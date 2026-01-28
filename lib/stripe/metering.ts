/**
 * Stripe Metering Module
 * 
 * Handles Stripe Billing Meters for usage-based billing on Connect accounts.
 * - Ensures meters exist on Connect accounts
 * - Submits meter events for billable usage
 * - Uses outbox pattern for reliability
 */

import { prisma } from "@/lib/prisma"
import { getStripe, getConnectAccountId } from "./index"
import { env } from "@/lib/env"
import type Stripe from "stripe"

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_METER_EVENT_NAME = "voice_call_minutes"
export const DEFAULT_METER_DISPLAY_NAME = "Voice Call Minutes"

// Feature flag
export function isMeteredBillingEnabled(): boolean {
  return env.enableStripeMeteredBilling
}

// =============================================================================
// TYPES
// =============================================================================

export interface MeterInfo {
  id: string
  eventName: string
  displayName: string
}

export interface MeterEventSubmission {
  workspaceId: string
  conversationId: string
  minutes: number
  stripeCustomerId: string
  stripeAccountId: string
  eventTimestamp: Date
}

export interface MeterEventResult {
  success: boolean
  stripeEventId?: string
  error?: string
}

// =============================================================================
// METER MANAGEMENT
// =============================================================================

/**
 * Ensure a billing meter exists on a Connect account.
 * Creates the meter if it doesn't exist.
 * 
 * Note: Stripe billing meters are created per-account. Each partner's Connect
 * account needs its own meter for usage tracking.
 */
export async function ensureMeterExists(
  connectAccountId: string,
  eventName: string = DEFAULT_METER_EVENT_NAME,
  displayName: string = DEFAULT_METER_DISPLAY_NAME
): Promise<MeterInfo> {
  const stripe = getStripe()

  try {
    // List existing meters to check if one already exists
    const meters = await stripe.billing.meters.list(
      { limit: 100 },
      { stripeAccount: connectAccountId }
    )

    // Check if meter with this event name already exists
    const existingMeter = meters.data.find(
      (m) => m.event_name === eventName && m.status === "active"
    )

    if (existingMeter) {
      console.log(
        `[Metering] Meter already exists on Connect account ${connectAccountId}: ${existingMeter.id}`
      )
      return {
        id: existingMeter.id,
        eventName: existingMeter.event_name,
        displayName: existingMeter.display_name,
      }
    }

    // Create new meter
    const meter = await stripe.billing.meters.create(
      {
        event_name: eventName,
        display_name: displayName,
        default_aggregation: {
          formula: "sum",
        },
        customer_mapping: {
          type: "by_id",
          event_payload_key: "stripe_customer_id",
        },
        value_settings: {
          event_payload_key: "value",
        },
      },
      { stripeAccount: connectAccountId }
    )

    console.log(
      `[Metering] Created new meter on Connect account ${connectAccountId}: ${meter.id}`
    )

    return {
      id: meter.id,
      eventName: meter.event_name,
      displayName: meter.display_name,
    }
  } catch (error) {
    console.error(
      `[Metering] Failed to ensure meter exists on Connect account ${connectAccountId}:`,
      error
    )
    throw error
  }
}

/**
 * Get or create meter for a partner's Connect account.
 * Caches meter info in partner settings for efficiency.
 */
export async function getOrCreateMeterForPartner(partnerId: string): Promise<MeterInfo | null> {
  if (!prisma) throw new Error("Database not configured")

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { settings: true },
  })

  if (!partner) {
    throw new Error("Partner not found")
  }

  const connectAccountId = getConnectAccountId(partner.settings as Record<string, unknown>)
  if (!connectAccountId) {
    console.log(`[Metering] Partner ${partnerId} has no Connect account, skipping meter creation`)
    return null
  }

  // Check if we have cached meter info
  const settings = partner.settings as Record<string, unknown>
  const cachedMeterId = settings.stripe_meter_id as string | undefined
  const cachedMeterEventName = settings.stripe_meter_event_name as string | undefined

  if (cachedMeterId && cachedMeterEventName) {
    return {
      id: cachedMeterId,
      eventName: cachedMeterEventName,
      displayName: DEFAULT_METER_DISPLAY_NAME,
    }
  }

  // Create meter and cache it
  const meterInfo = await ensureMeterExists(connectAccountId)

  // Update partner settings with meter info
  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      settings: {
        ...settings,
        stripe_meter_id: meterInfo.id,
        stripe_meter_event_name: meterInfo.eventName,
      },
    },
  })

  return meterInfo
}

// =============================================================================
// METER EVENT SUBMISSION
// =============================================================================

/**
 * Submit a meter event to Stripe.
 * This is the low-level function that actually calls the Stripe API.
 */
