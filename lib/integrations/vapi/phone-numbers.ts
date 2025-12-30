/**
 * VAPI Phone Numbers API
 * Handles phone number provisioning and management via VAPI
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const VAPI_BASE_URL = "https://api.vapi.ai"

// ============================================================================
// TYPES
// ============================================================================

export interface VapiPhoneNumber {
  id: string
  orgId: string
  provider: "vapi" | "twilio" | "vonage" | "telnyx" | "byo"
  number?: string
  sipUri?: string
  name?: string
  status?: "active" | "activating" | "blocked"
  assistantId?: string | null
  squadId?: string | null
  workflowId?: string | null
  createdAt: string
  updatedAt: string
}

export interface VapiPhoneNumberResponse {
  success: boolean
  data?: VapiPhoneNumber
  error?: string
}

export interface VapiPhoneNumberListResponse {
  success: boolean
  data?: VapiPhoneNumber[]
  error?: string
}

// ============================================================================
// LIST PHONE NUMBERS
// ============================================================================

export async function listPhoneNumbers(params: {
  apiKey: string
  limit?: number
}): Promise<VapiPhoneNumberListResponse> {
  const { apiKey, limit = 100 } = params

  try {
    const url = new URL(`${VAPI_BASE_URL}/phone-number`)
    url.searchParams.set("limit", limit.toString())

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiPhoneNumbers] List error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: VapiPhoneNumber[] = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[VapiPhoneNumbers] List exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error listing phone numbers",
    }
  }
}

// ============================================================================
// CREATE FREE US PHONE NUMBER
// ============================================================================

export async function createFreeUsPhoneNumber(params: {
  apiKey: string
  name?: string
}): Promise<VapiPhoneNumberResponse> {
  const { apiKey, name } = params

  try {
    console.log("[VapiPhoneNumbers] Creating free US phone number...")

    const payload: Record<string, unknown> = {
      provider: "vapi",
      // Not specifying numberDesiredAreaCode - let Vapi assign
    }

    if (name) {
      payload.name = name
    }

    const response = await fetch(`${VAPI_BASE_URL}/phone-number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiPhoneNumbers] Create error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()
    console.log("[VapiPhoneNumbers] Full Vapi create response:", JSON.stringify(data, null, 2))
    
    // According to Vapi docs:
    // - `number`: Optional PSTN phone number (only for purchased numbers)
    // - `sipUri`: SIP URI for inbound calls (may not be returned for free numbers)
    // For free Vapi numbers, we need to construct the SIP URI from the ID
    // Format: sip:{id}@sip.vapi.ai
    const constructedSipUri = data.sipUri || `sip:${data.id}@sip.vapi.ai`
    
    console.log("[VapiPhoneNumbers] Created phone - ID:", data.id, "Status:", data.status, "Number:", data.number, "SipUri:", constructedSipUri)
    
    return {
      success: true,
      data: {
        id: data.id,
        orgId: data.orgId,
        provider: data.provider,
        number: data.number || null, // PSTN number (may be null for free SIP numbers)
        sipUri: constructedSipUri, // SIP URI - constructed if not provided
        name: data.name,
        status: data.status,
        assistantId: data.assistantId,
        squadId: data.squadId,
        workflowId: data.workflowId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as VapiPhoneNumber,
    }
  } catch (error) {
    console.error("[VapiPhoneNumbers] Create exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating phone number",
    }
  }
}

// ============================================================================
// ATTACH PHONE NUMBER TO ASSISTANT
// ============================================================================

export async function attachPhoneNumberToAssistant(params: {
  apiKey: string
  phoneNumberId: string
  assistantId: string | null
}): Promise<VapiPhoneNumberResponse> {
  const { apiKey, phoneNumberId, assistantId } = params

  try {
    console.log(
      "[VapiPhoneNumbers] Attaching phone number",
      phoneNumberId,
      "to assistant",
      assistantId
    )

    const payload: Record<string, unknown> = {
      assistantId: assistantId,
    }

    const response = await fetch(`${VAPI_BASE_URL}/phone-number/${phoneNumberId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiPhoneNumbers] Attach error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data: VapiPhoneNumber = await response.json()
    console.log("[VapiPhoneNumbers] Phone number attached successfully")
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[VapiPhoneNumbers] Attach exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error attaching phone number",
    }
  }
}

// ============================================================================
// GET PHONE NUMBER BY ID
// ============================================================================

export async function getPhoneNumber(params: {
  apiKey: string
  phoneNumberId: string
}): Promise<VapiPhoneNumberResponse> {
  const { apiKey, phoneNumberId } = params

  try {
    const response = await fetch(`${VAPI_BASE_URL}/phone-number/${phoneNumberId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiPhoneNumbers] Get error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()
    console.log("[VapiPhoneNumbers] Get phone number response:", JSON.stringify(data, null, 2))
    
    // For free Vapi numbers, construct the SIP URI if not provided
    // Format: sip:{id}@sip.vapi.ai
    const constructedSipUri = data.sipUri || `sip:${data.id}@sip.vapi.ai`
    
    return {
      success: true,
      data: {
        id: data.id,
        orgId: data.orgId,
        provider: data.provider,
        number: data.number || null, // PSTN number (may be null)
        sipUri: constructedSipUri, // SIP URI - constructed if not provided
        name: data.name,
        status: data.status,
        assistantId: data.assistantId,
        squadId: data.squadId,
        workflowId: data.workflowId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as VapiPhoneNumber,
    }
  } catch (error) {
    console.error("[VapiPhoneNumbers] Get exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error getting phone number",
    }
  }
}

// ============================================================================
// DELETE PHONE NUMBER
// ============================================================================

export async function deletePhoneNumber(params: {
  apiKey: string
  phoneNumberId: string
}): Promise<{ success: boolean; error?: string }> {
  const { apiKey, phoneNumberId } = params

  try {
    console.log("[VapiPhoneNumbers] Deleting phone number:", phoneNumberId)

    const response = await fetch(`${VAPI_BASE_URL}/phone-number/${phoneNumberId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[VapiPhoneNumbers] Delete error:", errorData)
      return {
        success: false,
        error:
          errorData.message ||
          `VAPI API error: ${response.status} ${response.statusText}`,
      }
    }

    console.log("[VapiPhoneNumbers] Phone number deleted successfully")
    return { success: true }
  } catch (error) {
    console.error("[VapiPhoneNumbers] Delete exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting phone number",
    }
  }
}

