"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSuperAdminPartners } from "@/lib/hooks/use-super-admin-partners"
import { Briefcase, Users, Building2, Bot, TrendingUp, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

export default function SuperAdminDashboard() {
  const { data, isLoading } = useSuperAdminPartners({})

  const partners = data?.data || []
  const totalPartners = data?.total || 0

  // Calculate totals from partner data
  const totalWorkspaces = partners.reduce((sum, p) => sum + (p.workspace_count || 0), 0)
  const enterprisePartners = partners.filter((p) => p.plan_tier === "enterprise").length
  const platformPartner = partners.find((p) => p.is_platform_partner)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your Inspralv platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Partners</CardTitle>
            <Briefcase className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <div className="text-2xl font-bold text-white">{totalPartners}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">White-label instances</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Workspaces</CardTitle>
            <Building2 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <div className="text-2xl font-bold text-white">{totalWorkspaces}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Across all partners</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Enterprise Partners
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <div className="text-2xl font-bold text-white">{enterprisePartners}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Premium tier</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Platform Partner</CardTitle>
            <Bot className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white truncate">
              {platformPartner?.name || "Inspralv"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Your own white-label</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">
              Common platform management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-between bg-violet-500 hover:bg-violet-600">
              <Link href="/super-admin/partners">
                Manage Partners
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-between border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Link href="/super-admin/partners/new">
                Create New Partner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-between border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Link href="/super-admin/billing">
                View Billing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Partners</CardTitle>
            <CardDescription className="text-slate-400">
              Latest white-label partners
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              </div>
            ) : partners.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No partners yet</p>
            ) : (
              <div className="space-y-3">
                {partners.slice(0, 5).map((partner) => (
                  <Link
                    key={partner.id}
                    href={`/super-admin/partners/${partner.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: partner.branding?.primary_color || "#7c3aed" }}
                      >
                        {partner.name[0]}
                      </div>
                      <div>
                        <p className="text-white font-medium">{partner.name}</p>
                        <p className="text-xs text-slate-500">{partner.plan_tier}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {partner.workspace_count || 0} workspaces
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
