"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plug, ExternalLink, Settings, Check } from "lucide-react"

const INTEGRATIONS = [
  {
    id: "vapi",
    name: "Vapi",
    description: "Advanced AI voice agents with real-time conversation handling",
    logo: "🎙️",
    status: "available",
    docsUrl: "https://docs.vapi.ai",
  },
  {
    id: "retell",
    name: "Retell AI",
    description: "Enterprise-grade voice AI with custom voice cloning",
    logo: "📞",
    status: "available",
    docsUrl: "https://docs.retellai.com",
  },
  {
    id: "synthflow",
    name: "Synthflow",
    description: "No-code AI voice assistant builder",
    logo: "🔊",
    status: "available",
    docsUrl: "https://docs.synthflow.ai",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Phone number provisioning and SMS capabilities",
    logo: "📱",
    status: "coming_soon",
    docsUrl: "https://www.twilio.com/docs",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models for enhanced conversation intelligence",
    logo: "🤖",
    status: "coming_soon",
    docsUrl: "https://platform.openai.com/docs",
  },
]

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Plug className="h-8 w-8 text-primary" />
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your AI voice providers and enhance your agents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.id} className="relative">
            {integration.status === "coming_soon" && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <Badge variant="secondary" className="text-lg">
                  Coming Soon
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{integration.logo}</span>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                  </div>
                </div>
                {integration.status === "available" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                )}
              </div>
              <CardDescription>{integration.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" disabled={integration.status === "coming_soon"}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href={integration.docsUrl} target="_blank" rel="noopener">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Documentation
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure your API keys for each provider in Settings → Integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Go to Settings
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
