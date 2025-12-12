import { NextRequest } from "next/server"
import { getSuperAdminContext } from "@/lib/api/super-admin-auth"
import { apiResponse, apiError, unauthorized, notFound, serverError } from "@/lib/api/helpers"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  plan_tier: z.enum(["starter", "professional", "enterprise", "custom"]).optional(),
  subscription_status: z.enum(["trialing", "active", "past_due", "canceled", "unpaid"]).optional(),
  resource_limits: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getSuperAdminContext()
    if (!context) return unauthorized()

    const { id } = await params

    const { data: organization, error } = await context.supabase
      .from("organizations")
      .select(
        `
        *,
        departments:departments(count),
        users:users(count),
        ai_agents:ai_agents(count)
      `
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (error || !organization) {
      return notFound("Organization")
    }

    return apiResponse(organization)
  } catch (error) {
    console.error("GET /api/super-admin/organizations/[id] error:", error)
    return serverError()
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getSuperAdminContext()
    if (!context) return unauthorized()

    const { id } = await params
    const body = await request.json()
    const validation = updateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { data: organization, error } = await context.supabase
      .from("organizations")
      .update({
        ...validation.data,
        resource_limits: validation.data.resource_limits as any,
        features: validation.data.features as any,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update organization error:", error)
      return apiError("Failed to update organization")
    }

    return apiResponse(organization)
  } catch (error) {
    console.error("PATCH /api/super-admin/organizations/[id] error:", error)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getSuperAdminContext()
    if (!context) return unauthorized()

    const { id } = await params

    const { error } = await context.supabase
      .from("organizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("Delete organization error:", error)
      return apiError("Failed to delete organization")
    }

    return apiResponse({ success: true })
  } catch (error) {
    console.error("DELETE /api/super-admin/organizations/[id] error:", error)
    return serverError()
  }
}
