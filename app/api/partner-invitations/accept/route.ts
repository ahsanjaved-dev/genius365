import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { apiResponse, apiError, unauthorized, serverError } from "@/lib/api/helpers"

interface WorkspaceAssignment {
  workspace_id: string
  role: "admin" | "member" | "viewer"
}

/**
 * POST /api/partner-invitations/accept - Accept a partner invitation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return apiError("Invitation token is required")
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorized()
    }

    const adminClient = createAdminClient()

    // Find the invitation with metadata
    const { data: invitation, error: inviteError } = await adminClient
      .from("partner_invitations")
      .select(`
        *,
        partner:partners!inner(
          id,
          name,
          slug
        )
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single()

    if (inviteError || !invitation) {
      return apiError("Invalid or expired invitation", 404)
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient
        .from("partner_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)
      return apiError("This invitation has expired")
    }

    // Check if email matches
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return apiError("This invitation was sent to a different email address")
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
      .from("partner_members")
      .select("id")
      .eq("partner_id", invitation.partner_id)
      .eq("user_id", user.id)
      .is("removed_at", null)
      .maybeSingle()

    if (existingMember) {
      // Mark invitation as accepted anyway
      await adminClient
        .from("partner_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id)
      
      return apiResponse({ 
        success: true, 
        partner_slug: (invitation.partner as any).slug,
        message: "You are already a member of this organization"
      })
    }

    // Ensure user exists in public.users
    const { error: upsertError } = await adminClient
      .from("users")
      .upsert({
        id: user.id,
        email: user.email!,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        role: "org_member",
        status: "active",
      }, {
        onConflict: "id"
      })

    if (upsertError) {
      console.error("Upsert user error:", upsertError)
    }

    // Add user as partner member
    const { error: memberError } = await adminClient
      .from("partner_members")
      .insert({
        partner_id: invitation.partner_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error("Create partner member error:", memberError)
      return serverError("Failed to add you to the organization")
    }

    // Process workspace assignments from metadata
    const workspaceAssignments = invitation.metadata?.workspace_assignments as WorkspaceAssignment[] | undefined
    let assignedWorkspaces: string[] = []

    console.log(`[Partner Invitation Accept] User: ${user.email}, Invitation ID: ${invitation.id}`)
    console.log(`[Partner Invitation Accept] Metadata:`, JSON.stringify(invitation.metadata))

    if (workspaceAssignments && workspaceAssignments.length > 0) {
      console.log(`[Partner Invitation Accept] Processing ${workspaceAssignments.length} workspace assignments`)
      
      // Validate workspaces belong to this partner
      const workspaceIds = workspaceAssignments.map((wa) => wa.workspace_id)
      const { data: validWorkspaces, error: wsError } = await adminClient
        .from("workspaces")
        .select("id, name")
        .eq("partner_id", invitation.partner_id)
        .in("id", workspaceIds)
        .is("deleted_at", null)

      if (wsError) {
        console.error(`[Partner Invitation Accept] Error fetching workspaces:`, wsError)
      }

      console.log(`[Partner Invitation Accept] Valid workspaces found:`, validWorkspaces?.length || 0)
      const validWorkspaceMap = new Map(validWorkspaces?.map((w) => [w.id, w.name]) || [])

      // Add user to each valid workspace
      for (const assignment of workspaceAssignments) {
        console.log(`[Partner Invitation Accept] Processing assignment:`, assignment)
        
        if (!validWorkspaceMap.has(assignment.workspace_id)) {
          console.warn(`[Partner Invitation Accept] Skipping invalid workspace: ${assignment.workspace_id}`)
          continue
        }

        // Check if already a member of this workspace
        const { data: existingWsMember } = await adminClient
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", assignment.workspace_id)
          .eq("user_id", user.id)
          .is("removed_at", null)
          .maybeSingle()

        if (existingWsMember) {
          console.log(`[Partner Invitation Accept] User already member of: ${assignment.workspace_id}`)
          assignedWorkspaces.push(validWorkspaceMap.get(assignment.workspace_id) || assignment.workspace_id)
          continue
        }

        // Add user to workspace
        const { data: newMember, error: wsMemberError } = await adminClient
          .from("workspace_members")
          .insert({
            workspace_id: assignment.workspace_id,
            user_id: user.id,
            role: assignment.role,
            invited_by: invitation.invited_by,
            joined_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (wsMemberError) {
          console.error(`[Partner Invitation Accept] Failed to add to workspace ${assignment.workspace_id}:`, wsMemberError)
        } else {
          assignedWorkspaces.push(validWorkspaceMap.get(assignment.workspace_id) || assignment.workspace_id)
          console.log(`[Partner Invitation Accept] Added to workspace: ${assignment.workspace_id} as ${assignment.role}`, newMember)
        }
      }
    } else {
      console.log(`[Partner Invitation Accept] No workspace assignments in metadata`)
    }

    // Mark invitation as accepted
    await adminClient
      .from("partner_invitations")
      .update({ 
        status: "accepted", 
        accepted_at: new Date().toISOString() 
      })
      .eq("id", invitation.id)

    return apiResponse({ 
      success: true, 
      partner_slug: (invitation.partner as any).slug,
      partner_name: (invitation.partner as any).name,
      role: invitation.role,
      workspaces_assigned: assignedWorkspaces.length,
      workspace_names: assignedWorkspaces
    })
  } catch (error) {
    console.error("POST /api/partner-invitations/accept error:", error)
    return serverError()
  }
}

/**
 * GET /api/partner-invitations/accept - Get invitation details
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return apiError("Invitation token is required")
    }

    const adminClient = createAdminClient()

    const { data: invitation, error } = await adminClient
      .from("partner_invitations")
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        metadata,
        partner:partners!inner(
          id,
          name,
          slug,
          branding
        ),
        inviter:users!invited_by(
          first_name,
          last_name,
          email
        )
      `)
      .eq("token", token)
      .single()

    if (error || !invitation) {
      console.error("Invitation fetch error:", error)
      return apiError("Invalid invitation", 404)
    }

    // Check if expired
    const isExpired = new Date(invitation.expires_at) < new Date()
    
    // Get workspace names for assignments
    const workspaceAssignments = invitation.metadata?.workspace_assignments as any[] | undefined
    let workspaceDetails: { id: string; name: string; role: string }[] = []

    if (workspaceAssignments && workspaceAssignments.length > 0) {
      const workspaceIds = workspaceAssignments.map((wa) => wa.workspace_id)
      const { data: workspaces } = await adminClient
        .from("workspaces")
        .select("id, name")
        .in("id", workspaceIds)

      const wsMap = new Map(workspaces?.map((w) => [w.id, w.name]) || [])
      workspaceDetails = workspaceAssignments.map((wa) => ({
        id: wa.workspace_id,
        name: wsMap.get(wa.workspace_id) || wa.workspace_id,
        role: wa.role,
      }))
    }

    const partnerData = invitation.partner as any
    const inviterData = invitation.inviter as any
    
    return apiResponse({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      is_expired: isExpired,
      partner: {
        name: partnerData?.name || "Unknown Organization",
        slug: partnerData?.slug || "",
        branding: partnerData?.branding || {},
      },
      inviter: {
        name: inviterData?.first_name 
          ? `${inviterData.first_name} ${inviterData.last_name || ""}`.trim()
          : inviterData?.email || "Unknown",
      },
      workspace_assignments: workspaceDetails,
    })
  } catch (error) {
    console.error("GET /api/partner-invitations/accept error:", error)
    return serverError()
  }
}

