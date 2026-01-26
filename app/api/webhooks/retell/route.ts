/**
 * POST /api/webhooks/retell
 * Retell AI webhook handler for call events AND custom function execution
 *
 * Handles two types of requests:
 * 1. Call Events (call_started, call_ended, call_analyzed)
 *    - Processes usage billing
 *
 * 2. Custom Function Execution (function/tool calls)
 *    - When agent needs to execute a custom function tool
 *    - Payload has 'function' field with function name and parameters
 *    - We execute it and return the result
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processCallCompletion } from "@/lib/billing/usage"
import { Prisma, CallDirection } from "@/lib/generated/prisma"
import { indexCallLogToAlgolia, configureCallLogsIndex } from "@/lib/algolia"
import type { AgentProvider, Conversation } from "@/types/database.types"

// Disable body parsing - we need the raw body for signature verification
export const dynamic = "force-dynamic"

// =============================================================================
// TYPES (Based on Retell webhook payload structure)
// =============================================================================

interface RetellCallEvent {
  event: string // "call_started", "call_ended", "call_analyzed"
  call: {
    call_id: string
    agent_id: string
    call_type: "web_call" | "phone_call"
    call_status: "registered" | "ongoing" | "ended" | "error"
    start_timestamp: number // Unix timestamp in milliseconds
    end_timestamp?: number // Unix timestamp in milliseconds
    transcript?: string
    transcript_object?: Array<{
      role: "agent" | "user"
      content: string
      words: Array<{
        word: string
        start: number
        end: number
      }>
    }>
    recording_url?: string
    public_log_url?: string
    from_number?: string
    to_number?: string
    direction?: "inbound" | "outbound"
    disconnection_reason?: string
    call_analysis?: {
      call_summary?: string
      call_successful?: boolean
      user_sentiment?: string
      in_voicemail?: boolean
      custom_analysis_data?: Record<string, unknown>
    }
  }
}

interface RetellFunctionCall {
  function: string
  call_id?: string
  agent_id?: string
  parameters?: Record<string, unknown>
}

type RetellWebhookPayload = RetellCallEvent | RetellFunctionCall

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Parse webhook payload
    const body = await request.json()
    const payload = body as RetellWebhookPayload

    console.log("[Retell Webhook] ========================================")
    console.log("[Retell Webhook] 🔔 WEBHOOK RECEIVED AT:", new Date().toISOString())
    console.log("[Retell Webhook] Payload:", JSON.stringify(payload, null, 2))
    console.log("[Retell Webhook] ========================================")

    // 2. Determine request type: Call Event or Function Call
    if ("event" in payload) {
      // Call Event
      const callPayload = payload as RetellCallEvent
      console.log(`[Retell Webhook] Call event: ${callPayload.event}`)

      switch (callPayload.event) {
        case "call_ended":
          await handleCallEnded(callPayload)
          break

        case "call_started":
          await handleCallStarted(callPayload)
          break

        case "call_analyzed":
          await handleCallAnalyzed(callPayload)
          break

        default:
          console.log(`[Retell Webhook] Unhandled event type: ${callPayload.event}`)
      }

      return NextResponse.json({ received: true })
    } else if ("function" in payload) {
      // Function Call
      const funcPayload = payload as RetellFunctionCall
      console.log(`[Retell Webhook] Function call: ${funcPayload.function}`)

      const result = await handleFunctionCall(funcPayload)
      return NextResponse.json(result)
    } else {
      console.warn("[Retell Webhook] Unknown payload type")
      return NextResponse.json({ error: "Unknown payload type" }, { status: 400 })
    }
  } catch (error) {
    console.error("[Retell Webhook] Error processing webhook:", error)
    // Return 200 to prevent Retell from retrying (we've logged the error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle custom function tool execution
 * Called when Retell agent needs to execute a custom function
 */
