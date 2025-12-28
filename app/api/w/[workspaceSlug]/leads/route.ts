import { NextRequest } from "next/server"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError, getValidationError } from "@/lib/api/helpers"
import { createLeadSchema } from "@/types/database.types"
import { hasWorkspacePermission } from "@/lib/rbac/permissions"

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

    // Check permission
    if (!hasWorkspacePermission(ctx.workspace.role, "workspace.leads.read")) {
      return apiError("You don't have permission to view leads", 403)
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status")
    const source = searchParams.get("source")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    let query = ctx.adminClient
      .from("leads")
      .select(
        `
        *,
        agent:ai_agents(id, name, provider)
      `,
        { count: "exact" }
      )
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }
    if (source) {
      query = query.eq("source", source)
    }
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`
      )
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: leads, error, count } = await query

    if (error) {
      console.error("List leads error:", error)
      return serverError()
    }

    return apiResponse({
      data: leads,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("GET /api/w/[slug]/leads error:", error)
    return serverError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)

    if (!ctx) {
      return unauthorized()
    }

    // Check permission
    if (!hasWorkspacePermission(ctx.workspace.role, "workspace.leads.create")) {
      return apiError("You don't have permission to create leads", 403)
    }

    const body = await request.json()
    const validation = createLeadSchema.safeParse(body)

    if (!validation.success) {
      return apiError(getValidationError(validation.error), 400)
    }

    const leadData = validation.data

    // Require at least one contact method
    if (!leadData.email && !leadData.phone && !leadData.first_name && !leadData.last_name) {
      return apiError("At least one of name, email, or phone is required", 400)
    }

    const { data: lead, error } = await ctx.adminClient
      .from("leads")
      .insert({
        workspace_id: ctx.workspace.id,
        created_by: ctx.user.id,
        ...leadData,
      })
      .select(
        `
        *,
        agent:ai_agents(id, name, provider)
      `
      )
      .single()

    if (error) {
      console.error("Create lead error:", error)
      return serverError()
    }

    return apiResponse(lead, 201)
  } catch (error) {
    console.error("POST /api/w/[slug]/leads error:", error)
    return serverError()
  }
}

