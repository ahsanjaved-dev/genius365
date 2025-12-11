"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Loader2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Department } from "@/types/database.types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useRef } from "react"

interface DepartmentSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function DepartmentSelector({ value, onChange }: DepartmentSelectorProps) {
  const hasInitialized = useRef(false)

  const {
    data: departments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-departments"],
    queryFn: async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error: fetchError } = await supabase
        .from("department_permissions")
        .select(`department_id, department:departments(*)`)
        .eq("user_id", user.id)
        .is("revoked_at", null)

      if (fetchError) throw fetchError

      return data.map((d: any) => d.department).filter(Boolean) as Department[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // Set default value ONCE after data loads
  useEffect(() => {
    if (!hasInitialized.current && departments.length > 0 && !value) {
      hasInitialized.current = true
      onChange("all")
    }
  }, [departments.length, value, onChange])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="py-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">{(error as Error).message}</AlertDescription>
      </Alert>
    )
  }

  if (departments.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Alert className="py-2 flex-1">
          <Building2 className="h-4 w-4" />
          <AlertDescription className="text-xs">No departments yet</AlertDescription>
        </Alert>
        <Button asChild size="sm">
          <Link href="/departments/new">Create</Link>
        </Button>
      </div>
    )
  }

  // ✅ COMPLETE Select component with all children
  return (
    <Select value={value || "all"} onValueChange={onChange}>
      <SelectTrigger className="w-[250px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue placeholder="Select department" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            All Departments
          </div>
        </SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {dept.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
