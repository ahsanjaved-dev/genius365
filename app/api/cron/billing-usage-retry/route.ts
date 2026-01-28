/**
 * Cron endpoint to retry pending/failed Stripe usage event submissions
 *
 * This handles the outbox pattern for meter events:
 * - Retries events that failed immediate submission
 * - Respects max retry count
 * - Can be called by Vercel Cron or manually
 *
 * Security: Verify cron secret to prevent unauthorized access
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import {
  retryPendingUsageEvents,
  isMeteredBillingEnabled,
} from "@/lib/stripe/metering"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("[BillingUsageRetry] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if metered billing is enabled
    if (!isMeteredBillingEnabled()) {
      return NextResponse.json({
        success: true,
        message: "Metered billing is not enabled, skipping retry",
        processed: 0,
        succeeded: 0,
        failed: 0,
      })
    }

    logger.info("[BillingUsageRetry] Starting retry of pending usage events")
    const startTime = Date.now()

    // Retry pending events
    const result = await retryPendingUsageEvents()

    const duration = Date.now() - startTime

    logger.info("[BillingUsageRetry] Retry complete", {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      durationMs: duration,
    })

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} events: ${result.succeeded} succeeded, ${result.failed} failed`,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("[BillingUsageRetry] Unexpected error", {
      message: errorMessage,
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check and documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/cron/billing-usage-retry",
    status: isMeteredBillingEnabled() ? "enabled" : "disabled",
    description: "Retries pending/failed Stripe meter event submissions",
    configuration: {
      featureFlag: "ENABLE_STRIPE_METERED_BILLING",
      maxRetries: 5,
      batchSize: 100,
    },
    documentation: {
      authorization: "Bearer {CRON_SECRET} header required",
      method: "POST",
      response: {
        success: "boolean",
        processed: "number of events processed",
        succeeded: "number of events successfully sent",
        failed: "number of events that failed",
        durationMs: "execution time",
        timestamp: "ISO timestamp",
      },
    },
  })
}
