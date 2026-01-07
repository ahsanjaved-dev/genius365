"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { usePartnerAuth } from "./use-partner-auth"
import { hasPartnerPermission, hasWorkspacePermission, type PartnerRole, type WorkspaceRole } from "@/lib/rbac/permissions"
import type { DashboardStats } from "@/types/database.types"

// ============================================================================
// TYPES
// ============================================================================

export interface WorkspaceDashboardStats extends DashboardStats {
  // Workspace-specific stats
  total_agents: number
  total_conversations: number
  total_minutes: number
  total_cost: number
  conversations_this_month: number
  minutes_this_month: number
  cost_this_month: number
}

export interface PartnerDashboardStats {
  // Partner-wide (organization) stats - only for admins/owners
  total_workspaces: number
  total_agents_all_workspaces: number
  total_calls_today: number
}

export interface DashboardData {
  // Workspace-level stats (always available for workspace members)
  workspace: WorkspaceDashboardStats | null
  
  // Partner-level stats (only for partner admins/owners)
  partner: PartnerDashboardStats | null
  
  // Role information for conditional rendering
  roles: {
    workspaceRole: WorkspaceRole | null
    partnerRole: PartnerRole | null
    canViewPartnerStats: boolean
    canViewWorkspaceStats: boolean
    isWorkspaceAdmin: boolean
    isPartnerAdmin: boolean
  }
  
  // Loading states
  isLoading: boolean
  isLoadingWorkspace: boolean
  isLoadingPartner: boolean
  
  // Error states
  error: Error | null
  workspaceError: Error | null
  partnerError: Error | null
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDashboardData(): DashboardData {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  
  // Get auth context to determine roles
  const { data: authData, isLoading: isAuthLoading } = usePartnerAuth()
  
  // Find current workspace and role
  const currentWorkspace = authData?.workspaces.find((w) => w.slug === workspaceSlug)
  const workspaceRole = (currentWorkspace?.role as WorkspaceRole) || null
  const partnerRole = getPartnerRole(authData)
  
  // Determine permissions
  const canViewWorkspaceStats = workspaceRole 
    ? hasWorkspacePermission(workspaceRole, "workspace.dashboard.stats")
    : false
    
  const canViewPartnerStats = partnerRole 
    ? hasPartnerPermission(partnerRole, "partner.stats.read")
    : false
  
  const isWorkspaceAdmin = workspaceRole === "owner" || workspaceRole === "admin"
  const isPartnerAdmin = partnerRole === "owner" || partnerRole === "admin"
  
  // Fetch workspace stats (for workspace members)
  const {
    data: workspaceStats,
    isLoading: isLoadingWorkspace,
    error: workspaceError,
  } = useQuery<WorkspaceDashboardStats>({
    queryKey: ["workspace-dashboard-stats", workspaceSlug],
    queryFn: async () => {
      const res = await fetch(`/api/w/${workspaceSlug}/dashboard/stats`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to fetch workspace stats")
      }
      const json = await res.json()
      return json.data
    },
    enabled: !!workspaceSlug && !isAuthLoading && canViewWorkspaceStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })
  
  // Fetch partner stats (only for partner admins/owners)
  const {
    data: partnerStats,
    isLoading: isLoadingPartner,
    error: partnerError,
  } = useQuery<PartnerDashboardStats>({
    queryKey: ["partner-dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/partner/dashboard/stats")
      if (!res.ok) {
        if (res.status === 403) {
          // User doesn't have permission - this is expected for non-admins
          return null
        }
        const error = await res.json()
        throw new Error(error.error || "Failed to fetch partner stats")
      }
      const json = await res.json()
      return json.data
    },
    enabled: !isAuthLoading && canViewPartnerStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })
  
  return {
    workspace: workspaceStats ?? null,
    partner: canViewPartnerStats ? (partnerStats ?? null) : null,
    roles: {
      workspaceRole,
      partnerRole,
      canViewPartnerStats,
      canViewWorkspaceStats,
      isWorkspaceAdmin,
      isPartnerAdmin,
    },
    isLoading: isAuthLoading || isLoadingWorkspace || (canViewPartnerStats && isLoadingPartner),
    isLoadingWorkspace,
    isLoadingPartner: canViewPartnerStats ? isLoadingPartner : false,
    error: workspaceError || partnerError || null,
    workspaceError: workspaceError || null,
    partnerError: canViewPartnerStats ? (partnerError || null) : null,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract partner role from auth response - handles various response shapes
 */
function getPartnerRole(authData: any): PartnerRole | null {
  if (!authData) return null
  
  // Check for partnerRole in summary
  if (authData.summary?.roles?.length > 0) {
    const role = authData.summary.roles[0]
    if (role === "owner" || role === "admin" || role === "member") {
      return role as PartnerRole
    }
  }
  
  // Check for direct partnerRole field
  if (authData.partnerRole) {
    return authData.partnerRole as PartnerRole
  }
  
  return null
}

/**
 * Hook to prefetch dashboard data
 */
export function usePrefetchDashboardData() {
  const queryClient = useQueryClient()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  
  return {
    prefetchWorkspaceStats: async () => {
      await queryClient.prefetchQuery({
        queryKey: ["workspace-dashboard-stats", workspaceSlug],
        queryFn: async () => {
          const res = await fetch(`/api/w/${workspaceSlug}/dashboard/stats`)
          if (!res.ok) throw new Error("Failed to prefetch")
          return (await res.json()).data
        },
      })
    },
    prefetchPartnerStats: async () => {
      await queryClient.prefetchQuery({
        queryKey: ["partner-dashboard-stats"],
        queryFn: async () => {
          const res = await fetch("/api/partner/dashboard/stats")
          if (!res.ok) throw new Error("Failed to prefetch")
          return (await res.json()).data
        },
      })
    },
  }
}

