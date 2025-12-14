import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["org_admin", "org_member"]).default("org_member"),
  message: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    // Only org_owner and org_admin can invite users
    if (!["org_owner", "org_admin"].includes(auth.user.role)) {
      return forbidden("You don't have permission to invite users")
    }

    const body = await request.json()
    const validation = inviteSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { email, role, message } = validation.data
    const adminClient = createAdminClient()

    // Check if user already exists in org
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("organization_id", auth.organization.id)
      .eq("email", email)
      .is("deleted_at", null)
      .single()

    if (existingUser) {
      return apiError("This user is already a member of your organization")
    }

    // Check for pending invitation
    const { data: existingInvite } = await adminClient
      .from("invitations")
      .select("id")
      .eq("organization_id", auth.organization.id)
      .eq("email", email)
      .eq("status", "pending")
      .single()

    if (existingInvite) {
      return apiError("An invitation is already pending for this email")
    }

    // Create invitation
    const { data: invitation, error } = await adminClient
      .from("invitations")
      .insert({
        type: "org_member",
        email,
        organization_id: auth.organization.id,
        role,
        message: message || null,
        invited_by: auth.user.id,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Create invitation error:", error)
      return serverError()
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    return apiResponse({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
      invitation_link: `${appUrl}/accept-invitation?token=${invitation.token}`,
    })
  } catch (error) {
    console.error("POST /api/users/invite error:", error)
    return serverError()
  }
}
