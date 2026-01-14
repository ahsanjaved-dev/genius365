/**
 * Campaign Provider - Unified Interface for Outbound Calling
 * 
 * This module provides a unified interface for campaign outbound calling
 * with automatic fallback from Inspra to VAPI when the primary fails.
 * 
 * Flow:
 * 1. Try Inspra API first (primary provider)
 * 2. If Inspra fails, automatically fallback to VAPI
 * 3. Return combined result with provider used
 */

import {
  loadJsonBatch,
  pauseBatch,
  terminateBatch,
  queueTestCall,
  buildLoadJsonPayload,
  convertBusinessHoursToBlockRules,
  type InspraLoadJsonPayload,
  type InspraBatchPayload,
  type InspraTestCallPayload,
  type InspraApiResponse,
  type CampaignData,
  type RecipientData,
} from "./inspra/client"

import {
  startVapiBatch,
  isWithinBusinessHours,
  getNextBusinessHourWindow,
  type VapiBatchConfig,
  type VapiBatchCallItem,
  type VapiBatchResult,
} from "./vapi/batch-calls"

import type { BusinessHoursConfig } from "@/types/database.types"

// ============================================================================
// TYPES
// ============================================================================

export type CampaignProvider = "inspra" | "vapi"

export interface CampaignProviderConfig {
  // Inspra config (primary)
  inspra?: {
    enabled: boolean
  }
  // VAPI config (fallback)
  vapi?: {
    apiKey: string
    phoneNumberId: string  // VAPI phone number ID for outbound calls
  }
}

export interface CampaignBatchResult {
  success: boolean
  provider: CampaignProvider
  error?: string
  batchRef?: string
  recipientCount?: number
  // VAPI-specific results
  vapiResults?: VapiBatchResult
  // Additional context
  fallbackUsed?: boolean
  primaryError?: string
}

export interface CampaignTestCallResult {
  success: boolean
  provider: CampaignProvider
  error?: string
  fallbackUsed?: boolean
  primaryError?: string
}

// ============================================================================
// INSPRA CONFIGURATION CHECK
// ============================================================================

const INSPRA_API_URL = process.env.INSPRA_OUTBOUND_API_URL
const INSPRA_API_KEY = process.env.INSPRA_API_KEY

