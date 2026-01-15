"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertTriangle, CheckCircle2, XCircle, RefreshCw, WifiOff, Wifi } from "lucide-react"
import {
  useWebhookStatus,
  useResyncWebhooks,
  useWebhookHealthIndicator,
  type AgentWebhookStatus,
} from "@/lib/hooks/use-webhook-status"
import { toast } from "sonner"

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface WebhookStatusAlertProps {
  /** Only show if there are issues */
  showOnlyOnIssues?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Alert component that shows webhook configuration status.
 * Appears when agents have mismatched webhook URLs, which causes
 * production campaigns to not update UI in real-time.
 */
export function WebhookStatusAlert({ showOnlyOnIssues = true, className }: WebhookStatusAlertProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { status, issueCount, message } = useWebhookHealthIndicator()
  const { data: webhookData, isLoading, refetch } = useWebhookStatus()
  const resyncMutation = useResyncWebhooks()

  // Don't show if loading or if healthy (and showOnlyOnIssues is true)
  if (isLoading || (showOnlyOnIssues && status === "healthy")) {
    return null
  }

  // Handle resync all
  const handleResyncAll = async () => {
    try {
      const result = await resyncMutation.mutateAsync({ force: false })
      
      if (result.failed > 0) {
        toast.error(`Resync completed with ${result.failed} failure(s)`)
      } else if (result.resynced > 0) {
        toast.success(`Successfully resynced ${result.resynced} agent(s)`)
      } else {
        toast.info("All agents already have correct webhook URLs")
      }
      
      // Refresh the status
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resync webhooks")
    }
  }

  // Variant based on status
  const variant = status === "issues" ? "destructive" : "default"
  const Icon = status === "issues" ? AlertTriangle : status === "error" ? XCircle : CheckCircle2

  return (
    <>
      <Alert variant={variant} className={className}>
        <Icon className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>
            {status === "issues" ? "Webhook Configuration Issue" : 
             status === "error" ? "Webhook Check Failed" : "Webhook Status"}
          </span>
          {status === "issues" && (
            <Badge variant="outline" className="ml-2">
              {issueCount} agent{issueCount !== 1 ? "s" : ""} affected
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">{message}</p>
          
          {status === "issues" && (
            <p className="text-sm text-muted-foreground mb-3">
              This may cause campaign calls to not update in real-time. Click "Fix Now" to update 
              all agents with the correct production webhook URL.
            </p>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsOpen(true)}
            >
              View Details
            </Button>
            
            {status === "issues" && (
              <Button
                size="sm"
                onClick={handleResyncAll}
                disabled={resyncMutation.isPending}
              >
                {resyncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fix Now
                  </>
                )}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Details Dialog */}
      <WebhookStatusDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        data={webhookData}
        onResync={handleResyncAll}
        isResyncing={resyncMutation.isPending}
      />
    </>
  )
}

// ============================================================================
// DETAILS DIALOG
// ============================================================================

interface WebhookStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: {
    workspace: { id: string; slug: string }
    diagnostics: {
      currentAppUrl: string
      isProduction: boolean
      expectedWebhookUrl: string
      hasVapiKey: boolean
      commonIssues: string[]
    }
    agents: AgentWebhookStatus[]
    summary: {
      total: number
      synced: number
      needsResync: number
      notSynced: number
      webhookMismatch: number
      ok: number
    }
  }
  onResync: () => void
  isResyncing: boolean
}

function WebhookStatusDialog({
  open,
  onOpenChange,
  data,
  onResync,
  isResyncing,
}: WebhookStatusDialogProps) {
  if (!data) return null

  const { diagnostics, agents, summary } = data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Webhook Configuration Status</DialogTitle>
          <DialogDescription>
            Review and fix webhook URL configuration for your VAPI agents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.ok}</div>
              <div className="text-xs text-muted-foreground">OK</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summary.webhookMismatch}</div>
              <div className="text-xs text-muted-foreground">Needs Fix</div>
            </div>
            <div className="text-center p-3 bg-gray-500/10 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{summary.notSynced}</div>
              <div className="text-xs text-muted-foreground">Not Synced</div>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Environment</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">App URL: </span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{diagnostics.currentAppUrl}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Production: </span>
                <Badge variant={diagnostics.isProduction ? "default" : "secondary"}>
                  {diagnostics.isProduction ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Expected URL: </span>
              <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{diagnostics.expectedWebhookUrl}</code>
            </div>
            
            {diagnostics.commonIssues.length > 0 && (
              <div className="mt-2">
                <span className="text-sm text-destructive font-medium">Issues:</span>
                <ul className="text-sm text-destructive list-disc pl-4 mt-1">
                  {diagnostics.commonIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Agent List */}
          <div>
            <h4 className="font-medium text-sm mb-2">Agents ({agents.length})</h4>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-2">
                {agents.map((agent) => (
                  <AgentStatusRow key={agent.id} agent={agent} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {summary.webhookMismatch > 0 && (
            <Button onClick={onResync} disabled={isResyncing}>
              {isResyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fixing {summary.webhookMismatch} Agent{summary.webhookMismatch !== 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Fix {summary.webhookMismatch} Agent{summary.webhookMismatch !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// AGENT STATUS ROW
// ============================================================================

function AgentStatusRow({ agent }: { agent: AgentWebhookStatus }) {
  const statusConfig = {
    ok: { icon: Wifi, color: "text-green-600", bg: "bg-green-500/10" },
    mismatch: { icon: WifiOff, color: "text-yellow-600", bg: "bg-yellow-500/10" },
    not_synced: { icon: WifiOff, color: "text-gray-400", bg: "bg-gray-500/10" },
    unknown: { icon: AlertTriangle, color: "text-gray-400", bg: "bg-gray-500/10" },
  }

  const config = statusConfig[agent.status]
  const Icon = config.icon

  return (
    <div className={`p-2 rounded-lg ${config.bg} flex items-center gap-3`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{agent.name}</div>
        {agent.currentWebhookUrl && (
          <div className="text-xs text-muted-foreground truncate">
            Current: {agent.currentWebhookUrl}
          </div>
        )}
        {agent.error && (
          <div className="text-xs text-destructive">{agent.error}</div>
        )}
      </div>
      <Badge 
        variant={agent.status === "ok" ? "outline" : agent.status === "mismatch" ? "destructive" : "secondary"}
        className="shrink-0"
      >
        {agent.status === "ok" ? "OK" : 
         agent.status === "mismatch" ? "Needs Fix" : 
         agent.status === "not_synced" ? "Not Synced" : "Unknown"}
      </Badge>
    </div>
  )
}

// ============================================================================
// COMPACT INDICATOR
// ============================================================================

/**
 * Compact webhook status indicator for headers/toolbars
 */
export function WebhookStatusIndicator() {
  const { status, issueCount } = useWebhookHealthIndicator()

  if (status === "loading") {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  if (status === "healthy") {
    return (
      <div className="flex items-center gap-1 text-green-600" title="Webhooks configured correctly">
        <Wifi className="h-4 w-4" />
      </div>
    )
  }

  if (status === "issues") {
    return (
      <div className="flex items-center gap-1 text-yellow-600" title={`${issueCount} webhook issue(s)`}>
        <WifiOff className="h-4 w-4" />
        {issueCount > 0 && <span className="text-xs font-medium">{issueCount}</span>}
      </div>
    )
  }

  return null
}

