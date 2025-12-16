/**
 * Retell Response Handler
 * Processes Retell responses and updates Supabase
 */

import { createClient } from "@supabase/supabase-js"
import type { AIAgent } from "@/types/database.types"
import type { RetellResponse } from "./config"
import { mapFromRetell, type RetellAgentResponse, type RetellLLMResponse } from "./mapper"

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
// PROCESS RETELL RESPONSE
// ============================================================================

export async function processRetellResponse(
  providerResponse: RetellResponse,
  agentId: string
): Promise<ProcessResponseResult> {
  if (!providerResponse.success || !providerResponse.data) {
    return {
      success: false,
      error: providerResponse.error || "No data in Retell response",
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const retellData = providerResponse.data as RetellAgentResponse
    const llmData = providerResponse.llmData as RetellLLMResponse | undefined
    
    // Pass both agent and LLM data to mapper
    const mappedData = mapFromRetell(retellData, llmData)

    // Get current agent to merge config
    const { data: currentAgent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("config")
      .eq("id", agentId)
      .single()

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch current agent: ${fetchError.message}`,
      }
    }

    // Merge existing config with updates from Retell
    const mergedConfig = {
      ...(currentAgent?.config || {}),
      ...(mappedData.config || {}),
    }

    // Update agent in Supabase
    const { data: updatedAgent, error: updateError } = await supabase
      .from("ai_agents")
      .update({
        external_agent_id: mappedData.external_agent_id,
        config: mergedConfig,
        ...(mappedData.voice_provider && { voice_provider: mappedData.voice_provider }),
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

    return {
      success: true,
      agent: updatedAgent as AIAgent,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing Retell response",
    }
  }
}

// ============================================================================
// PROCESS DELETE RESPONSE
// ============================================================================

export async function processRetellDeleteResponse(
  providerResponse: RetellResponse,
  agentId: string
): Promise<ProcessResponseResult> {
  if (!providerResponse.success) {
    return {
      success: false,
      error: providerResponse.error || "Failed to delete agent on Retell",
    }
  }

  try {
    const supabase = getSupabaseAdmin()

    // Clear external_agent_id and retell_llm_id after successful deletion
    const { data: currentAgent } = await supabase
      .from("ai_agents")
      .select("config")
      .eq("id", agentId)
      .single()

    const updatedConfig = { ...(currentAgent?.config || {}) }
    delete updatedConfig.retell_llm_id  // Clean up LLM ID

    const { data: updatedAgent, error: updateError } = await supabase
      .from("ai_agents")
      .update({
        external_agent_id: null,
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
      .select()
      .single()

    if (updateError) {
      return {
        success: false,
        error: `Failed to update agent after Retell deletion: ${updateError.message}`,
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