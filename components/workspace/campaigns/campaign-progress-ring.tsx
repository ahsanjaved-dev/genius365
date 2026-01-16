"use client"

/**
 * Progress Ring Component (OPTIMIZED)
 * 
 * Lightweight circular progress indicator using CSS-only animations
 * No framer-motion dependency for better performance
 */

import { cn } from "@/lib/utils"

interface CampaignProgressRingProps {
  /** Progress value (0-100) */
  value: number
  /** Size of the ring in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Whether the campaign is actively processing */
  isActive?: boolean
  /** Show the percentage in the center */
  showPercentage?: boolean
  /** Show processed/total count */
  showCount?: boolean
  /** Total count for display */
  total?: number
  /** Processed count */
  processed?: number
  /** Color scheme */
  variant?: "default" | "success" | "warning" | "danger"
  /** Custom class name */
  className?: string
}

const VARIANTS = {
  default: {
    stroke: "#8b5cf6",
    bg: "stroke-slate-200 dark:stroke-slate-700",
  },
  success: {
    stroke: "#10b981",
    bg: "stroke-emerald-100 dark:stroke-emerald-900/30",
  },
  warning: {
    stroke: "#f59e0b",
    bg: "stroke-amber-100 dark:stroke-amber-900/30",
  },
  danger: {
    stroke: "#ef4444",
    bg: "stroke-red-100 dark:stroke-red-900/30",
  },
}

export function CampaignProgressRing({
  value,
  size = 140,
  strokeWidth = 12,
  isActive = false,
  showPercentage = true,
  showCount = false,
  total,
  processed,
  variant = "default",
  className,
}: CampaignProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, value))
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const colors = VARIANTS[variant]

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
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
          strokeWidth={strokeWidth}
          className={colors.bg}
        />

        {/* Progress circle - CSS transition for smooth updates */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <div className="flex items-baseline">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {Math.round(progress)}
            </span>
            <span className="text-lg font-medium text-muted-foreground">%</span>
          </div>
        )}
        {showCount && total !== undefined && processed !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {processed.toLocaleString()} / {total.toLocaleString()}
          </p>
        )}
        {isActive && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-medium text-green-600 uppercase tracking-wider">
              Active
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
