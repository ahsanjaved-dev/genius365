"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Phone,
  Clock,
  DollarSign,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Calendar,
  Eye,
  Smile,
  Meh,
  Frown,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Mock data for demonstration
const MOCK_STATS = {
  totalCalls: 1247,
  totalDuration: 18540, // in seconds
  avgCostPerCall: 0.42,
  successRate: 94.2,
  trends: {
    calls: { value: 12, positive: true },
    duration: { value: 8, positive: true },
    cost: { value: 3, positive: false },
    success: { value: 2.3, positive: true },
  },
}

const MOCK_CALLS_BY_DATE = [
  { label: "Mon", count: 156, duration: 2340, cost: 65.52 },
  { label: "Tue", count: 189, duration: 2835, cost: 79.38 },
  { label: "Wed", count: 201, duration: 3015, cost: 84.42 },
  { label: "Thu", count: 178, duration: 2670, cost: 74.76 },
  { label: "Fri", count: 223, duration: 3345, cost: 93.66 },
  { label: "Sat", count: 145, duration: 2175, cost: 60.90 },
  { label: "Sun", count: 155, duration: 2325, cost: 65.10 },
]

const MOCK_DURATION_DISTRIBUTION = [
  { label: "0-1m", count: 52 },
  { label: "1-2m", count: 156 },
  { label: "2-3m", count: 289 },
  { label: "3-5m", count: 412 },
  { label: "5-10m", count: 256 },
  { label: "10m+", count: 82 },
]

const MOCK_OUTCOMES = {
  completed: 1172,
  noAnswer: 52,
  transferred: 23,
}

const MOCK_SENTIMENT = {
  positive: 876,
  neutral: 298,
  negative: 73,
}

const MOCK_RECENT_CALLS = [
  { id: "call_8x7j2", agent: "Customer Support Bot", duration: 245, status: "completed", sentiment: "positive", sentimentScore: 0.89, cost: 0.38, time: "5 min ago" },
  { id: "call_9k3m5", agent: "Sales Qualifier", duration: 189, status: "completed", sentiment: "positive", sentimentScore: 0.92, cost: 0.31, time: "12 min ago" },
  { id: "call_2n8p1", agent: "Customer Support Bot", duration: 67, status: "no-answer", sentiment: "neutral", sentimentScore: 0.50, cost: 0.11, time: "18 min ago" },
  { id: "call_5r2t9", agent: "Appointment Scheduler", duration: 312, status: "completed", sentiment: "positive", sentimentScore: 0.85, cost: 0.48, time: "25 min ago" },
  { id: "call_7w4y6", agent: "Sales Qualifier", duration: 156, status: "transferred", sentiment: "neutral", sentimentScore: 0.55, cost: 0.24, time: "32 min ago" },
  { id: "call_1q9e3", agent: "Customer Support Bot", duration: 423, status: "completed", sentiment: "negative", sentimentScore: 0.28, cost: 0.65, time: "45 min ago" },
  { id: "call_4h6k8", agent: "Appointment Scheduler", duration: 198, status: "completed", sentiment: "positive", sentimentScore: 0.91, cost: 0.30, time: "1 hour ago" },
  { id: "call_3f5j7", agent: "Sales Qualifier", duration: 278, status: "completed", sentiment: "positive", sentimentScore: 0.88, cost: 0.43, time: "1 hour ago" },
]

const MOCK_AGENTS = [
  { id: "agent-1", name: "Customer Support Bot" },
  { id: "agent-2", name: "Sales Qualifier" },
  { id: "agent-3", name: "Appointment Scheduler" },
]

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }
  return `${mins}m ${secs}s`
}

function formatDurationShort(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }
  return `${mins}m`
}

