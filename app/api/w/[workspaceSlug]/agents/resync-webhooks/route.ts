/**
 * POST /api/w/[workspaceSlug]/agents/resync-webhooks
 * 
 * Force resync all agents in a workspace to update their webhook URLs.
 * This is the fix for production campaigns not updating UI.
 * 
 * When agents are synced, the webhook URL is set based on NEXT_PUBLIC_APP_URL.
 * If agents were synced in development (with ngrok/localhost), they need to
 * be re-synced in production to update the webhook URL.
 * 
 * Request Body (optional):
 * {
 *   agentIds?: string[]  // Specific agents to resync. If omitted, resync all mismatched agents.
 *   force?: boolean      // Force resync even if webhook URL looks correct
 * }
 */

import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getWorkspaceContext, checkWorkspacePaywall } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError, forbidden } from "@/lib/api/helpers"
import { safeVapiSync } from "@/lib/integrations/vapi/agent/sync"
import { env } from "@/lib/env"
import type { AIAgent } from "@/types/database.types"

export const dynamic = "force-dynamic"

// ============================================================================
// HELPERS
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function getExpectedWebhookUrl(workspaceId: string): string {
  const baseUrl = (env.appUrl || "https://genius365.vercel.app").replace(/\/$/, "")
  return `${baseUrl}/api/webhooks/w/${workspaceId}/vapi`
}

/**
 * Check if agent's current webhook URL needs updating
 */
async function checkAgentNeedsResync(
  externalAgentId: string,
  expectedUrl: string,
  apiKey: string
): Promise<{ needsResync: boolean; currentUrl?: string; error?: string }> {
  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${externalAgentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return { needsResync: true, error: `VAPI API error: ${response.status}` }
    }

    const data = await response.json()
    const currentUrl = data.serverUrl || ""

    // Check if URL matches expected
    const normalizedCurrent = currentUrl.replace(/\/$/, "").toLowerCase()
    const normalizedExpected = expectedUrl.replace(/\/$/, "").toLowerCase()

    const needsResync = normalizedCurrent !== normalizedExpected ||
      currentUrl.includes("localhost") ||
      currentUrl.includes("127.0.0.1") ||
      currentUrl.includes("ngrok")

    return { needsResync, currentUrl }
  } catch (error) {
    return { needsResync: true, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug, ["owner", "admin"])
    if (!ctx) return unauthorized()

    // Check paywall
    const paywallError = await checkWorkspacePaywall(ctx.workspace.id, workspaceSlug)
    if (paywallError) return paywallError

    // Parse request body
    let body: { agentIds?: string[]; force?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is OK
    }

    const { agentIds, force = false } = body

    const supabase = getSupabaseAdmin()

    // Build query for agents
    let query = supabase
      .from("ai_agents")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .eq("provider", "vapi")
      .is("deleted_at", null)

    // Filter to specific agents if provided
    if (agentIds && agentIds.length > 0) {
      query = query.in("id", agentIds)
    }

    const { data: agents, error: agentsError } = await query

    if (agentsError) {
      console.error("[ResyncWebhooks] Error fetching agents:", agentsError)
      return serverError("Failed to fetch agents")
    }

    if (!agents || agents.length === 0) {
      return apiResponse({
        success: true,
        message: "No VAPI agents found to resync",
        resynced: 0,
        skipped: 0,
        failed: 0,
      })
    }

    // Get VAPI API key
    const { data: assignment } = await supabase
      .from("workspace_integration_assignments")
      .select(`
        partner_integration:partner_integrations (
          api_keys,
          is_active
        )
      `)
      .eq("workspace_id", ctx.workspace.id)
      .eq("provider", "vapi")
      .single()

    const apiKeys = (assignment?.partner_integration as any)?.api_keys
    const secretKey = apiKeys?.default_secret_key

    if (!secretKey) {
      return apiError("No VAPI API key configured for this workspace")
    }

    const expectedWebhookUrl = getExpectedWebhookUrl(ctx.workspace.id)
    const results: Array<{
      agentId: string
      agentName: string
      status: "resynced" | "skipped" | "failed"
      previousUrl?: string
      newUrl?: string
      error?: string
    }> = []

    // Process each agent
    for (const agent of agents) {
      const result: typeof results[0] = {
        agentId: agent.id,
        agentName: agent.name,
        status: "skipped",
      }

      // Skip if not synced
      if (!agent.external_agent_id) {
        result.status = "skipped"
        result.error = "Agent not synced to VAPI"
        results.push(result)
        continue
      }

      // Check if resync is needed (unless force flag is set)
      if (!force) {
        const checkResult = await checkAgentNeedsResync(
          agent.external_agent_id,
          expectedWebhookUrl,
          secretKey
        )

        if (!checkResult.needsResync) {
          result.status = "skipped"
          result.previousUrl = checkResult.currentUrl
          result.newUrl = expectedWebhookUrl
          results.push(result)
          continue
        }

        result.previousUrl = checkResult.currentUrl
      }

      // Perform resync
      console.log(`[ResyncWebhooks] Resyncing agent ${agent.id} (${agent.name})...`)

      try {
        const syncResult = await safeVapiSync(agent as AIAgent, "update")

        if (syncResult.success) {
          result.status = "resynced"
          result.newUrl = expectedWebhookUrl
          console.log(`[ResyncWebhooks] Successfully resynced agent ${agent.id}`)
        } else {
          result.status = "failed"
          result.error = syncResult.error || "Unknown sync error"
          console.error(`[ResyncWebhooks] Failed to resync agent ${agent.id}:`, syncResult.error)
        }
      } catch (error) {
        result.status = "failed"
        result.error = error instanceof Error ? error.message : "Unknown error"
        console.error(`[ResyncWebhooks] Exception resyncing agent ${agent.id}:`, error)
      }

      results.push(result)

      // Small delay between resyncs to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Summary
    const resynced = results.filter((r) => r.status === "resynced").length
    const skipped = results.filter((r) => r.status === "skipped").length
    const failed = results.filter((r) => r.status === "failed").length

    return apiResponse({
      success: failed === 0,
      message: `Resync complete: ${resynced} resynced, ${skipped} skipped, ${failed} failed`,
      expectedWebhookUrl,
      currentAppUrl: env.appUrl,
      resynced,
      skipped,
      failed,
      results,
    })
  } catch (error) {
    console.error("[ResyncWebhooks] Error:", error)
    return serverError("Failed to resync webhooks")
  }
}

