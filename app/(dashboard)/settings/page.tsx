"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Loader2, Palette, Building2, Shield, Bell, Lock, Monitor, Key } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BrandingSettings() {
  const [companyName, setCompanyName] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#7c3aed")
  const [secondaryColor, setSecondaryColor] = useState("#6b7280")
  const queryClient = useQueryClient()

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const res = await fetch("/api/organization")
      if (!res.ok) throw new Error("Failed to fetch organization")
      return res.json().then((r) => r.data)
    },
  })

  useEffect(() => {
    if (org) {
      setCompanyName(org.branding?.company_name || org.name || "")
      setPrimaryColor(org.branding?.primary_color || "#7c3aed")
      setSecondaryColor(org.branding?.secondary_color || "#6b7280")
    }
  }, [org])

  const updateBranding = useMutation({
    mutationFn: async (branding: any) => {
      const res = await fetch("/api/organization/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      })
      if (!res.ok) throw new Error("Failed to update branding")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] })
      toast.success("Branding updated! Refresh to see changes.")
    },
    onError: () => {
      toast.error("Failed to update branding")
    },
  })

  const handleSave = () => {
    updateBranding.mutate({
      company_name: companyName,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Customize how your organization appears in the dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company Name"
          />
          <p className="text-xs text-muted-foreground">
            This will be displayed in the sidebar and header
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-3">
              <input
                type="color"
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex gap-3">
              <input
                type="color"
                id="secondaryColor"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {companyName[0]?.toUpperCase() || "C"}
            </div>
            <div>
              <p className="text-white font-semibold">{companyName || "Company Name"}</p>
              <p className="text-gray-400 text-sm">AI Voice Platform</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateBranding.isPending}>
            {updateBranding.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OrganizationSettings() {
  const { data: org, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const res = await fetch("/api/organization")
      if (!res.ok) throw new Error("Failed to fetch organization")
      return res.json().then((r) => r.data)
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>General information about your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm">Organization Name</Label>
            <p className="font-medium">{org?.name || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Slug</Label>
            <p className="font-medium font-mono">{org?.slug || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Plan</Label>
            <Badge className="capitalize">{org?.plan_tier || "starter"}</Badge>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Status</Label>
            <Badge variant="outline" className="capitalize">
              {org?.status || "active"}
            </Badge>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Created</Label>
            <p className="font-medium">
              {org?.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SecuritySettings() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setChangingPassword(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success("Password updated successfully!")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={changingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={changingPassword}
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app to generate one-time codes
              </p>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active sessions across devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">Current Session</p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </div>
              <Badge variant="secondary">This device</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Session history and management coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState({
    usageAlerts: true,
    weeklySummary: false,
    paymentIssues: true,
    teamActivity: true,
    agentErrors: true,
  })

  const notifications = [
    {
      id: "usageAlerts",
      label: "Usage Alerts",
      description: "Get notified when approaching plan limits",
    },
    {
      id: "weeklySummary",
      label: "Weekly Summary",
      description: "Receive a weekly digest of usage and performance",
    },
    {
      id: "paymentIssues",
      label: "Payment Issues",
      description: "Get notified about failed payments and billing issues",
    },
    {
      id: "teamActivity",
      label: "Team Activity",
      description: "When team members join or leave the organization",
    },
    {
      id: "agentErrors",
      label: "Agent Errors",
      description: "Get notified when agents encounter errors",
    },
  ]

  const handleToggle = (id: string) => {
    setEmailNotifications((prev) => ({
      ...prev,
      [id]: !prev[id as keyof typeof prev],
    }))
    toast.success("Notification preference updated")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>Choose what notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-center justify-between py-4 border-b last:border-0"
          >
            <div>
              <p className="font-medium">{notification.label}</p>
              <p className="text-sm text-muted-foreground">{notification.description}</p>
            </div>
            <Switch
              checked={emailNotifications[notification.id as keyof typeof emailNotifications]}
              onCheckedChange={() => handleToggle(notification.id)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
