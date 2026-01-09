/**
 * GET /api/partner/workspaces/[id]/members
 * List all members of a workspace (for partner admins)
 * 
 * POST /api/partner/workspaces/[id]/members
 * Add an org member to a workspace
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { getPartnerAuthContext, isPartnerAdmin } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, notFound, serverError } from "@/lib/api/helpers"

const WORKSPACE_MEMBER_ROLES = ["admin", "member", "viewer"] as const

const addMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  role: z.enum(WORKSPACE_MEMBER_ROLES, { message: "Role must be admin, member, or viewer" }),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const auth = await getPartnerAuthContext()

    if (!auth) {
      return unauthorized()
    }

    if (!isPartnerAdmin(auth)) {
      return forbidden("Only organization admins can view workspace members")
    }

    // Verify workspace belongs to this partner
    const { data: workspace, error: wsError } = await auth.adminClient
      .from("workspaces")
      .select("id, name, slug, partner_id")
      .eq("id", workspaceId)
      .eq("partner_id", auth.partner.id)
      .is("deleted_at", null)
      .single()

    if (wsError || !workspace) {
      return notFound("Workspace not found")
    }

    // Get workspace members
    const { data: members, error: membersError } = await auth.adminClient
      .from("workspace_members")
      .select(`
        id,
        role,
        joined_at,
        user:users!inner(
          id,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("workspace_id", workspaceId)
      .is("removed_at", null)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true })

    if (membersError) {
      console.error("Error fetching workspace members:", membersError)
      return serverError("Failed to fetch workspace members")
    }

    // Transform data
    const transformedMembers = (members || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      joined_at: m.joined_at,
      user_id: m.user.id,
      email: m.user.email,
      first_name: m.user.first_name,
      last_name: m.user.last_name,
      avatar_url: m.user.avatar_url,
    }))

    return apiResponse({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      members: transformedMembers,
    })
  } catch (error) {
    console.error("GET /api/partner/workspaces/[id]/members error:", error)
    return serverError()
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const auth = await getPartnerAuthContext()

    if (!auth) {
      return unauthorized()
    }

    if (!isPartnerAdmin(auth)) {
      return forbidden("Only organization admins can add members to workspaces")
    }

    // Parse request body
    const body = await request.json()
    const parsed = addMemberSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid data")
    }

    const { user_id, role } = parsed.data

    // Verify workspace belongs to this partner
    const { data: workspace, error: wsError } = await auth.adminClient
      .from("workspaces")
      .select("id, name, slug, partner_id")
      .eq("id", workspaceId)
      .eq("partner_id", auth.partner.id)
      .is("deleted_at", null)
      .single()

    if (wsError || !workspace) {
      return notFound("Workspace not found")
    }

    // Verify user is a member of this partner
    const { data: partnerMember, error: pmError } = await auth.adminClient
      .from("partner_members")
      .select("id, user_id")
      .eq("partner_id", auth.partner.id)
      .eq("user_id", user_id)
      .is("removed_at", null)
      .single()

    if (pmError || !partnerMember) {
      return apiError("User is not a member of this organization")
    }

    // Check if user is already a member of this workspace
    const { data: existingMember } = await auth.adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user_id)
      .is("removed_at", null)
      .single()

    if (existingMember) {
      return apiError("User is already a member of this workspace")
    }

    // Add user to workspace
    const { data: newMember, error: insertError } = await auth.adminClient
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: user_id,
        role: role,
        joined_at: new Date().toISOString(),
      })
      .select(`
        id,
        role,
        joined_at,
        user:users!inner(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .single()

    if (insertError) {
      console.error("Error adding workspace member:", insertError)
      return serverError("Failed to add member to workspace")
    }

    return apiResponse({
      message: "Member added successfully",
      member: {
        id: newMember.id,
        role: newMember.role,
        joined_at: newMember.joined_at,
        user_id: (newMember.user as any).id,
        email: (newMember.user as any).email,
        first_name: (newMember.user as any).first_name,
        last_name: (newMember.user as any).last_name,
      },
    })
  } catch (error) {
    console.error("POST /api/partner/workspaces/[id]/members error:", error)
    return serverError()
  }
}

