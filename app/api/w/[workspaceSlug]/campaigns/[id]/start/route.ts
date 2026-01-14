import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getWorkspaceContext, checkWorkspacePaywall } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError, notFound } from "@/lib/api/helpers"
import {
  loadJsonBatch,
  buildLoadJsonPayload,
  type CampaignData,
  type RecipientData,
} from "@/lib/integrations/inspra/client"
import type { BusinessHoursConfig } from "@/types/database.types"

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// HELPER: Get CLI (Caller ID) for campaign
// ============================================================================

async function getCLIForAgent(
  agent: any,
  workspaceId: string,
  partnerId: string,
  adminClient: ReturnType<typeof getSupabaseAdmin>
): Promise<string | null> {
  // Priority:
  // 1. Agent's external_phone_number
  // 2. Agent's assigned_phone_number_id (lookup)
  // 3. Shared outbound from integration config

  if (agent.external_phone_number) {
    return agent.external_phone_number
  }

  if (agent.assigned_phone_number_id) {
    const { data: phoneNumber } = await adminClient
      .from("phone_numbers")
      .select("phone_number, phone_number_e164")
      .eq("id", agent.assigned_phone_number_id)
      .single()

    if (phoneNumber) {
      return phoneNumber.phone_number_e164 || phoneNumber.phone_number
    }
  }

  // Check integration for shared outbound number
  const supabase = getSupabaseAdmin()
  const { data: assignment } = await supabase
    .from("workspace_integration_assignments")
    .select(`
      partner_integration:partner_integrations (
        config
      )
    `)
    .eq("workspace_id", workspaceId)
    .eq("provider", "vapi")
    .single()

  if (assignment?.partner_integration) {
    const config = (assignment.partner_integration as any).config
    if (config?.shared_outbound_phone_number) {
      return config.shared_outbound_phone_number
    }
  }

  return null
}

