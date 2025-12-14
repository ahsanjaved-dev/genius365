import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const adminClient = createAdminClient()

    const { data: organization, error } = await adminClient
      .from("organizations")
      .select("*")
      .eq("id", auth.organization.id)
      .single()

    if (error) {
      console.error("Get organization error:", error)
      return serverError()
    }

    return apiResponse(organization)
  } catch (error) {
    console.error("GET /api/organization error:", error)
    return serverError()
  }
}
