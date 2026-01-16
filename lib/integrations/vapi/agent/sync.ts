import { createClient } from "@supabase/supabase-js"
import type { AIAgent } from "@/types/database.types"
import { mapToVapi } from "./mapper"
import {
  createVapiAgentWithKey,
  updateVapiAgentWithKey,
  deleteVapiAgentWithKey,
} from "./config"
import { processVapiResponse, processDeleteResponse } from "./response"
import { syncVapiFunctionTools } from "@/lib/integrations/function_tools/vapi/api/sync"

export type SyncOperation = "create" | "update" | "delete"

export interface VapiSyncResult {
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
// CHECK IF SHOULD SYNC
// ============================================================================

export function shouldSyncToVapi(agent: AIAgent): boolean {
  if (agent.provider !== "vapi") {
    return false
  }

  // NEW ORG-LEVEL FLOW: Always return true for VAPI agents
  // The actual API key will be fetched from workspace's assigned integration
  // If no key is assigned, sync will fail gracefully with an error message
  return true
}

// ============================================================================
// GET API KEY FOR SYNC (NEW ORG-LEVEL FLOW)
// ============================================================================

async function getVapiApiKeyForAgent(
  agent: AIAgent
): Promise<{ secretKey: string; publicKey?: string } | null> {
  // Need workspace_id to fetch the assigned integration
  if (!agent.workspace_id) {
    console.error("[VapiSync] Agent has no workspace_id, cannot fetch integration keys")
    return null
  }

  try {
    const supabase = getSupabaseAdmin()
    console.log(`[VapiSync] Querying integration assignment for workspace ${agent.workspace_id}`)

    // NEW ORG-LEVEL FLOW: Fetch from workspace_integration_assignments -> partner_integrations
    const { data: assignment, error: assignmentError } = await supabase
      .from("workspace_integration_assignments")
      .select(`
        partner_integration:partner_integrations (
          id,
          api_keys,
          is_active
        )
      `)
      .eq("workspace_id", agent.workspace_id)
      .eq("provider", "vapi")
      .single()

    if (assignmentError) {
      console.error("[VapiSync] Assignment query error:", assignmentError.message, assignmentError.code)
      // PGRST116 = no rows found, which is expected if no integration assigned
      if (assignmentError.code !== "PGRST116") {
        console.error("[VapiSync] Unexpected query error:", assignmentError)
      }
      return null
    }
    
    if (!assignment) {
      console.log("[VapiSync] No assignment found for workspace")
      return null
    }
    
    console.log("[VapiSync] Assignment found:", JSON.stringify(assignment, null, 2))

    if (!assignment.partner_integration) {
      console.log("[VapiSync] Assignment exists but partner_integration is null")
      return null
    }

    const partnerIntegration = assignment.partner_integration as any
    if (!partnerIntegration.is_active) {
      console.log("[VapiSync] Assigned VAPI integration is not active")
      return null
    }

    const apiKeys = partnerIntegration.api_keys as any
    if (!apiKeys?.default_secret_key) {
      console.error("[VapiSync] Assigned integration has no secret key")
      return null
    }

    console.log("[VapiSync] Successfully retrieved API keys")
    return {
      secretKey: apiKeys.default_secret_key,
      publicKey: apiKeys.default_public_key || undefined,
    }
  } catch (error) {
    console.error("[VapiSync] Exception fetching API keys for agent:", error)
    return null
  }
}

// ============================================================================
// SAFE VAPI SYNC
// ============================================================================

export async function safeVapiSync(
  agent: AIAgent,
  operation: SyncOperation = "create"
): Promise<VapiSyncResult> {
  console.log(`[VapiSync] Starting ${operation} sync for agent ${agent.id} (${agent.name})`)
  
  try {
    if (!shouldSyncToVapi(agent)) {
      console.log("[VapiSync] Skipping sync - agent is not VAPI provider")
      return { success: true }
    }

    // Get the API key
    console.log(`[VapiSync] Fetching API key for workspace ${agent.workspace_id}`)
    const keys = await getVapiApiKeyForAgent(agent)

    if (!keys?.secretKey) {
      const errorMsg = "No VAPI API key configured. Please assign an API key in the agent settings."
      console.error(`[VapiSync] ${errorMsg}`)
      return {
        success: false,
        error: errorMsg,
      }
    }
    
    console.log(`[VapiSync] API key found, proceeding with ${operation}`)

    // ------------------------------------------------------------------------
    // Custom Function Tools (API Alternative)
    // - Sync internal `config.tools` (function tools) to VAPI via /tool API
    // - Persist `external_tool_id` back into the agent config
    // - mapToVapi will then attach them via `model.toolIds`
    // ------------------------------------------------------------------------
    let agentForMapping: AIAgent = agent
    if (operation !== "delete") {
      const configAny = (agent.config || {}) as any
      const tools = configAny.tools as any[] | undefined
      const defaultServerUrl = configAny.tools_server_url as string | undefined

      if (Array.isArray(tools) && tools.length > 0) {
        const synced = await syncVapiFunctionTools(tools as any, keys.secretKey, {
          defaultServerUrl,
        })

        if (synced.errors.length > 0) {
          console.warn("[VapiSync] Tool sync warnings:", synced.errors)
        }

        // Only persist if something changed (e.g. new external_tool_id)
        const changed =
          JSON.stringify(tools.map((t) => t?.external_tool_id || null)) !==
          JSON.stringify(synced.tools.map((t) => t?.external_tool_id || null))

        if (changed) {
          const supabase = getSupabaseAdmin()
          const nextConfig = { ...configAny, tools: synced.tools }

          await supabase
            .from("ai_agents")
            .update({ config: nextConfig, updated_at: new Date().toISOString() })
            .eq("id", agent.id)

          agentForMapping = {
            ...agent,
            config: nextConfig,
          } as AIAgent
        } else {
          agentForMapping = agent
        }
      }
    }

    const payload = mapToVapi(agentForMapping)
    console.log("[VapiSync] Mapped payload for VAPI:", JSON.stringify({ name: payload.name, model: payload.model?.model }, null, 2))
    let response
    let result: VapiSyncResult

    switch (operation) {
      case "create":
        console.log("[VapiSync] Creating agent on VAPI...")
        response = await createVapiAgentWithKey(payload, keys.secretKey)
        result = await processVapiResponse(response, agent.id)
        console.log(`[VapiSync] Create result: success=${result.success}, error=${result.error || 'none'}, external_id=${result.agent?.external_agent_id || 'none'}`)
        return result

      case "update":
        if (!agent.external_agent_id) {
          // No external ID, create instead
          console.log("[VapiSync] No external_agent_id, creating new agent on VAPI...")
          response = await createVapiAgentWithKey(payload, keys.secretKey)
          result = await processVapiResponse(response, agent.id)
          console.log(`[VapiSync] Create (from update) result: success=${result.success}, error=${result.error || 'none'}, external_id=${result.agent?.external_agent_id || 'none'}`)
          return result
        }
        
        console.log("[VapiSync] Updating agent on VAPI:", agent.external_agent_id)
        response = await updateVapiAgentWithKey(
          agent.external_agent_id,
          payload,
          keys.secretKey
        )
        
        // If update fails (agent doesn't exist or API key from different account), create new agent
        if (!response.success) {
          console.log("[VapiSync] Update failed, creating new agent on VAPI instead...")
          const createResponse = await createVapiAgentWithKey(payload, keys.secretKey)
          result = await processVapiResponse(createResponse, agent.id)
          console.log(`[VapiSync] Create (fallback) result: success=${result.success}, error=${result.error || 'none'}, external_id=${result.agent?.external_agent_id || 'none'}`)
          return result
        }
        
        result = await processVapiResponse(response, agent.id)
        console.log(`[VapiSync] Update result: success=${result.success}, error=${result.error || 'none'}, external_id=${result.agent?.external_agent_id || 'none'}`)
        return result

      case "delete":
        if (!agent.external_agent_id) {
          console.log("[VapiSync] No external_agent_id, nothing to delete")
          return { success: true } // Nothing to delete
        }
        console.log("[VapiSync] Deleting agent on VAPI:", agent.external_agent_id)
        response = await deleteVapiAgentWithKey(
          agent.external_agent_id,
          keys.secretKey
        )
        return await processDeleteResponse(response, agent.id)

      default:
        return { success: false, error: "Invalid sync operation" }
    }
  } catch (error) {
    console.error("[VapiSync] Sync exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown sync error",
    }
  }
}