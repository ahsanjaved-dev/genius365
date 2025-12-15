import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30")
    const departmentId = searchParams.get("department_id")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = auth.supabase
      .from("conversations")
      .select("created_at, duration_seconds, total_cost, status")
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })

    if (departmentId && departmentId !== "all") {
      query = query.eq("department_id", departmentId)
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error("Analytics query error:", error)
      return serverError()
    }

    // Group by day
    const dailyStats: Record<string, { conversations: number; minutes: number; cost: number }> = {}

    conversations?.forEach((conv) => {
      const date = new Date(conv.created_at).toISOString().split("T")[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { conversations: 0, minutes: 0, cost: 0 }
      }
      dailyStats[date].conversations += 1
      dailyStats[date].minutes += (conv.duration_seconds || 0) / 60
      dailyStats[date].cost += conv.total_cost || 0
    })

    // Convert to array sorted by date
    const trends = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        conversations: stats.conversations,
        minutes: Math.round(stats.minutes * 10) / 10,
        cost: Math.round(stats.cost * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return apiResponse({ trends, days })
  } catch (error) {
    console.error("GET /api/analytics/usage-trends error:", error)
    return serverError()
  }
}
