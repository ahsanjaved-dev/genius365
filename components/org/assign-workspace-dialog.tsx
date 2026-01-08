"use client"

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2,
  Loader2,
  Search,
  Shield,
  UserCheck,
  Eye,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePartnerWorkspaces, type PartnerWorkspace } from "@/lib/hooks/use-partner-workspaces"
import type { PartnerTeamMember, WorkspaceAccess } from "@/lib/hooks/use-partner-team"

interface AssignWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: PartnerTeamMember | null
}

function getWorkspaceGradient(str: string): string {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
    "from-cyan-500 to-teal-500",
    "from-fuchsia-500 to-pink-500",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length] ?? "from-violet-500 to-purple-600"
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AssignWorkspaceDialog({
  open,
  onOpenChange,
  member,
}: AssignWorkspaceDialogProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<"admin" | "member" | "viewer">("member")
  const [searchQuery, setSearchQuery] = useState("")

  const queryClient = useQueryClient()
  const { data: workspaces, isLoading: workspacesLoading } = usePartnerWorkspaces()

  // Filter out workspaces the member already has access to
  const availableWorkspaces = useMemo(() => {
    if (!workspaces || !member) return []
    
    const memberWorkspaceIds = new Set(member.workspace_access.map((wa) => wa.workspace_id))
    
    let available = workspaces.filter((ws) => !memberWorkspaceIds.has(ws.id))
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      available = available.filter(
        (ws) =>
          ws.name.toLowerCase().includes(query) ||
          ws.slug.toLowerCase().includes(query)
      )
    }
    
    return available
  }, [workspaces, member, searchQuery])

  const assignMutation = useMutation({
    mutationFn: async ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: string }) => {
      const res = await fetch(`/api/partner/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to assign workspace")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-team"] })
      queryClient.invalidateQueries({ queryKey: ["partner-workspaces"] })
      toast.success("Member assigned to workspace successfully")
      handleClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleClose = () => {
    setSelectedWorkspace(null)
    setSelectedRole("member")
    setSearchQuery("")
    onOpenChange(false)
  }

  const handleAssign = () => {
    if (!selectedWorkspace || !member) return

    assignMutation.mutate({
      workspaceId: selectedWorkspace,
      userId: member.user_id,
      role: selectedRole,
    })
  }

  const memberName = member?.first_name
    ? `${member.first_name} ${member.last_name || ""}`.trim()
    : member?.email || "Member"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Workspace</DialogTitle>
          <DialogDescription>
            Add <span className="font-medium text-foreground">{memberName}</span> to a workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Workspaces */}
          {member && member.workspace_count > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Current Workspaces</Label>
              <div className="flex flex-wrap gap-1.5">
                {member.workspace_access.map((wa) => (
                  <Badge key={wa.workspace_id} variant="secondary" className="text-xs">
                    {wa.workspace_name} ({wa.role})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Workspaces */}
          <div className="space-y-2">
            <Label>Select Workspace</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Workspace List */}
          <ScrollArea className="h-48 border rounded-lg">
            {workspacesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Building2 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery
                    ? "No workspaces match your search"
                    : "Member has access to all workspaces"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableWorkspaces.map((ws) => {
                  const isSelected = selectedWorkspace === ws.id

                  return (
                    <button
                      key={ws.id}
                      onClick={() => setSelectedWorkspace(ws.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left",
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted border border-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br shadow-sm shrink-0",
                          getWorkspaceGradient(ws.name)
                        )}
                      >
                        {getInitials(ws.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ws.member_summary.total} members • {ws.agent_count} agents
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Role in Workspace</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Admin - Manage workspace
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    Member - Use agents & features
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-600" />
                    Viewer - Read-only access
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedWorkspace || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign to Workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

