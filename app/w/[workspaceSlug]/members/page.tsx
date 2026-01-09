"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { InviteMemberDialog } from "@/components/workspace/members/invite-member-dialog"
import {
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useCancelWorkspaceInvitation,
  useUpdateWorkspaceMemberRole,
  useRemoveWorkspaceMember,
} from "@/lib/hooks/use-workspace-members"
import { useAuthContext } from "@/lib/hooks/use-auth"
import {
  Plus,
  Users,
  Loader2,
  MoreVertical,
  Mail,
  Clock,
  X,
  Shield,
  UserCheck,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Crown,
  Search,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  member: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

type RoleFilter = "all" | "owner" | "admin" | "member" | "viewer"

export default function WorkspaceMembersPage() {
  const params = useParams()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editMember, setEditMember] = useState<{ id: string; role: string; name: string } | null>(null)
  const [deleteMember, setDeleteMember] = useState<{ id: string; name: string } | null>(null)
  const [selectedRole, setSelectedRole] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")

  const { data: authContext } = useAuthContext()
  const { data: members, isLoading: membersLoading, refetch } = useWorkspaceMembers()
  const { data: invitations, isLoading: invitationsLoading } = useWorkspaceInvitations()
  const cancelInvitation = useCancelWorkspaceInvitation()
  const updateRole = useUpdateWorkspaceMemberRole()
  const removeMember = useRemoveWorkspaceMember()

  // Get current user's role in this workspace
  const currentWorkspaceRole = authContext?.workspaces?.find(
    (w) => w.slug === params.workspaceSlug
  )?.role || "viewer"
  
  const isAdmin = currentWorkspaceRole === "owner" || currentWorkspaceRole === "admin"
  const isOwner = currentWorkspaceRole === "owner"

  // Filter members by search query and role
  const filteredMembers = useMemo(() => {
    if (!members) return []

    let filtered = members

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.user?.email?.toLowerCase().includes(query) ||
          m.user?.first_name?.toLowerCase().includes(query) ||
          m.user?.last_name?.toLowerCase().includes(query)
      )
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((m) => m.role === roleFilter)
    }

    return filtered
  }, [members, searchQuery, roleFilter])

  // Stats
  const stats = useMemo(() => {
    if (!members) return { total: 0, owners: 0, admins: 0, members: 0, viewers: 0 }
    return {
      total: members.length,
      owners: members.filter((m) => m.role === "owner").length,
      admins: members.filter((m) => m.role === "admin").length,
      members: members.filter((m) => m.role === "member").length,
      viewers: members.filter((m) => m.role === "viewer").length,
    }
  }, [members])

  const handleCancelInvitation = async (id: string) => {
    try {
      await cancelInvitation.mutateAsync(id)
      toast.success("Invitation cancelled")
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation")
    }
  }

  const handleUpdateRole = async () => {
    if (!editMember || !selectedRole) return
    
    try {
      await updateRole.mutateAsync({ memberId: editMember.id, role: selectedRole })
      toast.success("Role updated successfully")
      setEditMember(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to update role")
    }
  }

  const handleRemoveMember = async () => {
    if (!deleteMember) return
    
    try {
      await removeMember.mutateAsync(deleteMember.id)
      toast.success("Member removed successfully")
      setDeleteMember(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member")
    }
  }

  const isLoading = membersLoading || invitationsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground mt-1">Manage who has access to this workspace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            roleFilter === "all" && "ring-2 ring-primary"
          )}
          onClick={() => setRoleFilter("all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            roleFilter === "owner" && "ring-2 ring-purple-500"
          )}
          onClick={() => setRoleFilter(roleFilter === "owner" ? "all" : "owner")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Owners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.owners}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            roleFilter === "admin" && "ring-2 ring-blue-500"
          )}
          onClick={() => setRoleFilter(roleFilter === "admin" ? "all" : "admin")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            roleFilter === "member" && "ring-2 ring-green-500"
          )}
          onClick={() => setRoleFilter(roleFilter === "member" ? "all" : "member")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.members}</div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-colors",
            roleFilter === "viewer" && "ring-2 ring-gray-500"
          )}
          onClick={() => setRoleFilter(roleFilter === "viewer" ? "all" : "viewer")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.viewers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {roleFilter !== "all" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRoleFilter("all")}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Clear filter: {roleLabels[roleFilter]}
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
            {(searchQuery || roleFilter !== "all") && (
              <Badge variant="secondary" className="ml-2">
                {filteredMembers.length} of {members?.length || 0}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>People who have access to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const RoleIcon = roleIcons[member.role] || UserCheck
                  const isCurrentUser = member.user_id === authContext?.user?.id
                  const canModify = isAdmin && !isCurrentUser && (isOwner || member.role !== "owner")
                  const memberName = member.user?.first_name
                    ? `${member.user.first_name} ${member.user.last_name || ""}`
                    : member.user?.email || "Unknown User"

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.user?.first_name?.[0] ||
                                member.user?.email?.[0]?.toUpperCase() ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {memberName}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.user?.email || member.user_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[member.role]}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.joined_at
                          ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })
                          : "—"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {canModify ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditMember({ id: member.id, role: member.role, name: memberName })
                                    setSelectedRole(member.role)
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteMember({ id: member.id, name: memberName })}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>
                {searchQuery || roleFilter !== "all"
                  ? "No members match your search"
                  : "No members yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations that haven't been accepted yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span>{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[invitation.role]}>
                        {roleLabels[invitation.role] || invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={cancelInvitation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <InviteMemberDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      {/* Edit Role Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change the role for {editMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {isOwner && (
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-600" />
                      Owner - Full access
                    </div>
                  </SelectItem>
                )}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRole} 
              disabled={updateRole.isPending || selectedRole === editMember?.role}
            >
              {updateRole.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={!!deleteMember} onOpenChange={(open) => !open && setDeleteMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deleteMember?.name} from this workspace?
              They will lose access to all workspace resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMember(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveMember}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
