"use client"

/**
 * Campaign Analytics Dashboard
 * 
 * Displays call outcome statistics with:
 * - Donut chart for call distribution
 * - Success rate metric
 * - Duration analytics
 * - Outcome breakdown
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  XCircle, 
  PhoneOff, 
  PhoneMissed, 
  Clock,
  TrendingUp,
  Timer,
  Activity
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignAnalyticsData {
  total: number
  completed: number
  successful: number
  failed: number
  pending: number
  /** Call outcomes breakdown */
  outcomes?: {
    answered: number
    no_answer: number
    busy: number
    voicemail: number
    failed: number
    other: number
  }
  /** Average call duration in seconds */
  avgDurationSeconds?: number
  /** Total minutes used */
  totalMinutes?: number
  /** Success rate percentage */
  successRate: number
}

export interface CampaignAnalyticsProps {
  data: CampaignAnalyticsData
  className?: string
}

// ============================================================================
// COLORS
// ============================================================================

const OUTCOME_COLORS = {
  answered: { bg: "bg-green-500", text: "text-green-500", light: "bg-green-100 dark:bg-green-900/30" },
  no_answer: { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-100 dark:bg-yellow-900/30" },
  busy: { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-100 dark:bg-orange-900/30" },
  voicemail: { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-100 dark:bg-blue-900/30" },
  failed: { bg: "bg-red-500", text: "text-red-500", light: "bg-red-100 dark:bg-red-900/30" },
  other: { bg: "bg-gray-500", text: "text-gray-500", light: "bg-gray-100 dark:bg-gray-900/30" },
  pending: { bg: "bg-slate-400", text: "text-slate-400", light: "bg-slate-100 dark:bg-slate-900/30" },
}

const OUTCOME_ICONS = {
  answered: CheckCircle2,
  no_answer: PhoneMissed,
  busy: PhoneOff,
  voicemail: Activity,
  failed: XCircle,
  other: Clock,
  pending: Clock,
}

const OUTCOME_LABELS = {
  answered: "Answered",
  no_answer: "No Answer",
  busy: "Busy",
  voicemail: "Voicemail",
  failed: "Failed",
  other: "Other",
  pending: "Pending",
}

// ============================================================================
// DONUT CHART COMPONENT
// ============================================================================

interface DonutSegment {
  key: string
  value: number
  color: string
}

function DonutChart({ 
  segments, 
  total, 
  centerLabel,
  size = 160 
}: { 
  segments: DonutSegment[]
  total: number
  centerLabel?: string
  size?: number
}) {
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // Calculate stroke-dasharray for each segment
  let accumulatedLength = 0
  
  const segmentData = segments
    .filter(s => s.value > 0)
    .map(segment => {
      const percentage = total > 0 ? segment.value / total : 0
      const length = circumference * percentage
      const offset = accumulatedLength
      accumulatedLength += length
      return {
        ...segment,
        percentage,
        length,
        offset,
      }
    })

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        
        {/* Segments */}
        {segmentData.map((segment, index) => (
          <circle
            key={segment.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            className={segment.color}
            style={{
              transition: "stroke-dasharray 0.5s ease-in-out, stroke-dashoffset 0.5s ease-in-out",
            }}
          />
        ))}
      </svg>
      
      {/* Center label */}
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold">{centerLabel}</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignAnalytics({ data, className }: CampaignAnalyticsProps) {
  // Prepare chart segments
  const segments: DonutSegment[] = []
  
  if (data.outcomes) {
    if (data.outcomes.answered > 0) {
      segments.push({ key: "answered", value: data.outcomes.answered, color: "text-green-500" })
    }
    if (data.outcomes.no_answer > 0) {
      segments.push({ key: "no_answer", value: data.outcomes.no_answer, color: "text-yellow-500" })
    }
    if (data.outcomes.busy > 0) {
      segments.push({ key: "busy", value: data.outcomes.busy, color: "text-orange-500" })
    }
    if (data.outcomes.voicemail > 0) {
      segments.push({ key: "voicemail", value: data.outcomes.voicemail, color: "text-blue-500" })
    }
    if (data.outcomes.failed > 0) {
      segments.push({ key: "failed", value: data.outcomes.failed, color: "text-red-500" })
    }
    if (data.outcomes.other > 0) {
      segments.push({ key: "other", value: data.outcomes.other, color: "text-gray-500" })
    }
  } else {
    // Use basic data if outcomes not available
    if (data.successful > 0) {
      segments.push({ key: "answered", value: data.successful, color: "text-green-500" })
    }
    if (data.failed > 0) {
      segments.push({ key: "failed", value: data.failed, color: "text-red-500" })
    }
  }
  
  if (data.pending > 0) {
    segments.push({ key: "pending", value: data.pending, color: "text-slate-400" })
  }
  
  const chartTotal = segments.reduce((acc, s) => acc + s.value, 0)
  
  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Campaign Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Donut Chart */}
          <div className="flex justify-center md:justify-start">
            <DonutChart
              segments={segments}
              total={chartTotal}
              centerLabel={`${data.successRate}%`}
              size={140}
            />
          </div>
          
          {/* Stats & Legend */}
          <div className="flex-1 space-y-4">
            {/* Duration Stats */}
            {(data.avgDurationSeconds || data.totalMinutes) && (
              <div className="flex gap-4 pb-3 border-b">
                {data.avgDurationSeconds !== undefined && (
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatDuration(Math.round(data.avgDurationSeconds))}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Duration</p>
                    </div>
                  </div>
                )}
                {data.totalMinutes !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{data.totalMinutes.toFixed(1)} min</p>
                      <p className="text-xs text-muted-foreground">Total Time</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2">
              {segments.map(segment => {
                const key = segment.key as keyof typeof OUTCOME_COLORS
                const colors = OUTCOME_COLORS[key]
                const Icon = OUTCOME_ICONS[key]
                const label = OUTCOME_LABELS[key]
                const percentage = chartTotal > 0 
                  ? Math.round((segment.value / chartTotal) * 100) 
                  : 0
                
                return (
                  <div 
                    key={segment.key}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg",
                      colors.light
                    )}
                  >
                    <Icon className={cn("h-4 w-4", colors.text)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{label}</p>
                      <p className={cn("text-sm font-bold", colors.text)}>
                        {segment.value}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({percentage}%)
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPACT VERSION FOR CAMPAIGN LIST
// ============================================================================

export function CampaignAnalyticsBadge({ 
  successRate, 
  completed,
  total,
}: { 
  successRate: number
  completed: number
  total: number
}) {
  const variant = successRate >= 70 
    ? "default" 
    : successRate >= 40 
      ? "secondary" 
      : "destructive"
  
  return (
    <Badge variant={variant} className="font-mono">
      {successRate}% ({completed}/{total})
    </Badge>
  )
}

