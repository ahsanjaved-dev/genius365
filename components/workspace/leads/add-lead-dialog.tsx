"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, UserPlus, Save } from "lucide-react"
import { 
  useCreateWorkspaceLead, 
  useUpdateWorkspaceLead 
} from "@/lib/hooks/use-workspace-leads"
import { createLeadSchema, type LeadFormInput, type LeadWithAgent, type LeadStatus } from "@/types/database.types"
import { toast } from "sonner"

interface AddLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editLead?: LeadWithAgent | null
}

const priorityOptions = [
  { value: "0", label: "Low" },
  { value: "1", label: "Medium" },
  { value: "2", label: "High" },
]

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
  { value: "nurturing", label: "Nurturing" },
]

export function AddLeadDialog({ open, onOpenChange, editLead }: AddLeadDialogProps) {
  const createLead = useCreateWorkspaceLead()
  const updateLead = useUpdateWorkspaceLead()
  const isEditing = !!editLead

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeadFormInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      job_title: "",
      status: "new",
      priority: 0,
      notes: "",
      tags: [],
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (editLead) {
      reset({
        first_name: editLead.first_name || "",
        last_name: editLead.last_name || "",
        email: editLead.email || "",
        phone: editLead.phone || "",
        company: editLead.company || "",
        job_title: editLead.job_title || "",
        status: editLead.status as LeadStatus,
        priority: editLead.priority,
        notes: editLead.notes || "",
        tags: editLead.tags || [],
      })
    } else {
      reset({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company: "",
        job_title: "",
        status: "new",
        priority: 0,
        notes: "",
        tags: [],
      })
    }
  }, [editLead, reset])

  const selectedStatus = watch("status")
  const selectedPriority = watch("priority")

  const onSubmit = async (data: LeadFormInput) => {
    try {
      if (isEditing && editLead) {
        await updateLead.mutateAsync({ id: editLead.id, data })
        toast.success("Lead updated successfully")
      } else {
        await createLead.mutateAsync(data)
        toast.success("Lead created successfully")
      }
      handleClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} lead`
      toast.error(message)
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const isPending = createLead.isPending || updateLead.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isEditing ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the lead information below."
              : "Add a new lead to your workspace. At least one of name, email, or phone is required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="John"
                {...register("first_name")}
                disabled={isPending}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                {...register("last_name")}
                disabled={isPending}
              />
              {errors.last_name && (
                <p className="text-sm text-red-500">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register("email")}
                disabled={isPending}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 (555) 000-0000"
                {...register("phone")}
                disabled={isPending}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Company row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                {...register("company")}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                placeholder="CEO"
                {...register("job_title")}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Status and Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue("status", value as LeadStatus)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={selectedPriority?.toString()}
                onValueChange={(value) => setValue("priority", parseInt(value))}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this lead..."
              rows={3}
              {...register("notes")}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Lead" : "Create Lead"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

