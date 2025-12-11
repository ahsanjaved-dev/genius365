import { NextRequest } from "next/server"
import { getAuthContext, isOrgAdmin } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import { createDepartmentSchema } from "@/types/api.types"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search")

    let query = auth.supabase
      .from("departments")
      .select("*", { count: "exact" })
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: departments, error, count } = await query

    if (error) {
      console.error("List departments error:", error)
      return apiError("Failed to fetch departments")
    }

    return apiResponse({
      data: departments,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("GET /api/departments error:", error)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    // Only org admins/owners can create departments
    if (!isOrgAdmin(auth.user)) {
      return forbidden()
    }

    const body = await request.json()
    const validation = createDepartmentSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    // Use admin client for write operations (bypasses RLS)
    const adminSupabase = createAdminClient()

    // Check if slug is unique within organization
    const { data: existing } = await adminSupabase
      .from("departments")
      .select("id")
      .eq("organization_id", auth.organization.id)
      .eq("slug", validation.data.slug)
      .is("deleted_at", null)
      .single()

    if (existing) {
      return apiError("A department with this slug already exists")
    }

    // Check organization department limit
    const orgLimits = auth.organization.resource_limits as any
    const maxDepartments = orgLimits?.max_departments || 10

    const { count } = await adminSupabase
      .from("departments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)

    if (count && count >= maxDepartments) {
      return apiError(`Department limit reached. Maximum: ${maxDepartments} departments.`, 403)
    }

    const { data: department, error } = await adminSupabase
      .from("departments")
      .insert({
        organization_id: auth.organization.id,
        name: validation.data.name,
        description: validation.data.description,
        slug: validation.data.slug,
        resource_limits: validation.data.resource_limits || {
          max_agents: 5,
          max_users: 10,
          max_minutes_per_month: 1000,
        },
        created_by: auth.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Create department error:", error)
      return apiError("Failed to create department")
    }

    // Auto-assign creator as department owner
    await adminSupabase.from("department_permissions").insert({
      user_id: auth.user.id,
      department_id: department.id,
      role: "owner",
      granted_by: auth.user.id,
    })

    return apiResponse(department, 201)
  } catch (error) {
    console.error("POST /api/departments error:", error)
    return serverError()
  }
}
