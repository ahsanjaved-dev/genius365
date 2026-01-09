"use client"

import { useQuery } from "@tanstack/react-query"

export interface WorkspaceMemberSummary {
  total: number
  owners: number
  admins: number
  members: number
  viewers: number
}

export interface PartnerWorkspace {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  created_at: string
  member_summary: WorkspaceMemberSummary
  agent_count: number
  owner_email: string | null
  owner_name: string | null
}

/**
 * Hook to fetch all workspaces for the current partner with stats
 */
export function usePartnerWorkspaces() {
  return useQuery<PartnerWorkspace[]>({
    queryKey: ["partner-workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/partner/workspaces")
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to fetch workspaces")
      }
      const result = await res.json()
      return result.data
    },
  })
}

