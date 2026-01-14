/**
 * VAPI Batch Calls Client
 * 
 * Handles batch outbound calling via VAPI as a fallback when Inspra fails.
 * Unlike Inspra which has native batch support, VAPI requires individual
 * calls to be made sequentially.
 * 
 * Features:
 * - Sequential call creation with configurable delays
 * - Business hours scheduling (implemented on our side)
 * - Integration with existing campaign infrastructure
 * - Call tracking and status updates
 */

import { createOutboundCall, type VapiCallResponse } from "./calls"
import type { BusinessHoursConfig, DayOfWeek } from "@/types/database.types"

// ============================================================================
// TYPES
// ============================================================================

export interface VapiBatchCallItem {
  phone: string
  recipientId: string
  variables: Record<string, string>
}

export interface VapiBatchConfig {
  apiKey: string
  assistantId: string        // VAPI external_agent_id
  phoneNumberId: string      // VAPI phone number ID for outbound
  workspaceId: string
  campaignId: string
  batchRef: string
  businessHoursConfig?: BusinessHoursConfig | null
  timezone?: string
  delayBetweenCallsMs?: number  // Delay between calls (default: 1000ms)
  skipBusinessHoursCheck?: boolean // Skip business hours check for immediate starts
}

export interface VapiBatchCallResult {
  recipientId: string
  phone: string
  success: boolean
  callId?: string
  error?: string
  status?: string
}

export interface VapiBatchResult {
  success: boolean
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  skippedCalls: number  // Skipped due to business hours
  results: VapiBatchCallResult[]
  error?: string
}

// ============================================================================
// BUSINESS HOURS UTILITIES
// ============================================================================

const DAY_MAP: Record<string, DayOfWeek> = {
  "0": "sunday",
  "1": "monday",
  "2": "tuesday",
  "3": "wednesday",
  "4": "thursday",
  "5": "friday",
  "6": "saturday",
}

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(
  config: BusinessHoursConfig | null | undefined,
  timezone: string = "UTC"
): boolean {
  if (!config || !config.enabled) {
    console.log("[VapiBatch] Business hours not configured or disabled, allowing calls")
    return true // No restrictions, always allowed
  }

  try {
    // Get current time in the specified timezone
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
    
    const formatter = new Intl.DateTimeFormat("en-US", options)
    const parts = formatter.formatToParts(now)
    
    const weekday = parts.find(p => p.type === "weekday")?.value?.toLowerCase()
    const hour = parts.find(p => p.type === "hour")?.value || "00"
    const minute = parts.find(p => p.type === "minute")?.value || "00"
    
    const currentTime = `${hour}:${minute}`
    const dayKey = weekday as DayOfWeek
    
    // Debug logging
    console.log(`[VapiBatch] Business hours check:`)
    console.log(`  - Server time (UTC): ${now.toISOString()}`)
    console.log(`  - Timezone: ${timezone}`)
    console.log(`  - Day in timezone: ${weekday}`)
    console.log(`  - Current time in timezone: ${currentTime}`)
    console.log(`  - Schedule for ${dayKey}:`, JSON.stringify(config.schedule[dayKey] || []))
    
    // Get schedule for current day
    const slots = config.schedule[dayKey] || []
    
    if (slots.length === 0) {
      console.log(`[VapiBatch] No slots for ${dayKey}, blocking calls`)
      return false // No slots for this day means blocked
    }
    
    // Check if current time falls within any slot
    for (const slot of slots) {
      console.log(`  - Checking slot: ${slot.start} - ${slot.end}`)
      if (currentTime >= slot.start && currentTime <= slot.end) {
        console.log(`[VapiBatch] Within business hours (slot: ${slot.start}-${slot.end})`)
        return true
      }
    }
    
    console.log(`[VapiBatch] Current time ${currentTime} not within any slot`)
    return false
  } catch (error) {
    console.error("[VapiBatch] Error checking business hours:", error)
    return true // On error, allow calls
  }
}

/**
 * Get next available business hour window
 * Returns null if no business hours are configured
 */
