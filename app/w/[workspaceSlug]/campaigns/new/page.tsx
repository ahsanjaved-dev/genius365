"use client"

import { useRouter, useParams } from "next/navigation"
import { CampaignWizard } from "@/components/workspace/campaigns/campaign-wizard-dynamic"
import { useWorkspaceAgents } from "@/lib/hooks/use-workspace-agents"
import { useCreateCampaignWizard } from "@/lib/hooks/use-campaigns"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { CreateCampaignWizardInput, AIAgent } from "@/types/database.types"

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const { data: agentsData, isLoading: agentsLoading } = useWorkspaceAgents()
  const createMutation = useCreateCampaignWizard()

  const agents: AIAgent[] = agentsData?.data || []

  const handleSubmit = async (data: CreateCampaignWizardInput) => {
    try {
      const result = await createMutation.mutateAsync(data)
      toast.success("Campaign created successfully!")
      router.push(`/w/${workspaceSlug}/campaigns/${result.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign")
      throw error // Re-throw to keep wizard in current state
    }
  }

  const handleCancel = () => {
    router.push(`/w/${workspaceSlug}/campaigns`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground">
            Set up a new outbound calling campaign step by step
          </p>
        </div>
      </div>

      {/* Wizard */}
      <CampaignWizard
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        onCancel={handleCancel}
        agents={agents}
        isLoadingAgents={agentsLoading}
      />
    </div>
  )
}

