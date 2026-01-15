/**
 * Campaign Polling Hook - Hybrid Real-time + Polling Approach
 * 
 * This hook provides a fallback polling mechanism when Supabase Realtime
 * updates aren't being received (e.g., due to webhook issues).
 * 
 * Strategy:
 * 1. Start with Supabase Realtime as primary
 * 2. If no updates received within threshold, enable polling
 * 3. Polling checks for recipient status changes
 * 4. Disable polling when realtime resumes
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignPollingConfig {
  /** Campaign ID to poll */
  campaignId: string
  /** Workspace ID for API calls */
  workspaceId?: string
  /** Polling interval in ms when active (default: 5000) */
  pollingInterval?: number
  /** Time without realtime updates before enabling polling (default: 30000) */
  realtimeTimeoutMs?: number
  /** Whether polling is enabled (default: true) */
  enabled?: boolean
  /** Callback when polling detects changes */
  onPollUpdate?: (stats: CampaignPollStats) => void
}

export interface CampaignPollStats {
  total: number
  pending: number
  calling: number
  completed: number
  failed: number
  successful: number
  lastUpdated: Date
}

export interface CampaignPollingResult {
  /** Whether polling is currently active */
  isPolling: boolean
  /** Whether realtime is considered healthy */
  realtimeHealthy: boolean
  /** Last poll time */
  lastPollAt: Date | null
  /** Last stats from polling */
  stats: CampaignPollStats | null
  /** Force enable/disable polling */
  setPollingEnabled: (enabled: boolean) => void
  /** Manually trigger a poll */
  pollNow: () => Promise<void>
  /** Report that a realtime update was received (resets timeout) */
  reportRealtimeUpdate: () => void
}

// ============================================================================
// FETCH STATS
// ============================================================================

async function fetchCampaignStats(
  workspaceSlug: string,
  campaignId: string
): Promise<CampaignPollStats | null> {
  try {
    const response = await fetch(
      `/api/w/${workspaceSlug}/campaigns/${campaignId}`
    )
    
    if (!response.ok) {
      console.error("[CampaignPolling] Failed to fetch campaign:", response.status)
      return null
    }
    
    const data = await response.json()
    const campaign = data.data || data
    
    if (!campaign) return null
    
    return {
      total: campaign.total_recipients || 0,
      pending: campaign.pending_calls || 0,
      calling: 0, // Need to count from recipients
      completed: campaign.completed_calls || 0,
      failed: campaign.failed_calls || 0,
      successful: campaign.successful_calls || 0,
      lastUpdated: new Date(),
    }
  } catch (error) {
    console.error("[CampaignPolling] Error fetching stats:", error)
    return null
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useCampaignPolling(config: CampaignPollingConfig): CampaignPollingResult {
  const {
    campaignId,
    workspaceId,
    pollingInterval = 5000,
    realtimeTimeoutMs = 30000,
    enabled = true,
    onPollUpdate,
  } = config

  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string
  const queryClient = useQueryClient()

  const [isPolling, setIsPolling] = useState(false)
  const [realtimeHealthy, setRealtimeHealthy] = useState(true)
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null)
  const [stats, setStats] = useState<CampaignPollStats | null>(null)
  const [manualPollingEnabled, setManualPollingEnabled] = useState<boolean | null>(null)

  // Track last realtime update time
  const lastRealtimeUpdateRef = useRef<Date>(new Date())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Determine if polling should be active
  const shouldPoll = enabled && 
    (manualPollingEnabled === true || (manualPollingEnabled === null && !realtimeHealthy))

  // Report realtime update
  const reportRealtimeUpdate = useCallback(() => {
    lastRealtimeUpdateRef.current = new Date()
    setRealtimeHealthy(true)
    
    // If we were polling due to realtime timeout, we can stop
    if (manualPollingEnabled === null) {
      setIsPolling(false)
    }
  }, [manualPollingEnabled])

  // Perform a poll
  const pollNow = useCallback(async () => {
    if (!workspaceSlug || !campaignId) return
    
    console.log("[CampaignPolling] Polling campaign stats...")
    const newStats = await fetchCampaignStats(workspaceSlug, campaignId)
    
    if (newStats) {
      setStats(newStats)
      setLastPollAt(new Date())
      
      // Notify callback
      if (onPollUpdate) {
        onPollUpdate(newStats)
      }
      
      // Invalidate React Query cache
      queryClient.invalidateQueries({
        queryKey: ["campaign", workspaceSlug, campaignId],
      })
      queryClient.invalidateQueries({
        queryKey: ["campaign-recipients", workspaceSlug, campaignId],
      })
    }
  }, [workspaceSlug, campaignId, queryClient, onPollUpdate])

  // Check realtime health
  useEffect(() => {
    if (!enabled) return

    // Periodically check if realtime is healthy
    realtimeCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastRealtimeUpdateRef.current.getTime()
      const isHealthy = timeSinceLastUpdate < realtimeTimeoutMs
      
      if (!isHealthy && realtimeHealthy) {
        console.log("[CampaignPolling] Realtime timeout, enabling polling fallback")
        setRealtimeHealthy(false)
      }
    }, 5000) // Check every 5 seconds

    return () => {
      if (realtimeCheckIntervalRef.current) {
        clearInterval(realtimeCheckIntervalRef.current)
      }
    }
  }, [enabled, realtimeTimeoutMs, realtimeHealthy])

  // Polling loop
  useEffect(() => {
    if (!shouldPoll || !workspaceSlug || !campaignId) {
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setIsPolling(false)
      return
    }

    console.log("[CampaignPolling] Starting polling with interval:", pollingInterval)
    setIsPolling(true)

    // Initial poll
    pollNow()

    // Set up polling interval
    pollingIntervalRef.current = setInterval(pollNow, pollingInterval)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [shouldPoll, workspaceSlug, campaignId, pollingInterval, pollNow])

  // Manual enable/disable
  const setPollingEnabled = useCallback((enabled: boolean) => {
    setManualPollingEnabled(enabled)
    if (!enabled && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsPolling(false)
    }
  }, [])

  return {
    isPolling,
    realtimeHealthy,
    lastPollAt,
    stats,
    setPollingEnabled,
    pollNow,
    reportRealtimeUpdate,
  }
}

