"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Search,
  Sun,
  Moon,
  CreditCard,
  PanelLeft,
  PanelLeftClose,
  Menu,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useTheme } from "@/context/theme-context"
import { cn } from "@/lib/utils"
import type { PartnerAuthUser, AccessibleWorkspace } from "@/types/database.types"
import type { ResolvedPartner } from "@/lib/api/partner"

interface Props {
  user: PartnerAuthUser
  partner: ResolvedPartner
  currentWorkspace: AccessibleWorkspace
  workspaces: AccessibleWorkspace[]
  isCollapsed: boolean
  onToggleSidebar: () => void
}

// Page name mapping for breadcrumbs
const pageNames: Record<string, string> = {
  dashboard: "Dashboard",
  agents: "Voice Agents",
  leads: "Leads",
  "knowledge-base": "Knowledge Base",
  integrations: "Integrations",
  telephony: "Telephony",
  billing: "Billing",
  analytics: "Analytics",
  calls: "Calls",
  members: "Members",
  settings: "Settings",
  conversations: "Conversations",
}

export function WorkspaceHeader({
  user,
  partner,
  currentWorkspace,
  workspaces,
  isCollapsed,
  onToggleSidebar,
}: Props) {
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user.email[0]?.toUpperCase() || "U"
  }

  const getDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "member":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: `/w/${currentWorkspace.slug}/dashboard` }]

    // Find the page segment (after /w/[slug]/)
    if (segments.length >= 3) {
      const pageSegment = segments[2]
      if (pageSegment) {
        const pageName = pageNames[pageSegment] || pageSegment
        crumbs.push({ label: pageName })
      }
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Left side - Collapse Button + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Desktop Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex h-9 w-9"
          onClick={onToggleSidebar}
        >
          {isCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-muted-foreground">/</span>}
                {crumb.href && !isLast ? (
                  <a
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className={cn(isLast ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {crumb.label}
                  </span>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            className="w-64 pl-9 pr-12 h-9"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hidden lg:block">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd>
          </span>
        </div>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {mounted ? (
            resolvedTheme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-3 border-b border-border">
              <h4 className="font-semibold">Notifications</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <div className="p-3 hover:bg-muted cursor-pointer bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">New call completed</p>
                    <p className="text-xs text-muted-foreground truncate">Customer Support Bot handled 5 calls</p>
                    <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
                  </div>
                </div>
              </div>
              <div className="p-3 hover:bg-muted cursor-pointer bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agent updated</p>
                    <p className="text-xs text-muted-foreground truncate">Sales Qualification Bot configuration changed</p>
                    <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                  </div>
                </div>
              </div>
              <div className="p-3 hover:bg-muted cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-transparent" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Weekly report ready</p>
                    <p className="text-xs text-muted-foreground truncate">Your analytics report for last week is available</p>
                    <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full">
                View all notifications
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/w/${currentWorkspace.slug}/settings`)}>
              <Settings className="w-4 h-4 mr-2" />
              Workspace Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/w/${currentWorkspace.slug}/billing`)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/select-workspace")}>
              <Building2 className="w-4 h-4 mr-2" />
              Switch Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
