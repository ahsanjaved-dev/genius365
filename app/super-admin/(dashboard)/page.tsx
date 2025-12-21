"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSuperAdminPartners } from "@/lib/hooks/use-super-admin-partners"
import { Briefcase, Building2, TrendingUp, ArrowRight, Loader2, LayoutGrid } from "lucide-react"
import Link from "next/link"

export default function SuperAdminDashboard() {
  const { data, isLoading } = useSuperAdminPartners({})

  const partners = data?.data || []
  const totalPartners = data?.total || 0

  // Calculate totals from partner data
  const totalWorkspaces = partners.reduce((sum, p) => sum + (p.workspace_count || 0), 0)
  const enterprisePartners = partners.filter((p) => p.plan_tier === "enterprise").length

  return (
    <div className="space-y-6">
      {/* Page Header - Genius style */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Organization rollups across agencies and workspaces.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/super-admin/partners">
            <Briefcase className="mr-2 h-4 w-4" />
            Manage Agencies
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Agencies</p>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-foreground">{totalPartners}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workspaces</p>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-foreground">{totalWorkspaces}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Partner</p>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-foreground">Genius</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-chart-1/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partners Table */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Agencies</CardTitle>
              <Link href="/super-admin/partners" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : partners.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No agencies yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-muted/50">Partner</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-muted/50">Workspaces</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-muted/50">Agents</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-muted/50">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.slice(0, 5).map((partner) => (
                      <tr key={partner.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/super-admin/partners/${partner.id}`} className="text-primary hover:underline font-medium">
                            {partner.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{partner.slug}</p>
                        </td>
                        <td className="py-3 px-4 text-foreground">{partner.workspace_count || 0}</td>
                        <td className="py-3 px-4 text-foreground">{partner.agent_count || 0}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                            {partner.plan_tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common platform management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-between bg-primary hover:bg-primary/90">
              <Link href="/super-admin/partners">
                Manage Agencies
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-between border-border text-foreground hover:bg-muted"
            >
              <Link href="/super-admin/billing">
                View Billing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
