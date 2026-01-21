/**
 * VAPI Response Handler
 * Processes VAPI responses and updates Supabase
 */

import { createClient } from "@supabase/supabase-js"
import type { AIAgent } from "@/types/database.types"
import type { VapiResponse } from "./config"
import { mapFromVapi, type VapiAssistantResponse } from "./mapper"
import { env } from "@/lib/env"
import { attachPhoneNumberToAssistant } from "../phone-numbers"

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessResponseResult {
  success: boolean
  agent?: AIAgent
  error?: string
}

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
// PROCESS VAPI RESPONSE
// ============================================================================

export async function processVapiResponse(
  providerResponse: VapiResponse,
  agentId: string
): Promise<ProcessResponseResult> {
  if (!providerResponse.success || !providerResponse.data) {
    return {
      success: false,
      error: providerResponse.error || "No data in VAPI response",
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const vapiData = providerResponse.data as VapiAssistantResponse
    const mappedData = mapFromVapi(vapiData)

    // Get current agent to merge config and get workspace_id
    const { data: currentAgent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("config, workspace_id")
      .eq("id", agentId)
      .single()

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch current agent: ${fetchError.message}`,
      }
    }

    // Generate webhook URL based on workspace
    // This URL is stored in config as read-only for user reference
    let baseUrl = (env.appUrl || "https://genius365.vercel.app").replace(/\/$/, "")
    
    // Ensure URL has https:// protocol
    if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`
    }
    
    const webhookUrl = currentAgent?.workspace_id
      ? `${baseUrl}/api/webhooks/w/${currentAgent.workspace_id}/vapi`
      : `${baseUrl}/api/webhooks/vapi`

    // Merge existing config with updates from VAPI
    // Include the generated webhook URL as a read-only field
    const mergedConfig = {
      ...(currentAgent?.config || {}),
      ...(mappedData.config || {}),
      // Store webhook URL in config (read-only, auto-generated)
      provider_webhook_url: webhookUrl,
      provider_webhook_configured_at: new Date().toISOString(),
    }

    // Update agent in Supabase
    const { data: updatedAgent, error: updateError } = await supabase
      .from("ai_agents")
      .update({
        external_agent_id: mappedData.external_agent_id,
        config: mergedConfig,
        sync_status: "synced",
        needs_resync: false,
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
        ...(mappedData.voice_provider && { voice_provider: mappedData.voice_provider }),
        ...(mappedData.model_provider && { model_provider: mappedData.model_provider }),
        ...(mappedData.transcriber_provider && { transcriber_provider: mappedData.transcriber_provider }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
      .select()
      .single()

    if (updateError) {
      return {
        success: false,
        error: `Failed to update agent: ${updateError.message}`,
      }
    }

    console.log(`[VapiResponse] Agent synced successfully. Webhook URL: ${webhookUrl}`)

    // =========================================================================
    // PHONE NUMBER BINDING FOR INBOUND CALLS
    // After agent is synced to VAPI, bind the assigned phone number to the
    // VAPI assistant so inbound calls route to this agent.
    // =========================================================================
    const typedAgent = updatedAgent as AIAgent
    if (typedAgent.assigned_phone_number_id && mappedData.external_agent_id) {
      console.log(`[VapiResponse] Agent has assigned_phone_number_id: ${typedAgent.assigned_phone_number_id}, binding to VAPI assistant...`)
      
      try {
        // Fetch the phone number to get its VAPI external_id
        const { data: phoneNumber, error: phoneError } = await supabase
          .from("phone_numbers")
          .select("id, external_id, phone_number")
          .eq("id", typedAgent.assigned_phone_number_id)
          .single()
        
        if (phoneError) {
          console.error(`[VapiResponse] Failed to fetch phone number: ${phoneError.message}`)
        } else if (!phoneNumber?.external_id) {
          console.warn(`[VapiResponse] Phone number ${typedAgent.assigned_phone_number_id} has no external_id (not synced to VAPI)`)
        } else {
          // Get VAPI API key to make the binding call
          const apiKey = await getVapiApiKeyForWorkspace(supabase, currentAgent?.workspace_id)
          
          if (apiKey) {
            const bindResult = await attachPhoneNumberToAssistant({
              apiKey,
              phoneNumberId: phoneNumber.external_id,
              assistantId: mappedData.external_agent_id,
            })
            
            if (bindResult.success) {
              console.log(`[VapiResponse] Successfully bound phone number ${phoneNumber.phone_number} to VAPI assistant ${mappedData.external_agent_id}`)
            } else {
              console.error(`[VapiResponse] Failed to bind phone number to VAPI assistant: ${bindResult.error}`)
            }
          } else {
            console.warn(`[VapiResponse] No VAPI API key found for workspace, cannot bind phone number`)
          }
        }
      } catch (bindError) {
        console.error(`[VapiResponse] Error binding phone number to VAPI assistant:`, bindError)
        // Don't fail the overall sync - phone binding is a secondary operation
      }
    }

    return {
      success: true,
      agent: updatedAgent as AIAgent,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing VAPI response",
    }
  }
}

// ============================================================================
// HELPER: Get VAPI API key for workspace
// ============================================================================

async function getVapiApiKeyForWorkspace(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  workspaceId: string | undefined
): Promise<string | null> {
  if (!workspaceId) return null
  
  try {
    const { data: assignment, error: assignmentError } = await supabase
      .from("workspace_integration_assignments")
      .select(`
        partner_integration:partner_integrations (
          id,
          api_keys,
          is_active
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("provider", "vapi")
      .single()
    
    if (assignmentError || !assignment?.partner_integration) {
      return null
    }
    
    const partnerIntegration = assignment.partner_integration as any
    if (!partnerIntegration.is_active) {
      return null
    }
    
    const apiKeys = partnerIntegration.api_keys as any
    return apiKeys?.default_secret_key || null
  } catch (error) {
    console.error("[VapiResponse] Error fetching VAPI API key:", error)
    return null
  }
}

// ============================================================================
// BIND PHONE NUMBER TO VAPI ASSISTANT
// Exported helper for binding phone numbers after agent sync or when phone
// number assignment changes.
// ============================================================================

export async function bindPhoneNumberToVapiAssistant(params: {
  agentId: string
  phoneNumberId: string
  externalAgentId: string
  workspaceId: string
}): Promise<{ success: boolean; error?: string }> {
  const { agentId, phoneNumberId, externalAgentId, workspaceId } = params
  
  try {
    const supabase = getSupabaseAdmin()
    
    // Fetch the phone number to get its VAPI external_id
    const { data: phoneNumber, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("id, external_id, phone_number")
      .eq("id", phoneNumberId)
      .single()
    
    if (phoneError) {
      return { success: false, error: `Failed to fetch phone number: ${phoneError.message}` }
    }
    
    if (!phoneNumber?.external_id) {
      return { success: false, error: `Phone number ${phoneNumberId} has no external_id (not synced to VAPI)` }
    }
    
    // Get VAPI API key
    const apiKey = await getVapiApiKeyForWorkspace(supabase, workspaceId)
    
    if (!apiKey) {
      return { success: false, error: "No VAPI API key found for workspace" }
    }
    
    const bindResult = await attachPhoneNumberToAssistant({
      apiKey,
      phoneNumberId: phoneNumber.external_id,
      assistantId: externalAgentId,
    })
    
    if (bindResult.success) {
      console.log(`[VapiResponse] Successfully bound phone number ${phoneNumber.phone_number} to VAPI assistant ${externalAgentId}`)
      return { success: true }
    } else {
      return { success: false, error: bindResult.error }
    }
  } catch (error) {
    console.error("[VapiResponse] Error binding phone number:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// UNBIND PHONE NUMBER FROM VAPI ASSISTANT
// Sets assistantId to null on the phone number in VAPI
// ============================================================================

export async function unbindPhoneNumberFromVapiAssistant(params: {
  phoneNumberId: string
  workspaceId: string
}): Promise<{ success: boolean; error?: string }> {
  const { phoneNumberId, workspaceId } = params
  
  try {
    const supabase = getSupabaseAdmin()
    
    // Fetch the phone number to get its VAPI external_id
    const { data: phoneNumber, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("id, external_id, phone_number")
      .eq("id", phoneNumberId)
      .single()
    
    if (phoneError) {
      return { success: false, error: `Failed to fetch phone number: ${phoneError.message}` }
    }
    
    if (!phoneNumber?.external_id) {
      // Phone number not synced to VAPI, nothing to unbind
      return { success: true }
    }
    
    // Get VAPI API key
    const apiKey = await getVapiApiKeyForWorkspace(supabase, workspaceId)
    
    if (!apiKey) {
      return { success: false, error: "No VAPI API key found for workspace" }
    }
    
    // Unbind by setting assistantId to null
    const unbindResult = await attachPhoneNumberToAssistant({
      apiKey,
      phoneNumberId: phoneNumber.external_id,
      assistantId: null,
    })
    
    if (unbindResult.success) {
      console.log(`[VapiResponse] Successfully unbound phone number ${phoneNumber.phone_number} from VAPI assistant`)
      return { success: true }
    } else {
      return { success: false, error: unbindResult.error }
    }
  } catch (error) {
    console.error("[VapiResponse] Error unbinding phone number:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// PROCESS DELETE RESPONSE
// ============================================================================

export async function processDeleteResponse(
  providerResponse: VapiResponse,
  agentId: string
): Promise<ProcessResponseResult> {
  if (!providerResponse.success) {
    return {
      success: false,
      error: providerResponse.error || "Failed to delete agent on VAPI",
    }
  }

  try {
    const supabase = getSupabaseAdmin()

    // Clear external_agent_id after successful deletion
    const { data: updatedAgent, error: updateError } = await supabase
      .from("ai_agents")
      .update({
        external_agent_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
      .select()
      .single()

    if (updateError) {
      return {
        success: false,
        error: `Failed to update agent after VAPI deletion: ${updateError.message}`,
      }
    }

    return {
      success: true,
      agent: updatedAgent as AIAgent,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing delete response",
    }
  }
}