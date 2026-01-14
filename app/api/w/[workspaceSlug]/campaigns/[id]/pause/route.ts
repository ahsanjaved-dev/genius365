import { NextRequest } from "next/server"
import { getWorkspaceContext, checkWorkspacePaywall } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError, notFound } from "@/lib/api/helpers"
import { pauseCampaignBatch } from "@/lib/integrations/campaign-provider"

/**
 * POST /api/w/[workspaceSlug]/campaigns/[id]/pause
 * 
 * Pause an active campaign.
 * Uses unified provider with automatic fallback handling.
 * For Inspra: calls /pause-batch
 * For VAPI: state-based (campaign status controls continuation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; id: string }> }
) {
  try {
    const { workspaceSlug, id } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)
    if (!ctx) return unauthorized()

    // Check paywall
    const paywallError = await checkWorkspacePaywall(ctx.workspace.id, workspaceSlug)
    if (paywallError) return paywallError

    // Get campaign with agent
    const { data: campaign, error: campaignError } = await ctx.adminClient
      .from("call_campaigns")
      .select(`
        *,
        agent:ai_agents!agent_id(id, external_agent_id)
      `)
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (campaignError || !campaign) {
      return notFound("Campaign")
    }

    // Validate campaign can be paused
    if (campaign.status !== "active") {
      return apiError("Only active campaigns can be paused")
    }

    const agent = campaign.agent as any
    if (!agent?.external_agent_id) {
      return apiError("Agent configuration is invalid")
    }

    // Call unified provider to pause batch
    console.log("[CampaignPause] Pausing campaign:", id)

    const providerResult = await pauseCampaignBatch(
      ctx.workspace.id,
      agent.external_agent_id,
      id
    )

    if (!providerResult.success) {
      console.error("[CampaignPause] Provider error:", providerResult.error)
      // Don't fail - still update local status
    }

    // Update campaign status to paused
    const { data: updatedCampaign, error: updateError } = await ctx.adminClient
      .from("call_campaigns")
      .update({
        status: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[CampaignPause] Error updating campaign status:", updateError)
      return serverError("Failed to update campaign status")
    }

    console.log("[CampaignPause] Campaign paused:", id)

    return apiResponse({
      success: true,
      campaign: updatedCampaign,
      provider: {
        used: providerResult.provider,
        success: providerResult.success,
        error: providerResult.error,
      },
      message: "Campaign paused. In-progress calls will complete, but no new calls will be initiated.",
    })
  } catch (error) {
    console.error("[CampaignPause] Exception:", error)
    return serverError("Internal server error")
  }
}
