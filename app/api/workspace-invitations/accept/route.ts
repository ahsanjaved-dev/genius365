import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { apiResponse, apiError, serverError, getValidationError } from "@/lib/api/helpers"
import { z } from "zod"

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return apiError("You must be signed in to accept an invitation", 401)
    }

    const body = await request.json()
    const validation = acceptInvitationSchema.safeParse(body)

    if (!validation.success) {
      return apiError(getValidationError(validation.error))
    }

    const { token } = validation.data

    // Get invitation with workspace details
    const { data: invitation, error: invError } = await adminClient
      .from("workspace_invitations")
      .select(
        `
        *,
        workspace:workspaces(
          id,
          name,
          slug,
          partner_id
        )
      `
      )
      .eq("token", token)
      .single()

    if (invError || !invitation) {
      return apiError("Invalid invitation token")
    }

    // Validate invitation status
    if (invitation.status !== "pending") {
      return apiError(`This invitation has already been ${invitation.status}`)
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)
      return apiError("This invitation has expired")
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== authUser.email?.toLowerCase()) {
      return apiError("This invitation was sent to a different email address")
    }

    // =========================================================================
    // STEP 1: Ensure user record exists in users table
    // =========================================================================
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle()

    if (!existingUser) {
      await adminClient.from("users").insert({
        id: authUser.id,
        email: authUser.email,
        first_name: authUser.user_metadata?.first_name || null,
        last_name: authUser.user_metadata?.last_name || null,
        role: "org_member",
        status: "active",
      })
    }

    // =========================================================================
    // STEP 2: Ensure user is a partner member
    // =========================================================================
    const partnerId = invitation.workspace.partner_id

    const { data: existingPartnerMember } = await adminClient
      .from("partner_members")
      .select("id")
      .eq("partner_id", partnerId)
      .eq("user_id", authUser.id)
      .is("removed_at", null)
      .maybeSingle()

    if (!existingPartnerMember) {
      const { error: partnerMemberError } = await adminClient.from("partner_members").insert({
        partner_id: partnerId,
        user_id: authUser.id,
        role: "member", // Default role for invited users
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
      })

      if (partnerMemberError) {
        console.error("Add partner member error:", partnerMemberError)
        // Continue - this shouldn't block workspace access
      }
    }

    // =========================================================================
    // STEP 3: Add to workspace (existing logic)
    // =========================================================================
    const { data: existingMember } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", authUser.id)
      .is("removed_at", null)
      .maybeSingle()

    if (existingMember) {
      // Already a member, just mark invitation as accepted
      await adminClient
        .from("workspace_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id)

      return apiResponse({
        success: true,
        message: "You're already a member of this workspace",
        workspace: invitation.workspace,
        redirect: `/w/${invitation.workspace.slug}/dashboard`,
      })
    }

    // Add user to workspace
    const { error: memberError } = await adminClient.from("workspace_members").insert({
      workspace_id: invitation.workspace_id,
      user_id: authUser.id,
      role: invitation.role,
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      joined_at: new Date().toISOString(),
    })

    if (memberError) {
      console.error("Add member error:", memberError)
      return apiError("Failed to join workspace")
    }

    // Update invitation status
    await adminClient
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)

    return apiResponse({
      success: true,
      message: `Welcome to ${invitation.workspace.name}!`,
      workspace: invitation.workspace,
      redirect: `/w/${invitation.workspace.slug}/dashboard`,
    })
  } catch (error) {
    console.error("POST /api/workspace-invitations/accept error:", error)
    return serverError()
  }
}

// GET endpoint to validate token without accepting (unchanged)
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return apiError("Token is required")
    }

    const { data: invitation, error } = await adminClient
      .from("workspace_invitations")
      .select(
        `
        id,
        email,
        role,
        message,
        expires_at,
        status,
        workspace:workspaces(
          id,
          name,
          slug,
          partner:partners(
            name,
            branding
          )
        )
      `
      )
      .eq("token", token)
      .single()

    if (error || !invitation) {
      return apiError("Invalid invitation")
    }

    if (invitation.status !== "pending") {
      return apiError(`This invitation has been ${invitation.status}`)
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return apiError("This invitation has expired")
    }

    return apiResponse(invitation)
  } catch (error) {
    console.error("GET /api/workspace-invitations/accept error:", error)
    return serverError()
  }
}