async function handleFunctionCall(payload: RetellFunctionCall): Promise<Record<string, unknown>> {
  const { function: functionName, parameters = {} } = payload

  console.log(`[Retell Webhook] Executing function: ${functionName}`)
  console.log(`[Retell Webhook] Parameters:`, parameters)

  try {
    // Here you would implement your custom function logic
    // For now, we'll return a mock response to prevent Retell errors

    // TODO: Implement custom function execution based on functionName
    // Examples:
    // - "create_support_ticket": Create a ticket in your system
    // - "book_appointment": Book an appointment in your calendar
    // - Any other custom function your agent needs

    // Mock response structure (adjust based on your actual needs)
    const result = {
      success: true,
      function: functionName,
      result: `Function '${functionName}' executed successfully`,
      // Return any data the agent needs
      data: {}
    }

    console.log(`[Retell Webhook] Function result:`, result)
    return result
  } catch (error) {
    console.error(`[Retell Webhook] Function execution error for '${functionName}':`, error)
    return {
      success: false,
      function: functionName,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Handle call_ended event from Retell
 * Contains complete call data with transcript, recording, duration
 * 
 * IMPORTANT: This is the PRIMARY Retell event that triggers Algolia indexing.
 * Only completed calls with full data are indexed for call logs display.
 */
async function handleCallEnded(payload: RetellCallEvent) {
  const { call } = payload

  console.log(`[Retell Webhook] ========================================`)
  console.log(`[Retell Webhook] CALL ENDED EVENT RECEIVED`)
  console.log(`[Retell Webhook] ========================================`)
  console.log(`[Retell Webhook] Call ID: ${call.call_id}`)
  console.log(`[Retell Webhook] Agent ID: ${call.agent_id}`)
  console.log(`[Retell Webhook] Duration: ${call.end_timestamp && call.start_timestamp ? (call.end_timestamp - call.start_timestamp) / 1000 : 'N/A'}s`)
  console.log(`[Retell Webhook] Transcript Preview: ${call.transcript?.substring(0, 100)}...`)
  console.log(`[Retell Webhook] ========================================`)

  if (!prisma) {
    console.error("[Retell Webhook] Prisma not configured")
    return
  }

  // 1. Find the conversation by externalId (Retell call ID)
  let conversation = await prisma.conversation.findFirst({
    where: {
      externalId: call.call_id,
    },
    include: {
      workspace: {
        select: {
          id: true,
          partnerId: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          provider: true,
        },
      },
    },
  })

  // If conversation doesn't exist (e.g., call_started webhook was missed), create it now
  if (!conversation) {
    console.log(`[Retell Webhook] Conversation not found for call ${call.call_id}, creating now...`)
    
    // Find the agent by Retell agent_id
    const agent = await prisma.aiAgent.findFirst({
      where: {
        externalAgentId: call.agent_id,
        provider: "retell",
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            id: true,
            partnerId: true,
          },
        },
      },
    })

    if (!agent || !agent.workspace) {
      console.error(`[Retell Webhook] Agent not found for Retell agent_id: ${call.agent_id}`)
      return
    }

    // Create conversation
    const direction = call.direction || "inbound"
    const newConversation = await prisma.conversation.create({
      data: {
        workspaceId: agent.workspace.id,
        agentId: agent.id,
        externalId: call.call_id,
        direction: direction as CallDirection,
        status: "in_progress",
        startedAt: new Date(call.start_timestamp),
        phoneNumber: call.from_number || call.to_number || null,
        metadata: {
          provider: "retell",
          call_type: call.call_type,
          direction: direction,
          retell_agent_id: call.agent_id,
          from_number: call.from_number,
          to_number: call.to_number,
        },
      },
    })

    // Re-fetch with relations
    conversation = await prisma.conversation.findFirst({
      where: { id: newConversation.id },
      include: {
        workspace: {
          select: {
            id: true,
            partnerId: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
      },
    })

    if (!conversation) {
      console.error(`[Retell Webhook] Failed to create conversation for call ${call.call_id}`)
      return
    }

    console.log(`[Retell Webhook] Created conversation ${conversation.id} for call ${call.call_id}`)
  }

  if (!conversation.workspace) {
    console.error(`[Retell Webhook] Conversation ${conversation.id} has no workspace`)
    return
  }

  // 2. Calculate duration from timestamps
  const durationMs = call.end_timestamp
    ? call.end_timestamp - call.start_timestamp
    : 0
  const durationSeconds = Math.max(0, Math.floor(durationMs / 1000))

  // 3. Update conversation with call details
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: "completed",
      endedAt: call.end_timestamp ? new Date(call.end_timestamp) : new Date(),
      durationSeconds: durationSeconds,
      transcript: call.transcript || conversation.transcript,
      recordingUrl: call.recording_url || conversation.recordingUrl,
      metadata: {
        ...(conversation.metadata as object),
        retell_disconnection_reason: call.disconnection_reason,
        retell_public_log_url: call.public_log_url,
      },
    },
  })

  // 4. Index to Algolia - ensure index is configured first
  // IMPORTANT: Must await to ensure indexing completes before serverless function terminates
  if (conversation.agent) {
    try {
      await configureCallLogsIndex(conversation.workspace.id)
      const indexResult = await indexCallLogToAlgolia({
        conversation: updatedConversation as unknown as Conversation,
        workspaceId: conversation.workspace.id,
        partnerId: conversation.workspace.partnerId,
        agentName: conversation.agent?.name || "Unknown Agent",
        agentProvider: (conversation.agent?.provider as AgentProvider) || "retell",
      })
      if (indexResult.success) {
        console.log(`[Retell Webhook] Successfully indexed call ${call.call_id} to Algolia`)
      } else {
        console.warn(`[Retell Webhook] Algolia indexing skipped for call ${call.call_id}: ${indexResult.reason}`)
      }
    } catch (err) {
      console.error("[Retell Webhook] Algolia indexing failed:", err)
    }
  }

  // 5. Process billing
  const result = await processCallCompletion({
    conversationId: conversation.id,
    workspaceId: conversation.workspace.id,
    partnerId: conversation.workspace.partnerId,
    durationSeconds: durationSeconds,
    provider: "retell",
    externalCallId: call.call_id,
  })

  if (result.success) {
    console.log(
      `[Retell Webhook] ✅ Billing processed for call ${call.call_id}: ` +
        `${result.minutesAdded} minutes, $${(result.amountDeducted || 0) / 100} deducted`
    )
  } else {
    console.error(
      `[Retell Webhook] ❌ Billing failed for call ${call.call_id}: ${result.error || result.reason}`
    )
  }

  // 6. Check if this call is part of a campaign and trigger next batch
  // Pass call outcome data for proper success/failure tracking
  await handleCampaignCallEnded(call.call_id, conversation.workspace.id, {
    callStatus: call.call_status,
    disconnectionReason: call.disconnection_reason,
    durationSeconds: durationSeconds,
  })
}

