"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  ChevronRight, 
  Plus, 
  LogOut, 
  Sparkles,
  Crown,
  Shield,
  User,
  Eye
} from "lucide-react"
import type { AccessibleWorkspace, PartnerAuthUser } from "@/types/database.types"
import type { ResolvedPartner } from "@/lib/api/partner"

interface Props {
  workspaces: AccessibleWorkspace[]
  partner: ResolvedPartner
  user: PartnerAuthUser
  canCreateWorkspace?: boolean
}

// Generate a consistent color based on string
function getWorkspaceColor(str: string): string {
  const colors = [
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
  return colors[Math.abs(hash) % colors.length] ?? colors[0]
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
  owner: { icon: Crown, label: "Owner", variant: "default" as const, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  admin: { icon: Shield, label: "Admin", variant: "secondary" as const, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  member: { icon: User, label: "Member", variant: "outline" as const, className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  viewer: { icon: Eye, label: "Viewer", variant: "outline" as const, className: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
}

export function WorkspaceSelector({
  workspaces,
  partner,
  user,
  canCreateWorkspace = false,
}: Props) {
  const branding = partner.branding
  const primaryColor = branding.primary_color || "#7c3aed"
  const companyName = branding.company_name || partner.name

  return (
    <div className="w-full max-w-xl">
      {/* Header Section */}
      <div className="text-center mb-8">
        {branding.logo_url ? (
          <img src={branding.logo_url} alt={companyName} className="h-10 mx-auto mb-6" />
        ) : (
          <div
            className="h-14 w-14 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25"
            style={{ backgroundColor: primaryColor }}
          >
            {companyName[0]}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Welcome back!
        </h1>
        <p className="text-muted-foreground">
          Select a workspace to continue
        </p>
      </div>

      {/* Workspace Grid */}
      <div className="space-y-3 mb-6">
        {workspaces.map((workspace) => {
          const roleInfo = roleConfig[workspace.role as keyof typeof roleConfig] || roleConfig.member
          const RoleIcon = roleInfo.icon
          const gradientClass = getWorkspaceColor(workspace.name)

          return (
            <Link
              key={workspace.id}
              href={`/w/${workspace.slug}/dashboard`}
              className={cn(
                "group relative flex items-center gap-4 p-4 rounded-2xl",
                "bg-card border border-border/50",
                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5"
              )}
            >
              {/* Workspace Avatar */}
              <div className={cn(
                "relative h-12 w-12 rounded-xl flex items-center justify-center",
                "text-white font-semibold text-sm shrink-0",
                "bg-gradient-to-br shadow-md",
                gradientClass
              )}>
                {getInitials(workspace.name)}
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Workspace Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {workspace.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs font-medium border", roleInfo.className)}
                  >
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {roleInfo.label}
                  </Badge>
                  {workspace.description && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      {workspace.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )
        })}

        {/* Create Workspace Button */}
        {canCreateWorkspace && (
          <Link
            href="/workspace-onboarding"
            className={cn(
              "group flex items-center justify-center gap-3 p-4 rounded-2xl",
              "border-2 border-dashed border-muted-foreground/20",
              "hover:border-primary/40 hover:bg-primary/5",
              "text-muted-foreground hover:text-primary",
              "transition-all duration-200"
            )}
          >
            <div className="h-10 w-10 rounded-xl border-2 border-current border-dashed flex items-center justify-center group-hover:border-solid">
              <Plus className="h-5 w-5" />
            </div>
            <span className="font-medium">Create New Workspace</span>
          </Link>
        )}
      </div>

      {/* User Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {user.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Signed in as </span>
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}
