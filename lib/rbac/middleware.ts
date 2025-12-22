/**
 * RBAC Middleware
 * Phase 2.2.2: Permission checking middleware for API routes
 *
 * Provides utilities for checking permissions in API routes.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  Permission,
  WorkspaceRole,
  PartnerRole,
  hasWorkspacePermission,
  hasPartnerPermission,
} from "./permissions"
import { getPartnerAuthContext } from "@/lib/api/auth"
import { forbidden, unauthorized } from "@/lib/api/helpers"

// ============================================================================
// TYPES
// ============================================================================

interface PermissionCheckResult {
  allowed: boolean
  role?: WorkspaceRole | PartnerRole
  reason?: string
}

interface WorkspacePermissionContext {
  workspaceId: string
  workspaceSlug?: string
  userId: string
  role: WorkspaceRole
}

interface PartnerPermissionContext {
  partnerId: string
  userId: string
  role: PartnerRole
}

// ============================================================================
// WORKSPACE PERMISSION CHECKING
// ============================================================================

/**
 * Check if the current user has the required workspace permission.
 * Returns the result with role information.
 */
export async function checkWorkspacePermission(
  workspaceSlug: string,
  permission: Permission
): Promise<PermissionCheckResult> {
  try {
    const auth = await getPartnerAuthContext()

    if (!auth || !auth.user) {
      return { allowed: false, reason: "Not authenticated" }
    }

    // Find the workspace in user's workspaces
    const workspace = auth.workspaces.find((w) => w.slug === workspaceSlug)

    if (!workspace) {
      return { allowed: false, reason: "Not a member of this workspace" }
    }

    const role = workspace.role as WorkspaceRole
    const allowed = hasWorkspacePermission(role, permission)

    return {
      allowed,
      role,
      reason: allowed ? undefined : `Role '${role}' does not have permission '${permission}'`,
    }
  } catch {
    return { allowed: false, reason: "Failed to check permissions" }
  }
}

/**
 * Check if the current user has the required partner permission.
 */
export async function checkPartnerPermission(
  permission: Permission
): Promise<PermissionCheckResult> {
  try {
    const auth = await getPartnerAuthContext()

    if (!auth || !auth.user) {
      return { allowed: false, reason: "Not authenticated" }
    }

    if (!auth.partnerMembership) {
      return { allowed: false, reason: "Not a member of this partner" }
    }

    const role = auth.partnerMembership.role as PartnerRole
    const allowed = hasPartnerPermission(role, permission)

    return {
      allowed,
      role,
      reason: allowed ? undefined : `Role '${role}' does not have permission '${permission}'`,
    }
  } catch {
    return { allowed: false, reason: "Failed to check permissions" }
  }
}

// ============================================================================
// MIDDLEWARE WRAPPERS
// ============================================================================

type ApiHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>

/**
 * Wrap an API handler with workspace permission checking.
 * Returns 401 if not authenticated, 403 if permission denied.
 */
export function withWorkspacePermission(
  permission: Permission,
  handler: (
    request: NextRequest,
    context: WorkspacePermissionContext & { params: Record<string, string> }
  ) => Promise<NextResponse>
): ApiHandler {
  return async (request: NextRequest, routeContext?: { params: Record<string, string> }) => {
    const params = routeContext?.params || {}
    const workspaceSlug = params.workspaceSlug

    if (!workspaceSlug) {
      return forbidden("Workspace not specified")
    }

    const auth = await getPartnerAuthContext()

    if (!auth || !auth.user) {
      return unauthorized()
    }

    const workspace = auth.workspaces.find((w) => w.slug === workspaceSlug)

    if (!workspace) {
      return forbidden("Not a member of this workspace")
    }

    const role = workspace.role as WorkspaceRole

    if (!hasWorkspacePermission(role, permission)) {
      return forbidden(`Permission denied: ${permission}`)
    }

    const permissionContext: WorkspacePermissionContext & { params: Record<string, string> } = {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      userId: auth.user.id,
      role,
      params,
    }

    return handler(request, permissionContext)
  }
}

/**
 * Wrap an API handler with partner permission checking.
 */
export function withPartnerPermission(
  permission: Permission,
  handler: (
    request: NextRequest,
    context: PartnerPermissionContext & { params: Record<string, string> }
  ) => Promise<NextResponse>
): ApiHandler {
  return async (request: NextRequest, routeContext?: { params: Record<string, string> }) => {
    const params = routeContext?.params || {}

    const auth = await getPartnerAuthContext()

    if (!auth || !auth.user) {
      return unauthorized()
    }

    if (!auth.partnerMembership) {
      return forbidden("Not a member of this partner")
    }

    const role = auth.partnerMembership.role as PartnerRole

    if (!hasPartnerPermission(role, permission)) {
      return forbidden(`Permission denied: ${permission}`)
    }

    const permissionContext: PartnerPermissionContext & { params: Record<string, string> } = {
      partnerId: auth.partner.id,
      userId: auth.user.id,
      role,
      params,
    }

    return handler(request, permissionContext)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Assert that the current user has a specific workspace permission.
 * Throws an error if not authorized.
 */
export async function assertWorkspacePermission(
  workspaceSlug: string,
  permission: Permission
): Promise<WorkspacePermissionContext> {
  const result = await checkWorkspacePermission(workspaceSlug, permission)

  if (!result.allowed) {
    throw new Error(result.reason || "Permission denied")
  }

  const auth = await getPartnerAuthContext()
  
  if (!auth || !auth.user) {
    throw new Error("Not authenticated")
  }
  
  const workspace = auth.workspaces.find((w) => w.slug === workspaceSlug)
  
  if (!workspace) {
    throw new Error("Workspace not found")
  }

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    userId: auth.user.id,
    role: result.role as WorkspaceRole,
  }
}

/**
 * Assert that the current user has a specific partner permission.
 * Throws an error if not authorized.
 */
export async function assertPartnerPermission(
  permission: Permission
): Promise<PartnerPermissionContext> {
  const result = await checkPartnerPermission(permission)

  if (!result.allowed) {
    throw new Error(result.reason || "Permission denied")
  }

  const auth = await getPartnerAuthContext()
  
  if (!auth || !auth.user) {
    throw new Error("Not authenticated")
  }

  return {
    partnerId: auth.partner.id,
    userId: auth.user.id,
    role: result.role as PartnerRole,
  }
}

