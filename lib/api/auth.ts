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
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Get user with organization
  const { data: user, error: userError } = await supabase
    .from("users")
    .select(
      `
      *,
      organization:organizations(*)
    `
    )
    .eq("id", authUser.id)
    .single()

  if (userError || !user) {
    return null
  }

  // Get user's department permissions
  const { data: departmentPermissions, error: deptError } = await supabase
    .from("department_permissions")
    .select(
      `
      *,
      department:departments(*)
    `
    )
    .eq("user_id", authUser.id)
    .is("revoked_at", null)

  if (deptError) {
    console.error("Error fetching department permissions:", deptError)
  }

  return {
    user: user as User,
    organization: (user as any).organization as Organization,
    departments: (departmentPermissions || []) as (DepartmentPermission & {
      department: Department
    })[],
    supabase,
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