/**
 * Determine if a Retell call was successful based on call status and disconnection reason
 */
function isRetellCallSuccessful(callStatus: string, disconnectionReason?: string): boolean {
  if (callStatus === "ended") {
    const successfulReasons = [
      "agent_hangup",
      "user_hangup", 
      "end_call_function_called",
      "voicemail_reached",
      "max_duration_reached",
    ]
    return !disconnectionReason || successfulReasons.includes(disconnectionReason)
  }
  return false
}

/**
 * Map Retell call outcome to a string similar to VAPI's outcome format
 */
function getRetellCallOutcome(callStatus: string, disconnectionReason?: string): string {
  if (callStatus === "not_connected") {
    if (disconnectionReason === "invalid_destination") return "invalid_number"
    if (disconnectionReason === "dial_no_answer") return "no_answer"
    if (disconnectionReason === "dial_busy") return "busy"
    if (disconnectionReason === "dial_rejected") return "rejected"
    return "not_connected"
  }
  
  if (callStatus === "ended") {
    if (disconnectionReason === "user_hangup" || disconnectionReason === "agent_hangup") {
      return "answered"
    }
    if (disconnectionReason === "voicemail_reached") return "voicemail"
    return "answered"
  }
  
  if (callStatus === "error") {
    return "error"
  }
  
  return disconnectionReason || "unknown"
}

interface CampaignCallOutcome {
  callStatus: string
  disconnectionReason?: string
  durationSeconds: number
}

/**
 * Handle campaign call continuation when a Retell call ends
 * Triggers the next batch of calls if this was a campaign call
 * Uses Supabase client (not Prisma) since call_recipients/call_campaigns aren't in Prisma schema
 */
