/**
 * VAPI Web Call
 * Handles web-based test calls via VAPI
 * Uses PUBLIC API key for client-side calls
 */

import type { AgentPublicApiKey } from "@/types/database.types"

// ============================================================================
// TYPES
// ============================================================================

export interface VapiWebCallSession {
  success: boolean
  provider: "vapi"
  publicKey?: string
  token?: string
  error?: string
}

// ============================================================================
// PUBLIC API KEY HELPER
// ============================================================================

function getVapiPublicKey(agentPublicApiKeys: AgentPublicApiKey[]): string {
  const apiKey = agentPublicApiKeys.find(
    (key) => key.provider === "vapi" && key.is_active
  )

  if (!apiKey?.key) {
    throw new Error("No active VAPI public API key found. Please add a public API key to enable test calls.")
  }

  return apiKey.key
}

// ============================================================================
// CREATE VAPI WEB CALL SESSION
// ============================================================================

export async function createVapiWebCall(
  assistantId: string,
  agentPublicApiKeys: AgentPublicApiKey[]
): Promise<VapiWebCallSession> {
  try {
    const publicKey = getVapiPublicKey(agentPublicApiKeys)

    // For VAPI, the public key is used directly by the client SDK
    // We just validate it exists and return it
    return {
      success: true,
      provider: "vapi",
      publicKey: publicKey,
      token: publicKey, // VAPI web SDK uses the public key as token
    }
  } catch (error) {
    return {
      success: false,
      provider: "vapi",
      error: error instanceof Error ? error.message : "Unknown error creating VAPI web call",
    }
  }
}

// ============================================================================
// VALIDATE AGENT FOR WEB CALL
// ============================================================================

export function canMakeVapiWebCall(
  externalAgentId: string | null,
  agentPublicApiKeys: AgentPublicApiKey[]
): { canCall: boolean; reason?: string } {
  if (!externalAgentId) {
    return {
      canCall: false,
      reason: "Agent has not been synced with VAPI yet",
    }
  }

  const hasPublicKey = agentPublicApiKeys?.some(
    (key) => key.provider === "vapi" && key.is_active
  )

  if (!hasPublicKey) {
    return {
      canCall: false,
      reason: "No active VAPI public API key configured",
    }
  }

  return { canCall: true }
}