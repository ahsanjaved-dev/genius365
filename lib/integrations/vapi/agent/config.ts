/**
 * VAPI Agent Config
 * Handles API communication with VAPI
 */

import type { AgentSecretApiKey } from "@/types/database.types"
import type { VapiAssistantPayload, VapiAssistantResponse } from "./mapper"

// ============================================================================
// CONFIGURATION
// ============================================================================

const VAPI_BASE_URL = "https://api.vapi.ai"

// ============================================================================
// RESPONSE TYPE
// ============================================================================

export interface VapiResponse {
  success: boolean
  data?: VapiAssistantResponse
  error?: string
}

// ============================================================================
// API KEY HELPER
// ============================================================================

function getVapiSecretKey(agentSecretApiKeys: AgentSecretApiKey[]): string {
  const apiKey = agentSecretApiKeys.find(
    (key) => key.provider === "vapi" && key.is_active
  )

  if (!apiKey?.key) {
    throw new Error("No active VAPI secret API key found. Please add a VAPI secret API key to the agent.")
  }

  return apiKey.key
}

// ============================================================================
// CREATE VAPI AGENT
// ============================================================================

export async function createVapiAgent(
  payload: VapiAssistantPayload,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<VapiResponse> {
  try {
    const apiKey = getVapiSecretKey(agentSecretApiKeys)

    const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
      method: "POST",
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
        error: errorData.message || `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: VapiAssistantResponse = await response.json()
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
// UPDATE VAPI AGENT
// ============================================================================

export async function updateVapiAgent(
  externalAgentId: string,
  payload: Partial<VapiAssistantPayload>,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<VapiResponse> {
  try {
    const apiKey = getVapiSecretKey(agentSecretApiKeys)

    const response = await fetch(`${VAPI_BASE_URL}/assistant/${externalAgentId}`, {
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
        error: errorData.message || `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: VapiAssistantResponse = await response.json()
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
// DELETE VAPI AGENT
// ============================================================================

export async function deleteVapiAgent(
  externalAgentId: string,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<VapiResponse> {
  try {
    const apiKey = getVapiSecretKey(agentSecretApiKeys)

    const response = await fetch(`${VAPI_BASE_URL}/assistant/${externalAgentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}