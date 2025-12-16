import type { AIAgent } from "@/types/database.types"
import { mapToVapi } from "./mapper"
import { createVapiAgent, updateVapiAgent, deleteVapiAgent } from "./config"
import { processVapiResponse, processDeleteResponse } from "./response"

// ... existing ProcessResponseResult interface and other code ...

export type SyncOperation = "create" | "update" | "delete"

export interface VapiSyncResult {
  success: boolean
  agent?: AIAgent
  error?: string
}

export function shouldSyncToVapi(agent: AIAgent): boolean {
  const hasSecretKey = agent.agent_secret_api_key?.some(
    (key) => key.provider === "vapi" && key.is_active
  )
  return agent.provider === "vapi" && hasSecretKey
}

export async function safeVapiSync(
  agent: AIAgent,
  operation: SyncOperation = "create"
): Promise<VapiSyncResult> {
  try {
    if (!shouldSyncToVapi(agent)) {
      return { success: true } // Skip sync if not configured for VAPI
    }

    const payload = mapToVapi(agent)
    let response

    switch (operation) {
      case "create":
        response = await createVapiAgent(payload, agent.agent_secret_api_key)
        return await processVapiResponse(response, agent.id)
      case "update":
        if (!agent.external_agent_id) {
          // No external ID, create instead
          response = await createVapiAgent(payload, agent.agent_secret_api_key)
          return await processVapiResponse(response, agent.id)
        }
        response = await updateVapiAgent(agent.external_agent_id, payload, agent.agent_secret_api_key)
        return await processVapiResponse(response, agent.id)
      case "delete":
        if (!agent.external_agent_id) {
          return { success: true } // Nothing to delete
        }
        response = await deleteVapiAgent(agent.external_agent_id, agent.agent_secret_api_key)
        return await processDeleteResponse(response, agent.id)
      default:
        return { success: false, error: "Invalid sync operation" }
    }
  } catch (error) {
    console.error("VAPI sync error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown sync error",
    }
  }
}