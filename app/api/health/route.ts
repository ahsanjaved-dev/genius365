import { NextResponse } from "next/server"
import { checkDatabaseHealth, isPrismaConfigured } from "@/lib/prisma"

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Checks:
 * - API is running
 * - Database connection (via Prisma, if configured)
 */
export async function GET() {
  const startTime = Date.now()
  
  // Check if Prisma is configured
  const prismaEnabled = isPrismaConfigured()
  
  // Check database connection (only if Prisma is configured)
  let dbHealthy: boolean | null = null
  let dbError: string | null = null
  
  if (prismaEnabled) {
    try {
      dbHealthy = await checkDatabaseHealth()
    } catch (error) {
      dbHealthy = false
      dbError = error instanceof Error ? error.message : "Unknown database error"
    }
  }
  
  const responseTime = Date.now() - startTime
  
  // Determine overall status
  const isHealthy = prismaEnabled ? dbHealthy === true : true
  
  const health = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    checks: {
      api: {
        status: "ok",
      },
      database: prismaEnabled
        ? {
            status: dbHealthy ? "ok" : "error",
            type: "postgresql",
            orm: "prisma",
            ...(dbError && { error: dbError }),
          }
        : {
            status: "skipped",
            message: "Prisma not configured (DATABASE_URL not set). Using Supabase client.",
          },
    },
  }
  
  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
