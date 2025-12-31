/**
 * Stripe Client Configuration
 * Platform Stripe client for managing subscriptions and payments
 */

import Stripe from "stripe"
import { env } from "@/lib/env"

// Validate Stripe is configured
function getStripeClient(): Stripe {
  if (!env.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }

  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2025-12-15.clover",
    typescript: true,
  })
}

// Lazy-loaded Stripe client
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = getStripeClient()
  }
  return _stripe
}

// For direct access (will throw if not configured)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

// =============================================================================
// PRICE ID HELPERS
// =============================================================================

export type PlanTier = "starter" | "professional" | "enterprise"

export function getPriceIdForPlan(tier: PlanTier): string | null {
  switch (tier) {
    case "starter":
      return env.stripePriceStarter || null
    case "professional":
      return env.stripePriceProfessional || null
    case "enterprise":
      return env.stripePriceEnterprise || null
    default:
      return null
  }
}

export function getPlanFromPriceId(priceId: string): PlanTier | null {
  if (priceId === env.stripePriceStarter) return "starter"
  if (priceId === env.stripePriceProfessional) return "professional"
  if (priceId === env.stripePriceEnterprise) return "enterprise"
  return null
}

// =============================================================================
// CUSTOMER HELPERS
// =============================================================================

/**
 * Get or create a Stripe customer for a partner
 */
export async function getOrCreateCustomer(
  partnerId: string,
  email: string,
  name: string,
  existingCustomerId?: string | null
): Promise<Stripe.Customer> {
  const stripeClient = getStripe()

  // If we already have a customer ID, retrieve it
  if (existingCustomerId) {
    try {
      const customer = await stripeClient.customers.retrieve(existingCustomerId)
      if (!customer.deleted) {
        return customer as Stripe.Customer
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  // Create new customer
  return stripeClient.customers.create({
    email,
    name,
    metadata: {
      partner_id: partnerId,
    },
  })
}

// =============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// =============================================================================

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!env.stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
  }

  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    env.stripeWebhookSecret
  )
}

