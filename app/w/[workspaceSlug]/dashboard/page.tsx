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
} from "lucide-react"
import Link from "next/link"
import { usePartnerDashboardStats } from "@/lib/hooks/use-partner-dashboard-stats"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const baseUrl = `/w/${workspaceSlug}`

  const { data: stats, isLoading, error } = usePartnerDashboardStats()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your workspace performance</p>
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

      {/* Stats Grid - 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Workspaces */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Workspaces</p>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <p className="stat-value">{stats?.total_workspaces ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="stat-trend positive">
            <TrendingUp className="w-3 h-3" />
            <span>Across partner</span>
          </div>
        </Card>

        {/* Total Agents (All Workspaces) */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Agents</p>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <p className="stat-value">{stats?.total_agents_all_workspaces ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="stat-trend positive">
            <TrendingUp className="w-3 h-3" />
            <span>Across all workspaces</span>
          </div>
        </Card>

        {/* Total Calls Today */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Calls Today</p>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <p className="stat-value">{stats?.total_calls_today ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Phone className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="stat-trend positive">
            <TrendingUp className="w-3 h-3" />
            <span>Across all workspaces</span>
          </div>
        </Card>
      </div>

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
          </CardContent>
        </Card>
      </div>

      {/* Empty State for Agents */}
      {!isLoading && stats?.total_agents_all_workspaces === 0 && (
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
