import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Health Check Endpoint
 * Phase 5.2.4: Create health check endpoint for monitoring
 *
 * GET /api/health
 *
 * Returns the health status of the application and its dependencies.
 * This endpoint is used for:
 * - Load balancer health checks
 * - Uptime monitoring
 * - Deployment verification
 */

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: CheckResult
    memory: CheckResult
  }
}

interface CheckResult {
  status: "pass" | "fail"
  latencyMs?: number
  message?: string
}

// Track server start time for uptime calculation
const startTime = Date.now()

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString()

  // Check database connectivity
  const dbCheck = await checkDatabase()

  // Check memory usage
  const memoryCheck = checkMemory()

  // Determine overall status
  const allChecks = [dbCheck, memoryCheck]
  const hasFailure = allChecks.some((c) => c.status === "fail")
  const overallStatus = hasFailure ? "unhealthy" : "healthy"

  const response: HealthStatus = {
    status: overallStatus,
    timestamp,
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: dbCheck,
      memory: memoryCheck,
    },
  }

  // Return appropriate status code
  const statusCode = overallStatus === "healthy" ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Check database connectivity and response time
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()

  try {
    const adminClient = createAdminClient()

    // Simple query to verify connection
    const { error } = await adminClient
      .from("partners")
      .select("id")
      .limit(1)
      .single()

    const latencyMs = Date.now() - start

    // Allow "no rows" error (PGRST116) as it still indicates the DB is working
    if (error && error.code !== "PGRST116") {
      return {
        status: "fail",
        latencyMs,
        message: error.message,
      }
    }

    // Warn if latency is high
    if (latencyMs > 1000) {
      return {
        status: "pass",
        latencyMs,
        message: "High latency detected",
      }
    }

    return {
      status: "pass",
      latencyMs,
    }
  } catch (error) {
    return {
      status: "fail",
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : "Database connection failed",
    }
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  // Only available in Node.js environment
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage()
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
    const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100)

    // Fail if memory usage is above 90%
    if (usagePercent > 90) {
      return {
        status: "fail",
        message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
      }
    }

    return {
      status: "pass",
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    }
  }

  return {
    status: "pass",
    message: "Memory check not available in this environment",
  }
}