function isInspraConfigured(): boolean {
  // Check if Inspra is configured and not pointing to webhook.site
  return !!(
    INSPRA_API_URL &&
    !INSPRA_API_URL.includes("webhook.site") &&
    INSPRA_API_URL.length > 0
  )
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Start a campaign batch with automatic fallback
 * 
 * @param campaign - Campaign data
 * @param recipients - List of recipients
 * @param vapiConfig - VAPI configuration for fallback
 * @param options - Additional options
 */
export async function startCampaignBatch(
  campaign: CampaignData,
  recipients: RecipientData[],
  vapiConfig: CampaignProviderConfig["vapi"],
  options: { startNow?: boolean } = {}
): Promise<CampaignBatchResult> {
  const { startNow = false } = options
  const batchRef = `campaign-${campaign.id}`
  
  console.log(`[CampaignProvider] Starting batch: ${batchRef}`)
  console.log(`[CampaignProvider] Recipients: ${recipients.length}`)
  console.log(`[CampaignProvider] Inspra configured: ${isInspraConfigured()}`)
  console.log(`[CampaignProvider] VAPI fallback available: ${!!vapiConfig?.apiKey}`)
  
  // =========================================================================
  // TRY INSPRA FIRST (Primary Provider)
  // =========================================================================
  
  if (isInspraConfigured()) {
    console.log(`[CampaignProvider] Attempting Inspra API...`)
    
    try {
      const inspraPayload = buildLoadJsonPayload(campaign, recipients, { startNow })
      const inspraResult = await loadJsonBatch(inspraPayload)
      
      if (inspraResult.success) {
        console.log(`[CampaignProvider] Inspra success!`)
        return {
          success: true,
          provider: "inspra",
          batchRef,
          recipientCount: recipients.length,
        }
      }
      
      // Inspra failed - log error and try fallback
      console.error(`[CampaignProvider] Inspra failed:`, inspraResult.error)
      
      // If VAPI fallback is not available, return Inspra error
      if (!vapiConfig?.apiKey) {
        return {
          success: false,
          provider: "inspra",
          error: inspraResult.error || "Inspra API error",
          batchRef,
        }
      }
      
      // Try VAPI fallback
      console.log(`[CampaignProvider] Falling back to VAPI...`)
      const vapiResult = await executeVapiBatch(campaign, recipients, vapiConfig, startNow)
      
      return {
        ...vapiResult,
        fallbackUsed: true,
        primaryError: inspraResult.error || "Inspra API error",
      }
    } catch (error) {
      console.error(`[CampaignProvider] Inspra exception:`, error)
      
      // If VAPI fallback is not available, return error
      if (!vapiConfig?.apiKey) {
        return {
          success: false,
          provider: "inspra",
          error: error instanceof Error ? error.message : "Unknown error",
          batchRef,
        }
      }
      
      // Try VAPI fallback
      console.log(`[CampaignProvider] Falling back to VAPI after exception...`)
      const vapiResult = await executeVapiBatch(campaign, recipients, vapiConfig, startNow)
      
      return {
        ...vapiResult,
        fallbackUsed: true,
        primaryError: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
  
  // =========================================================================
  // VAPI ONLY (Inspra not configured)
  // =========================================================================
  
  if (vapiConfig?.apiKey) {
    console.log(`[CampaignProvider] Using VAPI (Inspra not configured)`)
    return executeVapiBatch(campaign, recipients, vapiConfig, startNow)
  }
  
  // =========================================================================
  // NO PROVIDER AVAILABLE
  // =========================================================================
  
  return {
    success: false,
    provider: "inspra",
    error: "No outbound calling provider configured. Configure Inspra or VAPI.",
    batchRef,
  }
}

/**
 * Execute batch via VAPI
 */
async function executeVapiBatch(
  campaign: CampaignData,
  recipients: RecipientData[],
  vapiConfig: NonNullable<CampaignProviderConfig["vapi"]>,
  startNow: boolean
): Promise<CampaignBatchResult> {
  const batchRef = `campaign-${campaign.id}`
  
  // Check if we should start now based on schedule
  if (!startNow && campaign.schedule_type === "scheduled" && campaign.scheduled_start_at) {
    const scheduledTime = new Date(campaign.scheduled_start_at)
    if (scheduledTime > new Date()) {
      console.log(`[CampaignProvider] VAPI batch scheduled for: ${campaign.scheduled_start_at}`)
      return {
        success: true,
        provider: "vapi",
        batchRef,
        recipientCount: recipients.length,
        // Note: Actual scheduling would need a cron job or scheduled task
        // For now, we return success and expect the cron to pick it up
      }
    }
  }
  
  // Build VAPI batch config
  const vapiBatchConfig: VapiBatchConfig = {
    apiKey: vapiConfig.apiKey,
    assistantId: campaign.agent.external_agent_id,
    phoneNumberId: vapiConfig.phoneNumberId,
    workspaceId: campaign.workspace_id,
    campaignId: campaign.id,
    batchRef,
    businessHoursConfig: campaign.business_hours_config,
    timezone: campaign.timezone,
    delayBetweenCallsMs: 1500, // 1.5 second delay between calls
    // Skip business hours check when user explicitly clicks "Start Now"
    skipBusinessHoursCheck: startNow,
  }
  
  // Convert recipients to VAPI format
  // Use actual recipient ID from database for tracking, fallback to index-based ID
  const callList: VapiBatchCallItem[] = recipients.map((r, index) => ({
    phone: r.phone_number,
    recipientId: r.id || `${batchRef}-${index}`,
    variables: {
      FIRST_NAME: r.first_name || "",
      LAST_NAME: r.last_name || "",
      EMAIL: r.email || "",
      COMPANY_NAME: r.company || "",
      REASON_FOR_CALL: r.reason_for_call || "",
      ADDRESS: r.address_line_1 || "",
      ADDRESS_LINE_2: r.address_line_2 || "",
      CITY: r.suburb || "",
      STATE: r.state || "",
      POST_CODE: r.post_code || "",
      COUNTRY: r.country || "",
    },
  }))
  
  // Execute batch
  const result = await startVapiBatch(vapiBatchConfig, callList)
  
  return {
    success: result.success,
    provider: "vapi",
    error: result.error,
    batchRef,
    recipientCount: recipients.length,
    vapiResults: result,
  }
}

// ============================================================================
// PAUSE OPERATION
// ============================================================================

/**
 * Pause a campaign batch
 * 
 * Note: VAPI doesn't have native batch pause - we track state locally
 */
export async function pauseCampaignBatch(
  workspaceId: string,
  agentId: string,
  campaignId: string,
  vapiConfig?: CampaignProviderConfig["vapi"]
): Promise<CampaignBatchResult> {
  const batchRef = `campaign-${campaignId}`
  
  // Try Inspra first
  if (isInspraConfigured()) {
    console.log(`[CampaignProvider] Pausing via Inspra: ${batchRef}`)
    
    const payload: InspraBatchPayload = {
      workspaceId,
      agentId,
      batchRef,
    }
    
    const result = await pauseBatch(payload)
    
    return {
      success: result.success,
      provider: "inspra",
      error: result.error,
      batchRef,
    }
  }
  
  // VAPI doesn't have native pause - just return success
  // The campaign status in DB controls whether we continue making calls
  console.log(`[CampaignProvider] VAPI pause (state-based): ${batchRef}`)
  
  return {
    success: true,
    provider: "vapi",
    batchRef,
  }
}

// ============================================================================
// TERMINATE OPERATION
// ============================================================================

/**
 * Terminate a campaign batch
 */
export async function terminateCampaignBatch(
  workspaceId: string,
  agentId: string,
  campaignId: string,
  vapiConfig?: CampaignProviderConfig["vapi"]
): Promise<CampaignBatchResult> {
  const batchRef = `campaign-${campaignId}`
  
  // Try Inspra first
  if (isInspraConfigured()) {
    console.log(`[CampaignProvider] Terminating via Inspra: ${batchRef}`)
    
    const payload: InspraBatchPayload = {
      workspaceId,
      agentId,
      batchRef,
    }
    
    const result = await terminateBatch(payload)
    
    return {
      success: result.success,
      provider: "inspra",
      error: result.error,
      batchRef,
    }
  }
  
  // VAPI doesn't have native terminate - just return success
  // The campaign status in DB controls whether we continue making calls
  console.log(`[CampaignProvider] VAPI terminate (state-based): ${batchRef}`)
  
  return {
    success: true,
    provider: "vapi",
    batchRef,
  }
}

// ============================================================================
// TEST CALL OPERATION
// ============================================================================

/**
 * Make a test call with automatic fallback
 */
export async function makeTestCall(
  campaign: CampaignData,
  phoneNumber: string,
  variables: Record<string, string>,
  vapiConfig?: CampaignProviderConfig["vapi"]
): Promise<CampaignTestCallResult> {
  // Try Inspra first
  if (isInspraConfigured()) {
    console.log(`[CampaignProvider] Test call via Inspra to: ${phoneNumber}`)
    
    const now = new Date()
    const exp = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const payload: InspraTestCallPayload = {
      agentId: campaign.agent.external_agent_id,
      workspaceId: campaign.workspace_id,
      batchRef: `test-${campaign.id}-${Date.now()}`,
      cli: campaign.cli,
      nbf: now.toISOString(),
      exp: exp.toISOString(),
      blockRules: convertBusinessHoursToBlockRules(campaign.business_hours_config),
      phone: phoneNumber,
      variables,
    }
    
    const result = await queueTestCall(payload)
    
    if (result.success) {
      return {
        success: true,
        provider: "inspra",
      }
    }
    
    // Inspra failed - try VAPI fallback
    if (vapiConfig?.apiKey) {
      console.log(`[CampaignProvider] Test call fallback to VAPI`)
      const vapiResult = await executeVapiTestCall(campaign, phoneNumber, variables, vapiConfig)
      
      return {
        ...vapiResult,
        fallbackUsed: true,
        primaryError: result.error || "Inspra test call failed",
      }
    }
    
    return {
      success: false,
      provider: "inspra",
      error: result.error || "Inspra test call failed",
    }
  }
  
  // VAPI only
  if (vapiConfig?.apiKey) {
    console.log(`[CampaignProvider] Test call via VAPI to: ${phoneNumber}`)
    return executeVapiTestCall(campaign, phoneNumber, variables, vapiConfig)
  }
  
  return {
    success: false,
    provider: "inspra",
    error: "No outbound calling provider configured",
  }
}

/**
 * Execute test call via VAPI
 */
async function executeVapiTestCall(
  campaign: CampaignData,
  phoneNumber: string,
  variables: Record<string, string>,
  vapiConfig: NonNullable<CampaignProviderConfig["vapi"]>
): Promise<CampaignTestCallResult> {
  const { createOutboundCall } = await import("./vapi/calls")
  
  const result = await createOutboundCall({
    apiKey: vapiConfig.apiKey,
    assistantId: campaign.agent.external_agent_id,
    phoneNumberId: vapiConfig.phoneNumberId,
    customerNumber: phoneNumber,
    customerName: `${variables.FIRST_NAME || ""} ${variables.LAST_NAME || ""}`.trim() || undefined,
  })
  
  return {
    success: result.success,
    provider: "vapi",
    error: result.error,
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  isWithinBusinessHours,
  getNextBusinessHourWindow,
  isInspraConfigured,
  buildLoadJsonPayload,
  convertBusinessHoursToBlockRules,
}

