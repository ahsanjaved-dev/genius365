"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Clock, DollarSign, TrendingUp, Download, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function BillingPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and view usage.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Invoice
        </Button>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your workspace subscription details</CardDescription>
            </div>
            <Badge>Pro</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-2xl font-bold">$99/mo</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Period</p>
              <p className="text-lg font-medium">Dec 1 - Dec 31, 2024</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Invoice</p>
              <p className="text-lg font-medium">Jan 1, 2025</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline">Change Plan</Button>
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Update Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Minutes Used</p>
              <p className="stat-value">0</p>
              <p className="text-xs text-muted-foreground mt-1">of 1,000 included</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <Progress value={0} className="mt-3" />
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Current Spend</p>
              <p className="stat-value">$0.00</p>
              <p className="text-xs text-muted-foreground mt-1">This billing period</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Overage Rate</p>
              <p className="stat-value">$0.15</p>
              <p className="text-xs text-muted-foreground mt-1">Per minute over limit</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No payment history yet</p>
            <p className="text-sm">Your invoices will appear here once you have billing activity.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


