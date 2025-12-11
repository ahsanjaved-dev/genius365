// lib/hooks/use-super-admin.ts
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/fetcher"
import type { Organization, OrganizationWithStats, PaginatedResponse } from "@/types/database.types"

const ORGANIZATIONS_KEY = "super-admin-organizations"

interface UseOrganizationsParams {
  page?: number
  pageSize?: number
  search?: string
  plan_tier?: string
  status?: string
}

function buildQueryString(params?: UseOrganizationsParams): string {
  if (!params) return ""

  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set("page", params.page.toString())
  if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString())
  if (params.search) searchParams.set("search", params.search)
  if (params.plan_tier) searchParams.set("plan_tier", params.plan_tier)
  if (params.status) searchParams.set("status", params.status)

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useOrganizations(params?: UseOrganizationsParams) {
  return useQuery({
    queryKey: [ORGANIZATIONS_KEY, params],
    queryFn: () =>
      api.get<PaginatedResponse<Organization>>(
        `/api/super-admin/organizations${buildQueryString(params)}`
      ),
  })
}

export function useOrganization(id: string | null) {
  return useQuery({
    queryKey: [ORGANIZATIONS_KEY, id],
    queryFn: () => api.get<OrganizationWithStats>(`/api/super-admin/organizations/${id}`),
    enabled: !!id,
  })
}

interface CreateOrganizationInput {
  name: string
  email: string
  plan_tier?: "starter" | "professional" | "enterprise" | "custom"
  trial_days?: number
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrganizationInput) =>
      api.post<{ organization: Organization; invitation_link: string }>(
        "/api/super-admin/organizations",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORGANIZATIONS_KEY] })
    },
  })
}

interface UpdateOrganizationInput {
  name?: string
  plan_tier?: "starter" | "professional" | "enterprise" | "custom"
  subscription_status?: "trialing" | "active" | "past_due" | "canceled" | "unpaid"
  resource_limits?: Record<string, unknown>
  features?: Record<string, unknown>
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationInput }) =>
      api.patch<Organization>(`/api/super-admin/organizations/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [ORGANIZATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [ORGANIZATIONS_KEY, id] })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/api/super-admin/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORGANIZATIONS_KEY] })
    },
  })
}
