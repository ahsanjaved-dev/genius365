import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, notFound, serverError } from "@/lib/api/helpers"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext()
    if (!auth) return unauthorized()

    const { id } = await params

    const { data: conversation, error } = await auth.supabase
      .from("conversations")
      .select(
        `
        *,
        agent:ai_agents(id, name),
        department:departments(id, name)
      `
      )
      .eq("id", id)
      .eq("organization_id", auth.organization.id)
      .is("deleted_at", null)
      .single()

    if (error || !conversation) {
      return notFound("Conversation")
    }

    return apiResponse(conversation)
  } catch (error) {
    console.error("GET /api/conversations/[id] error:", error)
    return serverError()
  }
}
