/**
 * Retell Phone Numbers API
 * Handles phone number management and provisioning via Retell
 * 
 * @see https://docs.retellai.com/api-references/phone-number
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const RETELL_BASE_URL = "https://api.retellai.com"

// ============================================================================
// TYPES
// ============================================================================

export interface RetellPhoneNumber {
  phone_number: string // E.164 format
  phone_number_pretty: string // Human readable format
  inbound_agent_id?: string | null
  outbound_agent_id?: string | null
  area_code?: number
  nickname?: string
  last_modification_timestamp?: number
  termination_uri?: string // SIP termination URI for BYO numbers
}

export interface RetellPhoneNumberResponse {
  success: boolean
  data?: RetellPhoneNumber
  error?: string
}

export interface RetellPhoneNumberListResponse {
  success: boolean
  data?: RetellPhoneNumber[]
  error?: string
}

// ============================================================================
// IMPORT PHONE NUMBER TYPES
// ============================================================================

export interface ImportTwilioNumberParams {
  apiKey: string
  phoneNumber: string // E.164 format
  twilioAccountSid: string
  twilioAuthToken: string
  nickname?: string
  inboundAgentId?: string
  outboundAgentId?: string
}

export interface ImportVonageNumberParams {
  apiKey: string
  phoneNumber: string // E.164 format
  vonageApiKey: string
  vonageApiSecret: string
  vonageApplicationId: string
  vonagePrivateKey: string
  nickname?: string
  inboundAgentId?: string
  outboundAgentId?: string
}

export interface ImportTelnyxNumberParams {
  apiKey: string
  phoneNumber: string // E.164 format
  telnyxApiKey: string
  telnyxConnectionId: string
  nickname?: string
  inboundAgentId?: string
  outboundAgentId?: string
}

export interface ImportByoSipNumberParams {
  apiKey: string
  phoneNumber: string // E.164 format
  terminationUri: string // SIP URI for termination
  nickname?: string
  inboundAgentId?: string
  outboundAgentId?: string
}

// ============================================================================
// LIST PHONE NUMBERS
// ============================================================================

export async function listRetellPhoneNumbers(params: {
  apiKey: string
}): Promise<RetellPhoneNumberListResponse> {
  const { apiKey } = params

  try {
    console.log("[RetellPhoneNumbers] Listing phone numbers...")

    const response = await fetch(`${RETELL_BASE_URL}/v2/list-phone-numbers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] List error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber[] = await response.json()
    console.log("[RetellPhoneNumbers] Listed", data.length, "phone numbers")

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] List exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error listing phone numbers",
    }
  }
}

// ============================================================================
// GET PHONE NUMBER
// ============================================================================

export async function getRetellPhoneNumber(params: {
  apiKey: string
  phoneNumber: string // Can be E.164 or the phone_number field
}): Promise<RetellPhoneNumberResponse> {
  const { apiKey, phoneNumber } = params

  try {
    console.log("[RetellPhoneNumbers] Getting phone number:", phoneNumber)

    const response = await fetch(
      `${RETELL_BASE_URL}/v2/get-phone-number/${encodeURIComponent(phoneNumber)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Get error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber = await response.json()
    console.log("[RetellPhoneNumbers] Got phone number:", data.phone_number_pretty)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Get exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error getting phone number",
    }
  }
}

// ============================================================================
// UPDATE PHONE NUMBER (ASSIGN AGENT)
// ============================================================================

export async function updateRetellPhoneNumber(params: {
  apiKey: string
  phoneNumber: string
  inboundAgentId?: string | null
  outboundAgentId?: string | null
  nickname?: string
}): Promise<RetellPhoneNumberResponse> {
  const { apiKey, phoneNumber, inboundAgentId, outboundAgentId, nickname } = params

  try {
    console.log("[RetellPhoneNumbers] Updating phone number:", phoneNumber)

    const payload: Record<string, unknown> = {}

    // Retell uses null to unassign, undefined to leave unchanged
    if (inboundAgentId !== undefined) {
      payload.inbound_agent_id = inboundAgentId
    }
    if (outboundAgentId !== undefined) {
      payload.outbound_agent_id = outboundAgentId
    }
    if (nickname !== undefined) {
      payload.nickname = nickname
    }

    const response = await fetch(
      `${RETELL_BASE_URL}/v2/update-phone-number/${encodeURIComponent(phoneNumber)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Update error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber = await response.json()
    console.log("[RetellPhoneNumbers] Phone number updated successfully")

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Update exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error updating phone number",
    }
  }
}

// ============================================================================
// DELETE PHONE NUMBER
// ============================================================================

export async function deleteRetellPhoneNumber(params: {
  apiKey: string
  phoneNumber: string
}): Promise<{ success: boolean; error?: string }> {
  const { apiKey, phoneNumber } = params

  try {
    console.log("[RetellPhoneNumbers] Deleting phone number:", phoneNumber)

    const response = await fetch(
      `${RETELL_BASE_URL}/v2/delete-phone-number/${encodeURIComponent(phoneNumber)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Delete error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    console.log("[RetellPhoneNumbers] Phone number deleted successfully")
    return { success: true }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Delete exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting phone number",
    }
  }
}

// ============================================================================
// IMPORT PHONE NUMBER FROM TWILIO
// ============================================================================

export async function importTwilioPhoneNumber(
  params: ImportTwilioNumberParams
): Promise<RetellPhoneNumberResponse> {
  const {
    apiKey,
    phoneNumber,
    twilioAccountSid,
    twilioAuthToken,
    nickname,
    inboundAgentId,
    outboundAgentId,
  } = params

  try {
    console.log("[RetellPhoneNumbers] Importing Twilio phone number:", phoneNumber)

    const payload: Record<string, unknown> = {
      phone_number: phoneNumber,
      telephony_provider: "twilio",
      twilio_account_sid: twilioAccountSid,
      twilio_auth_token: twilioAuthToken,
    }

    if (nickname) payload.nickname = nickname
    if (inboundAgentId) payload.inbound_agent_id = inboundAgentId
    if (outboundAgentId) payload.outbound_agent_id = outboundAgentId

    const response = await fetch(`${RETELL_BASE_URL}/v2/import-phone-number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Import Twilio error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber = await response.json()
    console.log("[RetellPhoneNumbers] Twilio phone number imported:", data.phone_number)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Import Twilio exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error importing Twilio phone number",
    }
  }
}

// ============================================================================
// IMPORT PHONE NUMBER FROM VONAGE
// ============================================================================

export async function importVonagePhoneNumber(
  params: ImportVonageNumberParams
): Promise<RetellPhoneNumberResponse> {
  const {
    apiKey,
    phoneNumber,
    vonageApiKey,
    vonageApiSecret,
    vonageApplicationId,
    vonagePrivateKey,
    nickname,
    inboundAgentId,
    outboundAgentId,
  } = params

  try {
    console.log("[RetellPhoneNumbers] Importing Vonage phone number:", phoneNumber)

    const payload: Record<string, unknown> = {
      phone_number: phoneNumber,
      telephony_provider: "vonage",
      vonage_api_key: vonageApiKey,
      vonage_api_secret: vonageApiSecret,
      vonage_application_id: vonageApplicationId,
      vonage_private_key: vonagePrivateKey,
    }

    if (nickname) payload.nickname = nickname
    if (inboundAgentId) payload.inbound_agent_id = inboundAgentId
    if (outboundAgentId) payload.outbound_agent_id = outboundAgentId

    const response = await fetch(`${RETELL_BASE_URL}/v2/import-phone-number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Import Vonage error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber = await response.json()
    console.log("[RetellPhoneNumbers] Vonage phone number imported:", data.phone_number)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Import Vonage exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error importing Vonage phone number",
    }
  }
}

// ============================================================================
// IMPORT PHONE NUMBER FROM TELNYX
// ============================================================================

export async function importTelnyxPhoneNumber(
  params: ImportTelnyxNumberParams
): Promise<RetellPhoneNumberResponse> {
  const {
    apiKey,
    phoneNumber,
    telnyxApiKey,
    telnyxConnectionId,
    nickname,
    inboundAgentId,
    outboundAgentId,
  } = params

  try {
    console.log("[RetellPhoneNumbers] Importing Telnyx phone number:", phoneNumber)

    const payload: Record<string, unknown> = {
      phone_number: phoneNumber,
      telephony_provider: "telnyx",
      telnyx_api_key: telnyxApiKey,
      telnyx_connection_id: telnyxConnectionId,
    }

    if (nickname) payload.nickname = nickname
    if (inboundAgentId) payload.inbound_agent_id = inboundAgentId
    if (outboundAgentId) payload.outbound_agent_id = outboundAgentId

    const response = await fetch(`${RETELL_BASE_URL}/v2/import-phone-number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Import Telnyx error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber = await response.json()
    console.log("[RetellPhoneNumbers] Telnyx phone number imported:", data.phone_number)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Import Telnyx exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error importing Telnyx phone number",
    }
  }
}

// ============================================================================
// IMPORT BYO SIP PHONE NUMBER
// ============================================================================

export async function importByoSipPhoneNumber(
  params: ImportByoSipNumberParams
): Promise<RetellPhoneNumberResponse> {
  const {
    apiKey,
    phoneNumber,
    terminationUri,
    nickname,
    inboundAgentId,
    outboundAgentId,
  } = params

  try {
    console.log("[RetellPhoneNumbers] Importing BYO SIP phone number:", phoneNumber)

    const payload: Record<string, unknown> = {
      phone_number: phoneNumber,
      telephony_provider: "custom_telephony",
      termination_uri: terminationUri,
    }

    if (nickname) payload.nickname = nickname
    if (inboundAgentId) payload.inbound_agent_id = inboundAgentId
    if (outboundAgentId) payload.outbound_agent_id = outboundAgentId

    const response = await fetch(`${RETELL_BASE_URL}/v2/import-phone-number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellPhoneNumbers] Import BYO SIP error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellPhoneNumber = await response.json()
    console.log("[RetellPhoneNumbers] BYO SIP phone number imported:", data.phone_number)

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellPhoneNumbers] Import BYO SIP exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error importing BYO SIP phone number",
    }
  }
}

// ============================================================================
// ATTACH PHONE NUMBER TO AGENT (Convenience wrapper)
// ============================================================================

/**
 * Attach a phone number to an agent for inbound and/or outbound calls.
 * This is a convenience wrapper around updateRetellPhoneNumber.
 */
