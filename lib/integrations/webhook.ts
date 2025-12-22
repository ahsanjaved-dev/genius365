/**
 * Webhook Verification & Processing
 * Phase 7.1.3: Implement webhook signature verification
 *
 * Provides secure webhook handling for VAPI, Retell, Stripe, etc.
 */

import crypto from "crypto"

// ============================================================================
// TYPES
// ============================================================================

interface WebhookVerificationResult {
  valid: boolean
  error?: string
}

interface WebhookPayload {
  type: string
  data: unknown
  timestamp?: number
  signature?: string
}

interface ProcessedWebhook<T = unknown> {
  id: string
  type: string
  data: T
  receivedAt: Date
  source: string
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify HMAC-SHA256 signature
 */
export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha512" = "sha256"
): WebhookVerificationResult {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest("hex")

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, "hex")
    const expectedBuffer = Buffer.from(expectedSignature, "hex")

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: "Signature length mismatch" }
    }

    const valid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    return { valid, error: valid ? undefined : "Signature mismatch" }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    }
  }
}

/**
 * Verify Stripe webhook signature
 * Stripe uses a specific format: t=timestamp,v1=signature
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): WebhookVerificationResult {
  try {
    // Parse signature header
    const elements = signatureHeader.split(",")
    const signatureMap: Record<string, string> = {}

    for (const element of elements) {
      const [key, value] = element.split("=")
      if (key && value) {
        signatureMap[key] = value
      }
    }

    const timestamp = signatureMap["t"]
    const signature = signatureMap["v1"]

    if (!timestamp || !signature) {
      return { valid: false, error: "Invalid signature format" }
    }

    // Check timestamp tolerance
    const timestampMs = parseInt(timestamp, 10) * 1000
    const now = Date.now()
    if (Math.abs(now - timestampMs) > toleranceSeconds * 1000) {
      return { valid: false, error: "Timestamp out of tolerance" }
    }

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex")

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    )

    return { valid, error: valid ? undefined : "Signature mismatch" }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    }
  }
}

/**
 * Verify VAPI webhook signature
 * VAPI uses HMAC-SHA256 in the x-vapi-signature header
 */
export function verifyVapiSignature(
  payload: string,
  signature: string,
  secret: string
): WebhookVerificationResult {
  // VAPI signatures may be prefixed with algorithm identifier
  const cleanSignature = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature

  return verifyHmacSignature(payload, cleanSignature, secret)
}

/**
 * Verify Retell webhook signature
 */
export function verifyRetellSignature(
  payload: string,
  signature: string,
  secret: string
): WebhookVerificationResult {
  return verifyHmacSignature(payload, signature, secret)
}

// ============================================================================
// IDEMPOTENCY
// ============================================================================

// In-memory store for processed webhook IDs (use Redis in production)
const processedWebhooks = new Map<string, number>()

// Cleanup old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
    for (const [id, timestamp] of processedWebhooks.entries()) {
      if (timestamp < cutoff) {
        processedWebhooks.delete(id)
      }
    }
  }, 60 * 60 * 1000) // Every hour
}

/**
 * Check if a webhook has already been processed (idempotency)
 */
export function isWebhookProcessed(webhookId: string): boolean {
  return processedWebhooks.has(webhookId)
}

/**
 * Mark a webhook as processed
 */
export function markWebhookProcessed(webhookId: string): void {
  processedWebhooks.set(webhookId, Date.now())
}

/**
 * Process webhook with idempotency check
 */
export async function processWebhookIdempotently<T>(
  webhookId: string,
  processor: () => Promise<T>
): Promise<{ processed: boolean; result?: T; duplicate?: boolean }> {
  if (isWebhookProcessed(webhookId)) {
    return { processed: false, duplicate: true }
  }

  try {
    const result = await processor()
    markWebhookProcessed(webhookId)
    return { processed: true, result }
  } catch (error) {
    // Don't mark as processed on error to allow retry
    throw error
  }
}

// ============================================================================
// WEBHOOK LOGGING
// ============================================================================

interface WebhookLogEntry {
  id: string
  source: string
  type: string
  receivedAt: Date
  verified: boolean
  processed: boolean
  error?: string
  processingTimeMs?: number
}

const webhookLog: WebhookLogEntry[] = []
const MAX_LOG_SIZE = 1000

/**
 * Log a webhook event
 */
export function logWebhook(entry: WebhookLogEntry): void {
  webhookLog.unshift(entry)
  if (webhookLog.length > MAX_LOG_SIZE) {
    webhookLog.pop()
  }
}

/**
 * Get recent webhook logs
 */
export function getWebhookLogs(limit: number = 100): WebhookLogEntry[] {
  return webhookLog.slice(0, limit)
}

/**
 * Get webhook logs by source
 */
export function getWebhookLogsBySource(source: string, limit: number = 100): WebhookLogEntry[] {
  return webhookLog.filter((entry) => entry.source === source).slice(0, limit)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a webhook ID from payload if not provided
 */
export function generateWebhookId(payload: unknown): string {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload) + Date.now())
    .digest("hex")
  return hash.slice(0, 16)
}

/**
 * Extract webhook ID from common webhook formats
 */
export function extractWebhookId(payload: Record<string, unknown>): string | null {
  // Common webhook ID field names
  const idFields = ["id", "event_id", "eventId", "webhook_id", "message_id", "uuid"]

  for (const field of idFields) {
    if (typeof payload[field] === "string") {
      return payload[field]
    }
  }

  return null
}

/**
 * Parse and validate webhook payload
 */
export function parseWebhookPayload<T>(
  rawBody: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(rawBody) as T
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse JSON",
    }
  }
}

