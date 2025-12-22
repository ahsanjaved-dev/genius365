/**
 * Structured Logger
 * Phase 5.2.2: Implement structured logging
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output for production
 * - Pretty output for development
 * - Context attachment
 */

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLogLevel = (process.env.LOG_LEVEL as LogLevel) || "info"
const isProduction = process.env.NODE_ENV === "production"

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
}

function formatMessage(entry: LogEntry): string {
  if (isProduction) {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify(entry)
  }

  // Pretty format for development
  const timestamp = new Date(entry.timestamp).toLocaleTimeString()
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m", // Green
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
  }
  const reset = "\x1b[0m"
  const color = levelColors[entry.level]

  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${timestamp} - ${entry.message}`

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`
  }

  return output
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  }

  const formatted = formatMessage(entry)

  switch (level) {
    case "debug":
    case "info":
      console.log(formatted)
      break
    case "warn":
      console.warn(formatted)
      break
    case "error":
      console.error(formatted)
      break
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),

  /**
   * Create a child logger with attached context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log("info", message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) =>
      log("error", message, { ...baseContext, ...context }),
  }),

  /**
   * Log an error with stack trace
   */
  exception: (error: Error, context?: LogContext) => {
    log("error", error.message, {
      ...context,
      name: error.name,
      stack: error.stack,
    })
  },

  /**
   * Time a function execution
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now()
    try {
      const result = await fn()
      log("debug", `${label} completed`, { durationMs: Date.now() - start })
      return result
    } catch (error) {
      log("error", `${label} failed`, { durationMs: Date.now() - start })
      throw error
    }
  },
}

// ============================================================================
// REQUEST LOGGER
// ============================================================================

/**
 * Create a request-scoped logger with request ID
 */
export function createRequestLogger(requestId: string, context?: LogContext) {
  return logger.child({
    requestId,
    ...context,
  })
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

