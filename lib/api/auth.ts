import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPartnerFromHost, type ResolvedPartner } from "./partner"
import type {
  PartnerAuthUser,
  AccessibleWorkspace,
  WorkspaceMemberRole,
  PartnerMemberRole,
  PartnerMembership,
} from "@/types/database.types"

// ============================================================================
// PARTNER AUTH CONTEXT
// ============================================================================

export interface PartnerAuthContext {
  /** The authenticated user */
  user: PartnerAuthUser
  /** The partner resolved from the current hostname */
  partner: ResolvedPartner
  /** User's role within this partner (null if not a member) */
  partnerRole: PartnerMemberRole | null
  /** User's partner membership details */
  partnerMembership: PartnerMembership | null
  /** List of workspaces the user can access within this partner */
  workspaces: AccessibleWorkspace[]
  /** The Supabase client for database operations */
  supabase: Awaited<ReturnType<typeof createClient>>
  /** The admin client for bypassing RLS (use carefully) */
  adminClient: ReturnType<typeof createAdminClient>
}

/**
 * Get the partner-aware authentication context
 * This combines:
 * 1. Auth user from Supabase
 * 2. Partner resolved from hostname
 * 3. User's partner membership for that partner
 * 4. User's workspace memberships for that partner
 */
export async function getPartnerAuthContext(): Promise<PartnerAuthContext | null> {
  try {
    const supabase = await createClient()

    // Step 1: Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[getPartnerAuthContext] No auth user:", authError?.message)
      return null
    }

    // Step 2: Resolve partner from hostname
    const partner = await getPartnerFromHost()

    const adminClient = createAdminClient()

    // Step 3: Get user's partner membership
    const { data: partnerMemberData, error: partnerMemberError } = await adminClient
      .from("partner_members")
      .select(
        `
        id,
        role,
        partner:partners!inner(
          id,
          name,
          slug,
          is_platform_partner
        )
      `
      )
      .eq("user_id", authUser.id)
      .eq("partner_id", partner.id)
      .is("removed_at", null)
      .single()

    let partnerRole: PartnerMemberRole | null = null
    let partnerMembership: PartnerMembership | null = null

    if (partnerMemberData && !partnerMemberError) {
      const pm = partnerMemberData as any
      partnerRole = pm.role as PartnerMemberRole
      partnerMembership = {
        id: pm.id,
        partner_id: pm.partner.id,
        partner_name: pm.partner.name,
        partner_slug: pm.partner.slug,
        role: pm.role,
        is_platform_partner: pm.partner.is_platform_partner,
      }
    }

    // Step 4: Get user's workspace memberships for this partner
    const { data: memberships, error: membershipError } = await adminClient
      .from("workspace_members")
      .select(
        `
        role,
        workspace:workspaces!inner(
          id,
          name,
          slug,
          partner_id,
          description,
          resource_limits,
          status,
          deleted_at
        )
      `
      )
      .eq("user_id", authUser.id)
      .is("removed_at", null)

    if (membershipError) {
      console.error("[getPartnerAuthContext] Membership query error:", membershipError)
    }

    // Filter to only workspaces belonging to current partner and not deleted
    const workspaces: AccessibleWorkspace[] = (memberships || [])
      .filter(
        (m: any) => m.workspace?.partner_id === partner.id && m.workspace?.deleted_at === null
      )
      .map((m: any) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        partner_id: m.workspace.partner_id,
        description: m.workspace.description,
        role: m.role as WorkspaceMemberRole,
        resource_limits: m.workspace.resource_limits || {},
        status: m.workspace.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Construct user object
    const user: PartnerAuthUser = {
      id: authUser.id,
      email: authUser.email!,
      first_name: authUser.user_metadata?.first_name || null,
      last_name: authUser.user_metadata?.last_name || null,
      avatar_url: authUser.user_metadata?.avatar_url || null,
    }

    return {
      user,
      partner,
      partnerRole,
      partnerMembership,
      workspaces,
      supabase,
      adminClient,
    }
  } catch (error) {
    console.error("[getPartnerAuthContext] Unexpected error:", error)
    return null
  }
}

// ============================================================================
// PARTNER ACCESS VALIDATION
// ============================================================================

export function isPartnerMember(context: PartnerAuthContext): boolean {
  return context.partnerRole !== null
}

export function isPartnerAdmin(context: PartnerAuthContext): boolean {
  return context.partnerRole === "owner" || context.partnerRole === "admin"
}

export function isPartnerOwner(context: PartnerAuthContext): boolean {
  return context.partnerRole === "owner"
}

export function hasPartnerRole(
  context: PartnerAuthContext,
  requiredRoles: PartnerMemberRole[]
): boolean {
  if (!context.partnerRole) return false
  return requiredRoles.includes(context.partnerRole)
}

export function canCreateWorkspace(context: PartnerAuthContext): boolean {
  // Only partner owners and admins can create workspaces
  return isPartnerAdmin(context)
}

// ============================================================================
// WORKSPACE ACCESS VALIDATION (existing functions - unchanged)
// ============================================================================

export function getWorkspaceBySlug(
  context: PartnerAuthContext,
  workspaceSlug: string
): AccessibleWorkspace | null {
  return context.workspaces.find((w) => w.slug === workspaceSlug) || null
}

export function getWorkspaceById(
  context: PartnerAuthContext,
  workspaceId: string
): AccessibleWorkspace | null {
  return context.workspaces.find((w) => w.id === workspaceId) || null
}

export function hasWorkspaceRole(
  context: PartnerAuthContext,
  workspaceSlug: string,
  requiredRoles: WorkspaceMemberRole[]
): boolean {
  const workspace = getWorkspaceBySlug(context, workspaceSlug)
  if (!workspace) return false
  return requiredRoles.includes(workspace.role)
}

export function isWorkspaceAdmin(context: PartnerAuthContext, workspaceSlug: string): boolean {
  return hasWorkspaceRole(context, workspaceSlug, ["owner", "admin"])
}

export function isWorkspaceOwner(context: PartnerAuthContext, workspaceSlug: string): boolean {
  return hasWorkspaceRole(context, workspaceSlug, ["owner"])
}

export function requireWorkspaceAccess(
  context: PartnerAuthContext,
  workspaceSlug: string,
  requiredRoles?: WorkspaceMemberRole[]
): AccessibleWorkspace {
  const workspace = getWorkspaceBySlug(context, workspaceSlug)

  if (!workspace) {
    throw new Error(`No access to workspace: ${workspaceSlug}`)
  }

  if (requiredRoles && !requiredRoles.includes(workspace.role)) {
    throw new Error(
      `Insufficient permissions in workspace: ${workspaceSlug}. Required: ${requiredRoles.join(", ")}, has: ${workspace.role}`
    )
  }

  return workspace
}
