"use client"

/**
 * Campaign Stats Card Component (OPTIMIZED)
 * 
 * Lightweight stats display without heavy animations
 * Uses CSS transitions for subtle hover effects
 */

import { cn } from "@/lib/utils"
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  suffix?: string
}

function StatCard({ label, value, icon, color, bgColor, suffix }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4",
        "hover:shadow-md transition-shadow duration-200"
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <span className={color}>{icon}</span>
          </div>
        </div>

        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {value.toLocaleString()}
          {suffix}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  )
}

interface CampaignStatsGridProps {
  totalRecipients: number
  pendingCalls: number
  completedCalls: number
  successfulCalls: number
  failedCalls: number
  className?: string
}

export function CampaignStatsGrid({
  totalRecipients,
  pendingCalls,
  successfulCalls,
  failedCalls,
  className,
}: CampaignStatsGridProps) {
  const stats: StatCardProps[] = [
    {
      label: "Total Recipients",
      value: totalRecipients,
      icon: <Users className="h-5 w-5" />,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      label: "Pending",
      value: pendingCalls,
      icon: <Clock className="h-5 w-5" />,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Answered",
      value: successfulCalls,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Failed",
      value: failedCalls,
      icon: <XCircle className="h-5 w-5" />,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ]

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}

// Compact version for campaign list
export function CampaignStatsCompact({
  total,
  completed,
  successful,
  failed,
  isActive,
}: {
  total: number
  completed: number
  successful: number
  failed: number
  isActive?: boolean
}) {
  const successRate = completed > 0 ? Math.round((successful / completed) * 100) : 0

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{total.toLocaleString()}</span>
      </div>

      {isActive && (
        <>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successful}</span>
          </div>
          {failed > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1.5 text-red-500">
                <XCircle className="h-4 w-4" />
                <span>{failed}</span>
              </div>
            </>
          )}
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{successRate}% success</span>
        </>
      )}
    </div>
  )
}
