import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import type { 
  LeadWithAgent, 
  PaginatedResponse, 
  LeadFormInput 
} from "@/types/database.types"

interface UseWorkspaceLeadsParams {
  page?: number
  pageSize?: number
  status?: string
  source?: string
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export function useWorkspaceLeads(params: UseWorkspaceLeadsParams = {}) {
  const { workspaceSlug } = useParams()
  const { 
    page = 1, 
    pageSize = 20, 
    status, 
    source, 
    search,
    sortBy = "created_at",
    sortOrder = "desc",
  } = params

  return useQuery<PaginatedResponse<LeadWithAgent>>({
    queryKey: [
      "workspace-leads",
      workspaceSlug,
      { page, pageSize, status, source, search, sortBy, sortOrder },
    ],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      })

      if (status) searchParams.set("status", status)
      if (source) searchParams.set("source", source)
      if (search) searchParams.set("search", search)

      const res = await fetch(`/api/w/${workspaceSlug}/leads?${searchParams}`)

      if (!res.ok) {
        throw new Error("Failed to fetch leads")
      }

      const json = await res.json()
      return json.data
    },
    enabled: !!workspaceSlug,
  })
}

export function useWorkspaceLead(leadId: string) {
  const { workspaceSlug } = useParams()

  return useQuery<LeadWithAgent>({
    queryKey: ["workspace-lead", workspaceSlug, leadId],
    queryFn: async () => {
      const res = await fetch(`/api/w/${workspaceSlug}/leads/${leadId}`)

      if (!res.ok) {
        throw new Error("Failed to fetch lead")
      }

      const json = await res.json()
      return json.data
    },
    enabled: !!workspaceSlug && !!leadId,
  })
}

export function useCreateWorkspaceLead() {
  const queryClient = useQueryClient()
  const { workspaceSlug } = useParams()

  return useMutation({
    mutationFn: async (data: LeadFormInput) => {
      const res = await fetch(`/api/w/${workspaceSlug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to create lead")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-leads", workspaceSlug] })
    },
  })
}

export function useUpdateWorkspaceLead() {
  const queryClient = useQueryClient()
  const { workspaceSlug } = useParams()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LeadFormInput }) => {
      const res = await fetch(`/api/w/${workspaceSlug}/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to update lead")
      }

      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-leads", workspaceSlug] })
      queryClient.invalidateQueries({ queryKey: ["workspace-lead", workspaceSlug, variables.id] })
    },
  })
}

export function useDeleteWorkspaceLead() {
  const queryClient = useQueryClient()
  const { workspaceSlug } = useParams()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/w/${workspaceSlug}/leads/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to delete lead")
      }

      return res.json()
    },
    onMutate: async (deletedId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["workspace-leads", workspaceSlug] })
      const previousData = queryClient.getQueryData(["workspace-leads", workspaceSlug])
      return { previousData }
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["workspace-leads", workspaceSlug], context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-leads", workspaceSlug] })
    },
  })
}

