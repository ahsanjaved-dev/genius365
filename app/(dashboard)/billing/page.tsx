"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CreditCard,
  Package,
  Clock,
  MessageSquare,
  Bot,
  Users,
  Check,
  Loader2,
  ArrowRight,
} from "lucide-react"

const PLAN_LIMITS = {
  starter: { agents: 3, minutes: 500, conversations: 200, departments: 2 },
  professional: { agents: 10, minutes: 2000, conversations: 1000, departments: 10 },
  enterprise: { agents: 100, minutes: 10000, conversations: 5000, departments: -1 },
  custom: { agents: -1, minutes: -1, conversations: -1, departments: -1 },
}

export default function BillingPage() {
  const { data: organization, isLoading } = useQuery({
    queryKey: ["current-organization"],
    queryFn: async () => {
      const res = await fetch("/api/organization")
      if (!res.ok) throw new Error("Failed to fetch organization")
      const json = await res.json()
      return json.data
    },
  })

  const { data: usage } = useQuery({
    queryKey: ["current-usage"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("Failed to fetch usage")
      const json = await res.json()
      return json.data
    },
  })

  const planTier = organization?.plan_tier || "starter"
  const limits = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min(100, Math.round((used / limit) * 100))
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          Billing & Plan
        </h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and view usage</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Current Plan
                  </CardTitle>
                  <CardDescription>Your subscription details</CardDescription>
                </div>
                <Badge className="text-lg px-4 py-1 capitalize">{planTier}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {organization?.subscription_status || "Active"}
                </Badge>
              </div>
              {organization?.trial_ends_at && new Date(organization.trial_ends_at) > new Date() && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trial Ends</span>
                  <span className="font-medium">
                    {new Date(organization.trial_ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              <Button className="w-full mt-4">
                Upgrade Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
              <CardDescription>This month's usage against your plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span>Agents</span>
                  </div>
                  <span>
                    {usage?.total_agents || 0} / {formatLimit(limits.agents)}
                  </span>
                </div>
                <Progress value={getUsagePercent(usage?.total_agents || 0, limits.agents)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Minutes</span>
                  </div>
                  <span>
                    {Math.round(usage?.minutes_this_month || 0)} / {formatLimit(limits.minutes)}
                  </span>
                </div>
                <Progress value={getUsagePercent(usage?.minutes_this_month || 0, limits.minutes)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>Conversations</span>
                  </div>
                  <span>
                    {usage?.conversations_this_month || 0} / {formatLimit(limits.conversations)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercent(
                    usage?.conversations_this_month || 0,
                    limits.conversations
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Plan Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>Compare features and upgrade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["starter", "professional", "enterprise"] as const).map((plan) => (
                  <div
                    key={plan}
                    className={`p-4 rounded-lg border-2 ${
                      plan === planTier ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    <h3 className="font-bold capitalize text-lg">{plan}</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {formatLimit(PLAN_LIMITS[plan].agents)} Agents
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {formatLimit(PLAN_LIMITS[plan].minutes)} Minutes/mo
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {formatLimit(PLAN_LIMITS[plan].departments)} Departments
                      </li>
                    </ul>
                    {plan !== planTier && (
                      <Button variant="outline" className="w-full mt-4" size="sm">
                        {Object.keys(PLAN_LIMITS).indexOf(plan) >
                        Object.keys(PLAN_LIMITS).indexOf(planTier)
                          ? "Upgrade"
                          : "Downgrade"}
                      </Button>
                    )}
                    {plan === planTier && (
                      <Badge className="w-full justify-center mt-4">Current Plan</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
