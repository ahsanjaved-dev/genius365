import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getPartnerAuthCached } from "@/lib/api/get-auth-cached"
import { getPartnerFromHost } from "@/lib/api/partner"
import { isPartnerAdmin } from "@/lib/api/auth"
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form"
import { Button } from "@/components/ui/button"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  try {
    const partner = await getPartnerFromHost()
    const companyName = partner.branding.company_name || partner.name
    return {
      title: `Create Workspace | ${companyName}`,
      icons: partner.branding.favicon_url ? [{ url: partner.branding.favicon_url }] : undefined,
    }
  } catch {
    return { title: "Create Workspace" }
  }
}

export default async function WorkspaceOnboardingPage() {
  const auth = await getPartnerAuthCached()

  // Not authenticated - redirect to login
  if (!auth) {
    redirect("/login?redirect=/workspace-onboarding")
  }

  const branding = auth.partner.branding
  const primaryColor = branding.primary_color || "#7c3aed"

  // Check if user can create workspaces
  const canCreate = isPartnerAdmin(auth)

  // Not allowed to create workspaces
  if (!canCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        {/* Subtle background */}
        <div 
          className="fixed inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative w-full max-w-md">
          <div className="bg-card rounded-3xl border border-border/50 shadow-2xl shadow-black/5 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Permission Required</h1>
              <p className="text-muted-foreground">
                Only partner administrators can create new workspaces.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Contact your partner administrator if you need a new workspace created.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/select-workspace">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Workspaces
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      {/* Subtle background */}
      <div 
        className="fixed inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Gradient orbs */}
      <div 
        className="fixed top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="relative max-w-lg mx-auto">
        {/* Back link */}
        <Link
          href="/select-workspace"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to workspaces
        </Link>

        <CreateWorkspaceForm primaryColor={primaryColor} />
      </div>
    </div>
  )
}
