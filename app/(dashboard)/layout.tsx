import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/api/auth"
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext()

  if (!auth) {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (authUser) {
      // ✅ User has auth session but no DB row
      // Instead of redirecting (which causes loop), check if user row actually exists
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUser.id)
        .single()

      if (userRow) {
        // User row exists but getAuthContext failed - might be a transient error
        // Redirect to a neutral page that won't cause a loop
        console.error("[DashboardLayout] User row exists but getAuthContext failed. Refreshing...")
        // Force a hard refresh by redirecting to same page with cache buster
        redirect(`/dashboard?_t=${Date.now()}`)
      }

      // User truly doesn't have a row - this is a setup issue
      // Redirect to a dedicated setup page (not /signup which causes loop)
      redirect("/setup-profile")
    }

    // No auth session at all
    redirect("/login")
  }

  return (
    <DashboardLayoutClient
      user={auth.user}
      organization={auth.organization}
      departments={auth.departments}
    >
      {children}
    </DashboardLayoutClient>
  )
}
