import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, notFound, serverError } from "@/lib/api/helpers"
import { createVapiWebCall } from "@/lib/integrations/vapi/web-call"
import { createRetellWebCall } from "@/lib/integrations/retell/web-call"
import type { AIAgent } from "@/types/database.types"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/agents/[id]/test-call
 * Creates a web call session for testing an agent
 * Returns a token that can be used by the frontend to initiate WebRTC call
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    // Get agent with all required fields
    const { data: agent, error: fetchError } = await auth.supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .single()

    if (fetchError || !agent) {
      return notFound("Agent")
    }

    const typedAgent = agent as AIAgent

    // Validate agent has external_agent_id (synced with provider)
    if (!typedAgent.external_agent_id) {
      return apiError(
        "Agent has not been synced with the provider yet. Please ensure the agent has a valid external ID.",
        400
      )
    }

    // Handle based on provider
    if (typedAgent.provider === "vapi") {
      // VAPI uses PUBLIC API key
      if (!typedAgent.agent_public_api_key || typedAgent.agent_public_api_key.length === 0) {
        return apiError(
          "Agent does not have a public API key configured. Please add a VAPI public API key to enable test calls.",
          400
        )
      }

      const session = await createVapiWebCall(
        typedAgent.external_agent_id,
        typedAgent.agent_public_api_key
      )

      if (!session.success) {
        return apiError(session.error || "Failed to create web call session", 500)
      }

      return apiResponse({
        provider: session.provider,
        token: session.token,
        publicKey: session.publicKey,
        agentName: typedAgent.name,
        externalAgentId: typedAgent.external_agent_id,
      })
    } else if (typedAgent.provider === "retell") {
      // Retell uses SECRET API key to get access token
      if (!typedAgent.agent_secret_api_key || typedAgent.agent_secret_api_key.length === 0) {
        return apiError(
          "Agent does not have a secret API key configured. Please add a Retell secret API key to enable test calls.",
          400
        )
      }

      const session = await createRetellWebCall(
        typedAgent.external_agent_id,
        typedAgent.agent_secret_api_key
      )

      if (!session.success) {
        return apiError(session.error || "Failed to create web call session", 500)
      }

      return apiResponse({
        provider: session.provider,
        accessToken: session.accessToken,
        callId: session.callId,
        agentName: typedAgent.name,
        externalAgentId: typedAgent.external_agent_id,
      })
    } else {
      return apiError(
        `Web calls for ${typedAgent.provider} are not supported.`,
        400
      )
    }
  } catch (error) {
    console.error("POST /api/agents/[id]/test-call error:", error)
    return serverError()
  }
}