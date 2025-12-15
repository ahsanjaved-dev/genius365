import { createAdminClient } from "@/lib/supabase/admin"

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.invited"
  | "user.joined"
  | "user.updated"
  | "user.deleted"
  | "agent.created"
  | "agent.updated"
  | "agent.deleted"
  | "department.created"
  | "department.updated"
  | "department.deleted"
  | "organization.updated"
  | "settings.updated"
  | "invitation.created"
  | "invitation.accepted"
  | "invitation.revoked"

interface CreateAuditLogParams {
  userId?: string
  organizationId?: string
  action: AuditAction
  entityType: string
  entityId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient.from("audit_logs").insert({
      user_id: params.userId,
      organization_id: params.organizationId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      metadata: params.metadata || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })

    if (error) {
      console.error("[Audit] Failed to create log:", error)
    }
  } catch (error) {
    // Don't throw - audit logging should not break main functionality
    console.error("[Audit] Error:", error)
  }
}

// Helper to extract request metadata
export function getRequestMetadata(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  }
}
