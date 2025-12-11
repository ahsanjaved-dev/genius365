"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
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

export function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">{siteConfig.name}</h1>
        <p className="text-xs text-gray-400 mt-1">AI Voice Platform</p>
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
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
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