export async function attachRetellPhoneNumberToAgent(params: {
  apiKey: string
  phoneNumber: string
  agentId: string
  direction: "inbound" | "outbound" | "both"
}): Promise<RetellPhoneNumberResponse> {
  const { apiKey, phoneNumber, agentId, direction } = params

  console.log(
    `[RetellPhoneNumbers] Attaching phone number ${phoneNumber} to agent ${agentId} (${direction})`
  )

  const updateParams: {
    apiKey: string
    phoneNumber: string
    inboundAgentId?: string | null
    outboundAgentId?: string | null
  } = {
    apiKey,
    phoneNumber,
  }

  if (direction === "inbound" || direction === "both") {
    updateParams.inboundAgentId = agentId
  }
  if (direction === "outbound" || direction === "both") {
    updateParams.outboundAgentId = agentId
  }

  return updateRetellPhoneNumber(updateParams)
}

// ============================================================================
// DETACH PHONE NUMBER FROM AGENT (Convenience wrapper)
// ============================================================================

/**
 * Detach a phone number from an agent.
 * This is a convenience wrapper around updateRetellPhoneNumber.
 */
export async function detachRetellPhoneNumberFromAgent(params: {
  apiKey: string
  phoneNumber: string
  direction: "inbound" | "outbound" | "both"
}): Promise<RetellPhoneNumberResponse> {
  const { apiKey, phoneNumber, direction } = params

  console.log(
    `[RetellPhoneNumbers] Detaching phone number ${phoneNumber} from agent (${direction})`
  )

  const updateParams: {
    apiKey: string
    phoneNumber: string
    inboundAgentId?: string | null
    outboundAgentId?: string | null
  } = {
    apiKey,
    phoneNumber,
  }

  if (direction === "inbound" || direction === "both") {
    updateParams.inboundAgentId = null
  }
  if (direction === "outbound" || direction === "both") {
    updateParams.outboundAgentId = null
  }

  return updateRetellPhoneNumber(updateParams)
}

