/**
 * API Error Handler
 * Phase 5.1.3: Implement API error handling middleware
 *
 * Provides centralized error handling for API routes.
 */

import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  isAppError,
  toAppError,
} from "@/lib/errors"
import { logger } from "@/lib/logger"
import { getRateLimitHeaders } from "@/lib/rate-limit"

// ============================================================================
// TYPES
// ============================================================================

interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

type ApiHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse>

// ============================================================================
// ERROR RESPONSE BUILDER
// ============================================================================

function buildErrorResponse(error: AppError): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === "development" && error.details
        ? { details: error.details }
        : {}),
    },
  }

  const headers: Record<string, string> = {}

  // Add rate limit headers if applicable
  if (error instanceof RateLimitError && error.details?.retryAfterSeconds) {
    headers["Retry-After"] = String(error.details.retryAfterSeconds)
  }

  return NextResponse.json(body, {
    status: error.statusCode,
    headers,
  })
}

// ============================================================================
// ERROR CONVERSION
// ============================================================================

function convertToAppError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error
  }

  // Zod validation error
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0]
    return new ValidationError(
      firstIssue?.message || "Validation failed",
      {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      }
    )
  }

  // Generic Error
  if (error instanceof Error) {
    // Check for specific error patterns
    const message = error.message.toLowerCase()

    if (message.includes("unauthorized") || message.includes("not authenticated")) {
      return new AuthenticationError()
    }

    if (message.includes("forbidden") || message.includes("permission")) {
      return new AuthorizationError()
    }
  }

  // Unknown error
  return toAppError(error)
}

// ============================================================================
// ERROR HANDLER WRAPPER
// ============================================================================

/**
 * Wrap an API handler with error handling
 * Catches all errors and returns appropriate responses
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: unknown) => {
    try {
      return await handler(request, context)
    } catch (error) {
      const appError = convertToAppError(error)

      // Log the error
      logger.error("API error", {
        path: request.nextUrl.pathname,
        method: request.method,
        code: appError.code,
        message: appError.message,
        statusCode: appError.statusCode,
        ...(appError.details || {}),
      })

      // Return error response
      return buildErrorResponse(appError)
    }
  }
}

// ============================================================================
// SUCCESS RESPONSE BUILDER
// ============================================================================

interface SuccessResponseOptions {
  status?: number
  headers?: Record<string, string>
}

/**
 * Build a successful API response
 */
export function successResponse<T>(
  data: T,
  options: SuccessResponseOptions = {}
): NextResponse {
  const { status = 200, headers = {} } = options

  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status, headers }
  )
}

/**
 * Build a paginated API response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
  }
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
      hasMore: pagination.page * pagination.pageSize < pagination.total,
    },
  })
}

/**
 * Build an empty success response (204 No Content)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

