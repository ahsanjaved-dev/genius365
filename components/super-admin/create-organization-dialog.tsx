"use client"

import { useState } from "react"
import { useCreateOrganization } from "@/lib/hooks/use-super-admin"
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
import { Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [planTier, setPlanTier] = useState<"starter" | "professional" | "enterprise" | "custom">(
    "starter"
  )
  const [trialDays, setTrialDays] = useState("14")
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = useCreateOrganization()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await createMutation.mutateAsync({
        name,
        email,
        plan_tier: planTier,
        trial_days: parseInt(trialDays),
      })

      setInvitationLink(result.invitation_link)
      toast.success("Organization created successfully!")

      // Reset form
      setName("")
      setEmail("")
      setPlanTier("starter")
      setTrialDays("14")
    } catch (error: any) {
      toast.error(error.message || "Failed to create organization")
    }
  }

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      toast.success("Invitation link copied!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setInvitationLink(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {invitationLink ? "Organization Created!" : "Create New Organization"}
          </DialogTitle>
          <DialogDescription>
            {invitationLink
              ? "Share this invitation link with the organization owner."
              : "Create a new organization and send an invitation to the owner."}
          </DialogDescription>
        </DialogHeader>

        {!invitationLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Owner Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plan Tier</Label>
                <Select
                  value={planTier}
                  onValueChange={(value: any) => setPlanTier(value)}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial">Trial Days</Label>
                <Input
                  id="trial"
                  type="number"
                  min="0"
                  max="90"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Organization created successfully! Share this link:
              </p>
              <div className="flex gap-2">
                <Input value={invitationLink} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopyLink} size="sm" variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
