import { NextRequest } from "next/server"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import { z } from "zod"

interface RouteContext {
  params: Promise<{ workspaceSlug: string }>
}

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
})

// GET workspace settings
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)

    if (!ctx) {
      return unauthorized()
    }

    // Get full workspace data
    const { data: workspace, error } = await ctx.adminClient
      .from("workspaces")
      .select("*")
      .eq("id", ctx.workspace.id)
      .single()

    if (error) {
      console.error("Get workspace error:", error)
      return serverError()
    }

    return apiResponse(workspace)
  } catch (error) {
    console.error("GET /api/w/[slug]/settings error:", error)
    return serverError()
  }
}

// PATCH - Update workspace settings
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug, ["owner", "admin"])

    if (!ctx) {
      return forbidden("Only workspace owners and admins can update settings")
    }

    const body = await request.json()
    const validation = updateSettingsSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validation.data.name !== undefined) {
      updates.name = validation.data.name
    }
    if (validation.data.description !== undefined) {
      updates.description = validation.data.description
    }

    const { data: workspace, error } = await ctx.adminClient
      .from("workspaces")
      .update(updates)
      .eq("id", ctx.workspace.id)
      .select()
      .single()

    if (error) {
      console.error("Update workspace error:", error)
      return apiError("Failed to update workspace settings")
    }

    return apiResponse(workspace)
  } catch (error) {
    console.error("PATCH /api/w/[slug]/settings error:", error)
    return serverError()
  }
}

// DELETE - Delete workspace (owner only)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug, ["owner"])

    if (!ctx) {
      return forbidden("Only the workspace owner can delete this workspace")
    }

    // Soft delete
    const { error } = await ctx.adminClient
      .from("workspaces")
      .update({
        deleted_at: new Date().toISOString(),
        status: "deleted",
      })
      .eq("id", ctx.workspace.id)

    if (error) {
      console.error("Delete workspace error:", error)
      return apiError("Failed to delete workspace")
    }

    return apiResponse({ success: true, message: "Workspace deleted" })
  } catch (error) {
    console.error("DELETE /api/w/[slug]/settings error:", error)
    return serverError()
  }
}
