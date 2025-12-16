/**
 * Retell Sync
 * Orchestrates sync operations between internal agents and Retell
 * Flow: Create LLM → Create Agent (Retell requires LLM first)
 */

import type { AIAgent } from "@/types/database.types"
import { mapToRetellLLM, mapToRetellAgent, mapFromRetell } from "./mapper"
import { 
  createRetellLLM, 
  updateRetellLLM,
  deleteRetellLLM,
  createRetellAgent, 
  updateRetellAgent, 
  deleteRetellAgent 
} from "./config"
import { processRetellResponse, processRetellDeleteResponse } from "./response"

// ============================================================================
// TYPES
// ============================================================================

export type SyncOperation = "create" | "update" | "delete"

export interface RetellSyncResult {
  success: boolean
  agent?: AIAgent
  error?: string
}

// ============================================================================
// SHOULD SYNC CHECK
// ============================================================================

export function shouldSyncToRetell(agent: AIAgent): boolean {
  const hasSecretKey = agent.agent_secret_api_key?.some(
    (key) => key.provider === "retell" && key.is_active
  )
  return agent.provider === "retell" && hasSecretKey
}

// ============================================================================
// SAFE RETELL SYNC
// ============================================================================

export async function safeRetellSync(
  agent: AIAgent,
  operation: SyncOperation = "create"
): Promise<RetellSyncResult> {
  try {
    if (!shouldSyncToRetell(agent)) {
      return { success: true } // Skip sync if not configured for Retell
    }

    switch (operation) {
      case "create": {
        // Step 1: Create LLM first
        const llmPayload = mapToRetellLLM(agent)
        const llmResponse = await createRetellLLM(llmPayload, agent.agent_secret_api_key)
        
        if (!llmResponse.success || !llmResponse.data) {
          return {
            success: false,
            error: `Failed to create Retell LLM: ${llmResponse.error}`,
          }
        }

        const llmId = llmResponse.data.llm_id

        // Step 2: Create Agent with LLM ID
        const agentPayload = mapToRetellAgent(agent, llmId)
        const agentResponse = await createRetellAgent(agentPayload, agent.agent_secret_api_key)

        if (!agentResponse.success || !agentResponse.data) {
          // Cleanup: Delete the LLM we just created
          await deleteRetellLLM(llmId, agent.agent_secret_api_key)
          return {
            success: false,
            error: `Failed to create Retell Agent: ${agentResponse.error}`,
          }
        }

        // Process response with both LLM and Agent data
        return await processRetellResponse(
          { ...agentResponse, llmData: llmResponse.data },
          agent.id
        )
      }

      case "update": {
        if (!agent.external_agent_id) {
          // No external ID, create instead
          return await safeRetellSync(agent, "create")
        }

        const config = agent.config || {}
        
        // Update LLM if we have the llm_id stored
        if (config.retell_llm_id) {
          const llmPayload = mapToRetellLLM(agent)
          await updateRetellLLM(config.retell_llm_id, llmPayload, agent.agent_secret_api_key)
        }

        // Update Agent
        const agentPayload = mapToRetellAgent(agent, config.retell_llm_id || "")
        // Remove response_engine from update payload (can't change LLM reference)
        const { response_engine, ...updatePayload } = agentPayload
        
        const agentResponse = await updateRetellAgent(
          agent.external_agent_id, 
          updatePayload, 
          agent.agent_secret_api_key
        )

        return await processRetellResponse(agentResponse, agent.id)
      }

      case "delete": {
        if (!agent.external_agent_id) {
          return { success: true } // Nothing to delete
        }

        const config = agent.config || {}

        // Delete Agent first
        const agentResponse = await deleteRetellAgent(
          agent.external_agent_id, 
          agent.agent_secret_api_key
        )

        if (!agentResponse.success) {
          return {
            success: false,
            error: `Failed to delete Retell Agent: ${agentResponse.error}`,
          }
        }

        // Delete LLM if we have the llm_id stored
        if (config.retell_llm_id) {
          await deleteRetellLLM(config.retell_llm_id, agent.agent_secret_api_key)
        }

        return await processRetellDeleteResponse(agentResponse, agent.id)
      }

      default:
        return { success: false, error: "Invalid sync operation" }
    }
  } catch (error) {
    console.error("Retell sync error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown sync error",
    }
  }
}