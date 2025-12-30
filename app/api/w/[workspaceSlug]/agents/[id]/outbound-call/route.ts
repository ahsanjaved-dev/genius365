import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import type { AIAgent, IntegrationApiKeys } from "@/types/database.types"
import { createOutboundCall } from "@/lib/integrations/vapi/calls"
import { z } from "zod"

interface RouteContext {
  params: Promise<{ workspaceSlug: string; id: string }>
}

// ============================================================================
// REQUEST SCHEMA
// ============================================================================

const outboundCallSchema = z.object({
  customerNumber: z
    .string()
    .min(1, "Customer phone number is required")
    .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number format. Use E.164 format (e.g., +14155551234)"),
  customerName: z.string().optional(),
})

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// GET SECRET KEY FOR VAPI AGENT
// ============================================================================

async function getVapiSecretKeyForAgent(agent: AIAgent): Promise<string | null> {
  // Check legacy keys first
  const legacySecretKey = agent.agent_secret_api_key?.find(
    (key) => key.provider === "vapi" && key.is_active
  )

  if (legacySecretKey?.key) {
    return legacySecretKey.key
  }

  // Need to fetch from workspace_integrations
  if (!agent.workspace_id) {
    console.error("[OutboundCall] Agent has no workspace_id")
    return null
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: integration, error } = await supabase
      .from("workspace_integrations")
      .select("api_keys")
      .eq("workspace_id", agent.workspace_id)
      .eq("provider", "vapi")
      .eq("is_active", true)
      .single()

    if (error || !integration) {
      console.error("[OutboundCall] Failed to fetch VAPI integration:", error)
      return null
    }

    const apiKeys = integration.api_keys as IntegrationApiKeys
    const apiKeyConfig = agent.config?.api_key_config

    // NEW FLOW: Check assigned_key_id first
    if (apiKeyConfig?.assigned_key_id) {
      const keyId = apiKeyConfig.assigned_key_id

      if (keyId === "default") {
        return apiKeys.default_secret_key || null
      } else {
        const additionalKey = apiKeys.additional_keys?.find((k) => k.id === keyId)
        return additionalKey?.secret_key || null
      }
    }

    // LEGACY FLOW: Check secret_key.type
    if (!apiKeyConfig?.secret_key || apiKeyConfig.secret_key.type === "none") {
      return apiKeys.default_secret_key || null
    } else if (apiKeyConfig.secret_key.type === "default") {
      return apiKeys.default_secret_key || null
    } else if (apiKeyConfig.secret_key.type === "additional") {
      const additionalKey = apiKeys.additional_keys?.find(
        (k) => k.id === apiKeyConfig.secret_key?.additional_key_id
      )
      return additionalKey?.secret_key || null
    }

    return null
  } catch (error) {
    console.error("[OutboundCall] Error fetching secret key:", error)
    return null
  }
}

// ============================================================================
// POST /api/w/[workspaceSlug]/agents/[id]/outbound-call
// Create an outbound call from the agent's phone number to a customer
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { workspaceSlug, id } = await params
    const ctx = await getWorkspaceContext(workspaceSlug, ["owner", "admin", "member"])

    if (!ctx) {
      return forbidden("No permission to make outbound calls")
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = outboundCallSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0]?.message || "Invalid request", 400)
    }

    const { customerNumber, customerName } = validation.data

    // Get agent
    const { data: agent, error: agentError } = await ctx.adminClient
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .is("deleted_at", null)
      .single()

    if (agentError || !agent) {
      return apiError("Agent not found", 404)
    }

    const typedAgent = agent as AIAgent

    // Must be a Vapi agent
    if (typedAgent.provider !== "vapi") {
      return apiError("Outbound calls are only supported for Vapi agents", 400)
    }

    // Agent must be synced
    if (!typedAgent.external_agent_id) {
      return apiError(
        "Agent must be synced with Vapi before making outbound calls. Save the agent with an API key first.",
        400
      )
    }

    // Agent must have a phone number assigned
    const vapiPhoneNumberId = typedAgent.config?.telephony?.vapi_phone_number_id
    if (!vapiPhoneNumberId) {
      return apiError(
        "Agent does not have a phone number assigned. Provision one first.",
        400
      )
    }

    // Get secret key
    const secretKey = await getVapiSecretKeyForAgent(typedAgent)
    if (!secretKey) {
      return apiError(
        "No Vapi secret API key configured. Add one in the integration settings.",
        400
      )
    }

    // Create the outbound call
    const callResult = await createOutboundCall({
      apiKey: secretKey,
      assistantId: typedAgent.external_agent_id,
      phoneNumberId: vapiPhoneNumberId,
      customerNumber,
      customerName,
    })

    if (!callResult.success || !callResult.data) {
      return apiError(
        callResult.error || "Failed to create outbound call",
        500
      )
    }

    const call = callResult.data

    return apiResponse({
      success: true,
      callId: call.id,
      status: call.status,
      customerNumber,
      fromNumber: typedAgent.external_phone_number,
      message: "Outbound call initiated successfully",
    })
  } catch (error) {
    console.error("POST /api/w/[slug]/agents/[id]/outbound-call error:", error)
    return serverError()
  }
}

