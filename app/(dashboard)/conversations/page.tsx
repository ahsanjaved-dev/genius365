"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  MessageSquare,
  Search,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  DollarSign,
  Play,
  Eye,
  Building2,
} from "lucide-react"
import type { Conversation, Department } from "@/types/database.types"

interface ConversationWithAgent extends Conversation {
  agent?: { name: string } | null
}

function useConversations(params: {
  status?: string
  direction?: string
  department_id?: string
  page?: number
}) {
  return useQuery({
    queryKey: ["conversations", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.status && params.status !== "all") searchParams.set("status", params.status)
      if (params.direction && params.direction !== "all")
        searchParams.set("direction", params.direction)
      if (params.department_id && params.department_id !== "all")
        searchParams.set("department_id", params.department_id)
      if (params.page) searchParams.set("page", params.page.toString())

      const res = await fetch(`/api/conversations?${searchParams}`)
      if (!res.ok) throw new Error("Failed to fetch conversations")
      const json = await res.json()
      // FIX: Access the nested data structure correctly
      return json.data as { data: ConversationWithAgent[]; total: number }
    },
  })
}

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-for-filter"],
    queryFn: async () => {
      const res = await fetch("/api/departments")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      // FIX: Access the nested data structure - r.data.data is the array
      return json.data.data as Department[]
    },
  })

  const { data, isLoading, error } = useConversations({
    status: statusFilter,
    direction: directionFilter,
    department_id: departmentFilter,
  })

  const filteredConversations = data?.data?.filter((conv) => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      conv.phone_number?.toLowerCase().includes(search) ||
      conv.caller_name?.toLowerCase().includes(search) ||
      conv.agent?.name?.toLowerCase().includes(search)
    )
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      no_answer: "bg-yellow-100 text-yellow-800",
    }
    return <Badge className={styles[status] || "bg-gray-100"}>{status.replace("_", " ")}</Badge>
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground mt-1">View and manage your call history</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, caller, or agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departmentsData?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load conversations. Please try again.</p>
            <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredConversations?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No conversations yet</h3>
            <p className="text-muted-foreground mt-2 text-center max-w-sm">
              {searchQuery
                ? "No conversations match your search."
                : "Conversations will appear here once your agents start making calls."}
            </p>
          </CardContent>
        </Card>
      )}

      {filteredConversations && filteredConversations.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>Phone / Caller</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell>
                    {conv.direction === "inbound" ? (
                      <div className="flex items-center gap-2">
                        <PhoneIncoming className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Inbound</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Outbound</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{conv.phone_number || "Unknown"}</p>
                      {conv.caller_name && (
                        <p className="text-sm text-muted-foreground">{conv.caller_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{conv.agent?.name || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(conv.duration_seconds)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(conv.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {conv.total_cost?.toFixed(2) || "0.00"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(conv.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {conv.recording_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={conv.recording_url} target="_blank" rel="noopener">
                            <Play className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/conversations/${conv.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {data && data.total > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredConversations?.length} of {data.total} conversations
        </div>
      )}
    </div>
  )
}
