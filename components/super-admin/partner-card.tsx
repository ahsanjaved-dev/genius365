"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Briefcase, Globe, Building2, ExternalLink } from "lucide-react"
import type { Partner, PartnerDomain } from "@/types/database.types"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface PartnerCardProps {
  partner: Partner & {
    partner_domains?: PartnerDomain[]
    workspace_count?: number
  }
}

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-info/10 text-info",
  pro: "bg-primary/10 text-primary",
  enterprise: "bg-warning/10 text-warning",
}

export function PartnerCard({ partner }: PartnerCardProps) {
  const primaryDomain = partner.partner_domains?.find((d) => d.is_primary)
  const domainCount = partner.partner_domains?.length || 0

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: partner.branding?.primary_color || "#7c3aed" }}
            >
              {partner.branding?.logo_url ? (
                <img
                  src={partner.branding.logo_url}
                  alt={partner.name}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <Briefcase className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-foreground text-lg">{partner.name}</CardTitle>
              <p className="text-sm text-muted-foreground">/{partner.slug}</p>
            </div>
          </div>
          {partner.is_platform_partner && (
            <Badge className="bg-primary/10 text-primary">
              Platform
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={planColors[partner.plan_tier] || planColors.starter}>
            {partner.plan_tier}
          </Badge>
          <Badge variant="outline" className="bg-secondary/10 text-secondary">
            {partner.subscription_status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Workspaces:</span>
            <span className="text-foreground font-medium">{partner.workspace_count || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Domains:</span>
            <span className="text-foreground font-medium">{domainCount}</span>
          </div>
        </div>

        {/* Primary Domain */}
        {primaryDomain && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span className="truncate">{primaryDomain.hostname}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-border text-foreground hover:bg-muted"
            asChild
          >
            <Link href={`/super-admin/partners/${partner.id}`}>
              <ExternalLink className="mr-2 h-3 w-3" />
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