export async function submitMeterEvent(
  submission: MeterEventSubmission,
  eventName: string = DEFAULT_METER_EVENT_NAME
): Promise<MeterEventResult> {
  const stripe = getStripe()

  try {
    // Create meter event on the Connect account
    const meterEvent = await stripe.billing.meterEvents.create(
      {
        event_name: eventName,
        payload: {
          value: String(submission.minutes),
          stripe_customer_id: submission.stripeCustomerId,
        },
        timestamp: Math.floor(submission.eventTimestamp.getTime() / 1000),
        identifier: submission.conversationId, // For idempotency
      },
      { stripeAccount: submission.stripeAccountId }
    )

    console.log(
      `[Metering] Submitted meter event for workspace ${submission.workspaceId}: ` +
        `${submission.minutes} minutes, event_id=${meterEvent.identifier}`
    )

    return {
      success: true,
      stripeEventId: meterEvent.identifier,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(
      `[Metering] Failed to submit meter event for workspace ${submission.workspaceId}:`,
      error
    )
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// =============================================================================
// OUTBOX PATTERN: ENQUEUE & PROCESS
// =============================================================================

/**
 * Enqueue a usage event for Stripe submission (outbox pattern).
 * Creates a StripeUsageEvent record and attempts immediate submission.
 * If submission fails, the event will be retried by the cron job.
 */
export async function enqueueUsageEvent(
  workspaceId: string,
  conversationId: string,
  minutes: number,
  stripeCustomerId: string,
  stripeAccountId: string,
  eventTimestamp: Date
): Promise<{ eventId: string; submitted: boolean; error?: string }> {
  if (!prisma) throw new Error("Database not configured")

  // Create the outbox record
  const usageEvent = await prisma.stripeUsageEvent.create({
    data: {
      workspaceId,
      conversationId,
      minutes,
      stripeCustomerId,
      stripeAccountId,
      eventTimestamp,
      status: "pending",
    },
  })

  // Attempt immediate submission
  const result = await submitMeterEvent(
    {
      workspaceId,
      conversationId,
      minutes,
      stripeCustomerId,
      stripeAccountId,
      eventTimestamp,
    },
    DEFAULT_METER_EVENT_NAME
  )

  // Update the event status
  if (result.success) {
    await prisma.stripeUsageEvent.update({
      where: { id: usageEvent.id },
      data: {
        status: "sent",
        stripeEventId: result.stripeEventId,
      },
    })
  } else {
    await prisma.stripeUsageEvent.update({
      where: { id: usageEvent.id },
      data: {
        status: "failed",
        errorMessage: result.error,
        retryCount: { increment: 1 },
      },
    })
  }

  return {
    eventId: usageEvent.id,
    submitted: result.success,
    error: result.error,
  }
}

/**
 * Retry failed/pending usage events.
 * Called by the cron job to handle transient failures.
 */
export async function retryPendingUsageEvents(
  maxRetries: number = 5,
  batchSize: number = 100
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!prisma) throw new Error("Database not configured")

  // Get pending and failed events that haven't exceeded max retries
  const events = await prisma.stripeUsageEvent.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      retryCount: { lt: maxRetries },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  })

  let succeeded = 0
  let failed = 0

  for (const event of events) {
    if (!event.stripeCustomerId || !event.stripeAccountId) {
      // Mark as failed if missing required data
      await prisma.stripeUsageEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          errorMessage: "Missing stripeCustomerId or stripeAccountId",
        },
      })
      failed++
      continue
    }

    const result = await submitMeterEvent(
      {
        workspaceId: event.workspaceId,
        conversationId: event.conversationId || event.id,
        minutes: event.minutes,
        stripeCustomerId: event.stripeCustomerId,
        stripeAccountId: event.stripeAccountId,
        eventTimestamp: event.eventTimestamp,
      },
      DEFAULT_METER_EVENT_NAME
    )

    if (result.success) {
      await prisma.stripeUsageEvent.update({
        where: { id: event.id },
        data: {
          status: "sent",
          stripeEventId: result.stripeEventId,
        },
      })
      succeeded++
    } else {
      const newRetryCount = event.retryCount + 1
      await prisma.stripeUsageEvent.update({
        where: { id: event.id },
        data: {
          status: newRetryCount >= maxRetries ? "failed" : "pending",
          errorMessage: result.error,
          retryCount: newRetryCount,
        },
      })
      failed++
    }
  }

  console.log(
    `[Metering] Retry batch complete: ${events.length} processed, ${succeeded} succeeded, ${failed} failed`
  )

  return {
    processed: events.length,
    succeeded,
    failed,
  }
}

// =============================================================================
// METERED PRICE CREATION
// =============================================================================

/**
 * Create a metered usage price for overage billing.
 * This price is attached to a meter and bills based on usage events.
 */
