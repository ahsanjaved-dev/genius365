import { createClient } from "@/lib/supabase/server"
import type { User, Organization } from "@/types/database.types"

export interface AuthContext {
  user: User
  organization: Organization
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

export function hasRole(user: User, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role)
}

export function isAdmin(user: User): boolean {
  return hasRole(user, ["owner", "admin"])
}
