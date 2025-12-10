import { createClient } from "@/lib/supabase/server"
import type { User, Organization } from "@/types/database.types"

export interface AuthContext {
  user: User
  organization: Organization
  supabase: Awaited<ReturnType<typeof createClient>>
}

/**
 * Get authenticated user and their organization
 * Use this in API routes that need user context
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Get user profile with organization
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*, organization:organizations(*)")
    .eq("id", authUser.id)
    .single()

  if (userError || !user) {
    return null
  }

  return {
    user: user as User,
    organization: (user as any).organization as Organization,
    supabase,
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: User, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role)
}

/**
 * Check if user is owner or admin
 */
export function isAdmin(user: User): boolean {
  return hasRole(user, ["owner", "admin"])
}
