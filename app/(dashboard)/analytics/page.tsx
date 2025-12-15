"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Phone,
  Loader2,
  Bot,
  Building2,
} from "lucide-react"
import { DepartmentSelector } from "@/components/dashboard/department-selector"

interface DailyTrend {
  date: string
  conversations: number
  minutes: number
  cost: number
}

interface AgentPerformance {
  id: string
  name: string
  provider: string
  status: string
  totalCalls: number
  completedCalls: number
  successRate: number
  avgDuration: number
  totalMinutes: number
  totalCost: number
}

export default function AnalyticsPage() {
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [timeRange, setTimeRange] = useState("30")

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["usage-trends", timeRange, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ days: timeRange })
      if (departmentFilter !== "all") params.set("department_id", departmentFilter)
      const res = await fetch(`/api/analytics/usage-trends?${params}`)
      if (!res.ok) throw new Error("Failed to fetch trends")
      const json = await res.json()
      return json.data as { trends: DailyTrend[]; days: number }
    },
  })

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ["agent-performance", departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (departmentFilter !== "all") params.set("department_id", departmentFilter)
      const res = await fetch(`/api/analytics/agent-performance?${params}`)
      if (!res.ok) throw new Error("Failed to fetch performance")
      const json = await res.json()
      return json.data as { agents: AgentPerformance[] }
    },
  })

  // Calculate totals from trends
  const totals = trendsData?.trends?.reduce(
    (acc, day) => ({
      conversations: acc.conversations + day.conversations,
      minutes: acc.minutes + day.minutes,
      cost: acc.cost + day.cost,
    }),
    { conversations: 0, minutes: 0, cost: 0 }
  ) || { conversations: 0, minutes: 0, cost: 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track usage, performance, and costs across your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DepartmentSelector value={departmentFilter} onChange={setDepartmentFilter} />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Conversations
            </CardTitle>
            <Phone className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totals.conversations}</div>
                <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Minutes
            </CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totals.minutes.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">${totals.cost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Daily Trends
          </CardTitle>
          <CardDescription>Usage breakdown by day</CardDescription>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trendsData?.trends?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Minutes</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendsData?.trends
                  ?.slice(-10)
                  .reverse()
                  .map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">
                        {new Date(day.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">{day.conversations}</TableCell>
                      <TableCell className="text-right">{day.minutes}</TableCell>
                      <TableCell className="text-right">${day.cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Agent Performance
          </CardTitle>
          <CardDescription>Performance metrics by agent</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : performanceData?.agents?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No agents found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData?.agents?.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{agent.totalCalls}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          agent.successRate >= 80
                            ? "bg-green-100 text-green-800"
                            : agent.successRate >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {agent.successRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{agent.avgDuration} min</TableCell>
                    <TableCell className="text-right">${agent.totalCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