export function getNextBusinessHourWindow(
  config: BusinessHoursConfig | null | undefined,
  timezone: string = "UTC"
): Date | null {
  if (!config || !config.enabled) {
    return null // No restrictions
  }

  try {
    const now = new Date()
    
    // Check up to 7 days ahead
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        weekday: "long",
      }
      
      const weekday = new Intl.DateTimeFormat("en-US", options)
        .format(checkDate)
        .toLowerCase() as DayOfWeek
      
      const slots = config.schedule[weekday] || []
      
      if (slots.length > 0) {
        // Find first available slot
        const firstSlot = slots.sort((a, b) => a.start.localeCompare(b.start))[0]
        
        if (firstSlot) {
          // Parse start time
          const [hours, minutes] = firstSlot.start.split(":").map(Number)
          
          // Create date in target timezone
          const targetDate = new Date(checkDate)
          targetDate.setHours(hours, minutes, 0, 0)
          
          // If this is today and the time has passed, skip to next slot or day
          if (dayOffset === 0) {
            const currentTime = new Date().toLocaleTimeString("en-US", {
              timeZone: timezone,
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })
            
            if (currentTime > firstSlot.end) {
              continue // Move to next day
            }
            
            if (currentTime >= firstSlot.start) {
              return now // Already in window
            }
          }
          
          return targetDate
        }
      }
    }
    
    return null
  } catch (error) {
    console.error("[VapiBatch] Error calculating next business hour:", error)
    return null
  }
}

// ============================================================================
// VAPI BATCH CALLING
// ============================================================================

/**
 * Create a single outbound call via VAPI with retry logic
 */
async function createSingleCall(
  config: VapiBatchConfig,
  item: VapiBatchCallItem,
  retries: number = 2
): Promise<VapiBatchCallResult> {
  const { apiKey, assistantId, phoneNumberId } = config
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`[VapiBatch] Creating call to ${item.phone} (attempt ${attempt})`)
      
      const result = await createOutboundCall({
        apiKey,
        assistantId,
        phoneNumberId,
        customerNumber: item.phone,
        customerName: `${item.variables.FIRST_NAME || ""} ${item.variables.LAST_NAME || ""}`.trim() || undefined,
      })
      
      if (result.success && result.data) {
        console.log(`[VapiBatch] Call created successfully: ${result.data.id}`)
        return {
          recipientId: item.recipientId,
          phone: item.phone,
          success: true,
          callId: result.data.id,
          status: result.data.status,
        }
      }
      
      // If rate limited, wait and retry
      if (result.error?.includes("429") || result.error?.includes("rate")) {
        console.log(`[VapiBatch] Rate limited, waiting before retry...`)
        await sleep(5000) // Wait 5 seconds on rate limit
        continue
      }
      
      // Other error, don't retry
      return {
        recipientId: item.recipientId,
        phone: item.phone,
        success: false,
        error: result.error || "Unknown error",
      }
    } catch (error) {
      console.error(`[VapiBatch] Exception creating call:`, error)
      
      if (attempt <= retries) {
        await sleep(2000)
        continue
      }
      
      return {
        recipientId: item.recipientId,
        phone: item.phone,
        success: false,
        error: error instanceof Error ? error.message : "Unknown exception",
      }
    }
  }
  
  return {
    recipientId: item.recipientId,
    phone: item.phone,
    success: false,
    error: "Max retries exceeded",
  }
}

/**
 * Process a batch of calls via VAPI
 * 
 * This function creates calls sequentially with delays to respect rate limits.
 * Business hours are checked before each call.
 */
