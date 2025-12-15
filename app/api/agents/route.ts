import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, serverError } from "@/lib/api/helpers"
import { createAgentSchema } from "@/types/api.types"
import { createAuditLog, getRequestMetadata } from "@/lib/audit"
import type { AgentProvider } from "@/types/database.types"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const provider = searchParams.get("provider")
    const isActive = searchParams.get("isActive")
    const departmentId = searchParams.get("department_id")

    let query = auth.supabase
      .from("ai_agents")
      .select("*", { count: "exact" })
      .eq("organization_id", auth.organization.id)
      .order("created_at", { ascending: false })

    if (provider) {
      query = query.eq("provider", provider as AgentProvider)
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true")
    }
    if (departmentId) {
      query = query.eq("department_id", departmentId)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: agents, error, count } = await query

    if (error) {
      console.error("List agents error:", error)
      return apiError("Failed to fetch agents")
    }

    return apiResponse({
      data: agents,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("GET /api/agents error:", error)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const body = await request.json()
    const validation = createAgentSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const departmentId = body.department_id || auth.departments[0]?.department_id

    if (!departmentId) {
      return apiError("No department available. Please create a department first.")
    }

    const { count } = await auth.supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("department_id", departmentId)

    const { data: department } = await auth.supabase
      .from("departments")
      .select("resource_limits")
      .eq("id", departmentId)
      .single()

    const limits = (department?.resource_limits as any) || { max_agents: 5 }
    if (count && count >= limits.max_agents) {
      return apiError(
        `Agent limit reached for this department. Maximum: ${limits.max_agents} agents.`,
        403
      )
    }

    const { data: agent, error } = await auth.supabase
      .from("ai_agents")
      .insert({
        organization_id: auth.organization.id,
        department_id: departmentId,
        created_by: auth.user.id,
        name: validation.data.name,
        description: validation.data.description,
        provider: validation.data.provider,
        voice_provider: validation.data.voice_provider,
        model_provider: validation.data.model_provider,
        transcriber_provider: validation.data.transcriber_provider,
        config: validation.data.config || {},
        is_active: validation.data.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error("Create agent error:", error)
      return apiError("Failed to create agent")
    }

    // Create audit log
    const { ipAddress, userAgent } = getRequestMetadata(request)
    await createAuditLog({
      userId: auth.user.id,
      organizationId: auth.organization.id,
      action: "agent.created",
      entityType: "ai_agent",
      entityId: agent.id,
      newValues: {
        name: agent.name,
        provider: agent.provider,
        department_id: agent.department_id,
      },
      ipAddress,
      userAgent,
    })

    return apiResponse(agent, 201)
  } catch (error) {
    console.error("POST /api/agents error:", error)
    return serverError()
  }
}
