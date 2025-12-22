"use client"

/**
 * Loading Components
 * Phase 4: Frontend Performance - Loading states
 */

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
}

export function LoadingSpinner({
  size = "md",
  className,
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

interface FullPageLoaderProps {
  text?: string
}

export function FullPageLoader({ text = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

interface CardLoaderProps {
  className?: string
}

export function CardLoader({ className }: CardLoaderProps) {
  return (
    <div
      className={cn(
        "flex h-48 items-center justify-center rounded-lg border bg-card",
        className
      )}
    >
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  )
}

interface ModalLoaderProps {
  text?: string
}

export function ModalLoader({ text = "Loading content..." }: ModalLoaderProps) {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

interface TableLoaderProps {
  rows?: number
  columns?: number
}

export function TableLoader({ rows = 5, columns = 4 }: TableLoaderProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 animate-pulse rounded bg-muted",
              i === 0 ? "w-32" : "w-20",
              i === columns - 1 ? "ml-auto w-16" : ""
            )}
          />
        ))}
      </div>
      <div className="divide-y px-4">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 py-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={cn(
                  "h-4 animate-pulse rounded bg-muted",
                  colIdx === 0 ? "w-40" : "w-24",
                  colIdx === columns - 1 ? "ml-auto w-20" : ""
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