export async function processBatchCalls(
  config: VapiBatchConfig,
  callList: VapiBatchCallItem[]
): Promise<VapiBatchResult> {
  const {
    businessHoursConfig,
    timezone = "UTC",
    delayBetweenCallsMs = 1000,
    skipBusinessHoursCheck = false,
  } = config
  
  console.log(`[VapiBatch] Starting batch: ${config.batchRef}`)
  console.log(`[VapiBatch] Total recipients: ${callList.length}`)
  console.log(`[VapiBatch] Assistant ID: ${config.assistantId}`)
  console.log(`[VapiBatch] Phone Number ID: ${config.phoneNumberId}`)
  console.log(`[VapiBatch] Timezone: ${timezone}`)
  console.log(`[VapiBatch] Skip business hours: ${skipBusinessHoursCheck}`)
  
  const results: VapiBatchCallResult[] = []
  let successfulCalls = 0
  let failedCalls = 0
  let skippedCalls = 0
  
  // Check if we're within business hours (skip if explicitly requested)
  if (!skipBusinessHoursCheck && businessHoursConfig?.enabled) {
    // Debug logging
    const withinHours = isWithinBusinessHours(businessHoursConfig, timezone)
    console.log(`[VapiBatch] Business hours enabled: ${businessHoursConfig.enabled}`)
    console.log(`[VapiBatch] Within business hours: ${withinHours}`)
    
    if (!withinHours) {
      const nextWindow = getNextBusinessHourWindow(businessHoursConfig, timezone)
      console.log(`[VapiBatch] Outside business hours. Next window: ${nextWindow?.toISOString() || "unknown"}`)
      
      return {
        success: false,
        totalCalls: callList.length,
        successfulCalls: 0,
        failedCalls: 0,
        skippedCalls: callList.length,
        results: [],
        error: `Outside business hours. Next available: ${nextWindow?.toISOString() || "Check business hours configuration"}`,
      }
    }
  }
  
  for (let i = 0; i < callList.length; i++) {
    const item = callList[i]
    
    // Re-check business hours periodically (every 10 calls) - only if not skipped
    if (!skipBusinessHoursCheck && i > 0 && i % 10 === 0 && businessHoursConfig?.enabled) {
      if (!isWithinBusinessHours(businessHoursConfig, timezone)) {
        console.log(`[VapiBatch] Business hours ended during batch. Stopping.`)
        skippedCalls = callList.length - i
        break
      }
    }
    
    const result = await createSingleCall(config, item)
    results.push(result)
    
    if (result.success) {
      successfulCalls++
    } else {
      failedCalls++
    }
    
    // Progress logging
    if ((i + 1) % 10 === 0 || i === callList.length - 1) {
      console.log(`[VapiBatch] Progress: ${i + 1}/${callList.length} (${successfulCalls} success, ${failedCalls} failed)`)
    }
    
    // Delay between calls (skip delay for last call)
    if (i < callList.length - 1) {
      await sleep(delayBetweenCallsMs)
    }
  }
  
  console.log(`[VapiBatch] Batch complete: ${config.batchRef}`)
  console.log(`[VapiBatch] Results: ${successfulCalls} success, ${failedCalls} failed, ${skippedCalls} skipped`)
  
  // Build error message if there were failures
  let errorMessage: string | undefined
  if (failedCalls > 0) {
    const failedResults = results.filter(r => !r.success)
    const uniqueErrors = [...new Set(failedResults.map(r => r.error).filter(Boolean))]
    errorMessage = `${failedCalls} call(s) failed: ${uniqueErrors.join("; ")}`
  }
  
  return {
    success: failedCalls === 0 && skippedCalls === 0,
    totalCalls: callList.length,
    successfulCalls,
    failedCalls,
    skippedCalls,
    results,
    error: errorMessage,
  }
}

/**
 * Start a batch of calls immediately via VAPI
 * This is the main entry point for VAPI batch calling
 */
export async function startVapiBatch(
  config: VapiBatchConfig,
  callList: VapiBatchCallItem[]
): Promise<VapiBatchResult> {
  if (callList.length === 0) {
    return {
      success: false,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      skippedCalls: 0,
      results: [],
      error: "No calls in batch",
    }
  }
  
  // Validate configuration
  if (!config.apiKey) {
    return {
      success: false,
      totalCalls: callList.length,
      successfulCalls: 0,
      failedCalls: callList.length,
      skippedCalls: 0,
      results: [],
      error: "VAPI API key not configured",
    }
  }
  
  if (!config.assistantId) {
    return {
      success: false,
      totalCalls: callList.length,
      successfulCalls: 0,
      failedCalls: callList.length,
      skippedCalls: 0,
      results: [],
      error: "VAPI assistant ID not configured",
    }
  }
  
  if (!config.phoneNumberId) {
    return {
      success: false,
      totalCalls: callList.length,
      successfulCalls: 0,
      failedCalls: callList.length,
      skippedCalls: 0,
      results: [],
      error: "VAPI phone number ID not configured",
    }
  }
  
  return processBatchCalls(config, callList)
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

