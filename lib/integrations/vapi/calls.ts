/**
 * VAPI Calls API
 * Handles outbound call creation via VAPI
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const VAPI_BASE_URL = "https://api.vapi.ai"

// ============================================================================
// TYPES
// ============================================================================

export interface VapiCall {
  id: string
  orgId: string
  type: "inboundPhoneCall" | "outboundPhoneCall" | "webCall"
  status:
    | "queued"
    | "ringing"
    | "in-progress"
    | "forwarding"
    | "ended"
  assistantId?: string
  phoneNumberId?: string
  customer?: {
    number: string
    name?: string
  }
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  createdAt: string
  updatedAt: string
}

export interface VapiCallResponse {
  success: boolean
  data?: VapiCall
  error?: string
}

// ============================================================================
// CREATE OUTBOUND CALL
// ============================================================================

export async function createOutboundCall(params: {
  apiKey: string
  assistantId: string
  phoneNumberId: string
  customerNumber: string
  customerName?: string
}): Promise<VapiCallResponse> {
  const { apiKey, assistantId, phoneNumberId, customerNumber, customerName } = params

  try {
    console.log(
      "[VapiCalls] Creating outbound call from",
      phoneNumberId,
      "to",
      customerNumber
    )

    const payload: Record<string, unknown> = {
      assistantId,
      phoneNumberId,
      customer: {
        number: customerNumber,
        ...(customerName && { name: customerName }),
      },
    }

    const response = await fetch(`${VAPI_BASE_URL}/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiCalls] Create error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: VapiCall = await response.json()
    console.log("[VapiCalls] Outbound call created:", data.id, "status:", data.status)
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[VapiCalls] Create exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating outbound call",
    }
  }
}

// ============================================================================
// GET CALL BY ID
// ============================================================================

export async function getCall(params: {
  apiKey: string
  callId: string
}): Promise<VapiCallResponse> {
  const { apiKey, callId } = params

  try {
    const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiCalls] Get error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: VapiCall = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[VapiCalls] Get exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error getting call",
    }
  }
}

