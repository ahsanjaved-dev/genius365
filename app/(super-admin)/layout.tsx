import { redirect } from "next/navigation"
import { getSuperAdminContext } from "@/lib/api/super-admin-auth"
import { SuperAdminSidebar } from "@/components/super-admin/sidebar"
import { SuperAdminHeader } from "@/components/super-admin/header"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getSuperAdminContext()

  if (!context) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SuperAdminHeader superAdmin={context.superAdmin} />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
