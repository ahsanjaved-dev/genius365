/**
 * Formatting Utilities
 * Phase 3.3.3: Create shared utilities library
 *
 * Provides consistent formatting functions across the application.
 */

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a number with thousands separators
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", options).format(value)
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

/**
 * Format a number as a percentage
 */
export function formatPercent(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(value)
}

/**
 * Format a number with compact notation (e.g., 1.2K, 3.4M)
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

// ============================================================================
// DURATION FORMATTING
// ============================================================================

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts = []
  if (h > 0) parts.push(h.toString().padStart(2, "0"))
  parts.push(m.toString().padStart(2, "0"))
  parts.push(s.toString().padStart(2, "0"))

  return parts.join(":")
}

/**
 * Format seconds to human readable duration
 */
export function formatDurationWords(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds} sec`
      : `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`
}

/**
 * Format minutes to hours and minutes
 */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === "string" ? new Date(date) : date
  const diffMs = now.getTime() - target.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return "just now"
  }
  if (diffMin < 60) {
    return `${diffMin} min ago`
  }
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
  }
  if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
  }

  return formatDate(target)
}

/**
 * Format date as short date string
 */
export function formatDate(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(target)
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(target)
}

/**
 * Format date as ISO date (YYYY-MM-DD)
 */
export function formatISODate(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date
  return target.toISOString().split("T")[0] ?? ""
}

// ============================================================================
// STRING FORMATTING
// ============================================================================

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

/**
 * Generate a slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert string to title case
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Format a phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  const match = cleaned.match(/^(\d{1,3})?(\d{3})(\d{3})(\d{4})$/)

  if (match) {
    const countryCode = match[1] ? `+${match[1]} ` : ""
    return `${countryCode}(${match[2]}) ${match[3]}-${match[4]}`
  }

  return phone
}

// ============================================================================
// NAME FORMATTING
// ============================================================================

/**
 * Get initials from a name
 */
export function getInitials(name: string | null | undefined, maxLength: number = 2): string {
  if (!name) return ""

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, maxLength)
    .join("")
    .toUpperCase()
}

/**
 * Format full name from first and last name
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  return [firstName, lastName].filter(Boolean).join(" ") || ""
}

