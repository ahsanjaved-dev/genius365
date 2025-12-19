"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConversationDetailModal } from "@/components/workspace/conversations/conversation-detail-modal"
import { useWorkspaceConversations } from "@/lib/hooks/use-workspace-conversations"
import { useWorkspaceAgents } from "@/lib/hooks/use-workspace-agents"
import {
  MessageSquare,
  Search,
  Loader2,
  Phone,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Bot,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import type { ConversationWithAgent } from "@/types/database.types"

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  queued: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  no_answer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export default function WorkspaceConversationsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [agentFilter, setAgentFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithAgent | null>(
    null
  )

  const { data, isLoading, error } = useWorkspaceConversations({
    page,
    pageSize: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
    direction: directionFilter !== "all" ? directionFilter : undefined,
    agentId: agentFilter !== "all" ? agentFilter : undefined,
  })

  const { data: agentsData } = useWorkspaceAgents({})
  const agents = agentsData?.data || []

  const conversations = data?.data || []
  const totalPages = data?.totalPages || 1

  // Client-side search filter
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      c.phone_number?.toLowerCase().includes(search) ||
      c.caller_name?.toLowerCase().includes(search) ||
      c.agent?.name?.toLowerCase().includes(search)
    )
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground mt-1">
          View and analyze all voice conversations handled by your agents
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number or caller name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="no_answer">No Answer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Conversations
          </CardTitle>
          <CardDescription>{data?.total || 0} total conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-medium">No conversations found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Conversations will appear here once your agents start handling calls"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caller</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map((conversation) => (
                    <TableRow
                      key={conversation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{conversation.caller_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {conversation.phone_number || "No number"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span>{conversation.agent?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {conversation.direction === "inbound" ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowDownLeft className="h-4 w-4" />
                            <span>Inbound</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-blue-600">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>Outbound</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[conversation.status]}>
                          {conversation.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(conversation.duration_seconds)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {conversation.started_at
                          ? formatDistanceToNow(new Date(conversation.started_at), {
                              addSuffix: true,
                            })
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Conversation Detail Modal */}
      <ConversationDetailModal
        conversation={selectedConversation}
        open={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
      />
    </div>
  )
}
