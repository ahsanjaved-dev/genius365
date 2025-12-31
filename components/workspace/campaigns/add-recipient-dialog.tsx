"use client"

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
import { useAddRecipient } from "@/lib/hooks/use-campaigns"
import { createRecipientSchema, type CreateRecipientInput, type CreateRecipientFormInput } from "@/types/database.types"
import { Phone, Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface AddRecipientDialogProps {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRecipientDialog({
  campaignId,
  open,
  onOpenChange,
}: AddRecipientDialogProps) {
  const addMutation = useAddRecipient()

  const form = useForm<CreateRecipientFormInput>({
    resolver: zodResolver(createRecipientSchema),
    defaultValues: {
      phone_number: "",
      first_name: "",
      last_name: "",
      email: "",
      company: "",
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = form

  const onSubmit = async (data: CreateRecipientFormInput) => {
    try {
      await addMutation.mutateAsync({
        campaignId,
        data: data as CreateRecipientInput,
      })
      toast.success("Recipient added successfully")
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add recipient")
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Recipient
          </DialogTitle>
          <DialogDescription>
            Add a single phone number to this campaign.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone_number"
                placeholder="+1 (555) 123-4567"
                className="pl-9"
                {...register("phone_number")}
              />
            </div>
            {errors.phone_number && (
              <p className="text-sm text-destructive">{errors.phone_number.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1 for US)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="John"
                {...register("first_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                {...register("last_name")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Acme Inc"
              {...register("company")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Recipient
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

