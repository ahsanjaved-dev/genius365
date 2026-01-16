/**
 * GET /api/w/[workspaceSlug]/agents/webhook-status
 * 
 * Check webhook URL configuration for all agents in a workspace.
 * Returns list of agents with their configured webhook URLs vs expected production URLs.
 * 
 * This endpoint helps diagnose why production campaigns aren't updating UI:
 * - If agent's serverUrl in VAPI points to ngrok/localhost, webhooks won't reach production
 * - Agents need to be re-synced to update the webhook URL to production URL
 */

import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, serverError } from "@/lib/api/helpers"
import { env } from "@/lib/env"

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

interface VapiAssistant {
  id: string
  name: string
  serverUrl?: string
  metadata?: {
    internal_agent_id?: string
    workspace_id?: string
    webhook_url?: string
  }
}

/**
 * Fetch agent details from VAPI to check actual webhook URL
 */
async function getVapiAgentDetails(
  externalAgentId: string,
  apiKey: string
): Promise<{ serverUrl?: string; error?: string }> {
  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${externalAgentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { error: `VAPI API error: ${response.status} - ${errorText}` }
    }

    const data: VapiAssistant = await response.json()
    return { serverUrl: data.serverUrl }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const { workspaceSlug } = await params
    const ctx = await getWorkspaceContext(workspaceSlug)
    if (!ctx) return unauthorized()

    const supabase = getSupabaseAdmin()

    // Get all VAPI agents in this workspace
    const { data: agents, error: agentsError } = await supabase
      .from("ai_agents")
      .select("id, name, provider, external_agent_id, workspace_id, sync_status, last_synced_at")
      .eq("workspace_id", ctx.workspace.id)
      .eq("provider", "vapi")
      .is("deleted_at", null)

    if (agentsError) {
      console.error("[WebhookStatus] Error fetching agents:", agentsError)
      return serverError("Failed to fetch agents")
    }

    if (!agents || agents.length === 0) {
      return apiResponse({
        workspace: {
          id: ctx.workspace.id,
          slug: workspaceSlug,
        },
        expectedWebhookUrl: getExpectedWebhookUrl(ctx.workspace.id),
        currentAppUrl: env.appUrl,
        agents: [],
        summary: {
          total: 0,
          synced: 0,
          needsResync: 0,
          notSynced: 0,
          webhookMismatch: 0,
        },
      })
    }

    // Get VAPI API key for this workspace
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

    // Expected webhook URL for this workspace
    const expectedWebhookUrl = getExpectedWebhookUrl(ctx.workspace.id)

    // Check each agent's webhook configuration
    const agentStatuses = await Promise.all(
      agents.map(async (agent) => {
        const result: {
          id: string
          name: string
          externalAgentId: string | null
          syncStatus: string
          lastSyncAt: string | null
          currentWebhookUrl: string | null
          expectedWebhookUrl: string
          webhookMatch: boolean
          status: "ok" | "mismatch" | "not_synced" | "unknown"
          error?: string
        } = {
          id: agent.id,
          name: agent.name,
          externalAgentId: agent.external_agent_id,
          syncStatus: agent.sync_status,
          lastSyncAt: agent.last_synced_at,
          currentWebhookUrl: null,
          expectedWebhookUrl,
          webhookMatch: false,
          status: "unknown",
        }

        // If not synced, can't check webhook
        if (!agent.external_agent_id) {
          result.status = "not_synced"
          return result
        }

        // If no API key, can't check webhook
        if (!secretKey) {
          result.error = "No VAPI API key configured"
          result.status = "unknown"
          return result
        }

        // Fetch actual webhook URL from VAPI
        const vapiResult = await getVapiAgentDetails(agent.external_agent_id, secretKey)

        if (vapiResult.error) {
          result.error = vapiResult.error
          result.status = "unknown"
          return result
        }

        result.currentWebhookUrl = vapiResult.serverUrl || null

        // Check if webhook URL matches expected
        if (result.currentWebhookUrl) {
          // Normalize URLs for comparison (remove trailing slashes)
          const current = result.currentWebhookUrl.replace(/\/$/, "").toLowerCase()
          const expected = expectedWebhookUrl.replace(/\/$/, "").toLowerCase()
          
          result.webhookMatch = current === expected

          // Check for common issues
          const isLocalhost = current.includes("localhost") || current.includes("127.0.0.1")
          const isNgrok = current.includes("ngrok")
          const isDifferentDomain = !current.includes(new URL(expectedWebhookUrl).hostname)

          if (isLocalhost || isNgrok || !result.webhookMatch) {
            result.status = "mismatch"
          } else {
            result.status = "ok"
          }
        } else {
          result.status = "mismatch"
        }

        return result
      })
    )

    // Summary stats
    const summary = {
      total: agentStatuses.length,
      synced: agentStatuses.filter((a) => a.externalAgentId).length,
      needsResync: agentStatuses.filter((a) => a.status === "mismatch").length,
      notSynced: agentStatuses.filter((a) => a.status === "not_synced").length,
      webhookMismatch: agentStatuses.filter((a) => a.status === "mismatch").length,
      ok: agentStatuses.filter((a) => a.status === "ok").length,
    }

    // Environment diagnostics
    const diagnostics = {
      currentAppUrl: env.appUrl,
      isProduction: env.isProd,
      expectedWebhookUrl,
      hasVapiKey: !!secretKey,
      commonIssues: [] as string[],
    }

    // Detect common issues
    if (env.appUrl.includes("localhost") && env.isProd) {
      diagnostics.commonIssues.push("NEXT_PUBLIC_APP_URL is set to localhost but running in production")
    }
    if (!env.appUrl || env.appUrl === "http://localhost:3000") {
      diagnostics.commonIssues.push("NEXT_PUBLIC_APP_URL may not be set correctly")
    }
    if (summary.webhookMismatch > 0) {
      diagnostics.commonIssues.push(`${summary.webhookMismatch} agent(s) have mismatched webhook URLs and need to be re-synced`)
    }

    return apiResponse({
      workspace: {
        id: ctx.workspace.id,
        slug: workspaceSlug,
      },
      diagnostics,
      agents: agentStatuses,
      summary,
    })
  } catch (error) {
    console.error("[WebhookStatus] Error:", error)
    return serverError("Failed to check webhook status")
  }
}

