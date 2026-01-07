"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bot,
  Phone,
  LayoutGrid,
  Loader2,
  Plus,
  TrendingUp,
  ArrowRight,
  Activity,
  Clock,
  DollarSign,
  Users,
  Building2,
  Shield,
  Crown,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ============================================================================
// ROLE BADGE COMPONENT
// ============================================================================

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null
  
  const config = {
    owner: { icon: Crown, label: "Owner", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    admin: { icon: Shield, label: "Admin", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    member: { icon: Users, label: "Member", className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
    viewer: { icon: Users, label: "Viewer", className: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  }
  
  const roleConfig = config[role as keyof typeof config] || config.member
  const Icon = roleConfig.icon
  
  return (
    <Badge variant="outline" className={cn("gap-1", roleConfig.className)}>
      <Icon className="h-3 w-3" />
      {roleConfig.label}
    </Badge>
  )
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  iconClassName?: string
  trend?: string
  isLoading?: boolean
}

function StatCard({ label, value, icon: Icon, iconClassName, trend, isLoading }: StatCardProps) {
  return (
    <Card className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="stat-label">{label}</p>
          {isLoading ? (
            <div className="flex items-center gap-2 mt-1">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p className="stat-value">{value}</p>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconClassName || "bg-primary/10")}>
          <Icon className="w-6 h-6 text-inherit" />
        </div>
      </div>
      {trend && (
        <div className="stat-trend positive">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const baseUrl = `/w/${workspaceSlug}`

  const { 
    workspace: workspaceStats, 
    partner: partnerStats, 
    roles,
    isLoading,
    isLoadingWorkspace,
    isLoadingPartner,
    error 
  } = useDashboardData()

  const { workspaceRole, partnerRole, canViewPartnerStats, isWorkspaceAdmin, isPartnerAdmin } = roles

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Dashboard</h1>
            <RoleBadge role={workspaceRole} />
          </div>
          <p className="text-muted-foreground mt-1">
            {canViewPartnerStats 
              ? "Overview of your workspace and organization performance"
              : "Overview of your workspace performance"
            }
          </p>
        </div>
        <Button asChild>
          <Link href={`${baseUrl}/agents/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load dashboard stats. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workspace Stats - Always visible for workspace members */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Workspace Overview</h2>
          <Badge variant="secondary" className="text-xs">This Workspace</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Agents in this workspace */}
          <StatCard
            label="Agents"
            value={workspaceStats?.total_agents ?? 0}
            icon={Bot}
            iconClassName="bg-primary/10 text-primary"
            trend="In this workspace"
            isLoading={isLoadingWorkspace}
          />

          {/* Conversations */}
          <StatCard
            label="Total Conversations"
            value={workspaceStats?.total_conversations ?? 0}
            icon={MessageSquare}
            iconClassName="bg-blue-500/10 text-blue-600"
            trend="All time"
            isLoading={isLoadingWorkspace}
          />

          {/* Minutes this month */}
          <StatCard
            label="Minutes This Month"
            value={Math.round(workspaceStats?.minutes_this_month ?? 0)}
            icon={Clock}
            iconClassName="bg-amber-500/10 text-amber-600"
            trend="Current billing period"
            isLoading={isLoadingWorkspace}
          />

          {/* Cost this month */}
          <StatCard
            label="Cost This Month"
            value={`$${(workspaceStats?.cost_this_month ?? 0).toFixed(2)}`}
            icon={DollarSign}
            iconClassName="bg-green-500/10 text-green-600"
            trend="Current billing period"
            isLoading={isLoadingWorkspace}
          />
        </div>
      </div>

      {/* Organization Stats - Only visible for partner admins/owners */}
      {canViewPartnerStats && (
        <>
          <Separator className="my-6" />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Organization Overview</h2>
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                Admin View
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Workspaces */}
              <StatCard
                label="Total Workspaces"
                value={partnerStats?.total_workspaces ?? 0}
                icon={LayoutGrid}
                iconClassName="bg-violet-500/10 text-violet-600"
                trend="Across organization"
                isLoading={isLoadingPartner}
              />

              {/* Total Agents (All Workspaces) */}
              <StatCard
                label="Total Agents"
                value={partnerStats?.total_agents_all_workspaces ?? 0}
                icon={Bot}
                iconClassName="bg-emerald-500/10 text-emerald-600"
                trend="Across all workspaces"
                isLoading={isLoadingPartner}
              />

              {/* Total Calls Today */}
              <StatCard
                label="Total Calls Today"
                value={partnerStats?.total_calls_today ?? 0}
                icon={Phone}
                iconClassName="bg-orange-500/10 text-orange-600"
                trend="Across all workspaces"
                isLoading={isLoadingPartner}
              />
            </div>
          </div>
        </>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Over Time Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Calls Over Time</CardTitle>
              <Select defaultValue="7">
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No call data yet</p>
                <p className="text-xs">Charts will appear when you have calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Outcomes Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Call Outcomes</CardTitle>
              <Badge variant="secondary">This Week</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No outcome data yet</p>
                <p className="text-xs">Charts will appear when you have calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Calls</CardTitle>
              <Link
                href={`${baseUrl}/calls`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent calls</p>
              <p className="text-xs">Calls will appear here as they happen</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href={`${baseUrl}/agents/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Agent
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`${baseUrl}/agents`}>
                <Bot className="mr-2 h-4 w-4" />
                View All Agents
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`${baseUrl}/calls`}>
                <Phone className="mr-2 h-4 w-4" />
                View Call Logs
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`${baseUrl}/analytics`}>
                <Activity className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
            {isWorkspaceAdmin && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`${baseUrl}/members`}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State for Agents */}
      {!isLoading && workspaceStats?.total_agents === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No agents yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-2">
              Create your first AI voice agent to start handling calls and automating conversations.
            </p>
            <Button asChild className="mt-6">
              <Link href={`${baseUrl}/agents/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Agent
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
