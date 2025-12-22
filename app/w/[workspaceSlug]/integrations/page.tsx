"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plug, ExternalLink, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const integrations = [
  {
    id: "vapi",
    name: "Vapi",
    description: "Connect your Vapi account to sync voice agents.",
    icon: "🎙️",
    status: "available",
    category: "Voice AI",
  },
  {
    id: "retell",
    name: "Retell AI",
    description: "Integrate with Retell for advanced voice capabilities.",
    icon: "📞",
    status: "available",
    category: "Voice AI",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads and contacts with HubSpot CRM.",
    icon: "🔶",
    status: "coming_soon",
    category: "CRM",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Connect your Salesforce account for lead management.",
    icon: "☁️",
    status: "coming_soon",
    category: "CRM",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5000+ apps.",
    icon: "⚡",
    status: "coming_soon",
    category: "Automation",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and updates in Slack.",
    icon: "💬",
    status: "coming_soon",
    category: "Communication",
  },
]

export default function IntegrationsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect your favorite tools and services.</p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{integration.icon}</div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                {integration.status === "coming_soon" && (
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">{integration.description}</CardDescription>
              {integration.status === "available" ? (
                <Button className="w-full">
                  <Plug className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Integration */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-center">
            Don't see the integration you need?{" "}
            <a href="#" className="text-primary hover:underline">
              Request an integration
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


