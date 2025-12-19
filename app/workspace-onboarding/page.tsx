"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Building2, ArrowRight, ShieldAlert, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface AuthCheckResult {
  authenticated: boolean
  canCreateWorkspace: boolean
  partnerName?: string
}

export default function WorkspaceOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authCheck, setAuthCheck] = useState<AuthCheckResult | null>(null)

  // Form state
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceDescription, setWorkspaceDescription] = useState("")

  useEffect(() => {
    checkAuthAndPermissions()
  }, [])

  const checkAuthAndPermissions = async () => {
    try {
      // Use the workspaces API to check permissions
      const res = await fetch("/api/workspaces")

      if (res.status === 401) {
        router.push("/login?redirect=/workspace-onboarding")
        return
      }

      if (!res.ok) {
        setAuthCheck({ authenticated: false, canCreateWorkspace: false })
        return
      }

      const data = await res.json()
      setAuthCheck({
        authenticated: true,
        canCreateWorkspace: data.data?.canCreateWorkspace ?? false,
      })
    } catch (error) {
      console.error("Auth check error:", error)
      setAuthCheck({ authenticated: false, canCreateWorkspace: false })
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-")
  }

  const handleSubmit = async () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
          slug: generateSlug(workspaceName),
          description: workspaceDescription || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create workspace")
      }

      toast.success(data.data?.message || "Workspace created successfully!")
      router.push(data.data?.redirect || "/select-workspace")
      router.refresh()
    } catch (error: any) {
      console.error("Create workspace error:", error)
      toast.error(error.message || "Failed to create workspace")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  // Not allowed to create workspaces
  if (!authCheck?.canCreateWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Permission Required</CardTitle>
            <CardDescription>
              Only partner administrators can create new workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Contact your partner administrator if you need a new workspace created.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/select-workspace">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspaces
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Back link */}
        <Link
          href="/select-workspace"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to workspaces
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle>Create New Workspace</CardTitle>
                <CardDescription>Set up a workspace for your team</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Workspace"
                disabled={submitting}
              />
              {workspaceName && (
                <p className="text-xs text-muted-foreground">
                  URL: /w/{generateSlug(workspaceName)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                placeholder="What is this workspace for?"
                disabled={submitting}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !workspaceName.trim()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
