"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Send, CheckCircle, Copy, Link2, ArrowLeft } from "lucide-react"
import { useCreateWorkspaceInvitation } from "@/lib/hooks/use-workspace-members"
import { toast } from "sonner"

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["admin", "member", "viewer"]),
  message: z.string().max(500).optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const createInvitation = useCreateWorkspaceInvitation()
  const [inviteResult, setInviteResult] = useState<{ email: string; invite_link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
      message: "",
    },
  })

  const selectedRole = watch("role")

  const onSubmit = async (data: InviteFormData) => {
    try {
      const result = await createInvitation.mutateAsync(data)
      const inviteData = result.data
      
      // Show success with invite link
      setInviteResult({
        email: data.email,
        invite_link: inviteData.invite_link,
      })
      
      toast.success(`Invitation sent to ${data.email}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation")
    }
  }

  const handleCopyLink = async () => {
    if (inviteResult?.invite_link) {
      await navigator.clipboard.writeText(inviteResult.invite_link)
      setCopied(true)
      toast.success("Invitation link copied!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    reset()
    setInviteResult(null)
    setCopied(false)
    onOpenChange(false)
  }

  const handleSendAnother = () => {
    reset()
    setInviteResult(null)
    setCopied(false)
  }

  // Success state - show the invitation link
  if (inviteResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">Invitation Sent!</DialogTitle>
            <DialogDescription className="text-center">
              An email has been sent to <strong>{inviteResult.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Share this link if the email doesn't arrive:
              </Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={inviteResult.invite_link} 
                  className="text-xs bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> This link expires in 7 days. The recipient must use the email address the invitation was sent to.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendAnother}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Send Another
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Form state
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join this workspace. They'll receive an email with a link to
            accept.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              {...register("email")}
              disabled={createInvitation.isPending}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue("role", value as InviteFormData["role"])}
              disabled={createInvitation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span>Admin</span>
                    <span className="text-xs text-muted-foreground">
                      Can manage members and settings
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex flex-col">
                    <span>Member</span>
                    <span className="text-xs text-muted-foreground">
                      Can create and manage agents
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col">
                    <span>Viewer</span>
                    <span className="text-xs text-muted-foreground">Read-only access</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Input
              id="message"
              placeholder="Hey, join our workspace!"
              {...register("message")}
              disabled={createInvitation.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createInvitation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInvitation.isPending}>
              {createInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
