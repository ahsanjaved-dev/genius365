"use client"

import { useState } from "react"
import { useOrganizations } from "@/lib/hooks/use-super-admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OrganizationCard } from "@/components/super-admin/organization-card"
import { CreateOrganizationDialog } from "@/components/super-admin/create-organization-dialog"
import { Plus, Search, Building2, Users, TrendingUp, DollarSign } from "lucide-react"

export default function SuperAdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data, isLoading, error } = useOrganizations({
    search: searchQuery || undefined,
    plan_tier: planFilter !== "all" ? planFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const stats = {
    total_organizations: data?.total || 0,
    active_organizations:
      data?.data?.filter((org) => org.subscription_status === "active").length || 0,
    trialing_organizations:
      data?.data?.filter((org) => org.subscription_status === "trialing").length || 0,
    total_revenue: data?.data?.reduce((sum, org) => sum + (org.current_month_cost || 0), 0) || 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage all organizations and platform settings
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_organizations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_organizations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trialing</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialing_organizations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>View and manage all organizations on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading organizations...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-600">
              <p>Failed to load organizations. Please try again.</p>
            </div>
          )}

          {!isLoading && !error && data?.data && data.data.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No organizations found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery
                  ? "Try a different search query."
                  : "Create your first organization to get started."}
              </p>
            </div>
          )}

          {!isLoading && !error && data?.data && data.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((organization) => (
                <OrganizationCard key={organization.id} organization={organization} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrganizationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
