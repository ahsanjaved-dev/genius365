import { NextRequest } from "next/server"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError, notFound, getValidationError } from "@/lib/api/helpers"
import { updateLeadSchema } from "@/types/database.types"
import { hasWorkspacePermission } from "@/lib/rbac/permissions"

interface RouteContext {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug, id } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)

    if (!ctx) {
      return unauthorized()
    }

    if (!hasWorkspacePermission(ctx.workspace.role, "workspace.leads.read")) {
      return apiError("You don't have permission to view leads", 403)
    }

    const { data: lead, error } = await ctx.adminClient
      .from("leads")
      .select(
        `
        *,
        agent:ai_agents(id, name, provider)
      `
      )
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (error || !lead) {
      return notFound("Lead")
    }

    return apiResponse(lead)
  } catch (error) {
    console.error("GET /api/w/[slug]/leads/[id] error:", error)
    return serverError()
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug, id } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)

    if (!ctx) {
      return unauthorized()
    }

    if (!hasWorkspacePermission(ctx.workspace.role, "workspace.leads.update")) {
      return apiError("You don't have permission to update leads", 403)
    }

    const body = await request.json()
    const validation = updateLeadSchema.safeParse(body)

    if (!validation.success) {
      return apiError(getValidationError(validation.error), 400)
    }

    // Verify lead exists and belongs to workspace
    const { data: existingLead } = await ctx.adminClient
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (!existingLead) {
      return notFound("Lead")
    }

    const { data: lead, error } = await ctx.adminClient
      .from("leads")
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        agent:ai_agents(id, name, provider)
      `
      )
      .single()

    if (error) {
      console.error("Update lead error:", error)
      return serverError()
    }

    return apiResponse(lead)
  } catch (error) {
    console.error("PATCH /api/w/[slug]/leads/[id] error:", error)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug, id } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)

    if (!ctx) {
      return unauthorized()
    }

    if (!hasWorkspacePermission(ctx.workspace.role, "workspace.leads.delete")) {
      return apiError("You don't have permission to delete leads", 403)
    }

    // Soft delete
    const { error } = await ctx.adminClient
      .from("leads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)

    if (error) {
      console.error("Delete lead error:", error)
      return serverError()
    }

    return apiResponse({ success: true })
  } catch (error) {
    console.error("DELETE /api/w/[slug]/leads/[id] error:", error)
    return serverError()
  }
}

