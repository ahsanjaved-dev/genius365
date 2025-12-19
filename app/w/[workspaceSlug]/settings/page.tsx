"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Settings, Loader2, Save, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  useWorkspaceSettings,
  useUpdateWorkspaceSettings,
  useDeleteWorkspace,
} from "@/lib/hooks/use-workspace-settings"

export default function WorkspaceSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const { data: workspace, isLoading, error } = useWorkspaceSettings()
  const updateSettings = useUpdateWorkspaceSettings()
  const deleteWorkspace = useDeleteWorkspace()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form when data loads
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "")
      setDescription(workspace.description || "")
    }
  }, [workspace])

  // Track changes
  useEffect(() => {
    if (workspace) {
      const nameChanged = name !== (workspace.name || "")
      const descChanged = description !== (workspace.description || "")
      setHasChanges(nameChanged || descChanged)
    }
  }, [name, description, workspace])

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      })
      toast.success("Settings saved successfully")
      setHasChanges(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings")
    }
  }

  const handleDelete = async () => {
    try {
      await deleteWorkspace.mutateAsync()
      toast.success("Workspace deleted")
      router.push("/select-workspace")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete workspace")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">Failed to load settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace settings and configuration
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Basic workspace information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Workspace URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/w/</span>
              <Input id="slug" value={workspace?.slug || ""} disabled className="bg-muted" />
            </div>
            <p className="text-xs text-muted-foreground">The workspace URL cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
            className="w-full sm:w-auto"
          >
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900 rounded-lg">
            <div>
              <p className="font-medium">Delete this workspace</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, this workspace and all its data will be permanently removed.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the workspace
                    <strong> "{workspace?.name}"</strong> and remove all associated data including
                    agents, conversations, and members.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    {deleteWorkspace.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Workspace
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
