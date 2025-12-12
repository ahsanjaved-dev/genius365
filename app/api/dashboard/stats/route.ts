import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"
import type { DashboardStats } from "@/types/database.types"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get("department_id")
    const orgId = auth.organization.id

    const agentQuery = auth.supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null)

    const conversationQuery = auth.supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null)

    const usageQuery = auth.supabase
      .from("usage_tracking")
      .select("resource_type, quantity, total_cost")
      .eq("organization_id", orgId)
      .gte(
        "recorded_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      )

    if (departmentId && departmentId !== "all") {
      agentQuery.eq("department_id", departmentId)
      conversationQuery.eq("department_id", departmentId)
      usageQuery.eq("department_id", departmentId)
    }

    const [agentsResult, conversationsResult, usageResult] = await Promise.all([
      agentQuery,
      conversationQuery,
      usageQuery,
    ])

    let totalMinutes = 0
    let totalCost = 0

    if (usageResult.data) {
      usageResult.data.forEach((record) => {
        if (record.resource_type === "voice_minutes") {
          totalMinutes += Number(record.quantity) || 0
        }
        totalCost += Number(record.total_cost) || 0
      })
    }

    const conversationsThisMonthQuery = auth.supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    if (departmentId && departmentId !== "all") {
      conversationsThisMonthQuery.eq("department_id", departmentId)
    }

    const { count: conversationsThisMonth } = await conversationsThisMonthQuery

    const stats: DashboardStats = {
      total_agents: agentsResult.count || 0,
      total_conversations: conversationsResult.count || 0,
      total_minutes: totalMinutes,
      total_cost: totalCost,
      conversations_this_month: conversationsThisMonth || 0,
      minutes_this_month: totalMinutes,
      cost_this_month: totalCost,
    }

    return apiResponse(stats)
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error)
    return serverError()
  }
}