/**
 * POST /api/w/[workspaceSlug]/campaigns/[id]/start
 * 
 * Start a campaign that is in "ready" status.
 * 
 * Flow for "ready" campaigns:
 * 1. Campaign was created with loadJson payload (NBF = 1 year future)
 * 2. User clicks "Start Now"
 * 3. This endpoint RE-SENDS the loadJson payload with NBF = NOW
 * 4. Campaign status changes to "active"
 * 5. Inspra processes the updated NBF and calls begin immediately
 * 
 * Note: This is a lightweight operation - just updating NBF timing.
 * The heavy payload was already sent at campaign creation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; id: string }> }
) {
  try {
    const { workspaceSlug, id } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)
    if (!ctx) return unauthorized()

    // Check paywall
    const paywallError = await checkWorkspacePaywall(ctx.workspace.id, workspaceSlug)
    if (paywallError) return paywallError

    // Get campaign with agent (full details needed for Inspra)
    const { data: campaign, error: campaignError } = await ctx.adminClient
      .from("call_campaigns")
      .select(`
        *,
        agent:ai_agents!agent_id(
          id, 
          name, 
          provider, 
          is_active, 
          external_agent_id,
          external_phone_number,
          assigned_phone_number_id
        )
      `)
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (campaignError || !campaign) {
      return notFound("Campaign")
    }

    // Validate campaign can be started
    if (campaign.status === "active") {
      return apiError("Campaign is already active")
    }

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return apiError("Cannot start a completed or cancelled campaign")
    }

    if (campaign.status === "scheduled") {
      return apiError("Scheduled campaigns start automatically at the scheduled time")
    }

    // Only allow starting from "ready" or "draft" status
    if (campaign.status !== "ready" && campaign.status !== "draft") {
      return apiError(`Cannot start campaign with status: ${campaign.status}`)
    }

    // Validate agent
    const agent = campaign.agent as any
    if (!agent || !agent.is_active) {
      return apiError("Campaign agent is not active")
    }

    if (!agent.external_agent_id) {
      return apiError("Agent has not been synced with the voice provider")
    }

    // Get CLI (Caller ID)
    const cli = await getCLIForAgent(agent, ctx.workspace.id, ctx.partner.id, ctx.adminClient)
    if (!cli) {
      return apiError("No outbound phone number configured for the agent")
    }

    // Fetch all recipients for this campaign
    const { data: recipients, error: recipientsError } = await ctx.adminClient
      .from("call_recipients")
      .select("*")
      .eq("campaign_id", id)
      .eq("call_status", "pending")

    if (recipientsError) {
      console.error("[CampaignStart] Error fetching recipients:", recipientsError)
      return serverError("Failed to fetch recipients")
    }

    if (!recipients || recipients.length === 0) {
      return apiError("No pending recipients to call. Add recipients first.")
    }

    // =========================================================================
    // RE-SEND TO INSPRA API with NBF = NOW
    // The original payload was sent at creation with future NBF.
    // Now we re-send with startNow: true to set NBF = NOW and begin calls.
    // =========================================================================

    console.log("[CampaignStart] Re-sending campaign to Inspra with NBF = NOW...")

    // Build campaign data for Inspra
    const campaignDataForInspra: CampaignData = {
      id: campaign.id,
      workspace_id: ctx.workspace.id,
      agent: {
        external_agent_id: agent.external_agent_id,
        external_phone_number: agent.external_phone_number,
        assigned_phone_number_id: agent.assigned_phone_number_id,
      },
      cli,
      schedule_type: campaign.schedule_type, // Keep original schedule type
      scheduled_start_at: campaign.scheduled_start_at,
      scheduled_expires_at: campaign.scheduled_expires_at,
      business_hours_config: campaign.business_hours_config as BusinessHoursConfig | null,
      timezone: campaign.timezone,
    }

    // Map recipients to Inspra format
    const recipientsForInspra: RecipientData[] = recipients.map((r: any) => ({
      phone_number: r.phone_number,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      company: r.company,
      reason_for_call: r.reason_for_call,
      address_line_1: r.address_line_1,
      address_line_2: r.address_line_2,
      suburb: r.suburb,
      state: r.state,
      post_code: r.post_code,
      country: r.country,
    }))

    // Build Inspra payload with startNow: true to set NBF = NOW
    const inspraPayload = buildLoadJsonPayload(campaignDataForInspra, recipientsForInspra, { startNow: true })

    console.log("[CampaignStart] Inspra payload:", {
      batchRef: inspraPayload.batchRef,
      agentId: inspraPayload.agentId,
      workspaceId: inspraPayload.workspaceId,
      cli: inspraPayload.cli,
      recipientCount: inspraPayload.callList.length,
      nbf: inspraPayload.nbf,
      exp: inspraPayload.exp,
      blockRulesCount: inspraPayload.blockRules.length,
    })

    // Call Inspra API
    const inspraResult = await loadJsonBatch(inspraPayload)

    if (!inspraResult.success) {
      console.error("[CampaignStart] Failed to send to Inspra API:", inspraResult.error)
      return serverError(`Failed to start campaign: ${inspraResult.error || "Inspra API error"}`)
    }

    console.log("[CampaignStart] Successfully sent to Inspra API")

    // =========================================================================
    // UPDATE CAMPAIGN STATUS TO ACTIVE
    // =========================================================================

    const { data: updatedCampaign, error: updateError } = await ctx.adminClient
      .from("call_campaigns")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        pending_calls: recipients.length,
      })
      .eq("id", id)
      .select(`
        *,
        agent:ai_agents!agent_id(id, name, provider, is_active, external_agent_id)
      `)
      .single()

    if (updateError) {
      console.error("[CampaignStart] Error updating campaign status:", updateError)
      return serverError("Failed to update campaign status")
    }

    console.log("[CampaignStart] Campaign started:", {
      campaignId: id,
      batchRef: `campaign-${id}`,
      pendingRecipients: recipients.length,
    })

    return apiResponse({
      success: true,
      campaign: updatedCampaign,
      batchRef: `campaign-${id}`,
      recipientCount: recipients.length,
      message: "Campaign started! Calls are now being processed.",
      inspra: {
        sent: true,
        batchRef: inspraPayload.batchRef,
        recipientCount: inspraPayload.callList.length,
      },
    })
  } catch (error) {
    console.error("[CampaignStart] Exception:", error)
    return serverError("Internal server error")
  }
}
