"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Phone,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Eye,
  Bot,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { CallCampaignWithAgent, CampaignStatus } from "@/types/database.types"

interface CampaignCardProps {
  campaign: CallCampaignWithAgent
  onStart?: (campaign: CallCampaignWithAgent) => void
  onPause?: (campaign: CallCampaignWithAgent) => void
  onDelete?: (campaign: CallCampaignWithAgent) => void
}

const statusConfig: Record<CampaignStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    icon: null,
  },
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <span className="relative flex h-2 w-2 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>,
  },
  paused: {
    label: "Paused",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: null,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: <XCircle className="h-3 w-3 mr-1" />,
  },
}

export function CampaignCard({ campaign, onStart, onPause, onDelete }: CampaignCardProps) {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const progress = campaign.total_recipients > 0
    ? Math.round((campaign.completed_calls / campaign.total_recipients) * 100)
    : 0

  const statusInfo = statusConfig[campaign.status]
  const canStart = campaign.status === "draft" || campaign.status === "paused"
  const canPause = campaign.status === "active"
  const canDelete = campaign.status !== "active"

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/w/${workspaceSlug}/campaigns/${campaign.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {campaign.name}
                </Link>
                {campaign.agent && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    <span className="truncate">{campaign.agent.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{campaign.total_recipients} recipients</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{campaign.successful_calls} answered</span>
              </div>
              {campaign.failed_calls > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>{campaign.failed_calls} failed</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {campaign.total_recipients > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{campaign.completed_calls} / {campaign.total_recipients} completed</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          {/* Right side - Status & Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`flex items-center ${statusInfo.color}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/w/${workspaceSlug}/campaigns/${campaign.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canStart && onStart && (
                    <DropdownMenuItem onClick={() => onStart(campaign)}>
                      <Play className="h-4 w-4 mr-2" />
                      {campaign.status === "paused" ? "Resume" : "Start"} Campaign
                    </DropdownMenuItem>
                  )}
                  {canPause && onPause && (
                    <DropdownMenuItem onClick={() => onPause(campaign)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Campaign
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canDelete && onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(campaign)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

