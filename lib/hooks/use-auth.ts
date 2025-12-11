"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCallback, useMemo } from "react"

export function useAuth() {
  const router = useRouter()

  // ✅ Memoize the client to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }, [supabase, router])

  return { logout, supabase }
}
