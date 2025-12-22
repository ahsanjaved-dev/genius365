"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PhoneCall, Plus, Phone, Globe, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function TelephonyPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Telephony</h1>
          <p className="text-muted-foreground mt-1">Manage phone numbers and call routing for your voice agents.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Phone Number
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Phone Numbers</p>
              <p className="stat-value">0</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Active Calls</p>
              <p className="stat-value">0</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Countries</p>
              <p className="stat-value">0</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <PhoneCall className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No phone numbers configured</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Add a phone number to enable inbound and outbound calling for your voice agents.
          </p>
          <Button className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Phone Number
          </Button>
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Provider Configuration
          </CardTitle>
          <CardDescription>Configure your telephony provider settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="text-2xl">📞</div>
              <div>
                <p className="font-medium">Twilio</p>
                <p className="text-sm text-muted-foreground">Not configured</p>
              </div>
            </div>
            <Button variant="outline">Configure</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


