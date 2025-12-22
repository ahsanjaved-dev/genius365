/**
 * ETag Utility
 * Phase 1.2.4: Add ETag support for conditional requests
 *
 * Provides ETag generation and validation for HTTP caching.
 */

import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"

// ============================================================================
// ETAG GENERATION
// ============================================================================

/**
 * Generate an ETag from data
 * Uses MD5 hash of JSON stringified data
 */
export function generateETag(data: unknown): string {
  const content = JSON.stringify(data)
  const hash = createHash("md5").update(content).digest("hex")
  return `"${hash}"`
}

/**
 * Generate a weak ETag (allows semantic equivalence)
 */
export function generateWeakETag(data: unknown): string {
  return `W/${generateETag(data)}`
}

// ============================================================================
// CONDITIONAL REQUEST HANDLING
// ============================================================================

interface ConditionalRequestResult {
  /** Whether the client's cached version is still valid */
  notModified: boolean
  /** The ETag for the current data */
  etag: string
}

/**
 * Check if the request's If-None-Match header matches the ETag
 */
export function checkConditionalRequest(
  request: NextRequest,
  data: unknown
): ConditionalRequestResult {
  const etag = generateETag(data)
  const ifNoneMatch = request.headers.get("If-None-Match")

  // Check if client's cached version matches
  if (ifNoneMatch) {
    // Handle multiple ETags in If-None-Match
    const clientETags = ifNoneMatch.split(",").map((e) => e.trim())
    const notModified = clientETags.some((clientETag) => {
      // Remove weak indicator for comparison
      const normalizedClient = clientETag.replace(/^W\//, "")
      const normalizedServer = etag.replace(/^W\//, "")
      return normalizedClient === normalizedServer || clientETag === "*"
    })

    return { notModified, etag }
  }

  return { notModified: false, etag }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create a 304 Not Modified response
 */
export function notModifiedResponse(etag: string): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: {
      ETag: etag,
      "Cache-Control": "private, must-revalidate",
    },
  })
}

/**
 * Add ETag and caching headers to a response
 */
export function withETag<T>(
  response: NextResponse<T>,
  etag: string,
  options?: {
    maxAge?: number
    isPrivate?: boolean
  }
): NextResponse<T> {
  const { maxAge = 0, isPrivate = true } = options || {}

  response.headers.set("ETag", etag)
  response.headers.set(
    "Cache-Control",
    isPrivate
      ? `private, max-age=${maxAge}, must-revalidate`
      : `public, max-age=${maxAge}, must-revalidate`
  )

  return response
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

type ApiHandler<T> = (request: NextRequest) => Promise<NextResponse<T>>

/**
 * Wrap an API handler with ETag support
 * Automatically handles If-None-Match and adds ETag headers
 *
 * @example
 * export const GET = withETagSupport(async (request) => {
 *   const data = await fetchData()
 *   return NextResponse.json({ data })
 * })
 */
export function withETagSupport<T>(
  handler: ApiHandler<{ data: T }>,
  options?: { maxAge?: number }
): ApiHandler<{ data: T }> {
  return async (request: NextRequest): Promise<NextResponse<{ data: T }>> => {
    // Get the response from the handler
    const response = await handler(request)

    // Only apply ETag to successful JSON responses
    if (response.status !== 200) {
      return response
    }

    try {
      // Clone and parse the response body
      const clonedResponse = response.clone()
      const body = await clonedResponse.json()

      // Generate ETag from response data
      const { notModified, etag } = checkConditionalRequest(request, body.data)

      // Return 304 if not modified
      if (notModified) {
        return notModifiedResponse(etag) as NextResponse<{ data: T }>
      }

      // Add ETag to the original response
      return withETag(response, etag, options)
    } catch {
      // If parsing fails, return the original response
      return response
    }
  }
}

