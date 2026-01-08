/**
 * GET /api/partner/workspaces
 * List all workspaces for the current partner with member counts and stats
 */

import { NextRequest } from "next/server"
import { getPartnerAuthContext, isPartnerAdmin } from "@/lib/api/auth"
import { apiResponse, unauthorized, forbidden, serverError } from "@/lib/api/helpers"

interface WorkspaceMemberSummary {
  total: number
  owners: number
  admins: number
  members: number
  viewers: number
}

interface WorkspaceWithStats {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  created_at: string
  member_summary: WorkspaceMemberSummary
  agent_count: number
  owner_email: string | null
  owner_name: string | null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPartnerAuthContext()

    if (!auth) {
      return unauthorized()
    }

    // Only partner admins/owners can view all workspaces
    if (!isPartnerAdmin(auth)) {
      return forbidden("Only organization admins can view all workspaces")
    }

    // Get all workspaces for this partner
    const { data: workspaces, error: workspacesError } = await auth.adminClient
      .from("workspaces")
      .select(`
        id,
        name,
        slug,
        description,
        status,
        created_at
      `)
      .eq("partner_id", auth.partner.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (workspacesError) {
      console.error("Error fetching workspaces:", workspacesError)
      return serverError("Failed to fetch workspaces")
    }

    if (!workspaces || workspaces.length === 0) {
      return apiResponse([])
    }

    const workspaceIds = workspaces.map((w) => w.id)

    // Get all workspace members - simple query without joins
    const { data: allMembers, error: membersError } = await auth.adminClient
      .from("workspace_members")
      .select("id, workspace_id, user_id, role")
      .in("workspace_id", workspaceIds)
      .is("removed_at", null)

    if (membersError) {
      console.error("Error fetching workspace members:", membersError)
    }

    // Get agent counts per workspace
    const { data: agentCounts } = await auth.adminClient
      .from("ai_agents")
      .select("workspace_id")
      .in("workspace_id", workspaceIds)
      .is("deleted_at", null)

    // Build member summary per workspace
    const membersByWorkspace = new Map<string, any[]>()
    for (const member of allMembers || []) {
      const existing = membersByWorkspace.get(member.workspace_id) || []
      existing.push(member)
      membersByWorkspace.set(member.workspace_id, existing)
    }

    // Count agents per workspace
    const agentCountByWorkspace = new Map<string, number>()
    for (const agent of agentCounts || []) {
      const count = agentCountByWorkspace.get(agent.workspace_id) || 0
      agentCountByWorkspace.set(agent.workspace_id, count + 1)
    }

    // Get owner user IDs for separate user lookup
    const ownerUserIds = (allMembers || [])
      .filter((m) => m.role === "owner")
      .map((m) => m.user_id)

    // Fetch owner user details
    let ownerUserMap = new Map<string, any>()
    if (ownerUserIds.length > 0) {
      const { data: ownerUsers } = await auth.adminClient
        .from("users")
        .select("id, email, first_name, last_name")
        .in("id", ownerUserIds)

      for (const user of ownerUsers || []) {
        ownerUserMap.set(user.id, user)
      }
    }

    // Transform workspaces with stats
    const workspacesWithStats: WorkspaceWithStats[] = workspaces.map((ws) => {
      const members = membersByWorkspace.get(ws.id) || []
      
      const memberSummary: WorkspaceMemberSummary = {
        total: members.length,
        owners: members.filter((m) => m.role === "owner").length,
        admins: members.filter((m) => m.role === "admin").length,
        members: members.filter((m) => m.role === "member").length,
        viewers: members.filter((m) => m.role === "viewer").length,
      }

      // Find the workspace owner
      const owner = members.find((m) => m.role === "owner")
      const ownerUser = owner ? ownerUserMap.get(owner.user_id) : null

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        status: ws.status,
        created_at: ws.created_at,
        member_summary: memberSummary,
        agent_count: agentCountByWorkspace.get(ws.id) || 0,
        owner_email: ownerUser?.email || null,
        owner_name: ownerUser?.first_name 
          ? `${ownerUser.first_name} ${ownerUser.last_name || ""}`.trim() 
          : null,
      }
    })

    return apiResponse(workspacesWithStats)
  } catch (error) {
    console.error("GET /api/partner/workspaces error:", error)
    return serverError()
  }
}

