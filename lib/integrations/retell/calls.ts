/**
 * Retell Calls API
 * Handles fetching call details from Retell API
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const RETELL_BASE_URL = "https://api.retellai.com"

// ============================================================================
// TYPES
// ============================================================================

export interface RetellCallCost {
  product_costs: Array<{
    product: string
    unit_price?: number
    cost: number
  }>
  total_duration_seconds: number
  total_duration_unit_price: number
  combined_cost: number // in cents
}

export interface RetellCallAnalysis {
  call_summary?: string
  in_voicemail?: boolean
  user_sentiment?: "Negative" | "Positive" | "Neutral" | "Unknown"
  call_successful?: boolean
  custom_analysis_data?: Record<string, unknown>
}

export interface RetellUtterance {
  role: "agent" | "user" | "transfer_target"
  content: string
  words?: Array<{
    word: string
    start: number
    end: number
  }>
}

export interface RetellCallDetails {
  call_id: string
  agent_id: string
  agent_name?: string
  agent_version?: number
  call_type: "web_call" | "phone_call"
  call_status: "registered" | "not_connected" | "ongoing" | "ended" | "error"
  start_timestamp?: number // milliseconds since epoch
  end_timestamp?: number // milliseconds since epoch
  duration_ms?: number
  transcript?: string
  transcript_object?: RetellUtterance[]
  recording_url?: string
  public_log_url?: string
  disconnection_reason?: string
  call_analysis?: RetellCallAnalysis
  call_cost?: RetellCallCost
  metadata?: Record<string, unknown>
  // Phone call specific
  from_number?: string
  to_number?: string
  direction?: "inbound" | "outbound"
}

export interface RetellCallResponse {
  success: boolean
  data?: RetellCallDetails
  error?: string
}

// ============================================================================
// GET CALL DETAILS
// ============================================================================

export async function getRetellCallDetails(params: {
  apiKey: string
  callId: string
}): Promise<RetellCallResponse> {
  const { apiKey, callId } = params

  try {
    console.log("[RetellCalls] Fetching call details:", callId)

    const response = await fetch(`${RETELL_BASE_URL}/v2/get-call/${callId}`, {
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
      console.error("[RetellCalls] Get call error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellCallDetails = await response.json()
    console.log("[RetellCalls] Call details retrieved:", {
      callId: data.call_id,
      status: data.call_status,
      durationMs: data.duration_ms,
      hasTranscript: !!data.transcript,
      hasCost: !!data.call_cost,
    })

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellCalls] Get call exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error fetching call details",
    }
  }
}

// ============================================================================
// POLL FOR CALL COMPLETION
// Retell calls may not have all data immediately after ending
// ============================================================================

export async function pollRetellCallUntilReady(params: {
  apiKey: string
  callId: string
  maxAttempts?: number
  delayMs?: number
}): Promise<RetellCallResponse> {
  const { apiKey, callId, maxAttempts = 10, delayMs = 2000 } = params

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[RetellCalls] Poll attempt ${attempt}/${maxAttempts} for call:`, callId)

    const result = await getRetellCallDetails({ apiKey, callId })

    if (!result.success) {
      // If it's a not found or similar error, keep retrying
      if (attempt < maxAttempts) {
        await sleep(delayMs)
        continue
      }
      return result
    }

    const call = result.data!

    // Check if call has ended and has the data we need
    if (call.call_status === "ended" && call.duration_ms !== undefined) {
      // Transcript might take a moment to be available
      if (call.transcript !== undefined || call.transcript_object !== undefined) {
        console.log("[RetellCalls] Call data ready after", attempt, "attempts")
        return result
      }
    }

    // If call is still ongoing or data not ready, wait and retry
    if (attempt < maxAttempts) {
      await sleep(delayMs)
    }
  }

  // Return last result even if not fully ready
  console.warn("[RetellCalls] Max attempts reached, returning partial data")
  return await getRetellCallDetails({ apiKey, callId })
}

// ============================================================================
// LIST CALLS (for backfill/reconciliation)
// ============================================================================

export interface RetellListCallsParams {
  apiKey: string
  agentId?: string
  startTimestamp?: number
  endTimestamp?: number
  callStatus?: ("registered" | "not_connected" | "ongoing" | "ended" | "error")[]
  limit?: number
  paginationKey?: string
}

export interface RetellListCallsResponse {
  success: boolean
  data?: RetellCallDetails[]
  error?: string
}

export async function listRetellCalls(params: RetellListCallsParams): Promise<RetellListCallsResponse> {
  const { apiKey, agentId, startTimestamp, endTimestamp, callStatus, limit = 50, paginationKey } = params

  try {
    const filterCriteria: Record<string, unknown> = {}

    if (agentId) {
      filterCriteria.agent_id = [agentId]
    }
    if (callStatus) {
      filterCriteria.call_status = callStatus
    }
    if (startTimestamp || endTimestamp) {
      filterCriteria.start_timestamp = {
        ...(startTimestamp && { lower_threshold: startTimestamp }),
        ...(endTimestamp && { upper_threshold: endTimestamp }),
      }
    }

    const body: Record<string, unknown> = {
      filter_criteria: filterCriteria,
      sort_order: "descending",
      limit,
    }

    if (paginationKey) {
      body.pagination_key = paginationKey
    }

    const response = await fetch(`${RETELL_BASE_URL}/v2/list-calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` }
      }
      console.error("[RetellCalls] List calls error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data: RetellCallDetails[] = await response.json()
    console.log("[RetellCalls] Listed", data.length, "calls")

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("[RetellCalls] List calls exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error listing calls",
    }
  }
}

// ============================================================================
// CREATE OUTBOUND PHONE CALL
// ============================================================================

export interface CreateOutboundCallParams {
  apiKey: string
  /** The phone number to call (E.164 format, e.g., +14155551234) */
  toNumber: string
  /** The phone number to call from (must be imported in Retell) */
  fromNumber: string
  /** 
   * Either agentId OR overrideAgentId must be provided.
   * Use agentId if the from_number has an outbound_agent_id already assigned.
   * Use overrideAgentId to specify a different agent for this call.
   */
  agentId?: string
  overrideAgentId?: string
  /** Optional metadata to attach to the call */
  metadata?: Record<string, unknown>
  /** Max call duration in ms (default: 3600000 = 1 hour) */
  retellLlmDynamicVariables?: Record<string, unknown>
  /** Drop call if machine detected */
  dropIfMachineDetected?: boolean
}

