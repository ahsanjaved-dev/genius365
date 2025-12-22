/**
 * Retry Logic with Exponential Backoff
 * Phase 7.1.2: Add retry logic for transient failures
 *
 * Provides configurable retry mechanisms for external API calls.
 */

// ============================================================================
// TYPES
// ============================================================================

interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Initial delay in ms before first retry */
  initialDelayMs: number
  /** Maximum delay in ms between retries */
  maxDelayMs: number
  /** Backoff multiplier (e.g., 2 for exponential) */
  backoffMultiplier: number
  /** Add random jitter to prevent thundering herd */
  jitter: boolean
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

interface RetryResult<T> {
  success: boolean
  data?: T
  error?: unknown
  attempts: number
  totalTimeMs: number
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: defaultIsRetryable,
}

// ============================================================================
// RETRY FUNCTION
// ============================================================================

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const startTime = Date.now()
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (attempt === opts.maxRetries) {
        break
      }

      if (opts.isRetryable && !opts.isRetryable(error)) {
        break
      }

      // Calculate delay with exponential backoff
      let delayMs = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs
      )

      // Add jitter
      if (opts.jitter) {
        delayMs = delayMs * (0.5 + Math.random())
      }

      // Callback for retry
      if (opts.onRetry) {
        opts.onRetry(attempt + 1, error, delayMs)
      }

      // Wait before retrying
      await sleep(delayMs)
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Execute with retry and return detailed result
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  let attempts = 0

  try {
    const data = await withRetry(fn, {
      ...options,
      onRetry: (attempt, error, delayMs) => {
        attempts = attempt
        options?.onRetry?.(attempt, error, delayMs)
      },
    })
    return {
      success: true,
      data,
      attempts: attempts + 1,
      totalTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error,
      attempts: attempts + 1,
      totalTimeMs: Date.now() - startTime,
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Default function to determine if an error is retryable
 */
function defaultIsRetryable(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true
  }

  // Check for HTTP status codes
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status
    // Retry on server errors (5xx) and rate limiting (429)
    return status >= 500 || status === 429
  }

  // Check error message patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("socket") ||
      message.includes("rate limit")
    )
  }

  return false
}

/**
 * Check if a fetch response should trigger a retry
 */
export function shouldRetryResponse(response: Response): boolean {
  // Retry on server errors and rate limiting
  return response.status >= 500 || response.status === 429
}

/**
 * Get retry delay from response headers
 */
export function getRetryDelayFromResponse(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After")
  if (!retryAfter) return null

  // Can be seconds or HTTP date
  const seconds = parseInt(retryAfter, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter)
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now())
  }

  return null
}

// ============================================================================
// FETCH WITH RETRY
// ============================================================================

/**
 * Fetch with automatic retry logic
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: Partial<RetryOptions>
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init)

      // Throw on retryable status codes to trigger retry
      if (shouldRetryResponse(response)) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & {
          status: number
          response: Response
        }
        error.status = response.status
        error.response = response
        throw error
      }

      return response
    },
    {
      ...retryOptions,
      isRetryable: (error) => {
        // Use custom or default check
        if (retryOptions?.isRetryable) {
          return retryOptions.isRetryable(error)
        }
        return defaultIsRetryable(error)
      },
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[Retry] Attempt ${attempt} for ${url} after ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        )
        retryOptions?.onRetry?.(attempt, error, delayMs)
      },
    }
  )
}

// ============================================================================
// PRE-CONFIGURED RETRY PROFILES
// ============================================================================

export const retryProfiles = {
  /** Quick retries for low-latency operations */
  quick: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryOptions>,

  /** Standard retries for most API calls */
  standard: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryOptions>,

  /** Aggressive retries for critical operations */
  aggressive: {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryOptions>,

  /** Patient retries for background jobs */
  patient: {
    maxRetries: 10,
    initialDelayMs: 5000,
    maxDelayMs: 300000, // 5 minutes
    backoffMultiplier: 1.5,
    jitter: true,
  } as Partial<RetryOptions>,
}

