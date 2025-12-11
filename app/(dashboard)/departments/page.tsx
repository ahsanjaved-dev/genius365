"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DepartmentCard } from "@/components/departments/department-card"
import { DeleteDepartmentDialog } from "@/components/departments/delete-department-dialog"
import { useDepartments, useDeleteDepartment } from "@/lib/hooks/use-departments"
import { Plus, Search, Building2, Loader2 } from "lucide-react"
import type { Department } from "@/types/database.types"

export default function DepartmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDepartment, setDeleteDepartment] = useState<Department | null>(null)

  const { data, isLoading, error } = useDepartments()
  const deleteMutation = useDeleteDepartment()

  const filteredDepartments = data?.data?.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = (department: Department) => {
    setDeleteDepartment(department)
  }

  const confirmDelete = async () => {
    if (!deleteDepartment) return
    try {
      await deleteMutation.mutateAsync(deleteDepartment.id)
      setDeleteDepartment(null)
    } catch (error) {
      console.error("Failed to delete department:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground mt-1">Organize your teams and manage resources</p>
        </div>
        <Button asChild>
          <Link href="/departments/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Department
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-center py-12 border rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Failed to load departments. Please try again.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && filteredDepartments?.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No departments yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            {searchQuery
              ? "No departments match your search. Try a different query."
              : "Get started by creating your first department."}
          </p>
          {!searchQuery && (
            <Button asChild className="mt-4">
              <Link href="/departments/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Department
              </Link>
            </Button>
          )}
        </div>
      )}

      {filteredDepartments && filteredDepartments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((department) => (
            <DepartmentCard key={department.id} department={department} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredDepartments?.length} of {data.total} departments
        </div>
      )}

      <DeleteDepartmentDialog
        open={!!deleteDepartment}
        onOpenChange={(open) => !open && setDeleteDepartment(null)}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
        departmentName={deleteDepartment?.name}
      />
    </div>
  )
}
