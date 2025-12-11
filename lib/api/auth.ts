// lib/api/auth.ts
import { createClient } from "@/lib/supabase/server"
import type { User, Organization, Department, DepartmentPermission } from "@/types/database.types"

export interface AuthContext {
  user: User
  organization: Organization
  departments: (DepartmentPermission & { department: Department })[]
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[getAuthContext] No auth user:", authError?.message)
      return null
    }

    // Get user with organization - with retry logic
    let user = null
    let userError = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from("users")
        .select(`*, organization:organizations(*)`)
        .eq("id", authUser.id)
        .single()

      user = result.data
      userError = result.error

      if (user) break

      // Wait before retry
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
      }
    }

    if (userError) {
      console.error(
        "[getAuthContext] User query error:",
        userError.message,
        "for user:",
        authUser.id
      )
    }

    if (!user) {
      console.error("[getAuthContext] No user row found for:", authUser.id)
      return null
    }

    // Get user's department permissions
    const { data: departmentPermissions, error: deptError } = await supabase
      .from("department_permissions")
      .select(`*, department:departments(*)`)
      .eq("user_id", authUser.id)
      .is("revoked_at", null)

    if (deptError) {
      console.error("[getAuthContext] Department permissions error:", deptError)
    }

    return {
      user: user as User,
      organization: (user as any).organization as Organization,
      departments: (departmentPermissions || []) as (DepartmentPermission & {
        department: Department
      })[],
      supabase,
    }
  } catch (error) {
    console.error("[getAuthContext] Unexpected error:", error)
    return null
  }
}

export function hasRole(user: User, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role)
}

export function isOrgOwner(user: User): boolean {
  return hasRole(user, ["org_owner"])
}

export function isOrgAdmin(user: User): boolean {
  return hasRole(user, ["org_owner", "org_admin"])
}

export function hasDepartmentAccess(
  departments: (DepartmentPermission & { department: Department })[],
  departmentId: string,
  requiredRoles?: string[]
): boolean {
  const permission = departments.find((d) => d.department_id === departmentId)
  if (!permission) return false
  if (!requiredRoles) return true
  return requiredRoles.includes(permission.role)
}
