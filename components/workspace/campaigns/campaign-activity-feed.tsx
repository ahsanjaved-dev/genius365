"use client"

/**
 * Campaign Live Activity Feed
 * 
 * Displays real-time call activity with:
 * - Animated entry for new events
 * - Status-based color coding
 * - Auto-scrolling for new events
 * - Compact and detailed views
 */

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Activity, 
  Phone, 
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  PhoneMissed,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Pause,
  Play,
  Maximize2,
  Minimize2
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export type ActivityEventType = 
  | "call_started" 
  | "call_ringing"
  | "call_answered" 
  | "call_ended" 
  | "call_failed"
  | "call_no_answer"
  | "campaign_started"
  | "campaign_paused"
  | "campaign_resumed"
  | "campaign_completed"

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  timestamp: Date
  recipientId?: string
  recipientName?: string
  recipientPhone?: string
  callId?: string
  duration?: number // seconds
  message?: string
}

export interface CampaignActivityFeedProps {
  events: ActivityEvent[]
  maxEvents?: number
  className?: string
  /** Auto-scroll to new events */
  autoScroll?: boolean
  /** Show in compact mode */
  compact?: boolean
}

// ============================================================================
// EVENT STYLING
// ============================================================================

const EVENT_CONFIG: Record<ActivityEventType, {
  icon: typeof Phone
  color: string
  bgColor: string
  label: string
}> = {
  call_started: {
    icon: PhoneCall,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Call Started",
  },
  call_ringing: {
    icon: PhoneIncoming,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Ringing",
  },
  call_answered: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Answered",
  },
  call_ended: {
    icon: Phone,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    label: "Call Ended",
  },
  call_failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Failed",
  },
  call_no_answer: {
    icon: PhoneMissed,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "No Answer",
  },
  campaign_started: {
    icon: Play,
    color: "text-green-600",
    bgColor: "bg-green-600/10",
    label: "Campaign Started",
  },
  campaign_paused: {
    icon: Pause,
    color: "text-yellow-600",
    bgColor: "bg-yellow-600/10",
    label: "Campaign Paused",
  },
  campaign_resumed: {
    icon: Play,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    label: "Campaign Resumed",
  },
  campaign_completed: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-600/10",
    label: "Campaign Completed",
  },
}

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  event: ActivityEvent
  isNew?: boolean
  compact?: boolean
}

function ActivityItem({ event, isNew, compact }: ActivityItemProps) {
  const config = EVENT_CONFIG[event.type]
  const Icon = config.icon
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md text-sm transition-all duration-300",
          isNew && "animate-in slide-in-from-left-5 fade-in-0",
          config.bgColor
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.color)} />
        <span className="font-medium truncate flex-1">
          {event.recipientName || event.recipientPhone || config.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(event.timestamp)}
        </span>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-all duration-500",
        isNew && "animate-in slide-in-from-left-5 fade-in-0",
        config.bgColor
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        config.bgColor
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-sm", config.color)}>
            {config.label}
          </span>
          {event.duration !== undefined && (
            <Badge variant="outline" className="text-xs">
              {formatDuration(event.duration)}
            </Badge>
          )}
        </div>
        
        {(event.recipientName || event.recipientPhone) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {event.recipientName || event.recipientPhone}
            </span>
          </div>
        )}
        
        {event.message && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {event.message}
          </p>
        )}
      </div>
      
      {/* Timestamp */}
      <div className="flex-shrink-0 text-xs text-muted-foreground">
        {formatTime(event.timestamp)}
      </div>
    </div>
  )
}

// ============================================================================
// PULSING DOT COMPONENT
// ============================================================================

function PulsingDot({ active }: { active: boolean }) {
  if (!active) return null
  
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignActivityFeed({ 
  events, 
  maxEvents = 50,
  className,
  autoScroll = true,
  compact: initialCompact = false,
}: CampaignActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(initialCompact)
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set())
  const prevEventsRef = useRef<string[]>([])
  
  // Track new events for animation
  useEffect(() => {
    const currentIds = events.map(e => e.id)
    const prevIds = prevEventsRef.current
    
    const newIds = currentIds.filter(id => !prevIds.includes(id))
    
    if (newIds.length > 0) {
      setNewEventIds(new Set(newIds))
      
      // Clear "new" status after animation
      setTimeout(() => {
        setNewEventIds(new Set())
      }, 1000)
    }
    
    prevEventsRef.current = currentIds
  }, [events])
  
  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [events.length, autoScroll])
  
  // Sort events by timestamp (newest first for display, but render oldest first for animation)
  const displayEvents = [...events]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .slice(-maxEvents)
  
  const hasActiveCall = events.some(e => 
    e.type === "call_started" || e.type === "call_ringing"
  )

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Activity
            <PulsingDot active={hasActiveCall} />
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCompact(!compact)}
          >
            {compact ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea 
          ref={scrollRef}
          className={cn(
            "px-4 pb-4",
            compact ? "h-[200px]" : "h-[300px]"
          )}
        >
          {displayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs">Events will appear here when the campaign starts</p>
            </div>
          ) : (
            <div className={cn(
              "space-y-2",
              compact && "space-y-1"
            )}>
              {displayEvents.map(event => (
                <ActivityItem 
                  key={event.id}
                  event={event}
                  isNew={newEventIds.has(event.id)}
                  compact={compact}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// HELPER: Convert recipient status change to activity event
// ============================================================================

export function recipientStatusToActivityEvent(
  recipientId: string,
  recipientName: string | null,
  recipientPhone: string,
  status: string,
  callId?: string
): ActivityEvent {
  let type: ActivityEventType = "call_started"
  
  switch (status) {
    case "calling":
      type = "call_started"
      break
    case "ringing":
      type = "call_ringing"
      break
    case "in-progress":
    case "answered":
      type = "call_answered"
      break
    case "completed":
      type = "call_ended"
      break
    case "failed":
    case "error":
      type = "call_failed"
      break
    case "no-answer":
    case "no_answer":
      type = "call_no_answer"
      break
    default:
      type = "call_started"
  }
  
  return {
    id: `${recipientId}-${status}-${Date.now()}`,
    type,
    timestamp: new Date(),
    recipientId,
    recipientName: recipientName || undefined,
    recipientPhone,
    callId,
  }
}