export default function WorkspaceAnalyticsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const baseUrl = `/w/${workspaceSlug}`

  const [dateRange, setDateRange] = useState("7")
  const [selectedAgent, setSelectedAgent] = useState("all")
  const [chartType, setChartType] = useState<"calls" | "duration" | "cost">("calls")

  // Calculate sentiment percentages
  const sentimentTotal = MOCK_SENTIMENT.positive + MOCK_SENTIMENT.neutral + MOCK_SENTIMENT.negative
  const sentimentPositivePercent = Math.round((MOCK_SENTIMENT.positive / sentimentTotal) * 100)
  const sentimentNeutralPercent = Math.round((MOCK_SENTIMENT.neutral / sentimentTotal) * 100)
  const sentimentNegativePercent = Math.round((MOCK_SENTIMENT.negative / sentimentTotal) * 100)
  const avgSentimentScore = Math.round(
    ((MOCK_SENTIMENT.positive * 1 + MOCK_SENTIMENT.neutral * 0.5 + MOCK_SENTIMENT.negative * 0) / sentimentTotal) * 100
  )

  // SVG gauge calculations
  const circumference = 2 * Math.PI * 40
  const positiveArc = (sentimentPositivePercent / 100) * circumference
  const neutralArc = (sentimentNeutralPercent / 100) * circumference
  const negativeArc = (sentimentNegativePercent / 100) * circumference

  // Get max for chart scaling
  const maxCount = Math.max(...MOCK_CALLS_BY_DATE.map((d) => d.count))
  const maxDuration = Math.max(...MOCK_DURATION_DISTRIBUTION.map((d) => d.count))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze your voice agent performance.
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-44">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Agent Filter */}
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {MOCK_AGENTS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" size="sm" className="ml-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Calls</p>
              <p className="stat-value">{MOCK_STATS.totalCalls.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className={cn("stat-trend", MOCK_STATS.trends.calls.positive ? "positive" : "negative")}>
            {MOCK_STATS.trends.calls.positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{MOCK_STATS.trends.calls.positive ? "+" : "-"}{MOCK_STATS.trends.calls.value}% from last period</span>
          </div>
        </Card>

        {/* Total Duration */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Duration</p>
              <p className="stat-value">{formatDurationShort(MOCK_STATS.totalDuration)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
          <div className={cn("stat-trend", MOCK_STATS.trends.duration.positive ? "positive" : "negative")}>
            {MOCK_STATS.trends.duration.positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{MOCK_STATS.trends.duration.positive ? "+" : "-"}{MOCK_STATS.trends.duration.value}% from last period</span>
          </div>
        </Card>

        {/* Avg Cost/Call */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Avg Cost/Call</p>
              <p className="stat-value">${MOCK_STATS.avgCostPerCall.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className={cn("stat-trend", !MOCK_STATS.trends.cost.positive ? "positive" : "negative")}>
            {!MOCK_STATS.trends.cost.positive ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
            <span>-{MOCK_STATS.trends.cost.value}% from last period</span>
          </div>
        </Card>

        {/* Success Rate */}
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Success Rate</p>
              <p className="stat-value">{MOCK_STATS.successRate}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className={cn("stat-trend", MOCK_STATS.trends.success.positive ? "positive" : "negative")}>
            {MOCK_STATS.trends.success.positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{MOCK_STATS.trends.success.positive ? "+" : "-"}{MOCK_STATS.trends.success.value}% from last period</span>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Calls Over Time</CardTitle>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {(["calls", "duration", "cost"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize",
                      chartType === type
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Simple CSS-based chart visualization */}
            <div className="h-72 flex items-end justify-between gap-2 pt-8 pb-4">
              {MOCK_CALLS_BY_DATE.map((day, idx) => {
                const value = chartType === "calls" ? day.count : chartType === "duration" ? day.duration / 60 : day.cost
                const maxVal = chartType === "calls" ? maxCount : chartType === "duration" ? Math.max(...MOCK_CALLS_BY_DATE.map(d => d.duration / 60)) : Math.max(...MOCK_CALLS_BY_DATE.map(d => d.cost))
                const height = (value / maxVal) * 100
                return (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full flex-1 flex items-end justify-center">
                      <div
                        className="w-full max-w-8 bg-primary/20 rounded-t-md relative group cursor-pointer"
                        style={{ height: `${height}%` }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {chartType === "calls" && day.count}
                          {chartType === "duration" && `${Math.round(day.duration / 60)}m`}
                          {chartType === "cost" && `$${day.cost.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{day.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center gap-8">
              {/* Donut Chart */}
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                  {/* Completed */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth="12"
                    strokeDasharray={`${(MOCK_OUTCOMES.completed / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                  {/* No Answer */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(215, 16%, 47%)"
                    strokeWidth="12"
                    strokeDasharray={`${(MOCK_OUTCOMES.noAnswer / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 251.2} 251.2`}
                    strokeDashoffset={`-${(MOCK_OUTCOMES.completed / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 251.2}`}
                    strokeLinecap="round"
                  />
                  {/* Transferred */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(38, 92%, 50%)"
                    strokeWidth="12"
                    strokeDasharray={`${(MOCK_OUTCOMES.transferred / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 251.2} 251.2`}
                    strokeDashoffset={`-${((MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer) / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 251.2}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-xs text-muted-foreground">{MOCK_OUTCOMES.completed} ({Math.round((MOCK_OUTCOMES.completed / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 100)}%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <div>
                    <p className="text-sm font-medium">No Answer</p>
                    <p className="text-xs text-muted-foreground">{MOCK_OUTCOMES.noAnswer} ({Math.round((MOCK_OUTCOMES.noAnswer / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 100)}%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Transferred</p>
                    <p className="text-xs text-muted-foreground">{MOCK_OUTCOMES.transferred} ({Math.round((MOCK_OUTCOMES.transferred / (MOCK_OUTCOMES.completed + MOCK_OUTCOMES.noAnswer + MOCK_OUTCOMES.transferred)) * 100)}%)</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duration Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Call Duration Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-end justify-between gap-3 pt-8 pb-4">
              {MOCK_DURATION_DISTRIBUTION.map((bucket) => {
                const height = (bucket.count / maxDuration) * 100
                return (
                  <div key={bucket.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full flex-1 flex items-end justify-center">
                      <div
                        className="w-full max-w-12 bg-primary rounded-t-md relative group cursor-pointer"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {bucket.count} calls
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{bucket.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center gap-8">
              {/* Sentiment Gauge */}
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                  {/* Positive segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth="12"
                    strokeDasharray={`${positiveArc} ${circumference}`}
                    strokeLinecap="round"
                  />
                  {/* Neutral segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(38, 92%, 50%)"
                    strokeWidth="12"
                    strokeDasharray={`${neutralArc} ${circumference}`}
                    strokeDashoffset={`-${positiveArc}`}
                    strokeLinecap="round"
                  />
                  {/* Negative segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth="12"
                    strokeDasharray={`${negativeArc} ${circumference}`}
                    strokeDashoffset={`-${positiveArc + neutralArc}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{avgSentimentScore}%</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium">Positive</p>
                    <p className="text-xs text-muted-foreground">{sentimentPositivePercent}% ({MOCK_SENTIMENT.positive})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Neutral</p>
                    <p className="text-xs text-muted-foreground">{sentimentNeutralPercent}% ({MOCK_SENTIMENT.neutral})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-medium">Negative</p>
                    <p className="text-xs text-muted-foreground">{sentimentNegativePercent}% ({MOCK_SENTIMENT.negative})</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Calls</CardTitle>
            <Link href={`${baseUrl}/calls`} className="text-sm text-primary hover:underline">
              View all calls
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RECENT_CALLS.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-mono text-xs">{call.id}</TableCell>
                  <TableCell>{call.agent}</TableCell>
                  <TableCell>{formatDuration(call.duration)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        call.status === "completed" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                        call.status === "no-answer" && "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
                        call.status === "transferred" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      )}
                    >
                      {call.status === "no-answer" ? "No Answer" : call.status === "transferred" ? "Transferred" : "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        call.sentiment === "positive" && "text-green-600",
                        call.sentiment === "neutral" && "text-amber-600",
                        call.sentiment === "negative" && "text-red-600"
                      )}
                    >
                      {call.sentiment === "positive" && <Smile className="w-4 h-4" />}
                      {call.sentiment === "neutral" && <Meh className="w-4 h-4" />}
                      {call.sentiment === "negative" && <Frown className="w-4 h-4" />}
                      {Math.round(call.sentimentScore * 100)}%
                    </span>
                  </TableCell>
                  <TableCell>${call.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{call.time}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`${baseUrl}/calls?id=${call.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
