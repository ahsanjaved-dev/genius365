/**
 * Campaign Progress Tracking Hook
 * 
 * Provides real-time progress tracking for active campaigns with:
 * - Progress percentage
 * - Estimated time remaining (ETA)
 * - Call rate metrics
 * - Status breakdown
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignProgress {
  /** Total recipients */
  total: number
  /** Completed calls (success + failed) */
  completed: number
  /** Successful/answered calls */
  successful: number
  /** Failed calls */
  failed: number
  /** Pending calls */
  pending: number
  /** Currently calling */
  calling: number
  /** Progress percentage (0-100) */
  progressPercent: number
  /** Estimated seconds remaining (null if unknown) */
  estimatedSecondsRemaining: number | null
  /** Human readable ETA string */
  etaDisplay: string
  /** Calls per minute rate */
  callsPerMinute: number
  /** Success rate percentage */
  successRate: number
  /** Campaign status */
  status: "draft" | "ready" | "scheduled" | "active" | "paused" | "completed" | "cancelled"
}

export interface UseCampaignProgressConfig {
  /** Campaign ID to track */
  campaignId: string
  /** Workspace ID */
  workspaceId?: string
  /** Polling interval in ms (default: 3000) */
  pollingInterval?: number
  /** Only poll when campaign is active (default: true) */
  onlyWhenActive?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function formatETA(seconds: number | null): string {
  if (seconds === null || seconds < 0) {
    return "Calculating..."
  }
  
  if (seconds < 60) {
    return `${seconds}s remaining`
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s remaining`
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m remaining`
}

// ============================================================================
// HOOK
// ============================================================================

export function useCampaignProgress(config: UseCampaignProgressConfig): {
  progress: CampaignProgress | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
} {
  const { campaignId, workspaceId, pollingInterval = 3000, onlyWhenActive = true } = config
  
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string
  
  const [progress, setProgress] = useState<CampaignProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedHistoryRef = useRef<Array<{ time: number; completed: number }>>([])

  const fetchProgress = useCallback(async () => {
    if (!workspaceSlug || !campaignId) return
    
    try {
      const response = await fetch(`/api/w/${workspaceSlug}/campaigns/${campaignId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign: ${response.status}`)
      }
      
      const data = await response.json()
      const campaign = data.data || data
      
      if (!campaign) {
        throw new Error("Campaign not found")
      }
      
      // Calculate metrics
      const total = campaign.total_recipients || 0
      const completed = campaign.completed_calls || 0
      const successful = campaign.successful_calls || 0
      const failed = campaign.failed_calls || 0
      const pending = campaign.pending_calls || 0
      const calling = Math.max(0, total - completed - pending)
      
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0
      const successRate = completed > 0 ? Math.round((successful / completed) * 100) : 0
      
      // Calculate ETA based on recent progress
      let estimatedSecondsRemaining: number | null = null
      let callsPerMinute = 0
      
      if (startTimeRef.current === null && campaign.status === "active") {
        startTimeRef.current = Date.now()
      }
      
      // Track completed count history for rate calculation
      const now = Date.now()
      completedHistoryRef.current.push({ time: now, completed })
      
      // Keep only last 60 seconds of history
      completedHistoryRef.current = completedHistoryRef.current.filter(
        entry => now - entry.time < 60000
      )
      
      // Calculate calls per minute from history
      if (completedHistoryRef.current.length >= 2) {
        const oldest = completedHistoryRef.current[0]!
        const newest = completedHistoryRef.current[completedHistoryRef.current.length - 1]!
        const elapsedMs = newest.time - oldest.time
        const completedInPeriod = newest.completed - oldest.completed
        
        if (elapsedMs > 0 && completedInPeriod > 0) {
          callsPerMinute = Math.round((completedInPeriod / elapsedMs) * 60000 * 10) / 10
          
          // Calculate ETA
          const remaining = pending + calling
          if (remaining > 0 && callsPerMinute > 0) {
            estimatedSecondsRemaining = Math.round((remaining / callsPerMinute) * 60)
          }
        }
      }
      
      const progressData: CampaignProgress = {
        total,
        completed,
        successful,
        failed,
        pending,
        calling,
        progressPercent,
        estimatedSecondsRemaining,
        etaDisplay: formatETA(estimatedSecondsRemaining),
        callsPerMinute,
        successRate,
        status: campaign.status,
      }
      
      setProgress(progressData)
      setError(null)
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [workspaceSlug, campaignId])

  // Initial fetch
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Polling
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Only poll if campaign is active (or onlyWhenActive is false)
    const shouldPoll = !onlyWhenActive || progress?.status === "active"
    
    if (shouldPoll && workspaceSlug && campaignId) {
      intervalRef.current = setInterval(fetchProgress, pollingInterval)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [workspaceSlug, campaignId, pollingInterval, onlyWhenActive, progress?.status, fetchProgress])

  // Reset history when campaign changes
  useEffect(() => {
    startTimeRef.current = null
    completedHistoryRef.current = []
  }, [campaignId])

  return {
    progress,
    isLoading,
    error,
    refetch: fetchProgress,
  }
}

// ============================================================================
// SIMPLE PROGRESS BAR COMPONENT
// ============================================================================

export interface ProgressDisplayProps {
  progress: CampaignProgress
  showEta?: boolean
  showRate?: boolean
  compact?: boolean
}

/**
 * Helper function to get progress display data
 */
export function getProgressDisplayData(progress: CampaignProgress): {
  percentage: number
  label: string
  sublabel: string
  variant: "default" | "success" | "warning" | "destructive"
} {
  const { progressPercent, completed, total, etaDisplay, status, successRate } = progress
  
  let variant: "default" | "success" | "warning" | "destructive" = "default"
  let label = `${progressPercent}%`
  let sublabel = `${completed}/${total} calls`
  
  if (status === "completed") {
    variant = successRate >= 70 ? "success" : successRate >= 40 ? "warning" : "destructive"
    label = "Complete"
    sublabel = `${successRate}% success rate`
  } else if (status === "active") {
    sublabel = etaDisplay
  } else if (status === "paused") {
    variant = "warning"
    label = "Paused"
  } else if (status === "cancelled") {
    variant = "destructive"
    label = "Cancelled"
  }
  
  return { percentage: progressPercent, label, sublabel, variant }
}