async function handleCampaignCallEnded(
  callId: string,
  workspaceId: string,
  outcome: CampaignCallOutcome
) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient()

    // Find the campaign recipient by external_call_id
    const { data: recipient, error: findError } = await supabase
      .from("call_recipients")
      .select("id, campaign_id")
      .eq("external_call_id", callId)
      .single()

    if (findError || !recipient) {
      // Not a campaign call - this is normal for non-campaign calls
      if (findError?.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.log(`[Retell Webhook] No campaign recipient found for call ${callId}`)
      }
      return
    }

    // Determine success/failure based on Retell call outcome
    const isSuccessful = isRetellCallSuccessful(outcome.callStatus, outcome.disconnectionReason)
    const callOutcome = getRetellCallOutcome(outcome.callStatus, outcome.disconnectionReason)
    const finalStatus = isSuccessful ? "completed" : "failed"

    console.log(`[Retell Webhook] Campaign call ended: ${callId}, campaign: ${recipient.campaign_id}, outcome: ${callOutcome}, successful: ${isSuccessful}`)

    // Get campaign info
    const { data: campaign, error: campaignError } = await supabase
      .from("call_campaigns")
      .select("id, status, completed_calls, successful_calls, failed_calls, pending_calls")
      .eq("id", recipient.campaign_id)
      .single()

    if (campaignError || !campaign) {
      console.error(`[Retell Webhook] Campaign not found: ${recipient.campaign_id}`)
      return
    }

    // Update recipient status with outcome
    const { error: updateError } = await supabase
      .from("call_recipients")
      .update({
        call_status: finalStatus,
        call_outcome: callOutcome,
        call_ended_at: new Date().toISOString(),
        call_duration_seconds: outcome.durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id)

    if (updateError) {
      console.error("[Retell Webhook] Error updating recipient:", updateError)
    }

    console.log(`[Retell Webhook] Campaign recipient ${recipient.id} updated: status=${finalStatus}, outcome=${callOutcome}`)

    // Calculate new campaign stats
    const newCompletedCalls = (campaign.completed_calls || 0) + 1
    const newSuccessfulCalls = isSuccessful
      ? (campaign.successful_calls || 0) + 1
      : campaign.successful_calls || 0
    const newFailedCalls = !isSuccessful
      ? (campaign.failed_calls || 0) + 1
      : campaign.failed_calls || 0

    // Update campaign stats
    const { error: statsError } = await supabase
      .from("call_campaigns")
      .update({
        completed_calls: newCompletedCalls,
        successful_calls: newSuccessfulCalls,
        failed_calls: newFailedCalls,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.campaign_id)

    if (statsError) {
      console.error("[Retell Webhook] Error updating campaign stats:", statsError)
    } else {
      console.log(`[Retell Webhook] Campaign stats updated: completed=${newCompletedCalls}, successful=${newSuccessfulCalls}, failed=${newFailedCalls}`)
    }

    // Check if campaign is still active
    if (campaign.status !== "active") {
      console.log(`[Retell Webhook] Campaign ${recipient.campaign_id} is not active, skipping next batch`)
      return
    }

    // Check remaining recipients
    const { count: remainingCount } = await supabase
      .from("call_recipients")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", recipient.campaign_id)
      .eq("call_status", "pending")

    console.log(`[Retell Webhook] Remaining recipients to process: ${remainingCount}`)

    if (!remainingCount || remainingCount === 0) {
      // Check if there are any calls still in progress
      const { count: callingCount } = await supabase
        .from("call_recipients")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", recipient.campaign_id)
        .eq("call_status", "calling")

      if (!callingCount || callingCount === 0) {
        // All calls done - mark campaign as completed
        console.log(`[Retell Webhook] Campaign ${recipient.campaign_id} completed - all recipients processed`)
        await supabase
          .from("call_campaigns")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", recipient.campaign_id)
      }
    } else {
      // Trigger next batch of calls
      try {
        const { startNextCalls, getRetellConfigForCampaign } =
          await import("@/lib/campaigns/call-queue-manager")

        const retellConfig = await getRetellConfigForCampaign(recipient.campaign_id)

        if (retellConfig) {
          console.log(`[Retell Webhook] Triggering next batch for campaign ${recipient.campaign_id}...`)
          
          // Fire-and-forget to not block the webhook response
          startNextCalls(recipient.campaign_id, workspaceId, retellConfig)
            .then((result) => {
              if (result.concurrencyHit) {
                console.log(
                  `[Retell Webhook] Next batch: CONCURRENCY LIMIT - in cooldown, ${result.remaining} pending`
                )
              } else {
                console.log(
                  `[Retell Webhook] Next batch result: started=${result.started}, failed=${result.failed}, remaining=${result.remaining}`
                )
              }
              if (result.errors.length > 0 && !result.concurrencyHit) {
                console.error(`[Retell Webhook] Next batch errors:`, result.errors)
              }
            })
            .catch((err) => {
              console.error("[Retell Webhook] Error starting next calls:", err)
            })
        } else {
          console.error(`[Retell Webhook] Could not get Retell config for campaign ${recipient.campaign_id}`)
        }
      } catch (err) {
        console.error("[Retell Webhook] Error importing call-queue-manager:", err)
      }
    }
  } catch (error) {
    console.error("[Retell Webhook] Error handling campaign call ended:", error)
    // Don't throw - this is a secondary operation
  }
}

/**
 * Handle call_started event from Retell
 * Creates a conversation for inbound calls or updates existing for outbound
 * 
 * NOTE: This handler does NOT index to Algolia. Only call_ended/call_analyzed
 * events trigger Algolia indexing for call logs display.
 */
