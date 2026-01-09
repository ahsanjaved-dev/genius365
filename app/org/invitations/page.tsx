"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  usePartnerInvitations,
  useInvitePartnerMember,
  useCancelPartnerInvitation,
  useResendPartnerInvitation,
  type WorkspaceAssignment,
  type PartnerInvitation,
} from "@/lib/hooks/use-partner-team"
import { usePartnerWorkspaces } from "@/lib/hooks/use-partner-workspaces"
import { useAuthContext } from "@/lib/hooks/use-auth"
import {
  Mail,
  Loader2,
  RefreshCw,
  X,
  Clock,
  Send,
  Crown,
  Shield,
  UserCheck,
  UserPlus,
  Copy,
  Check,
  Building2,
  Eye,
  CheckCircle,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  member: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

function getWorkspaceGradient(str: string): string {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length] ?? "from-violet-500 to-purple-600"
}

function getInitials(name: string): string {
  return name.split(" ").map((word) => word[0] ?? "").join("").toUpperCase().slice(0, 2)
}

export default function OrgInvitationsPage() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"owner" | "admin" | "member">("member")
  const [message, setMessage] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false)
  const [workspaceAssignments, setWorkspaceAssignments] = useState<Map<string, "admin" | "member" | "viewer">>(new Map())
  const [inviteResult, setInviteResult] = useState<{ email: string; invite_link: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data: authContext } = useAuthContext()
  const { data: invitations, isLoading, refetch } = usePartnerInvitations()
  const { data: workspaces, isLoading: workspacesLoading } = usePartnerWorkspaces()
  const inviteMember = useInvitePartnerMember()
  const cancelInvitation = useCancelPartnerInvitation()
  const resendInvitation = useResendPartnerInvitation()

  const currentUserRole = authContext?.partnerMembership?.role || "member"
  const isOwner = currentUserRole === "owner"

  const toggleWorkspace = (workspaceId: string, checked: boolean) => {
    setWorkspaceAssignments((prev) => {
      const next = new Map(prev)
      if (checked) {
        next.set(workspaceId, "member")
      } else {
        next.delete(workspaceId)
      }
      return next
    })
  }

  const setWorkspaceRole = (workspaceId: string, wsRole: "admin" | "member" | "viewer") => {
    setWorkspaceAssignments((prev) => {
      const next = new Map(prev)
      next.set(workspaceId, wsRole)
      return next
    })
  }

  const resetForm = () => {
    setEmail("")
    setMessage("")
    setRole("member")
    setWorkspaceAssignments(new Map())
    setShowWorkspaceSelector(false)
    setInviteResult(null)
    setLinkCopied(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    try {
      // Convert Map to array format
      const assignments: WorkspaceAssignment[] = Array.from(workspaceAssignments.entries()).map(
        ([workspace_id, wsRole]) => ({ workspace_id, role: wsRole })
      )

      const result = await inviteMember.mutateAsync({
        email,
        role,
        message: message || undefined,
        workspace_assignments: assignments.length > 0 ? assignments : undefined,
      })
      
      // Show success with invite link
      if (result.data?.invite_link) {
        setInviteResult({
          email,
          invite_link: result.data.invite_link,
        })
      }
      
      toast.success(`Invitation sent to ${email}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation")
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelInvitation.mutateAsync(id)
      toast.success("Invitation cancelled")
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation")
    }
  }

  const handleResend = async (id: string) => {
    try {
      await resendInvitation.mutateAsync(id)
      toast.success("Invitation resent")
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation")
    }
  }

  const copyInviteLink = (invitation: { id: string; token: string }) => {
    const link = `${window.location.origin}/accept-partner-invitation?token=${invitation.token}`
    navigator.clipboard.writeText(link)
    setCopiedId(invitation.id)
    toast.success("Invite link copied!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyResultLink = async () => {
    if (inviteResult?.invite_link) {
      await navigator.clipboard.writeText(inviteResult.invite_link)
      setLinkCopied(true)
      toast.success("Invitation link copied!")
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  // Success state dialog
  if (inviteResult) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Invitations</h1>
            <p className="text-muted-foreground mt-1">
              Invite new members to your organization and assign them to workspaces
            </p>
          </div>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Invitation Sent!</CardTitle>
            <CardDescription>
              An email has been sent to <strong>{inviteResult.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Share this link if the email doesn't arrive:
              </Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={inviteResult.invite_link} 
                  className="text-xs bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyResultLink}
                  className="shrink-0"
                >
                  {linkCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> This link expires in 7 days. The recipient must use the email address the invitation was sent to.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Send Another
              </Button>
              <Button
                type="button"
                onClick={() => setInviteResult(null)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-muted-foreground mt-1">
            Invite new members to your organization and assign them to workspaces
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Send Invitation
          </CardTitle>
          <CardDescription>
            Invite someone to join your organization. You can also pre-assign them to workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Organization Role</Label>
                <Select value={role} onValueChange={(v: "owner" | "admin" | "member") => setRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isOwner && (
                      <SelectItem value="owner">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-purple-600" />
                          <span>Owner - Full org access</span>
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span>Admin - Manage team & workspaces</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span>Member - Access assigned workspaces</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to your invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>

            {/* Workspace Assignment - Now a button to open dialog */}
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowWorkspaceSelector(true)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Assign to Workspaces
                {workspaceAssignments.size > 0 && (
                  <Badge variant="secondary" className="ml-2">{workspaceAssignments.size} selected</Badge>
                )}
              </Button>

              {workspaceAssignments.size > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setWorkspaceAssignments(new Map())}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Show selected workspaces */}
            {workspaceAssignments.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(workspaceAssignments.entries()).map(([wsId, wsRole]) => {
                  const ws = workspaces?.find((w) => w.id === wsId)
                  return (
                    <Badge key={wsId} variant="outline" className="py-1.5">
                      <div
                        className={cn(
                          "h-4 w-4 rounded flex items-center justify-center text-white font-semibold text-[8px] bg-gradient-to-br mr-2",
                          getWorkspaceGradient(ws?.name || "")
                        )}
                      >
                        {getInitials(ws?.name || "?")}
                      </div>
                      {ws?.name || wsId}
                      <span className="text-muted-foreground ml-1">({wsRole})</span>
                      <button
                        type="button"
                        onClick={() => toggleWorkspace(wsId, false)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            <Button type="submit" disabled={inviteMember.isPending} className="mt-4">
              {inviteMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Workspace Selector Dialog */}
      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Assign to Workspaces
            </DialogTitle>
            <DialogDescription>
              Select workspaces the invited user will have access to when they join.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {workspacesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : workspaces && workspaces.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {workspaces.map((workspace) => {
                    const isSelected = workspaceAssignments.has(workspace.id)
                    const wsRole = workspaceAssignments.get(workspace.id) || "member"

                    return (
                      <div
                        key={workspace.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          isSelected
                            ? "border-primary/30 bg-primary/5"
                            : "border-border hover:border-border/80"
                        )}
                      >
                        <Checkbox
                          id={`ws-${workspace.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            toggleWorkspace(workspace.id, checked as boolean)
                          }
                        />
                        <div
                          className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br shadow-sm shrink-0",
                            getWorkspaceGradient(workspace.name)
                          )}
                        >
                          {getInitials(workspace.name)}
                        </div>
                        <label
                          htmlFor={`ws-${workspace.id}`}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="font-medium text-sm">{workspace.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workspace.member_summary.total} member{workspace.member_summary.total !== 1 ? "s" : ""}
                          </p>
                        </label>
                        {isSelected && (
                          <Select
                            value={wsRole}
                            onValueChange={(v) =>
                              setWorkspaceRole(workspace.id, v as "admin" | "member" | "viewer")
                            }
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-1.5">
                                  <Shield className="h-3 w-3 text-blue-600" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="member">
                                <div className="flex items-center gap-1.5">
                                  <UserCheck className="h-3 w-3 text-green-600" />
                                  Member
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-1.5">
                                  <Eye className="h-3 w-3 text-gray-600" />
                                  Viewer
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No workspaces available</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkspaceSelector(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowWorkspaceSelector(false)}>
              Done ({workspaceAssignments.size} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Invitations that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invitations && invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Org Role</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const isExpiringSoon = new Date(invitation.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000
                  const inviterName = invitation.inviter?.first_name
                    ? `${invitation.inviter.first_name} ${invitation.inviter.last_name || ""}`.trim()
                    : invitation.inviter?.email || "Unknown"
                  const wsAssignments = invitation.metadata?.workspace_assignments || []

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{invitation.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[invitation.role]}>
                          {roleLabels[invitation.role] || invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {wsAssignments.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {wsAssignments.length} workspace{wsAssignments.length !== 1 ? "s" : ""}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  {wsAssignments.map((wa: any, idx: number) => {
                                    const ws = workspaces?.find((w) => w.id === wa.workspace_id)
                                    return (
                                      <p key={idx}>
                                        {ws?.name || wa.workspace_id} ({wa.role})
                                      </p>
                                    )
                                  })}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inviterName}
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-1",
                          isExpiringSoon ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyInviteLink(invitation)}
                            title="Copy invite link"
                          >
                            {copiedId === invitation.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleResend(invitation.id)}
                            disabled={resendInvitation.isPending}
                            title="Resend invitation"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleCancel(invitation.id)}
                            disabled={cancelInvitation.isPending}
                            title="Cancel invitation"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending invitations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
