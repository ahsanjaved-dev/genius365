/**
 * Hook for checking and managing webhook URL status
 * 
 * This hook helps diagnose why production campaigns aren't updating UI
 * by checking if agents have correctly configured webhook URLs.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"

// ============================================================================
// TYPES
// ============================================================================

export interface AgentWebhookStatus {
  id: string
  name: string
  externalAgentId: string | null
  syncStatus: string
  lastSyncAt: string | null
  currentWebhookUrl: string | null
  expectedWebhookUrl: string
  webhookMatch: boolean
  status: "ok" | "mismatch" | "not_synced" | "unknown"
  error?: string
}

export interface WebhookStatusDiagnostics {
  currentAppUrl: string
  isProduction: boolean
  expectedWebhookUrl: string
  hasVapiKey: boolean
  commonIssues: string[]
}

export interface WebhookStatusSummary {
  total: number
  synced: number
  needsResync: number
  notSynced: number
  webhookMismatch: number
  ok: number
}

export interface WebhookStatusResponse {
  workspace: {
    id: string
    slug: string
  }
  diagnostics: WebhookStatusDiagnostics
  agents: AgentWebhookStatus[]
  summary: WebhookStatusSummary
}

export interface ResyncResult {
  agentId: string
  agentName: string
  status: "resynced" | "skipped" | "failed"
  previousUrl?: string
  newUrl?: string
  error?: string
}

export interface ResyncResponse {
  success: boolean
  message: string
  expectedWebhookUrl: string
  currentAppUrl: string
  resynced: number
  skipped: number
  failed: number
  results: ResyncResult[]
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Check webhook status for all VAPI agents in the workspace
 */
export function useWebhookStatus(options?: { enabled?: boolean }) {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string

  return useQuery<WebhookStatusResponse>({
    queryKey: ["webhook-status", workspaceSlug],
    queryFn: async () => {
      const response = await fetch(`/api/w/${workspaceSlug}/agents/webhook-status`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(error.error || "Failed to check webhook status")
      }
      
      const data = await response.json()
      return data.data || data
    },
    enabled: !!workspaceSlug && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Check if any agents have webhook URL mismatches
 */
export function useHasWebhookIssues(): boolean {
  const { data } = useWebhookStatus({ enabled: true })
  return (data?.summary?.webhookMismatch ?? 0) > 0
}

/**
 * Resync webhook URLs for agents
 */
export function useResyncWebhooks() {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string
  const queryClient = useQueryClient()

  return useMutation<ResyncResponse, Error, { agentIds?: string[]; force?: boolean }>({
    mutationFn: async ({ agentIds, force }) => {
      const response = await fetch(`/api/w/${workspaceSlug}/agents/resync-webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds, force }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(error.error || "Failed to resync webhooks")
      }

      const data = await response.json()
      return data.data || data
    },
    onSuccess: () => {
      // Invalidate webhook status query to refresh data
      queryClient.invalidateQueries({ queryKey: ["webhook-status", workspaceSlug] })
      // Also invalidate agents query
      queryClient.invalidateQueries({ queryKey: ["agents", workspaceSlug] })
    },
  })
}

/**
 * Get a simple webhook health indicator
 * Returns: "healthy" | "issues" | "loading" | "error"
 */
export function useWebhookHealthIndicator(): {
  status: "healthy" | "issues" | "loading" | "error"
  issueCount: number
  message: string
} {
  const { data, isLoading, isError, error } = useWebhookStatus()

  if (isLoading) {
    return {
      status: "loading",
      issueCount: 0,
      message: "Checking webhook configuration...",
    }
  }

  if (isError) {
    return {
      status: "error",
      issueCount: 0,
      message: error?.message || "Failed to check webhook status",
    }
  }

  const issues = data?.summary?.webhookMismatch ?? 0
  const commonIssues = data?.diagnostics?.commonIssues ?? []

  if (issues > 0 || commonIssues.length > 0) {
    const issueMessages = [
      ...commonIssues,
      issues > 0 ? `${issues} agent(s) have outdated webhook URLs` : "",
    ].filter(Boolean)

    return {
      status: "issues",
      issueCount: issues,
      message: issueMessages[0] || "Webhook configuration issues detected",
    }
  }

  return {
    status: "healthy",
    issueCount: 0,
    message: "All webhook URLs are correctly configured",
  }
}

