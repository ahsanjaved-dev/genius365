import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"
import type { DashboardStats } from "@/types/database.types"

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const orgId = auth.organization.id

    // Get counts in parallel
    const [agentsResult, conversationsResult, usageResult] = await Promise.all([
      // Total agents
      auth.supabase
        .from("ai_agents")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId),

      // Total conversations
      auth.supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId),

      // Usage this month
      auth.supabase
        .from("usage_tracking")
        .select("resource_type, quantity, total_cost")
        .eq("organization_id", orgId)
        .gte(
          "recorded_at",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        ),
    ])

    // Calculate totals from usage
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

    // Get conversations this month
    const { count: conversationsThisMonth } = await auth.supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

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
