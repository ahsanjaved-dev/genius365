/**
 * Workspace Setup Utilities
 * 
 * Functions to handle workspace initialization tasks, including:
 * - Auto-assigning default integrations from partner level
 */

import { prisma } from "@/lib/prisma"

/**
 * Auto-assign default partner integrations to a newly created workspace.
 * 
 * This function finds all default integrations for the partner and creates
 * workspace integration assignments for them. This ensures that when a workspace
 * owner creates an agent with a provider (e.g., VAPI), the agent can automatically
 * sync using the org-level API keys.
 * 
 * @param workspaceId - The ID of the newly created workspace
 * @param partnerId - The ID of the partner the workspace belongs to
 * @param assignedBy - The user ID who triggered the workspace creation (optional)
 * @returns Object with success status and count of assigned integrations
 */
export async function assignDefaultIntegrationsToWorkspace(
  workspaceId: string,
  partnerId: string,
  assignedBy?: string
): Promise<{ success: boolean; assignedCount: number; error?: string }> {
  if (!prisma) {
    console.log("[WorkspaceSetup] Prisma not available, skipping integration assignment")
    return { success: true, assignedCount: 0 }
  }

  try {
    // Find all default integrations for this partner
    const defaultIntegrations = await prisma.partnerIntegration.findMany({
      where: {
        partnerId: partnerId,
        isDefault: true,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        name: true,
      },
    })

    if (defaultIntegrations.length === 0) {
      console.log(`[WorkspaceSetup] No default integrations found for partner ${partnerId}`)
      return { success: true, assignedCount: 0 }
    }

    console.log(`[WorkspaceSetup] Found ${defaultIntegrations.length} default integration(s) to assign to workspace ${workspaceId}`)

    // Check for existing assignments (in case this is a retry or migration)
    const existingAssignments = await prisma.workspaceIntegrationAssignment.findMany({
      where: {
        workspaceId: workspaceId,
      },
      select: {
        provider: true,
      },
    })

    const existingProviders = new Set(existingAssignments.map(a => a.provider))

    // Filter out integrations that are already assigned
    const integrationsToAssign = defaultIntegrations.filter(
      integration => !existingProviders.has(integration.provider)
    )

    if (integrationsToAssign.length === 0) {
      console.log(`[WorkspaceSetup] All default integrations already assigned to workspace ${workspaceId}`)
      return { success: true, assignedCount: 0 }
    }

    // Create assignments for each default integration
    const assignments = integrationsToAssign.map(integration => ({
      workspaceId: workspaceId,
      provider: integration.provider,
      partnerIntegrationId: integration.id,
      assignedBy: assignedBy || null,
    }))

    await prisma.workspaceIntegrationAssignment.createMany({
      data: assignments,
    })

    console.log(`[WorkspaceSetup] Successfully assigned ${integrationsToAssign.length} default integration(s) to workspace ${workspaceId}:`, 
      integrationsToAssign.map(i => `${i.provider} (${i.name})`).join(", ")
    )

    return { success: true, assignedCount: integrationsToAssign.length }
  } catch (error) {
    console.error("[WorkspaceSetup] Error assigning default integrations:", error)
    return { 
      success: false, 
      assignedCount: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Check if a workspace has any integration assignments.
 * Useful for debugging or migration scenarios.
 */
export async function getWorkspaceIntegrationAssignments(
  workspaceId: string
): Promise<{ provider: string; integrationName: string }[]> {
  if (!prisma) {
    return []
  }

  const assignments = await prisma.workspaceIntegrationAssignment.findMany({
    where: {
      workspaceId: workspaceId,
    },
    include: {
      partnerIntegration: {
        select: {
          name: true,
        },
      },
    },
  })

  return assignments.map(a => ({
    provider: a.provider,
    integrationName: a.partnerIntegration.name,
  }))
}

