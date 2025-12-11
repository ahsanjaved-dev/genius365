import { NextRequest } from "next/server"
import { getAuthContext, isOrgAdmin, hasDepartmentAccess } from "@/lib/api/auth"
import {
  apiResponse,
  apiError,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/helpers"
import { updateDepartmentSchema } from "@/types/api.types"
import { createAdminClient } from "@/lib/supabase/admin"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    const { data: department, error } = await auth.supabase
      .from("departments")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)
      .single()

    if (error || !department) {
      return notFound("Department")
    }

    return apiResponse(department)
  } catch (error) {
    console.error("GET /api/departments/[id] error:", error)
    return serverError()
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    // Check if user has admin access
    const canEdit =
      isOrgAdmin(auth.user) || hasDepartmentAccess(auth.departments, id, ["owner", "admin"])

    if (!canEdit) {
      return forbidden()
    }

    const body = await request.json()
    const validation = updateDepartmentSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const adminSupabase = createAdminClient()

    // If updating slug, check uniqueness
    if (validation.data.slug) {
      const { data: existing } = await adminSupabase
        .from("departments")
        .select("id")
        .eq("organization_id", auth.organization.id)
        .eq("slug", validation.data.slug)
        .neq("id", id)
        .is("deleted_at", null)
        .single()

      if (existing) {
        return apiError("A department with this slug already exists")
      }
    }

    const { data: department, error } = await adminSupabase
      .from("departments")
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .select()
      .single()

    if (error) {
      console.error("Update department error:", error)
      return apiError("Failed to update department")
    }

    return apiResponse(department)
  } catch (error) {
    console.error("PATCH /api/departments/[id] error:", error)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    if (!isOrgAdmin(auth.user)) {
      return forbidden()
    }

    const adminSupabase = createAdminClient()

    // Check if department has agents
    const { count: agentCount } = await adminSupabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("department_id", id)
      .is("deleted_at", null)

    if (agentCount && agentCount > 0) {
      return apiError(
        `Cannot delete department with ${agentCount} active agent(s). Please delete or reassign agents first.`
      )
    }

    // Soft delete
    const { error } = await adminSupabase
      .from("departments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", auth.organization.id)

    if (error) {
      console.error("Delete department error:", error)
      return apiError("Failed to delete department")
    }

    return apiResponse({ success: true })
  } catch (error) {
    console.error("DELETE /api/departments/[id] error:", error)
    return serverError()
  }
}
