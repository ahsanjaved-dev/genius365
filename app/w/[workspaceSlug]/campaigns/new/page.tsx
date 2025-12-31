"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateCampaign } from "@/lib/hooks/use-campaigns"
import { useWorkspaceAgents } from "@/lib/hooks/use-workspace-agents"
import { createCampaignSchema, type CreateCampaignInput, type CreateCampaignFormInput } from "@/types/database.types"
import {
  Phone,
  ArrowLeft,
  Loader2,
  Bot,
  Settings2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Dubai", label: "Gulf Standard (GST)" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const [showAdvanced, setShowAdvanced] = useState(false)

  const { data: agentsData, isLoading: agentsLoading } = useWorkspaceAgents()
  const createMutation = useCreateCampaign()

  const agents = agentsData?.data?.filter(a => a.is_active) || []

  const form = useForm<CreateCampaignFormInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      description: "",
      agent_id: "",
      schedule_type: "immediate",
      business_hours_only: false,
      timezone: "UTC",
      concurrency_limit: 1,
      max_attempts: 3,
      retry_delay_minutes: 30,
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form
  const businessHoursOnly = watch("business_hours_only")

  const onSubmit = async (data: CreateCampaignFormInput) => {
    try {
      const result = await createMutation.mutateAsync(data as CreateCampaignInput)
      toast.success("Campaign created successfully")
      router.push(`/w/${workspaceSlug}/campaigns/${result.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign")
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground">Set up a new outbound calling campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Campaign Details
            </CardTitle>
            <CardDescription>Basic information about your campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Holiday Sale Outreach"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this campaign..."
                rows={3}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agent Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Agent
            </CardTitle>
            <CardDescription>Select the agent that will make the calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Select Agent *</Label>
              {agentsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading agents...
                </div>
              ) : agents.length === 0 ? (
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <p className="text-muted-foreground">No active agents available</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => router.push(`/w/${workspaceSlug}/agents/new`)}
                  >
                    Create an agent first
                  </Button>
                </div>
              ) : (
                <Select
                  value={watch("agent_id")}
                  onValueChange={(value) => setValue("agent_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          <span>{agent.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({agent.provider})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.agent_id && (
                <p className="text-sm text-destructive">{errors.agent_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Call Settings
                </CardTitle>
                <CardDescription>Configure how calls are made</CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? "Hide" : "Show"} Advanced
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Hours */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Business Hours Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only make calls during business hours
                </p>
              </div>
              <Switch
                checked={businessHoursOnly}
                onCheckedChange={(checked) => setValue("business_hours_only", checked)}
              />
            </div>

            {businessHoursOnly && (
              <div className="pl-4 border-l-2 border-muted space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      defaultValue="09:00"
                      {...register("business_hours_start")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      defaultValue="18:00"
                      {...register("business_hours_end")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={watch("timezone")}
                    onValueChange={(value) => setValue("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {showAdvanced && (
              <>
                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-2">
                    <Label>Concurrent Calls</Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum simultaneous calls (1-10)
                    </p>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...register("concurrency_limit", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Retry Attempts</Label>
                    <p className="text-sm text-muted-foreground">
                      How many times to retry failed calls (1-5)
                    </p>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      {...register("max_attempts", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Retry Delay (minutes)</Label>
                    <p className="text-sm text-muted-foreground">
                      Wait time between retry attempts
                    </p>
                    <Input
                      type="number"
                      min={5}
                      {...register("retry_delay_minutes", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || agents.length === 0}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

