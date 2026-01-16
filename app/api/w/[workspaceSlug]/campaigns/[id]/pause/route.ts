import { NextRequest } from "next/server"
import { getWorkspaceContext, checkWorkspacePaywall } from "@/lib/api/workspace-auth"
import { apiError, unauthorized, notFound } from "@/lib/api/helpers"

/**
 * POST /api/w/[workspaceSlug]/campaigns/[id]/pause
 * 
 * DISABLED: VAPI does not support pausing campaigns.
 * 
 * VAPI queues all calls on their servers when a campaign starts.
 * Once queued, calls cannot be paused - they will be executed.
 * 
 * To stop a campaign, use the CANCEL/TERMINATE endpoint instead,
 * which will prevent any remaining calls from being sent to VAPI.
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

    // Get campaign
    const { data: campaign, error: campaignError } = await ctx.adminClient
      .from("call_campaigns")
      .select("id, status")
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (campaignError || !campaign) {
      return notFound("Campaign")
    }

    // Return error explaining that pause is not supported
    return apiError(
      "Pause is not supported. VAPI processes all calls immediately once a campaign starts. " +
      "To stop the campaign, use Cancel instead - this will prevent remaining calls from being sent.",
      400
    )
  } catch (error) {
    console.error("[CampaignPause] Exception:", error)
    return apiError("Internal server error", 500)
  }
}
