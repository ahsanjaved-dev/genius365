"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { api } from "@/lib/api/fetcher"
import type { Workspace } from "@/types/database.types"

export function useWorkspaceSettings() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  return useQuery({
    queryKey: ["workspace-settings", workspaceSlug],
    queryFn: () => api.get<Workspace>(`/api/w/${workspaceSlug}/settings`),
    enabled: !!workspaceSlug,
  })
}

interface UpdateSettingsInput {
  name?: string
  description?: string | null
}

export function useUpdateWorkspaceSettings() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSettingsInput) =>
      api.patch<Workspace>(`/api/w/${workspaceSlug}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceSlug] })
    },
  })
}

export function useDeleteWorkspace() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.delete(`/api/w/${workspaceSlug}/settings`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