// ============================================================================
// COMBINED HOOK - Realtime + Polling
// ============================================================================

import { useRealtimeCampaignRecipients } from "./use-realtime-campaign"

export interface CampaignHybridConfig {
  campaignId: string
  workspaceId?: string
  /** Enable polling fallback (default: true) */
  enablePollingFallback?: boolean
  /** Polling interval when active (default: 5000) */
  pollingInterval?: number
  /** Callbacks */
  onRecipientUpdate?: (recipient: any) => void
  onCallComplete?: (recipient: any) => void
  onCallFailed?: (recipient: any) => void
  onStatsUpdate?: (stats: any) => void
}

/**
 * Combined hook that uses Supabase Realtime with polling fallback
 */
export function useCampaignHybridUpdates(config: CampaignHybridConfig) {
  const {
    campaignId,
    workspaceId,
    enablePollingFallback = true,
    pollingInterval = 5000,
    onRecipientUpdate,
    onCallComplete,
    onCallFailed,
    onStatsUpdate,
  } = config

  // Realtime hook
  const realtime = useRealtimeCampaignRecipients({
    campaignId,
    workspaceId,
    onRecipientUpdate: (recipient) => {
      // Report to polling hook that realtime is working
      polling.reportRealtimeUpdate()
      onRecipientUpdate?.(recipient)
    },
    onCallComplete,
    onCallFailed,
    onStatsUpdate,
  })

  // Polling hook (fallback)
  const polling = useCampaignPolling({
    campaignId,
    workspaceId,
    enabled: enablePollingFallback,
    pollingInterval,
    onPollUpdate: (stats) => {
      // If polling detects changes, notify via onStatsUpdate
      onStatsUpdate?.({
        total: stats.total,
        pending: stats.pending,
        calling: stats.calling,
        completed: stats.completed,
        failed: stats.failed,
        successful: stats.successful,
      })
    },
  })

  return {
    // Realtime status
    isRealtimeConnected: realtime.isConnected,
    realtimeError: realtime.error,
    recentUpdates: realtime.recentUpdates,
    realtimeStats: realtime.stats,
    recipientStatuses: realtime.recipientStatuses,
    
    // Polling status
    isPolling: polling.isPolling,
    realtimeHealthy: polling.realtimeHealthy,
    lastPollAt: polling.lastPollAt,
    pollingStats: polling.stats,
    
    // Combined status
    connectionStatus: realtime.isConnected 
      ? (polling.realtimeHealthy ? "healthy" : "degraded") 
      : "disconnected",
    
    // Actions
    pollNow: polling.pollNow,
    setPollingEnabled: polling.setPollingEnabled,
  }
}

