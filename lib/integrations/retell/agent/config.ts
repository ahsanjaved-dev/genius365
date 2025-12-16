/**
 * Retell Agent Config
 * Handles API communication with Retell
 */

import type { AgentSecretApiKey } from "@/types/database.types"
import type { 
  RetellAgentPayload, 
  RetellAgentResponse,
  RetellLLMPayload,
  RetellLLMResponse 
} from "./mapper"

// ============================================================================
// CONFIGURATION
// ============================================================================

const RETELL_BASE_URL = "https://api.retellai.com"

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface RetellResponse {
  success: boolean
  data?: RetellAgentResponse
  llmData?: RetellLLMResponse
  error?: string
}

export interface RetellLLMApiResponse {
  success: boolean
  data?: RetellLLMResponse
  error?: string
}

// ============================================================================
// API KEY HELPER
// ============================================================================

function getRetellSecretKey(agentSecretApiKeys: AgentSecretApiKey[]): string {
  const apiKey = agentSecretApiKeys.find(
    (key) => key.provider === "retell" && key.is_active
  )

  if (!apiKey?.key) {
    throw new Error("No active Retell secret API key found. Please add a Retell secret API key to the agent.")
  }

  return apiKey.key
}

// ============================================================================
// CREATE RETELL LLM
// ============================================================================

export async function createRetellLLM(
  payload: RetellLLMPayload,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellLLMApiResponse> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    const response = await fetch(`${RETELL_BASE_URL}/create-retell-llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Retell LLM error details:", JSON.stringify(errorData, null, 2))
      return {
        success: false,
        error: errorData.message || errorData.error || `Retell API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: RetellLLMResponse = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// ============================================================================
// UPDATE RETELL LLM
// ============================================================================

export async function updateRetellLLM(
  llmId: string,
  payload: Partial<RetellLLMPayload>,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellLLMApiResponse> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    const response = await fetch(`${RETELL_BASE_URL}/update-retell-llm/${llmId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || `Retell API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: RetellLLMResponse = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// ============================================================================
// DELETE RETELL LLM
// ============================================================================

export async function deleteRetellLLM(
  llmId: string,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellLLMApiResponse> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    const response = await fetch(`${RETELL_BASE_URL}/delete-retell-llm/${llmId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || `Retell API error: ${response.status} ${response.statusText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// ============================================================================
// CREATE RETELL AGENT
// ============================================================================

export async function createRetellAgent(
  payload: RetellAgentPayload,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellResponse> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    const response = await fetch(`${RETELL_BASE_URL}/create-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Retell Agent error details:", JSON.stringify(errorData, null, 2))
      return {
        success: false,
        error: errorData.message || errorData.error || `Retell API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: RetellAgentResponse = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// ============================================================================
// UPDATE RETELL AGENT
// ============================================================================

export async function updateRetellAgent(
  externalAgentId: string,
  payload: Partial<RetellAgentPayload>,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellResponse> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    const response = await fetch(`${RETELL_BASE_URL}/update-agent/${externalAgentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || `Retell API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: RetellAgentResponse = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// ============================================================================
// DELETE RETELL AGENT
// ============================================================================

export async function deleteRetellAgent(
  externalAgentId: string,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellResponse> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    const response = await fetch(`${RETELL_BASE_URL}/delete-agent/${externalAgentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || `Retell API error: ${response.status} ${response.statusText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}