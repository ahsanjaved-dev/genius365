import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiResponse, apiError, serverError, notFound } from "@/lib/api/helpers"
import { z } from "zod"

const acceptInvitationSchema = z.object({
  organization_id: z.string().uuid(),
  password: z.string().min(8),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = acceptInvitationSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { organization_id, password, first_name, last_name } = validation.data

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organization_id)
      .is("deleted_at", null)
      .single()

    if (orgError || !organization) {
      return notFound("Organization")
    }

    const { data: existingOwner } = await supabase
      .from("users")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("role", "org_owner")
      .single()

    if (existingOwner) {
      return apiError("This organization already has an owner")
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return apiError("Please sign up first")
    }

    const { error: userError } = await supabase.from("users").insert({
      id: authUser.id,
      organization_id: organization.id,
      email: authUser.email!,
      first_name,
      last_name,
      role: "org_owner",
      status: "active",
      invitation_accepted_at: new Date().toISOString(),
    })

    if (userError) {
      console.error("Create user error:", userError)
      return apiError("Failed to create user profile")
    }

    await supabase
      .from("organizations")
      .update({
        activated_at: new Date().toISOString(),
        onboarding_step: 1,
      })
      .eq("id", organization.id)

    return apiResponse({
      success: true,
      organization,
      message: "Welcome to Inspralv! Let's set up your organization.",
    })
  } catch (error) {
    console.error("POST /api/organizations/accept-invitation error:", error)
    return serverError()
  }
}