export async function createMeteredUsagePrice(
  connectAccountId: string,
  productId: string,
  unitAmountCents: number,
  meterId: string
): Promise<Stripe.Price> {
  const stripe = getStripe()

  const price = await stripe.prices.create(
    {
      product: productId,
      currency: "usd",
      billing_scheme: "per_unit",
      unit_amount: unitAmountCents,
      recurring: {
        interval: "month",
        usage_type: "metered",
        meter: meterId,
      },
      metadata: {
        type: "usage_overage",
      },
    },
    { stripeAccount: connectAccountId }
  )

  console.log(
    `[Metering] Created metered price ${price.id} for product ${productId} ` +
      `at $${(unitAmountCents / 100).toFixed(2)}/minute on Connect account ${connectAccountId}`
  )

  return price
}

// =============================================================================
// WORKSPACE CUSTOMER MANAGEMENT
// =============================================================================

/**
 * Ensure a workspace has a Stripe customer on the partner's Connect account.
 * Creates the customer if it doesn't exist.
 */
export async function ensureWorkspaceStripeCustomer(
  workspaceId: string
): Promise<{ customerId: string; connectAccountId: string } | null> {
  if (!prisma) throw new Error("Database not configured")

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      stripeCustomerId: true,
      partner: {
        select: {
          id: true,
          settings: true,
        },
      },
    },
  })

  if (!workspace) {
    throw new Error("Workspace not found")
  }

  const connectAccountId = getConnectAccountId(
    workspace.partner.settings as Record<string, unknown>
  )

  if (!connectAccountId) {
    console.log(
      `[Metering] Partner ${workspace.partner.id} has no Connect account, cannot create workspace customer`
    )
    return null
  }

  // Return existing customer if we have one
  if (workspace.stripeCustomerId) {
    return {
      customerId: workspace.stripeCustomerId,
      connectAccountId,
    }
  }

  // Create new customer on Connect account
  const stripe = getStripe()
  const customer = await stripe.customers.create(
    {
      name: workspace.name,
      metadata: {
        workspace_id: workspace.id,
        workspace_slug: workspace.slug,
        partner_id: workspace.partner.id,
      },
    },
    { stripeAccount: connectAccountId }
  )

  // Save customer ID to workspace
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { stripeCustomerId: customer.id },
  })

  console.log(
    `[Metering] Created Stripe customer ${customer.id} for workspace ${workspaceId} ` +
      `on Connect account ${connectAccountId}`
  )

  return {
    customerId: customer.id,
    connectAccountId,
  }
}

// =============================================================================
// CUSTOMER BALANCE (CREDITS)
// =============================================================================

/**
 * Add credits to a workspace's Stripe customer balance.
 * Credits are stored as negative balance (credit to customer).
 */
export async function addCustomerBalanceCredits(
  workspaceId: string,
  amountCents: number,
  description: string,
  metadata?: Record<string, string>
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  if (!prisma) throw new Error("Database not configured")

  const customerInfo = await ensureWorkspaceStripeCustomer(workspaceId)
  if (!customerInfo) {
    return {
      success: false,
      error: "No Connect account configured for partner",
    }
  }

  const stripe = getStripe()

  try {
    // Create a customer balance transaction (negative amount = credit)
    const transaction = await stripe.customers.createBalanceTransaction(
      customerInfo.customerId,
      {
        amount: -amountCents, // Negative = credit to customer
        currency: "usd",
        description,
        metadata: metadata || {},
      },
      { stripeAccount: customerInfo.connectAccountId }
    )

    // Get updated customer to return new balance
    const customer = await stripe.customers.retrieve(
      customerInfo.customerId,
      { stripeAccount: customerInfo.connectAccountId }
    )

    const newBalance = (customer as Stripe.Customer).balance || 0

    console.log(
      `[Metering] Added $${(amountCents / 100).toFixed(2)} credit to workspace ${workspaceId}, ` +
        `new balance: $${(Math.abs(newBalance) / 100).toFixed(2)}`
    )

    return {
      success: true,
      newBalance: Math.abs(newBalance), // Return as positive number
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[Metering] Failed to add customer balance credits:`, error)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Get a workspace's Stripe customer balance (credits).
 */
export async function getCustomerBalance(
  workspaceId: string
): Promise<{ balanceCents: number } | null> {
  if (!prisma) throw new Error("Database not configured")

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      stripeCustomerId: true,
      partner: {
        select: {
          settings: true,
        },
      },
    },
  })

  if (!workspace?.stripeCustomerId) {
    return null
  }

  const connectAccountId = getConnectAccountId(
    workspace.partner.settings as Record<string, unknown>
  )

  if (!connectAccountId) {
    return null
  }

  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(
    workspace.stripeCustomerId,
    { stripeAccount: connectAccountId }
  )

  // Stripe balance is negative for credit, positive for amount owed
  const balance = (customer as Stripe.Customer).balance || 0
  return { balanceCents: Math.abs(balance) }
}
