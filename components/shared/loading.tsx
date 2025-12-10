import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

export function Loading({ size = "md", text, className }: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size])} />
      {text && <span className="text-muted-foreground text-sm">{text}</span>}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loading size="lg" text="Loading..." />
    </div>
  )
}
