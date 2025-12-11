"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/fetcher"
import type { Department, PaginatedResponse } from "@/types/database.types"
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/types/api.types"

const DEPARTMENTS_KEY = "departments"

interface UseDepartmentsParams {
  page?: number
  pageSize?: number
  search?: string
}

function buildQueryString(params?: UseDepartmentsParams): string {
  if (!params) return ""

  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set("page", params.page.toString())
  if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString())
  if (params.search) searchParams.set("search", params.search)

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useDepartments(params?: UseDepartmentsParams) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, params],
    queryFn: () =>
      api.get<PaginatedResponse<Department>>(`/api/departments${buildQueryString(params)}`),
  })
}

export function useDepartment(id: string | null) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, id],
    queryFn: () => api.get<Department>(`/api/departments/${id}`),
    enabled: !!id,
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => api.post<Department>("/api/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] })
      queryClient.invalidateQueries({ queryKey: ["user-departments"] })
    },
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentInput }) =>
      api.patch<Department>(`/api/departments/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, id] })
      queryClient.invalidateQueries({ queryKey: ["user-departments"] })
    },
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] })
      queryClient.invalidateQueries({ queryKey: ["user-departments"] })
    },
  })
}
