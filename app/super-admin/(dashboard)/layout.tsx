import { redirect } from "next/navigation"
import { getSuperAdminContext } from "@/lib/api/super-admin-auth"
import { getPartnerFromHost } from "@/lib/api/partner"
import { SuperAdminLayoutClient } from "@/components/super-admin/super-admin-layout-client"

export default async function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await getSuperAdminContext()

  if (!context) {
    redirect("/super-admin/login")
  }

  // Get platform partner branding for logo
  const partner = await getPartnerFromHost()

  return <SuperAdminLayoutClient superAdmin={context.superAdmin} partner={partner}>{children}</SuperAdminLayoutClient>
}
