import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
      .from("users")
      .select("*")
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("List users error:", error)
      return serverError()
    }

    return apiResponse(users)
  } catch (error) {
    console.error("GET /api/users error:", error)
    return serverError()
  }
}
