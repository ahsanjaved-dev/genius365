/**
 * Custom Error Types
 * Phase 3.3.4: Implement consistent error types
 *
 * Provides structured error handling across the application.
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "AppError"

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

/**
 * Validation errors - invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
  }
}

/**
 * Authentication errors - user not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401)
    this.name = "AuthenticationError"
  }
}

/**
 * Authorization errors - user not authorized for action
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message, "AUTHORIZATION_ERROR", 403)
    this.name = "AuthorizationError"
  }
}

/**
 * Not found errors - resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, "NOT_FOUND", 404)
    this.name = "NotFoundError"
  }
}

/**
 * Conflict errors - resource already exists or state conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409)
    this.name = "ConflictError"
  }
}

/**
 * Rate limit errors - too many requests
 */
export class RateLimitError extends AppError {
  constructor(
    retryAfterSeconds: number,
    message: string = "Too many requests. Please try again later."
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, { retryAfterSeconds })
    this.name = "RateLimitError"
  }
}

/**
 * External service errors - third-party API failures
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(`${service} error: ${message}`, "EXTERNAL_SERVICE_ERROR", 502, {
      service,
      ...details,
    })
    this.name = "ExternalServiceError"
  }
}

/**
 * Database errors - database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", 500, details)
    this.name = "DatabaseError"
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(error.message, "UNKNOWN_ERROR", 500, {
      originalName: error.name,
      stack: error.stack,
    })
  }

  return new AppError(
    typeof error === "string" ? error : "An unexpected error occurred",
    "UNKNOWN_ERROR",
    500
  )
}

/**
 * Safe error message for client (hides internal details in production)
 */
export function getClientErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === "production") {
    return "An unexpected error occurred"
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred"
}

