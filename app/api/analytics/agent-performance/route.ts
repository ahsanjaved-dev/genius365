import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get("department_id")

    // Get all agents with their conversation stats
    let agentsQuery = auth.supabase
      .from("ai_agents")
      .select("id, name, provider, status")
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)

    if (departmentId && departmentId !== "all") {
      agentsQuery = agentsQuery.eq("department_id", departmentId)
    }

    const { data: agents, error: agentsError } = await agentsQuery

    if (agentsError) {
      console.error("Agents query error:", agentsError)
      return serverError()
    }

    // Get conversation stats for each agent
    const agentPerformance = await Promise.all(
      (agents || []).map(async (agent) => {
        const { data: convs } = await auth.supabase
          .from("conversations")
          .select("status, duration_seconds, total_cost")
          .eq("agent_id", agent.id)
          .is("deleted_at", null)

        const totalCalls = convs?.length || 0
        const completedCalls = convs?.filter((c) => c.status === "completed").length || 0
        const totalMinutes =
          (convs?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) ?? 0) / 60
        const totalCost = convs?.reduce((sum, c) => sum + (c.total_cost || 0), 0) ?? 0

        return {
          id: agent.id,
          name: agent.name,
          provider: agent.provider,
          status: agent.status,
          totalCalls,
          completedCalls,
          successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
          avgDuration: totalCalls > 0 ? Math.round((totalMinutes / totalCalls) * 10) / 10 : 0,
          totalMinutes: Math.round(totalMinutes * 10) / 10,
          totalCost: Math.round(totalCost * 100) / 100,
        }
      })
    )

    return apiResponse({ agents: agentPerformance })
  } catch (error) {
    console.error("GET /api/analytics/agent-performance error:", error)
    return serverError()
  }
}
