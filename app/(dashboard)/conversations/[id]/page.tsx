"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  DollarSign,
  Bot,
  Calendar,
  FileText,
  Play,
  Star,
  AlertCircle,
} from "lucide-react"
import type { Conversation } from "@/types/database.types"

interface ConversationWithDetails extends Conversation {
  agent?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ConversationDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${id}`)
      if (!res.ok) throw new Error("Failed to fetch conversation")
      const json = await res.json()
      return json.data as ConversationWithDetails
    },
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      no_answer: "bg-yellow-100 text-yellow-800",
    }
    return colors[status] || "bg-gray-100"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Conversation not found</p>
        <Button asChild className="mt-4">
          <Link href="/conversations">Back to Conversations</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conversations">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {conversation.direction === "inbound" ? (
              <PhoneIncoming className="h-6 w-6 text-green-600" />
            ) : (
              <PhoneOutgoing className="h-6 w-6 text-blue-600" />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {conversation.phone_number || "Unknown Number"}
              </h1>
              <p className="text-muted-foreground">
                {conversation.caller_name || "Unknown Caller"}
              </p>
            </div>
          </div>
        </div>
        <Badge className={getStatusColor(conversation.status)}>
          {conversation.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(conversation.duration_seconds)}
                </p>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  ${conversation.total_cost?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold truncate">{conversation.agent?.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">Agent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {conversation.quality_score ? `${conversation.quality_score}/10` : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Quality</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recording */}
          {conversation.recording_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full">
                  <source src={conversation.recording_url} />
                  Your browser does not support audio playback.
                </audio>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversation.transcript ? (
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                  {conversation.transcript}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No transcript available</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {conversation.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{conversation.summary}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Direction</span>
                <span className="capitalize">{conversation.direction}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span>
                  {conversation.started_at
                    ? new Date(conversation.started_at).toLocaleString()
                    : "N/A"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ended</span>
                <span>
                  {conversation.ended_at ? new Date(conversation.ended_at).toLocaleString() : "N/A"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sentiment</span>
                <span className="capitalize">{conversation.sentiment || "N/A"}</span>
              </div>
              {conversation.customer_rating && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer Rating</span>
                    <span>{conversation.customer_rating}/5 ⭐</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          {conversation.cost_breakdown && Object.keys(conversation.cost_breakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(conversation.cost_breakdown as Record<string, number>).map(
                  ([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace("_", " ")}
                      </span>
                      <span>${value?.toFixed(4) || "0.00"}</span>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          )}

          {/* Follow-up */}
          {conversation.requires_follow_up && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">⚠️ Follow-up Required</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700">
                  {conversation.follow_up_notes || "This conversation requires follow-up action."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
