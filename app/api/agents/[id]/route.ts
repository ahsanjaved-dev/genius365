import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, notFound, serverError } from "@/lib/api/helpers"
import { updateAgentSchema } from "@/types/api.types"
import { safeVapiSync, shouldSyncToVapi } from "@/lib/integrations/vapi/agent/sync"
import type { AIAgent } from "@/types/database.types"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    const { data: agent, error } = await auth.supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .single()

    if (error || !agent) {
      return notFound("Agent")
    }

    return apiResponse(agent)
  } catch (error) {
    console.error("GET /api/agents/[id] error:", error)
    return serverError()
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params
    const body = await request.json()
    const validation = updateAgentSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { data: existing } = await auth.supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .single()

    if (!existing) {
      return notFound("Agent")
    }

    const { data: agent, error } = await auth.supabase
      .from("ai_agents")
      .update(validation.data)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update agent error:", error)
      return apiError("Failed to update agent")
    }

    // Sync agent with VAPI (only for VAPI provider)
    let syncedAgent = agent as AIAgent
    const typedAgent = agent as AIAgent

    if (typedAgent.provider === "vapi" && shouldSyncToVapi(typedAgent)) {
      const syncResult = await safeVapiSync(typedAgent, "update")
      
      if (syncResult.success && syncResult.agent) {
        syncedAgent = syncResult.agent
      } else if (!syncResult.success) {
        console.error("VAPI sync failed:", syncResult.error)
      }
    }

    return apiResponse(syncedAgent)
  } catch (error) {
    console.error("PATCH /api/agents/[id] error:", error)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    const { data: existing } = await auth.supabase
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .single()

    if (!existing) {
      return notFound("Agent")
    }

    // Delete from VAPI first if synced (only for VAPI provider)
    const typedExisting = existing as AIAgent
    if (
      typedExisting.provider === "vapi" &&
      typedExisting.external_agent_id &&
      shouldSyncToVapi(typedExisting)
    ) {
      await safeVapiSync(typedExisting, "delete")
    }

    const { error } = await auth.supabase.from("ai_agents").delete().eq("id", id)

    if (error) {
      console.error("Delete agent error:", error)
      return apiError("Failed to delete agent")
    }

    return apiResponse({ success: true })
  } catch (error) {
    console.error("DELETE /api/agents/[id] error:", error)
    return serverError()
  }
}