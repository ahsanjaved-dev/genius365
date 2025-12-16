"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"
import { TestCallModal } from "./test-call-modal"
import type { AIAgent } from "@/types/database.types"

interface TestCallButtonProps {
  agent: AIAgent
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function TestCallButton({ 
  agent, 
  variant = "outline", 
  size = "sm",
  className 
}: TestCallButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check if agent can make test calls (needs external_id and PUBLIC key)
  const canTestCall = agent.external_agent_id && 
                      agent.agent_public_api_key && 
                      agent.agent_public_api_key.length > 0 &&
                      agent.provider !== "synthflow"

  // Get reason for being disabled
  const getDisabledReason = () => {
    if (!agent.external_agent_id) return "Not synced"
    if (!agent.agent_public_api_key?.length) return "No public key"
    if (agent.provider === "synthflow") return "Not supported"
    return ""
  }

  if (!canTestCall) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled 
        className={className}
      >
        <Phone className="mr-2 h-3 w-3" />
        Test Call
        <span className="ml-1 text-xs text-muted-foreground">
          ({getDisabledReason()})
        </span>
      </Button>
    )
  }

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        <Phone className="mr-2 h-3 w-3" />
        Test Call
      </Button>

      <TestCallModal 
        agent={agent} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  )
}