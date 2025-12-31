import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError, getValidationError } from "@/lib/api/helpers"
import { createCampaignSchema } from "@/types/database.types"

// GET /api/w/[workspaceSlug]/campaigns - List campaigns
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)
    if (!ctx) return unauthorized()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const offset = (page - 1) * pageSize

    // Build query
    let query = ctx.adminClient
      .from("call_campaigns")
      .select(`
        *,
        agent:ai_agents!agent_id(id, name, provider, is_active)
      `, { count: "exact" })
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[CampaignsAPI] Error fetching campaigns:", error)
      return serverError("Failed to fetch campaigns")
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("[CampaignsAPI] Exception:", error)
    return serverError("Internal server error")
  }
}

// POST /api/w/[workspaceSlug]/campaigns - Create campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)
    if (!ctx) return unauthorized()

    const body = await request.json()
    const parsed = createCampaignSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(getValidationError(parsed.error))
    }

    const { agent_id, ...campaignData } = parsed.data

    // Verify agent exists and belongs to this workspace
    const { data: agent, error: agentError } = await ctx.adminClient
      .from("ai_agents")
      .select("id, name, provider, is_active")
      .eq("id", agent_id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (agentError || !agent) {
      console.error("[CampaignsAPI] Agent lookup error:", agentError, "agent_id:", agent_id)
      return apiError("Agent not found or does not belong to this workspace")
    }

    if (!agent.is_active) {
      return apiError("Selected agent is not active")
    }

    // Create campaign
    const { data: campaign, error } = await ctx.adminClient
      .from("call_campaigns")
      .insert({
        ...campaignData,
        agent_id,
        workspace_id: ctx.workspace.id,
        created_by: ctx.user.id,
        status: "draft",
      })
      .select(`
        *,
        agent:ai_agents!agent_id(id, name, provider, is_active)
      `)
      .single()

    if (error) {
      console.error("[CampaignsAPI] Error creating campaign:", error)
      return serverError("Failed to create campaign")
    }

    return apiResponse(campaign, 201)
  } catch (error) {
    console.error("[CampaignsAPI] Exception:", error)
    return serverError("Internal server error")
  }
}