export interface CreateOutboundCallResponse {
  success: boolean
  data?: {
    call_id: string
    agent_id: string
    call_type: "phone_call"
    call_status: string
    from_number: string
    to_number: string
    direction: "outbound"
    metadata?: Record<string, unknown>
  }
  error?: string
}

/**
 * Create an outbound phone call via Retell API
 * @see https://docs.retellai.com/api-references/create-phone-call
 */
export async function createRetellOutboundCall(
  params: CreateOutboundCallParams
): Promise<CreateOutboundCallResponse> {
  const {
    apiKey,
    toNumber,
    fromNumber,
    agentId,
    overrideAgentId,
    metadata,
    retellLlmDynamicVariables,
    dropIfMachineDetected,
  } = params

  try {
    console.log("[RetellCalls] Creating outbound call:", { 
      to: toNumber, 
      from: fromNumber, 
      agentId: overrideAgentId || agentId 
    })

    const payload: Record<string, unknown> = {
      to_number: toNumber,
      from_number: fromNumber,
    }

    // Use override_agent_id to specify the agent for this call
    // This is the recommended approach when you want to use a specific agent
    if (overrideAgentId) {
      payload.override_agent_id = overrideAgentId
    }

    if (metadata) {
      payload.metadata = metadata
    }

    if (retellLlmDynamicVariables) {
      payload.retell_llm_dynamic_variables = retellLlmDynamicVariables
    }

    if (dropIfMachineDetected !== undefined) {
      payload.drop_if_machine_detected = dropIfMachineDetected
    }

    const response = await fetch(`${RETELL_BASE_URL}/v2/create-phone-call`, {
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
      console.error("[RetellCalls] Create outbound call error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data = await response.json()
    console.log("[RetellCalls] Outbound call created successfully:", data.call_id)

    return {
      success: true,
      data: {
        call_id: data.call_id,
        agent_id: data.agent_id,
        call_type: "phone_call",
        call_status: data.call_status || "registered",
        from_number: data.from_number,
        to_number: data.to_number,
        direction: "outbound",
        metadata: data.metadata,
      },
    }
  } catch (error) {
    console.error("[RetellCalls] Create outbound call exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating outbound call",
    }
  }
}

// ============================================================================
// REGISTER INBOUND PHONE CALL (for SIP integration)
// ============================================================================

export interface RegisterPhoneCallParams {
  apiKey: string
  /** The Retell agent ID to handle this call */
  agentId: string
  /** The phone number the call is coming from */
  fromNumber: string
  /** The phone number being called (your number) */
  toNumber: string
  /** Direction of the call */
  direction?: "inbound" | "outbound"
  /** Optional metadata */
  metadata?: Record<string, unknown>
  /** Dynamic variables for the LLM */
  retellLlmDynamicVariables?: Record<string, unknown>
}

export interface RegisterPhoneCallResponse {
  success: boolean
  data?: {
    call_id: string
    agent_id: string
    call_type: "phone_call"
    call_status: string
    from_number: string
    to_number: string
    direction: "inbound" | "outbound"
    sip_endpoint?: string
    metadata?: Record<string, unknown>
  }
  error?: string
}

/**
 * Register an inbound phone call with Retell for SIP integration
 * This is used when handling inbound calls from your own SIP provider.
 * After registering, you get a SIP endpoint to forward the call to.
 * 
 * @see https://docs.retellai.com/api-references/register-phone-call
 */
export async function registerRetellPhoneCall(
  params: RegisterPhoneCallParams
): Promise<RegisterPhoneCallResponse> {
  const {
    apiKey,
    agentId,
    fromNumber,
    toNumber,
    direction = "inbound",
    metadata,
    retellLlmDynamicVariables,
  } = params

  try {
    console.log("[RetellCalls] Registering phone call:", { 
      agentId, 
      from: fromNumber, 
      to: toNumber,
      direction 
    })

    const payload: Record<string, unknown> = {
      agent_id: agentId,
      from_number: fromNumber,
      to_number: toNumber,
      direction,
    }

    if (metadata) {
      payload.metadata = metadata
    }

    if (retellLlmDynamicVariables) {
      payload.retell_llm_dynamic_variables = retellLlmDynamicVariables
    }

    const response = await fetch(`${RETELL_BASE_URL}/v2/register-phone-call`, {
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
      console.error("[RetellCalls] Register phone call error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    const data = await response.json()
    console.log("[RetellCalls] Phone call registered successfully:", data.call_id)

    return {
      success: true,
      data: {
        call_id: data.call_id,
        agent_id: data.agent_id,
        call_type: "phone_call",
        call_status: data.call_status || "registered",
        from_number: data.from_number,
        to_number: data.to_number,
        direction: data.direction || direction,
        sip_endpoint: data.sip_endpoint,
        metadata: data.metadata,
      },
    }
  } catch (error) {
    console.error("[RetellCalls] Register phone call exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error registering phone call",
    }
  }
}

// ============================================================================
// END CALL
// ============================================================================

export interface EndCallResponse {
  success: boolean
  error?: string
}

/**
 * End an ongoing call
 * @see https://docs.retellai.com/api-references/end-call
 */
export async function endRetellCall(params: {
  apiKey: string
  callId: string
}): Promise<EndCallResponse> {
  const { apiKey, callId } = params

  try {
    console.log("[RetellCalls] Ending call:", callId)

    const response = await fetch(`${RETELL_BASE_URL}/v2/end-call/${callId}`, {
      method: "POST",
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
      console.error("[RetellCalls] End call error:", response.status, errorData)
      return {
        success: false,
        error: (errorData.message as string) || `Retell API error: ${response.status}`,
      }
    }

    console.log("[RetellCalls] Call ended successfully")
    return { success: true }
  } catch (error) {
    console.error("[RetellCalls] End call exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error ending call",
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// MAPPER: Retell Call → Conversation DB Record
// ============================================================================

export interface ConversationInsertData {
  external_id: string
  workspace_id: string
  agent_id: string
  direction: "inbound" | "outbound"
  status: "initiated" | "ringing" | "in_progress" | "completed" | "failed" | "no_answer" | "busy" | "canceled"
  duration_seconds: number
  total_cost: number
  cost_breakdown: Record<string, unknown>
  transcript: string | null
  recording_url: string | null
  started_at: string | null
  ended_at: string | null
  phone_number: string | null
  caller_name: string | null
  sentiment: string | null
  summary: string | null
  metadata: Record<string, unknown>
}

export function mapRetellCallToConversation(
  call: RetellCallDetails,
  workspaceId: string,
  agentId: string
): ConversationInsertData {
  // Map Retell status to our status enum
  const statusMap: Record<string, ConversationInsertData["status"]> = {
    registered: "initiated",
    not_connected: "failed",
    ongoing: "in_progress",
    ended: "completed",
    error: "failed",
  }

  // Map disconnection reason to status
  let status = statusMap[call.call_status] || "completed"
  if (call.disconnection_reason === "dial_no_answer") {
    status = "no_answer"
  } else if (call.disconnection_reason === "dial_busy") {
    status = "busy"
  } else if (call.disconnection_reason?.startsWith("error_")) {
    status = "failed"
  }

  // Convert cost from cents to dollars
  const totalCostDollars = call.call_cost ? call.call_cost.combined_cost / 100 : 0

  // Map sentiment
  const sentimentMap: Record<string, string> = {
    Positive: "positive",
    Negative: "negative",
    Neutral: "neutral",
    Unknown: "neutral",
  }
  const sentiment = call.call_analysis?.user_sentiment
    ? sentimentMap[call.call_analysis.user_sentiment] || "neutral"
    : null

  // Retell sometimes provides transcript only as `transcript_object`.
  // Build a readable transcript string as a fallback so we persist it in Postgres.
  const transcriptText = (() => {
    if (typeof call.transcript === "string" && call.transcript.trim().length > 0) {
      return call.transcript
    }
    if (Array.isArray(call.transcript_object) && call.transcript_object.length > 0) {
      return call.transcript_object
        .map((u) => {
          const role = u.role ? `${u.role}: ` : ""
          const content = typeof u.content === "string" ? u.content : ""
          return `${role}${content}`.trim()
        })
        .filter(Boolean)
        .join("\n")
    }
    return null
  })()

  return {
    external_id: call.call_id,
    workspace_id: workspaceId,
    agent_id: agentId,
    direction: call.direction || "outbound", // web calls default to outbound
    status,
    duration_seconds: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
    total_cost: totalCostDollars,
    cost_breakdown: { ...(call.call_cost || {}) },
    transcript: transcriptText,
    recording_url: call.recording_url || null,
    started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : null,
    ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
    phone_number: call.from_number || call.to_number || null,
    caller_name: null, // Not available from Retell
    sentiment,
    summary: call.call_analysis?.call_summary || null,
    metadata: {
      provider: "retell",
      call_type: call.call_type,
      agent_version: call.agent_version,
      disconnection_reason: call.disconnection_reason,
      public_log_url: call.public_log_url,
      retell_metadata: call.metadata,
    },
  }
}

