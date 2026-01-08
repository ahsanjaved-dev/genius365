import { NextRequest } from "next/server"
import { getPartnerAuthContext, isPartnerAdmin } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"

interface WorkspaceAccess {
  workspace_id: string
  workspace_name: string
  workspace_slug: string
  role: string
}

interface PartnerTeamMemberWithAccess {
  id: string
  role: string
  joined_at: string
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  status: string
  workspace_access: WorkspaceAccess[]
  workspace_count: number
  is_workspace_owner: boolean // True if they own at least one workspace
}

/**
 * GET /api/partner/team - List all team members for the current partner
 * Includes workspace access information for each member
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getPartnerAuthContext()
    if (!ctx) return unauthorized()
    
    // All partner members can view the team
    if (!ctx.partnerRole) {
      return forbidden("You are not a member of this organization")
    }

    // Get all partner members
    const { data: members, error } = await ctx.adminClient
      .from("partner_members")
      .select(`
        id,
        role,
        joined_at,
        created_at,
        user:users!inner(
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          status
        )
      `)
      .eq("partner_id", ctx.partner.id)
      .is("removed_at", null)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true })

    if (error) {
      console.error("List partner members error:", error)
      return serverError()
    }

    // Get all workspaces for this partner
    const { data: workspaces } = await ctx.adminClient
      .from("workspaces")
      .select("id, name, slug")
      .eq("partner_id", ctx.partner.id)
      .is("deleted_at", null)

    const workspaceMap = new Map(workspaces?.map((w) => [w.id, w]) || [])

    // Get workspace memberships for all users in this partner
    const userIds = members.map((m: any) => m.user.id)
    const workspaceIds = workspaces?.map((w) => w.id) || []

    let workspaceMemberships: any[] = []
    if (userIds.length > 0 && workspaceIds.length > 0) {
      const { data: memberships } = await ctx.adminClient
        .from("workspace_members")
        .select("user_id, workspace_id, role")
        .in("user_id", userIds)
        .in("workspace_id", workspaceIds)
        .is("removed_at", null)

      workspaceMemberships = memberships || []
    }

    // Group workspace memberships by user
    const membershipsByUser = new Map<string, WorkspaceAccess[]>()
    for (const membership of workspaceMemberships) {
      const workspace = workspaceMap.get(membership.workspace_id)
      if (!workspace) continue

      const access: WorkspaceAccess = {
        workspace_id: membership.workspace_id,
        workspace_name: workspace.name,
        workspace_slug: workspace.slug,
        role: membership.role,
      }

      const existing = membershipsByUser.get(membership.user_id) || []
      existing.push(access)
      membershipsByUser.set(membership.user_id, existing)
    }

    // Transform the data to include workspace access
    const transformedMembers: PartnerTeamMemberWithAccess[] = members.map((m: any) => {
      const workspaceAccess = membershipsByUser.get(m.user.id) || []
      const isWorkspaceOwner = workspaceAccess.some((wa) => wa.role === "owner")

      return {
        id: m.id,
        role: m.role,
        joined_at: m.joined_at,
        user_id: m.user.id,
        email: m.user.email,
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        avatar_url: m.user.avatar_url,
        status: m.user.status,
        workspace_access: workspaceAccess,
        workspace_count: workspaceAccess.length,
        is_workspace_owner: isWorkspaceOwner,
      }
    })

    return apiResponse(transformedMembers)
  } catch (error) {
    console.error("GET /api/partner/team error:", error)
    return serverError()
  }
}

