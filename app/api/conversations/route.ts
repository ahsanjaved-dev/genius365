import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status")
    const direction = searchParams.get("direction")
    const departmentId = searchParams.get("department_id")
    const agentId = searchParams.get("agent_id")

    let query = auth.supabase
      .from("conversations")
      .select(
        `
        *,
        agent:ai_agents(id, name)
      `,
        { count: "exact" }
      )
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }
    if (direction) {
      query = query.eq("direction", direction)
    }
    if (departmentId) {
      query = query.eq("department_id", departmentId)
    }
    if (agentId) {
      query = query.eq("agent_id", agentId)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: conversations, error, count } = await query

    if (error) {
      console.error("List conversations error:", error)
      return serverError()
    }

    return apiResponse({
      data: conversations,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("GET /api/conversations error:", error)
    return serverError()
  }
}
