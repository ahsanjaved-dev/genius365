"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  LayoutGrid,
  Bot,
  Users,
  BookOpen,
  Plug,
  PhoneCall,
  CreditCard,
  BarChart3,
  Phone,
  ChevronDown,
  Check,
  Building2,
  UserPlus,
  Plus,
  Crown,
  Shield,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AccessibleWorkspace } from "@/types/database.types"
import type { ResolvedPartner } from "@/lib/api/partner"

interface Props {
  partner: ResolvedPartner
  currentWorkspace: AccessibleWorkspace
  workspaces: AccessibleWorkspace[]
  isCollapsed: boolean
  partnerRole?: "owner" | "admin" | "member" | null
}

// Generate a consistent gradient based on string
function getWorkspaceGradient(str: string): string {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
    "from-cyan-500 to-teal-500",
    "from-fuchsia-500 to-pink-500",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length] ?? "from-violet-500 to-purple-600"
}

// Get initials from workspace name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const roleConfig = {
  owner: { icon: Crown, label: "Owner" },
  admin: { icon: Shield, label: "Admin" },
  member: { icon: User, label: "Member" },
  viewer: { icon: User, label: "Viewer" },
}

export function WorkspaceSidebar({ partner, currentWorkspace, workspaces, isCollapsed, partnerRole }: Props) {
  const pathname = usePathname()

  const branding = partner.branding
  const primaryColor = branding.primary_color || "#7c3aed"
  const companyName = branding.company_name || partner.name

  // Navigation items scoped to current workspace
  const baseUrl = `/w/${currentWorkspace.slug}`
  
  // Role-based navigation - some items only for admins/owners
  const isWorkspaceAdmin = currentWorkspace.role === "owner" || currentWorkspace.role === "admin"
  const isPartnerAdmin = partnerRole === "owner" || partnerRole === "admin"

  const navigation = [
    { title: "Dashboard", href: `${baseUrl}/dashboard`, icon: LayoutDashboard },
    { title: "Agents", href: `${baseUrl}/agents`, icon: Bot },
    { title: "Leads", href: `${baseUrl}/leads`, icon: Users },
    { title: "Knowledge Base", href: `${baseUrl}/knowledge-base`, icon: BookOpen },
    { title: "Integrations", href: `${baseUrl}/integrations`, icon: Plug },
    { title: "Telephony", href: `${baseUrl}/telephony`, icon: PhoneCall },
    ...(isWorkspaceAdmin ? [{ title: "Billing", href: `${baseUrl}/billing`, icon: CreditCard }] : []),
    { title: "Analytics", href: `${baseUrl}/analytics`, icon: BarChart3 },
    { title: "Calls", href: `${baseUrl}/calls`, icon: Phone },
    ...(isWorkspaceAdmin ? [{ title: "Workspace Team", href: `${baseUrl}/members`, icon: Users }] : []),
  ]
  
  // Organization-level navigation (for partner admins/owners)
  const orgNavigation = isPartnerAdmin ? [
    { title: "Organization Team", href: `/org/team`, icon: Building2 },
    { title: "Invite Members", href: `/org/invitations`, icon: UserPlus },
  ] : []

  return (
    <div
      className={cn(
        "hidden lg:flex flex-col h-full bg-card border-r border-border shrink-0 transition-[width] duration-300",
        isCollapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      {/* Partner Logo - Fixed at top */}
      <div className={cn("p-4 border-b border-border shrink-0", isCollapsed && "px-2")}>
        <Link
          href={`${baseUrl}/dashboard`}
          className={cn("flex items-center gap-3", isCollapsed && "justify-center")}
        >
          {branding.logo_url ? (
            isCollapsed ? (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {companyName[0]}
              </div>
            ) : (
              <img
                src={branding.logo_url}
                alt={companyName}
                className="h-8 max-w-[10rem] object-contain"
              />
            )
          ) : (
            <>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {companyName[0]}
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold text-foreground">{companyName}</span>
              )}
            </>
          )}
        </Link>
      </div>

      {/* Workspace Selector - Redesigned */}
      <div className={cn("p-3 shrink-0", isCollapsed && "px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all group outline-none",
                "bg-muted/50 hover:bg-muted border border-border/50 hover:border-border",
                isCollapsed ? "p-2 justify-center" : "p-2.5"
              )}
              title={isCollapsed ? currentWorkspace.name : undefined}
            >
              <div
                className={cn(
                  "rounded-lg flex items-center justify-center text-white font-semibold text-xs shrink-0 bg-gradient-to-br shadow-sm",
                  isCollapsed ? "h-8 w-8" : "h-9 w-9",
                  getWorkspaceGradient(currentWorkspace.name)
                )}
              >
                {getInitials(currentWorkspace.name)}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{currentWorkspace.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentWorkspace.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-80 p-2" 
            sideOffset={8}
          >
            {/* Current Workspace Header */}
            <div className="px-2 py-1.5 mb-1">
              <p className="text-xs font-medium text-muted-foreground">Switch workspace</p>
            </div>

            {/* Workspace List */}
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {workspaces.map((ws) => {
                const isCurrent = ws.id === currentWorkspace.id
                const roleInfo = roleConfig[ws.role as keyof typeof roleConfig] || roleConfig.member

                return (
                  <DropdownMenuItem key={ws.id} asChild className="p-0 focus:bg-transparent">
                    <Link
                      href={`/w/${ws.slug}/dashboard`}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer w-full transition-colors",
                        isCurrent 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted border border-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0 bg-gradient-to-br shadow-sm",
                          getWorkspaceGradient(ws.name)
                        )}
                      >
                        {getInitials(ws.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{ws.name}</p>
                          {isCurrent && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <roleInfo.icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{roleInfo.label}</span>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </div>

            <DropdownMenuSeparator className="my-2" />

            {/* Actions */}
            <div className="space-y-0.5">
              {isPartnerAdmin && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/workspace-onboarding"
                    className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg"
                  >
                    <div className="h-8 w-8 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">Create workspace</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link
                  href="/select-workspace"
                  className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium">View all workspaces</span>
                </Link>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="mx-3 shrink-0" />

      {/* Navigation - Scrollable area that takes remaining space */}
      <ScrollArea className="flex-1 min-h-0">
        <nav className={cn("space-y-1 py-4", isCollapsed ? "px-2" : "px-3")}>
          {/* Workspace Navigation */}
          {!isCollapsed && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              Workspace
            </p>
          )}
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
          
          {/* Organization Navigation (for partner admins/owners) */}
          {orgNavigation.length > 0 && (
            <>
              {!isCollapsed && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-4">
                  Organization
                </p>
              )}
              {isCollapsed && <Separator className="my-2" />}
              {orgNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                      isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </ScrollArea>

    </div>
  )
}
