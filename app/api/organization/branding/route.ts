import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const brandingSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  logo_url: z.string().url().optional().nullable(),
  favicon_url: z.string().url().optional().nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    // Only org_owner and org_admin can update branding
    if (!["org_owner", "org_admin"].includes(auth.user.role)) {
      return forbidden("You don't have permission to update branding")
    }

    const body = await request.json()
    const validation = brandingSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const adminClient = createAdminClient()

    // Get current branding
    const { data: currentOrg } = await adminClient
      .from("organizations")
      .select("branding")
      .eq("id", auth.organization.id)
      .single()

    // Merge with existing branding
    const updatedBranding = {
      ...(currentOrg?.branding || {}),
      ...validation.data,
    }

    const { data: organization, error } = await adminClient
      .from("organizations")
      .update({ branding: updatedBranding })
      .eq("id", auth.organization.id)
      .select()
      .single()

    if (error) {
      console.error("Update branding error:", error)
      return serverError()
    }

    return apiResponse(organization)
  } catch (error) {
    console.error("PATCH /api/organization/branding error:", error)
    return serverError()
  }
}
