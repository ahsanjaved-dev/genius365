"use client"

/**
 * Prefetching Utilities
 * Phase 1.3.1: Implement React Query prefetching
 *
 * Provides hooks for prefetching data before navigation.
 */

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import type { AIAgent, PaginatedResponse } from "@/types/database.types"

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Prefetch workspace agents on hover/focus
 */
export function usePrefetchWorkspaceAgents() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    (workspaceSlug: string) => {
      queryClient.prefetchQuery({
        queryKey: ["workspace-agents", workspaceSlug, {}],
        queryFn: async (): Promise<PaginatedResponse<AIAgent>> => {
          const res = await fetch(`/api/w/${workspaceSlug}/agents`)
          if (!res.ok) throw new Error("Failed to prefetch agents")
          const json = await res.json()
          return json.data
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      })
    },
    [queryClient]
  )

  return prefetch
}

/**
 * Prefetch single agent details
 */
export function usePrefetchAgent() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    (workspaceSlug: string, agentId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["workspace-agent", workspaceSlug, agentId],
        queryFn: async (): Promise<AIAgent> => {
          const res = await fetch(`/api/w/${workspaceSlug}/agents/${agentId}`)
          if (!res.ok) throw new Error("Failed to prefetch agent")
          const json = await res.json()
          return json.data
        },
        staleTime: 5 * 60 * 1000,
      })
    },
    [queryClient]
  )

  return prefetch
}

/**
 * Prefetch workspace members
 */
export function usePrefetchWorkspaceMembers() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    (workspaceSlug: string) => {
      queryClient.prefetchQuery({
        queryKey: ["workspace-members", workspaceSlug],
        queryFn: async () => {
          const res = await fetch(`/api/w/${workspaceSlug}/members`)
          if (!res.ok) throw new Error("Failed to prefetch members")
          const json = await res.json()
          return json.data
        },
        staleTime: 5 * 60 * 1000,
      })
    },
    [queryClient]
  )

  return prefetch
}

/**
 * Prefetch workspace stats
 */
export function usePrefetchWorkspaceStats() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    (workspaceSlug: string) => {
      queryClient.prefetchQuery({
        queryKey: ["workspace-stats", workspaceSlug],
        queryFn: async () => {
          const res = await fetch(`/api/w/${workspaceSlug}/stats`)
          if (!res.ok) throw new Error("Failed to prefetch stats")
          const json = await res.json()
          return json.data
        },
        staleTime: 2 * 60 * 1000, // 2 minutes for stats
      })
    },
    [queryClient]
  )

  return prefetch
}

// ============================================================================
// PREFETCH ON HOVER HANDLER
// ============================================================================

/**
 * Create a prefetch handler for onMouseEnter/onFocus
 * Implements debouncing to prevent unnecessary prefetches
 */
export function useDebouncedPrefetch<T extends (...args: unknown[]) => void>(
  prefetchFn: T,
  delay: number = 100
) {
  const timeoutRef = { current: null as NodeJS.Timeout | null }

  const debouncedPrefetch = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        prefetchFn(...args)
      }, delay)
    },
    [prefetchFn, delay]
  )

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return { prefetch: debouncedPrefetch, cancel }
}

// ============================================================================
// LINK WITH PREFETCH COMPONENT HELPER
// ============================================================================

/**
 * Props for creating prefetch handlers on links
 */
export function createPrefetchHandlers(prefetchFn: () => void) {
  return {
    onMouseEnter: prefetchFn,
    onFocus: prefetchFn,
  }
}

