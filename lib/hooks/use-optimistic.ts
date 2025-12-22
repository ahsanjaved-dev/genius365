"use client"

/**
 * Optimistic Update Utilities
 * Phase 1.3.2: Add optimistic updates for mutations
 *
 * Provides helpers for implementing optimistic updates with React Query.
 */

import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useCallback } from "react"

// ============================================================================
// TYPES
// ============================================================================

interface OptimisticContext<T> {
  previousData: T | undefined
  queryKey: QueryKey
}

interface OptimisticOptions<TData, TVariables> {
  /** Query key to update optimistically */
  queryKey: QueryKey
  /** Function to update the cache optimistically */
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
  /** Whether to invalidate after success (default: true) */
  invalidateOnSuccess?: boolean
  /** Whether to invalidate after error (default: true) */
  invalidateOnError?: boolean
}

// ============================================================================
// HOOK: useOptimisticMutation
// ============================================================================

/**
 * Create optimistic mutation handlers for React Query
 *
 * @example
 * const { mutate } = useMutation({
 *   mutationFn: updateAgent,
 *   ...useOptimisticMutation({
 *     queryKey: ['workspace-agents', workspaceSlug],
 *     updateFn: (oldData, { id, data }) => ({
 *       ...oldData,
 *       data: oldData.data.map(agent =>
 *         agent.id === id ? { ...agent, ...data } : agent
 *       )
 *     })
 *   })
 * })
 */
export function useOptimisticMutation<TData, TVariables>({
  queryKey,
  updateFn,
  invalidateOnSuccess = true,
  invalidateOnError = true,
}: OptimisticOptions<TData, TVariables>) {
  const queryClient = useQueryClient()

  const onMutate = useCallback(
    async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // Optimistically update the cache
      queryClient.setQueryData<TData>(queryKey, (oldData) =>
        updateFn(oldData, variables)
      )

      // Return context with snapshot
      return { previousData, queryKey }
    },
    [queryClient, queryKey, updateFn]
  )

  const onError = useCallback(
    (
      _error: unknown,
      _variables: TVariables,
      context: OptimisticContext<TData> | undefined
    ) => {
      // Roll back to the previous value on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData)
      }

      // Optionally invalidate to refetch
      if (invalidateOnError) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
    [queryClient, queryKey, invalidateOnError]
  )

  const onSuccess = useCallback(() => {
    // Invalidate to ensure we have the latest server data
    if (invalidateOnSuccess) {
      queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient, queryKey, invalidateOnSuccess])

  const onSettled = useCallback(() => {
    // Always invalidate on settled to ensure consistency
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    onMutate,
    onError,
    onSuccess,
    onSettled,
  }
}

// ============================================================================
// HELPER: Optimistic List Operations
// ============================================================================

/**
 * Helper to optimistically add an item to a list
 */
export function optimisticAdd<T extends { id: string }>(
  list: T[] | undefined,
  newItem: T
): T[] {
  return [...(list || []), newItem]
}

/**
 * Helper to optimistically update an item in a list
 */
export function optimisticUpdate<T extends { id: string }>(
  list: T[] | undefined,
  id: string,
  updates: Partial<T>
): T[] {
  return (list || []).map((item) =>
    item.id === id ? { ...item, ...updates } : item
  )
}

/**
 * Helper to optimistically remove an item from a list
 */
export function optimisticRemove<T extends { id: string }>(
  list: T[] | undefined,
  id: string
): T[] {
  return (list || []).filter((item) => item.id !== id)
}

/**
 * Helper for paginated response optimistic updates
 */
export function optimisticPaginatedUpdate<T extends { id: string }>(
  response: { data: T[] } | undefined,
  updateFn: (data: T[]) => T[]
): { data: T[] } | undefined {
  if (!response) return response
  return {
    ...response,
    data: updateFn(response.data),
  }
}

