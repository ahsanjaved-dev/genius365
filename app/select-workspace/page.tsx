import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getPartnerAuthCached } from "@/lib/api/get-auth-cached"
import { getPartnerFromHost } from "@/lib/api/partner"
import { WorkspaceSelector } from "@/components/workspace/workspace-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Plus, Mail, LogOut } from "lucide-react"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  try {
    const partner = await getPartnerFromHost()
    const companyName = partner.branding.company_name || partner.name
    return {
      title: `Select Workspace | ${companyName}`,
      icons: partner.branding.favicon_url ? [{ url: partner.branding.favicon_url }] : undefined,
    }
  } catch {
    return { title: "Select Workspace" }
  }
}

export default async function SelectWorkspacePage() {
  const auth = await getPartnerAuthCached()

  // Not authenticated - redirect to login
  if (!auth) {
    redirect("/login")
  }

  // Auto-redirect if only one workspace
  if (auth.workspaces.length === 1) {
    redirect(`/w/${auth.workspaces[0].slug}/dashboard`)
  }

  const branding = auth.partner.branding
  const companyName = branding.company_name || auth.partner.name
  const primaryColor = branding.primary_color || "#7c3aed"

  // Check if user can create workspaces (partner admin or owner)
  const canCreateWorkspace = auth.partnerRole === "owner" || auth.partnerRole === "admin"
  const isPartnerMember = auth.partnerRole !== null

  // No workspaces - show appropriate message based on role
  if (auth.workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={companyName} className="h-12 mx-auto mb-4" />
            ) : (
              <div
                className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: primaryColor }}
              >
                {companyName[0]}
              </div>
            )}

            {canCreateWorkspace ? (
              <>
                <CardTitle className="text-2xl">Create Your First Workspace</CardTitle>
                <CardDescription>Get started by creating a workspace for your team</CardDescription>
              </>
            ) : isPartnerMember ? (
              <>
                <CardTitle className="text-2xl">No Workspaces Yet</CardTitle>
                <CardDescription>
                  You're a member of {companyName}, but you haven't been added to any workspaces
                  yet.
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl">Access Required</CardTitle>
                <CardDescription>You need to be invited to access {companyName}.</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {canCreateWorkspace ? (
              <div className="space-y-4">
                <Button asChild className="w-full" style={{ backgroundColor: primaryColor }}>
                  <Link href="/workspace-onboarding">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </Link>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  As a {auth.partnerRole}, you can create and manage workspaces.
                </p>
              </div>
            ) : isPartnerMember ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Waiting for invitation
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Ask your workspace administrator to invite you. You'll receive an email when
                        added.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Logged in as: <span className="font-medium">{auth.user.email}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  Contact your administrator to request access.
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  Logged in as: <span className="font-medium">{auth.user.email}</span>
                </p>
              </div>
            )}

            <form action="/api/auth/signout" method="POST" className="pt-2">
              <Button variant="ghost" type="submit" className="w-full text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Multiple workspaces - show selector
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}10 0%, transparent 50%)`,
      }}
    >
      <WorkspaceSelector
        workspaces={auth.workspaces}
        partner={auth.partner}
        user={auth.user}
        canCreateWorkspace={canCreateWorkspace}
      />
    </div>
  )
}
