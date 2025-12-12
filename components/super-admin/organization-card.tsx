"use client"

import { Organization } from "@/types/database.types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, MoreVertical, Edit, Trash2, Eye, Mail } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface OrganizationCardProps {
  organization: Organization
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  const statusColors = {
    trialing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    past_due: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    canceled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  }

  const planColors = {
    starter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    professional: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    enterprise: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    custom: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{organization.name}</CardTitle>
            <p className="text-sm text-muted-foreground">/{organization.slug}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/super-admin/organizations/${organization.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Badge className={statusColors[organization.subscription_status]}>
            {organization.subscription_status}
          </Badge>
          <Badge className={planColors[organization.plan_tier]}>{organization.plan_tier}</Badge>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Usage:</span>
            <span className="font-medium">{organization.current_month_minutes.toFixed(0)} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">${organization.current_month_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(organization.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {organization.trial_ends_at && organization.subscription_status === "trialing" && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Trial ends{" "}
              {formatDistanceToNow(new Date(organization.trial_ends_at), { addSuffix: true })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
