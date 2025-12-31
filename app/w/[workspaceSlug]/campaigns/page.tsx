"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CampaignCard } from "@/components/workspace/campaigns/campaign-card"
import { useCampaigns, useUpdateCampaign, useDeleteCampaign } from "@/lib/hooks/use-campaigns"
import {
  Phone,
  Plus,
  Loader2,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  PhoneCall,
} from "lucide-react"
import { toast } from "sonner"
import type { CallCampaignWithAgent, CampaignStatus } from "@/types/database.types"

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export default function CampaignsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<CallCampaignWithAgent | null>(null)

  const { data, isLoading, refetch } = useCampaigns({ 
    status: statusFilter, 
    page 
  })
  const updateMutation = useUpdateCampaign()
  const deleteMutation = useDeleteCampaign()

  const campaigns = data?.data || []
  const totalCampaigns = data?.total || 0

  // Calculate stats
  const activeCampaigns = campaigns.filter(c => c.status === "active").length
  const totalRecipients = campaigns.reduce((sum, c) => sum + c.total_recipients, 0)
  const completedCalls = campaigns.reduce((sum, c) => sum + c.completed_calls, 0)

  const handleStart = async (campaign: CallCampaignWithAgent) => {
    if (campaign.total_recipients === 0) {
      toast.error("Add recipients before starting the campaign")
      return
    }
    
    try {
      await updateMutation.mutateAsync({ 
        id: campaign.id, 
        data: { status: "active" } 
      })
      toast.success("Campaign started successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start campaign")
    }
  }

  const handlePause = async (campaign: CallCampaignWithAgent) => {
    try {
      await updateMutation.mutateAsync({ 
        id: campaign.id, 
        data: { status: "paused" } 
      })
      toast.success("Campaign paused")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to pause campaign")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success("Campaign deleted")
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete campaign")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage outbound calling campaigns for your AI agents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href={`/w/${workspaceSlug}/campaigns/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalCampaigns}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{activeCampaigns}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{totalRecipients}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{completedCalls}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select 
              value={statusFilter} 
              onValueChange={(v) => { 
                setStatusFilter(v as CampaignStatus | "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No campaigns yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-2">
              {statusFilter !== "all"
                ? "No campaigns match your filter. Try adjusting your selection."
                : "Create your first calling campaign to start reaching your leads with AI-powered outbound calls."}
            </p>
            {statusFilter === "all" && (
              <Button className="mt-6" asChild>
                <Link href={`/w/${workspaceSlug}/campaigns/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Campaign
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStart={handleStart}
              onPause={handlePause}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also remove all recipients and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

