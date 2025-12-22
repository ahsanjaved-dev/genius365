import { NextRequest } from "next/server"
import { getPartnerAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"

export interface PartnerDashboardStats {
  total_workspaces: number
  total_agents_all_workspaces: number
  total_calls_today: number
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPartnerAuthContext()

    if (!auth) {
      return unauthorized()
    }

    // Total workspaces the user has access to
    const totalWorkspaces = auth.workspaces.length

    // Get workspace IDs for querying
    const workspaceIds = auth.workspaces.map((ws) => ws.id)

    if (workspaceIds.length === 0) {
      // No workspaces, return zeros
      const stats: PartnerDashboardStats = {
        total_workspaces: 0,
        total_agents_all_workspaces: 0,
        total_calls_today: 0,
      }
      return apiResponse(stats)
    }

    // Query total agents across all workspaces
    const agentsQuery = auth.adminClient
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .in("workspace_id", workspaceIds)
      .is("deleted_at", null)

    // Query total calls (conversations) today across all workspaces
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const callsTodayQuery = auth.adminClient
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .in("workspace_id", workspaceIds)
      .is("deleted_at", null)
      .gte("created_at", startOfToday.toISOString())

    const [agentsResult, callsTodayResult] = await Promise.all([agentsQuery, callsTodayQuery])

    const stats: PartnerDashboardStats = {
      total_workspaces: totalWorkspaces,
      total_agents_all_workspaces: agentsResult.count || 0,
      total_calls_today: callsTodayResult.count || 0,
    }

    return apiResponse(stats)
  } catch (error) {
    console.error("GET /api/partner/dashboard/stats error:", error)
    return serverError()
  }
}

