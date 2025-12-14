"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Plug,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Building2,
  Users,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Organization } from "@/types/database.types"

const navigation = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", href: "/agents", icon: Bot },
  { title: "Conversations", href: "/conversations", icon: MessageSquare },
  { title: "Departments", href: "/departments", icon: Building2 },
  { title: "Users", href: "/users", icon: Users },
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  organization: Organization
}

export function Sidebar({ organization }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const branding = organization.branding || {}
  const companyName = branding.company_name || organization.name
  const primaryColor = branding.primary_color || "#7c3aed"

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo/Company Section */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={companyName}
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {companyName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold truncate max-w-[160px]">{companyName}</h1>
            <p className="text-xs text-gray-400">AI Voice Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive ? "text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              style={isActive ? { backgroundColor: primaryColor } : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  )
}
