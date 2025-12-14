"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { BrandingProvider } from "@/context/branding-context"
import type { User, Organization, Department, DepartmentPermission } from "@/types/database.types"

interface DashboardLayoutClientProps {
  user: User
  organization: Organization
  departments: (DepartmentPermission & { department: Department })[]
  children: React.ReactNode
}

export function DashboardLayoutClient({
  user,
  organization,
  departments,
  children,
}: DashboardLayoutClientProps) {
  return (
    <BrandingProvider organization={organization}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar organization={organization} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} organization={organization} />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">{children}</main>
        </div>
      </div>
    </BrandingProvider>
  )
}
