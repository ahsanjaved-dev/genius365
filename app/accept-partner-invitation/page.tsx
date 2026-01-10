"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Building2, Mail, Shield, Briefcase } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface WorkspaceAssignment {
  id: string
  name: string
  role: string
}

interface InvitationDetails {
  id: string
  email: string
  role: string
  status: string
  is_expired: boolean
  partner: {
    name: string
    slug: string
    branding: any
  }
  inviter: {
    name: string
  }
  workspace_assignments?: WorkspaceAssignment[]
}

const roleLabels: Record<string, string> = {
  owner: "Organization Owner",
  admin: "Administrator",
  member: "Team Member",
}

const workspaceRoleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

function AcceptPartnerInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [assignedWorkspaces, setAssignedWorkspaces] = useState<string[]>([])

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        setError("Invalid invitation link")
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/partner-invitations/accept?token=${token}`)
        const result = await res.json()

        if (!res.ok) {
          setError(result.error || "Invalid invitation")
          setLoading(false)
          return
        }

        setInvitation(result.data)
      } catch (err) {
        setError("Failed to load invitation")
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!token || !isAuthenticated) return

    setAccepting(true)
    try {
      const res = await fetch("/api/partner-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || "Failed to accept invitation")
        return
      }

      setSuccess(true)
      setAssignedWorkspaces(result.data.workspace_names || [])
      toast.success(`Welcome to ${result.data.partner_name}!`)

      // Redirect to the appropriate page after a short delay
      // If workspaces were assigned, go directly to the first workspace
      // Otherwise, go to workspace selector
      setTimeout(() => {
        const redirectUrl = result.data.redirect || "/select-workspace"
        router.push(redirectUrl)
        router.refresh()
      }, 2500)
    } catch (err) {
      toast.error("Failed to accept invitation")
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-white">Invalid Invitation</CardTitle>
            <CardDescription>
              {error || "This invitation is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invitation.status !== "pending" || invitation.is_expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="text-white">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has{" "}
              {invitation.status === "accepted" ? "already been used" : "expired"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-white">Welcome to {invitation.partner.name}!</CardTitle>
            <CardDescription>
              You've successfully joined the organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignedWorkspaces.length > 0 && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">You now have access to:</p>
                <div className="space-y-1">
                  {assignedWorkspaces.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-white">
                      <Briefcase className="h-4 w-4 text-primary" />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const primaryColor = invitation.partner.branding?.primary_color || "#7c3aed"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
        <CardHeader className="text-center">
          <div
            className="mx-auto w-16 h-16 rounded-xl flex items-center justify-center mb-4 text-white font-bold text-2xl shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {invitation.partner.name.charAt(0).toUpperCase()}
          </div>
          <CardTitle className="text-white">Join {invitation.partner.name}</CardTitle>
          <CardDescription>
            {invitation.inviter.name} has invited you to join their organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4 bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invited as</p>
                <p className="font-medium text-white">{invitation.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your role</p>
                <Badge 
                  variant="secondary" 
                  className="mt-0.5"
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  {roleLabels[invitation.role] || invitation.role}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="font-medium text-white">{invitation.partner.name}</p>
              </div>
            </div>
          </div>

          {/* Workspace Assignments */}
          {invitation.workspace_assignments && invitation.workspace_assignments.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-white">You'll have access to these workspaces:</p>
              </div>
              <div className="space-y-2">
                {invitation.workspace_assignments.map((ws) => (
                  <div 
                    key={ws.id} 
                    className="flex items-center justify-between bg-slate-700/30 rounded-md px-3 py-2"
                  >
                    <span className="text-sm text-white">{ws.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {workspaceRoleLabels[ws.role] || ws.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {isAuthenticated ? (
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleAccept} 
              disabled={accepting}
              style={{ backgroundColor: primaryColor }}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Sign in or create an account to accept this invitation
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/accept-partner-invitation?token=${token}`)}`}
                >
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link
                  href={`/signup?redirect=${encodeURIComponent(`/accept-partner-invitation?token=${token}`)}&email=${encodeURIComponent(invitation.email)}`}
                >
                  <Button className="w-full" style={{ backgroundColor: primaryColor }}>
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptPartnerInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
          <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptPartnerInvitationContent />
    </Suspense>
  )
}
