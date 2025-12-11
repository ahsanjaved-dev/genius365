import { DepartmentForm } from "@/components/departments/department-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditDepartmentPage({ params }: PageProps) {
  const { id } = await params
  return <DepartmentForm departmentId={id} />
}
