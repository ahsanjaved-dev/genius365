"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Bot,
  Calendar,
  Clock,
  Tag,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { LeadWithAgent } from "@/types/database.types"

interface LeadDetailModalProps {
  lead: LeadWithAgent | null
  open: boolean
  onClose: () => void
  onEdit: (lead: LeadWithAgent) => void
  onDelete: (lead: LeadWithAgent) => void
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  converted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  nurturing: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
}

const priorityLabels: { [key: number]: { label: string; color: string } } = {
  0: { label: "Low", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  1: { label: "Medium", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  2: { label: "High", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

const defaultPriority = { label: "Low", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }

export function LeadDetailModal({ lead, open, onClose, onEdit, onDelete }: LeadDetailModalProps) {
  if (!lead) return null

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown"
  const priorityValue = lead.priority ?? 0
  const priority = priorityLabels[priorityValue] ?? defaultPriority

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {fullName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[lead.status]}>
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </Badge>
              <Badge className={priority.color}>{priority.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
            <div className="grid gap-2">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.company}</span>
                </div>
              )}
              {lead.job_title && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.job_title}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Source & Agent */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Source</h4>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{lead.source.replace("_", " ")}</span>
              </div>
              {lead.agent && (
                <div className="flex items-center gap-2 text-sm">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {lead.agent.name}{" "}
                    <span className="text-muted-foreground">({lead.agent.provider})</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                  {lead.notes}
                </p>
              </div>
            </>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
            </div>
            {lead.last_contacted_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Last contact {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onEdit(lead)
                onClose()
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onDelete(lead)
                onClose()
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

