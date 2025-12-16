/**
 * Retell Web Call
 * Handles web-based test calls via Retell
 * Uses API key to register web call and get access token
 */

import type { AgentSecretApiKey } from "@/types/database.types"

// ============================================================================
// CONFIGURATION
// ============================================================================

const RETELL_BASE_URL = "https://api.retellai.com"

// ============================================================================
// TYPES
// ============================================================================

export interface RetellWebCallSession {
  success: boolean
  provider: "retell"
  accessToken?: string
  callId?: string
  error?: string
}

interface RetellWebCallResponse {
  access_token: string
  call_id: string
}

// ============================================================================
// SECRET API KEY HELPER
// ============================================================================

function getRetellSecretKey(agentSecretApiKeys: AgentSecretApiKey[]): string {
  const apiKey = agentSecretApiKeys.find(
    (key) => key.provider === "retell" && key.is_active
  )

  if (!apiKey?.key) {
    throw new Error("No active Retell secret API key found.")
  }

  return apiKey.key
}

// ============================================================================
// CREATE RETELL WEB CALL SESSION
// ============================================================================

export async function createRetellWebCall(
  agentId: string,
  agentSecretApiKeys: AgentSecretApiKey[]
): Promise<RetellWebCallSession> {
  try {
    const apiKey = getRetellSecretKey(agentSecretApiKeys)

    // Register web call with Retell
    const response = await fetch(`${RETELL_BASE_URL}/v2/create-web-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        provider: "retell",
        error: errorData.message || errorData.error || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellWebCallResponse = await response.json()

    return {
      success: true,
      provider: "retell",
      accessToken: data.access_token,
      callId: data.call_id,
    }
  } catch (error) {
    return {
      success: false,
      provider: "retell",
      error: error instanceof Error ? error.message : "Unknown error creating Retell web call",
    }
  }
}

// ============================================================================
// VALIDATE AGENT FOR WEB CALL
// ============================================================================

export function canMakeRetellWebCall(
  externalAgentId: string | null,
  agentSecretApiKeys: AgentSecretApiKey[]
): { canCall: boolean; reason?: string } {
  if (!externalAgentId) {
    return {
      canCall: false,
      reason: "Agent has not been synced with Retell yet",
    }
  }

  const hasSecretKey = agentSecretApiKeys?.some(
    (key) => key.provider === "retell" && key.is_active
  )

  if (!hasSecretKey) {
    return {
      canCall: false,
      reason: "No active Retell secret API key configured",
    }
  }

  return { canCall: true }
}