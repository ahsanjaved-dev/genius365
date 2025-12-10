import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, serverError } from "@/lib/api/helpers"
import { updateOrganizationSchema } from "@/types/api.types"

// GET /api/organizations - Get current user's organization
export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    return apiResponse(auth.organization)
  } catch (error) {
    console.error("GET /api/organizations error:", error)
    return serverError()
  }
}

// PATCH /api/organizations - Update current organization
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    // Only owner/admin can update organization
    if (!["owner", "admin"].includes(auth.user.role)) {
      return apiError("Only owners and admins can update organization settings", 403)
    }

    const body = await request.json()
    const validation = updateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { data: updated, error } = await auth.supabase
      .from("organizations")
      .update(validation.data)
      .eq("id", auth.organization.id)
      .select()
      .single()

    if (error) {
      console.error("Update organization error:", error)
      return apiError("Failed to update organization")
    }

    return apiResponse(updated)
  } catch (error) {
    console.error("PATCH /api/organizations error:", error)
    return serverError()
  }
}