async function handleCallStarted(payload: RetellCallEvent) {
  const { call } = payload

  console.log(`[Retell Webhook] Call started: ${call.call_id}`)
  console.log(`[Retell Webhook] Call type: ${call.call_type}, Direction: ${call.direction || 'unknown'}`)
  console.log(`[Retell Webhook] Agent ID: ${call.agent_id}`)
  console.log(`[Retell Webhook] From: ${call.from_number}, To: ${call.to_number}`)

  if (!prisma) {
    console.error("[Retell Webhook] Prisma not configured")
    return
  }

  // Find existing conversation (for outbound calls initiated from our app)
  let conversation = await prisma.conversation.findFirst({
    where: { externalId: call.call_id },
  })

  if (conversation) {
    // Update existing conversation (outbound call)
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "in_progress",
        startedAt: new Date(call.start_timestamp),
      },
    })
    console.log(`[Retell Webhook] Conversation ${conversation.id} marked as in_progress`)
  } else {
    // Create new conversation for inbound calls
    // Find the agent by Retell agent_id
    const agent = await prisma.aiAgent.findFirst({
      where: {
        externalAgentId: call.agent_id,
        provider: "retell",
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            id: true,
            partnerId: true,
          },
        },
      },
    })

    if (!agent || !agent.workspace) {
      console.error(`[Retell Webhook] Agent not found for Retell agent_id: ${call.agent_id}`)
      return
    }

    // Determine direction - inbound if call is to our number, outbound if from our number
    const direction = call.direction || "inbound"

    // Create conversation for inbound call
    const newConversation = await prisma.conversation.create({
      data: {
        workspaceId: agent.workspace.id,
        agentId: agent.id,
        externalId: call.call_id,
        direction: direction as CallDirection,
        status: "in_progress",
        startedAt: new Date(call.start_timestamp),
        phoneNumber: call.from_number || call.to_number || null,
        metadata: {
          provider: "retell",
          call_type: call.call_type,
          direction: direction,
          retell_agent_id: call.agent_id,
          from_number: call.from_number,
          to_number: call.to_number,
        },
      },
    })

    console.log(`[Retell Webhook] Created new conversation ${newConversation.id} for inbound call`)
  }
}

/**
 * Handle call_analyzed event from Retell
 * Contains analysis data: summary, sentiment, custom analysis
 * 
 * NOTE: This event comes AFTER call_ended and RE-INDEXES to Algolia
 * to update the call log with analysis data (summary, sentiment).
 */
async function handleCallAnalyzed(payload: RetellCallEvent) {
  const { call } = payload

  console.log(`[Retell Webhook] Call analyzed: ${call.call_id}`)

  if (!prisma) {
    console.error("[Retell Webhook] Prisma not configured")
    return
  }

  // Find conversation and update with analysis data
  const conversation = await prisma.conversation.findFirst({
    where: { externalId: call.call_id },
    include: {
      workspace: {
        select: {
          id: true,
          partnerId: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          provider: true,
        },
      },
    },
  })

  if (conversation && call.call_analysis) {
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        summary: call.call_analysis.call_summary || conversation.summary,
        sentiment: call.call_analysis.user_sentiment || conversation.sentiment,
        metadata: {
          ...(conversation.metadata as object),
          retell_analysis: {
            call_successful: call.call_analysis.call_successful,
            in_voicemail: call.call_analysis.in_voicemail,
            custom_data: call.call_analysis.custom_analysis_data as Prisma.InputJsonValue | undefined,
          },
        } as Prisma.InputJsonValue,
      },
    })

    console.log(`[Retell Webhook] Conversation ${conversation.id} updated with analysis`)

    // Re-index to Algolia with updated analysis data (summary, sentiment are searchable)
    // IMPORTANT: Must await to ensure indexing completes before serverless function terminates
    if (conversation.agent && conversation.workspace) {
      try {
        const indexResult = await indexCallLogToAlgolia({
          conversation: updatedConversation as unknown as Conversation,
          workspaceId: conversation.workspace.id,
          partnerId: conversation.workspace.partnerId,
          agentName: conversation.agent.name || "Unknown Agent",
          agentProvider: (conversation.agent.provider as AgentProvider) || "retell",
        })
        if (indexResult.success) {
          console.log(`[Retell Webhook] Re-indexed call ${call.call_id} to Algolia with analysis data`)
        } else {
          console.warn(`[Retell Webhook] Algolia re-indexing skipped for call ${call.call_id}: ${indexResult.reason}`)
        }
      } catch (err) {
        console.error("[Retell Webhook] Algolia re-indexing failed:", err)
      }
    }
  }
}
