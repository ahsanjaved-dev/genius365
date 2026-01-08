import { NextRequest } from "next/server"
import { getPartnerAuthContext, isPartnerAdmin } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError, getValidationError } from "@/lib/api/helpers"
import { sendPartnerInvitation } from "@/lib/email/send"
import { headers } from "next/headers"
import { z } from "zod"

const workspaceAssignmentSchema = z.object({
  workspace_id: z.string().uuid("Invalid workspace ID"),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
})

const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
  message: z.string().max(500).optional(),
  workspace_assignments: z.array(workspaceAssignmentSchema).optional(),
})

/**
 * GET /api/partner/invitations - List all pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getPartnerAuthContext()
    if (!ctx) return unauthorized()

    if (!isPartnerAdmin(ctx)) {
      return forbidden("Only admins and owners can view invitations")
    }

    const { data: invitations, error } = await ctx.adminClient
      .from("partner_invitations")
      .select(`
        id,
        email,
        role,
        message,
        status,
        token,
        expires_at,
        created_at,
        metadata,
        inviter:users!invited_by(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq("partner_id", ctx.partner.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("List partner invitations error:", error)
      return serverError()
    }

    return apiResponse(invitations)
  } catch (error) {
    console.error("GET /api/partner/invitations error:", error)
    return serverError()
  }
}

/**
 * POST /api/partner/invitations - Create a new invitation
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getPartnerAuthContext()
    if (!ctx) return unauthorized()

    if (!isPartnerAdmin(ctx)) {
      return forbidden("Only admins and owners can invite team members")
    }

    const body = await request.json()
    const validation = createInvitationSchema.safeParse(body)

    if (!validation.success) {
      const errors = getValidationError(validation.error)
      return apiError(errors)
    }

    const { email, role, message, workspace_assignments } = validation.data

    // Only owners can invite other owners
    if (role === "owner" && ctx.partnerRole !== "owner") {
      return forbidden("Only owners can invite other owners")
    }

    // Validate workspace assignments - ensure all workspaces belong to this partner
    if (workspace_assignments && workspace_assignments.length > 0) {
      const workspaceIds = workspace_assignments.map((wa) => wa.workspace_id)
      const { data: validWorkspaces } = await ctx.adminClient
        .from("workspaces")
        .select("id")
        .eq("partner_id", ctx.partner.id)
        .in("id", workspaceIds)
        .is("deleted_at", null)

      const validIds = new Set(validWorkspaces?.map((w) => w.id) || [])
      const invalidIds = workspaceIds.filter((id) => !validIds.has(id))

      if (invalidIds.length > 0) {
        return apiError("Some workspaces are invalid or don't belong to this organization")
      }
    }

    // Check if user is already a member
    const { data: { users } } = await ctx.adminClient.auth.admin.listUsers()
    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
      const { data: existingMember } = await ctx.adminClient
        .from("partner_members")
        .select("id")
        .eq("partner_id", ctx.partner.id)
        .eq("user_id", existingUser.id)
        .is("removed_at", null)
        .maybeSingle()

      if (existingMember) {
        return apiError("This user is already a team member")
      }
    }

    // Check if already invited
    const { data: existingInvitation } = await ctx.adminClient
      .from("partner_invitations")
      .select("id")
      .eq("partner_id", ctx.partner.id)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle()

    if (existingInvitation) {
      return apiError("An invitation is already pending for this email")
    }

    // Create the invitation with workspace assignments in metadata
    const metadata = workspace_assignments && workspace_assignments.length > 0
      ? { workspace_assignments }
      : {}

    const { data: invitation, error } = await ctx.adminClient
      .from("partner_invitations")
      .insert({
        partner_id: ctx.partner.id,
        email,
        role,
        message: message || null,
        invited_by: ctx.user.id,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error("Create partner invitation error:", error)
      return apiError("Failed to create invitation")
    }

    // Build invite link
    const headersList = await headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const inviteLink = `${protocol}://${host}/accept-partner-invitation?token=${invitation.token}`

    // Get workspace names for assignments (if any)
    let workspaceAssignmentDetails: { name: string; role: string }[] = []
    if (workspace_assignments && workspace_assignments.length > 0) {
      const workspaceIds = workspace_assignments.map((wa) => wa.workspace_id)
      const { data: workspacesData } = await ctx.adminClient
        .from("workspaces")
        .select("id, name")
        .in("id", workspaceIds)

      const wsMap = new Map(workspacesData?.map((w) => [w.id, w.name]) || [])
      workspaceAssignmentDetails = workspace_assignments.map((wa) => ({
        name: wsMap.get(wa.workspace_id) || wa.workspace_id,
        role: wa.role,
      }))
    }

    // Send email invitation
    try {
      const inviterName = ctx.user.first_name
        ? `${ctx.user.first_name} ${ctx.user.last_name || ""}`.trim()
        : ctx.user.email

      await sendPartnerInvitation(
        email,
        ctx.partner.name,
        inviterName,
        inviteLink,
        role,
        invitation.expires_at,
        workspaceAssignmentDetails.length > 0 ? workspaceAssignmentDetails : undefined,
        message || undefined,
        ctx.partner.branding?.primary_color,
        ctx.partner.branding?.logo_url
      )

      console.log(`[Partner Invitation] Email sent to: ${email}`)
    } catch (emailError) {
      console.error("Failed to send partner invitation email:", emailError)
      // Don't fail the request if email fails - invitation is still created
    }

    return apiResponse({ ...invitation, invite_link: inviteLink }, 201)
  } catch (error) {
    console.error("POST /api/partner/invitations error:", error)
    return serverError()
  }
}

