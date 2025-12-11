// lib/api/super-admin-auth.ts
import { createClient } from "@/lib/supabase/server"
import type { SuperAdmin } from "@/types/database.types"

export interface SuperAdminContext {
  superAdmin: SuperAdmin
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function getSuperAdminContext(): Promise<SuperAdminContext | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  const { data: superAdmin, error: superAdminError } = await supabase
    .from("super_admins")
    .select("*")
    .eq("id", authUser.id)
    .eq("is_active", true)
    .single()

  if (superAdminError || !superAdmin) {
    return null
  }

  return {
    superAdmin: superAdmin as SuperAdmin,
    supabase,
  }
}

export function isSuperAdmin(permissions: string[]): boolean {
  return permissions.includes("all")
}
