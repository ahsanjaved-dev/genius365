import { NextRequest } from "next/server"
import { getPartnerAuthContext, isPartnerAdmin } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import { createWorkspaceSchema } from "@/types/database.types"

export async function POST(request: NextRequest) {
  try {
    const auth = await getPartnerAuthContext()
    if (!auth) return unauthorized()

    // Check if user can create workspaces (partner admin/owner)
    if (!isPartnerAdmin(auth)) {
      return forbidden("Only partner administrators can create workspaces")
    }

    const body = await request.json()

    // Add a timestamp suffix to ensure unique slugs
    const baseSlug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-")

    // Check slug availability
    const { data: existingWorkspace } = await auth.adminClient
      .from("workspaces")
      .select("id")
      .eq("partner_id", auth.partner.id)
      .eq("slug", baseSlug)
      .maybeSingle()

    const finalSlug = existingWorkspace
      ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
      : baseSlug

    const validation = createWorkspaceSchema.safeParse({
      ...body,
      slug: finalSlug,
    })

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { name, slug, description, resource_limits } = validation.data

    // Create workspace
    const { data: workspace, error: wsError } = await auth.adminClient
      .from("workspaces")
      .insert({
        partner_id: auth.partner.id,
        name,
        slug,
        description: description || null,
        resource_limits: resource_limits || {},
        settings: {},
        status: "active",
      })
      .select()
      .single()

    if (wsError) {
      console.error("Create workspace error:", wsError)
      return apiError("Failed to create workspace")
    }

    // Add creator as workspace owner
    const { error: memberError } = await auth.adminClient.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: auth.user.id,
      role: "owner",
      joined_at: new Date().toISOString(),
    })

    if (memberError) {
      console.error("Add workspace owner error:", memberError)
      // Rollback workspace creation
      await auth.adminClient.from("workspaces").delete().eq("id", workspace.id)
      return apiError("Failed to set up workspace owner")
    }

    return apiResponse({
      workspace,
      message: "Workspace created successfully",
      redirect: `/w/${workspace.slug}/dashboard`,
    })
  } catch (error) {
    console.error("POST /api/workspaces error:", error)
    return serverError()
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPartnerAuthContext()
    if (!auth) return unauthorized()

    // Return user's accessible workspaces
    return apiResponse({
      workspaces: auth.workspaces,
      canCreateWorkspace: isPartnerAdmin(auth),
    })
  } catch (error) {
    console.error("GET /api/workspaces error:", error)
    return serverError()
  }
}
