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
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUser.id)
        .single()

      if (userRow) {
        console.error("[DashboardLayout] User row exists but getAuthContext failed. Refreshing...")

        redirect(`/dashboard?_t=${Date.now()}`)
      }

      redirect("/setup-profile")
    }

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
