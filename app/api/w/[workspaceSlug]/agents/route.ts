import { NextRequest } from "next/server"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError, getValidationError } from "@/lib/api/helpers"
import { createWorkspaceAgentSchema } from "@/types/api.types"
import { createAuditLog, getRequestMetadata } from "@/lib/audit"
import type { AgentProvider, AIAgent } from "@/types/database.types"

interface RouteContext {
  params: Promise<{ workspaceSlug: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)

    if (!ctx) {
      return unauthorized()
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const provider = searchParams.get("provider")
    const isActive = searchParams.get("isActive")

    let query = ctx.adminClient
      .from("ai_agents")
      .select("*", { count: "exact" })
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (provider) {
      query = query.eq("provider", provider as AgentProvider)
    }
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true")
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
    console.error("GET /api/w/[slug]/agents error:", error)
    return serverError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug, ["owner", "admin", "member"])

    if (!ctx) {
      return forbidden("No permission to create agents in this workspace")
    }

    const body = await request.json()
    const validation = createWorkspaceAgentSchema.safeParse(body)

    if (!validation.success) {
      return apiError(getValidationError(validation.error))
    }

    // Check agent limits for workspace
    const { count } = await ctx.adminClient
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)

    const resourceLimits = ctx.workspace.resource_limits as { max_agents?: number } | null
    const maxAgents = resourceLimits?.max_agents || 10
    if (count && count >= maxAgents) {
      return apiError(`Agent limit reached for this workspace. Maximum: ${maxAgents} agents.`, 403)
    }

    // NEW FLOW: Build config WITHOUT auto-assigning API keys
    // Agent starts with no API key assigned and sync_status = "not_synced"
    const inputConfig = validation.data.config || {}
    
    const configWithoutDefaultKeys = {
      ...inputConfig,
      api_key_config: {
        // No keys assigned by default - admin will configure later
        secret_key: { type: "none" as const },
        public_key: { type: "none" as const },
        assigned_key_id: null,
      },
    }

    console.log(`[AgentCreate] Creating agent with provider: ${validation.data.provider}, NO API keys assigned (not_synced)`)

    // Create agent WITHOUT syncing - sync will happen when admin assigns API key
    const { data: agent, error } = await ctx.adminClient
      .from("ai_agents")
      .insert({
        workspace_id: ctx.workspace.id,
        created_by: ctx.user.id,
        name: validation.data.name,
        description: validation.data.description,
        provider: validation.data.provider,
        voice_provider: validation.data.voice_provider,
        model_provider: validation.data.model_provider,
        transcriber_provider: validation.data.transcriber_provider,
        config: configWithoutDefaultKeys,
        agent_secret_api_key: [],
        agent_public_api_key: [],
        is_active: validation.data.is_active ?? true,
        // NEW: Set sync_status to not_synced - no sync on creation
        sync_status: "not_synced",
        needs_resync: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Create agent error:", error)
      return apiError("Failed to create agent")
    }

    // NEW FLOW: DO NOT sync on creation
    // Sync will happen when admin assigns API key via PATCH

    // Audit log
    const { ipAddress, userAgent } = getRequestMetadata(request)
    await createAuditLog({
      userId: ctx.user.id,
      workspaceId: ctx.workspace.id,
      action: "agent.created",
      entityType: "ai_agent",
      entityId: agent.id,
      newValues: {
        name: agent.name,
        provider: agent.provider,
        workspace_id: ctx.workspace.id,
        sync_status: "not_synced",
      },
      ipAddress,
      userAgent,
    })

    return apiResponse(agent, 201)
  } catch (error) {
    console.error("POST /api/w/[slug]/agents error:", error)
    return serverError()
  }
}