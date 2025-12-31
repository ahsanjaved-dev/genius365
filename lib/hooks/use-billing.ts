/**
 * React Query hooks for billing operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/fetcher"

// =============================================================================
// TYPES
// =============================================================================

export interface BillingSubscription {
  planTier: string
  planName: string
  planPrice: number | null
  status: string
  hasActiveSubscription: boolean
  hasStripeCustomer: boolean
  hasStripeSubscription: boolean
}

export interface BillingInfo {
  partner: {
    id: string
    name: string
  }
  subscription: BillingSubscription
  features: Record<string, number>
  features_list: string[]
}

export interface CheckoutResponse {
  sessionId: string
  url: string
}

export interface PortalResponse {
  url: string
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const billingKeys = {
  all: ["billing"] as const,
  info: () => [...billingKeys.all, "info"] as const,
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Get current billing/subscription info
 */
export function useBillingInfo() {
  return useQuery({
    queryKey: billingKeys.info(),
    queryFn: () => apiFetch<BillingInfo>("/api/partner/billing"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Create checkout session mutation
 */
export function useCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plan: "starter" | "professional" | "enterprise") => {
      const response = await fetch("/api/partner/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create checkout session")
      }

      const result = await response.json()
      return result.data as CheckoutResponse
    },
    onSuccess: () => {
      // Invalidate billing info after successful checkout redirect
      queryClient.invalidateQueries({ queryKey: billingKeys.info() })
    },
  })
}

/**
 * Create customer portal session mutation
 */
export function useCustomerPortal() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/partner/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create portal session")
      }

      const result = await response.json()
      return result.data as PortalResponse
    },
  })
}

