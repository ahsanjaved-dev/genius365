"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthContext } from "@/lib/hooks/use-auth"
import { useBillingInfo, useCheckout, useCustomerPortal } from "@/lib/hooks/use-billing"
import { Building2, Shield, Settings, CreditCard, ExternalLink, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function OrgSettingsPage() {
  const searchParams = useSearchParams()
  const { data: authContext, isLoading } = useAuthContext()
  const { data: billingInfo, isLoading: billingLoading, refetch: refetchBilling } = useBillingInfo()
  const checkout = useCheckout()
  const portal = useCustomerPortal()

  const partner = authContext?.partner
  const partnerRole = authContext?.partnerMembership?.role
  const isAdmin = partnerRole === "owner" || partnerRole === "admin"

  // Handle checkout callback messages
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout")
    if (checkoutStatus === "success") {
      toast.success("Subscription activated successfully!")
      refetchBilling()
    } else if (checkoutStatus === "cancelled") {
      toast.info("Checkout cancelled")
    }
  }, [searchParams, refetchBilling])

  const handleCheckout = async (plan: "starter" | "professional" | "enterprise") => {
    try {
      const result = await checkout.mutateAsync(plan)
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout")
    }
  }

  const handleManageBilling = async () => {
    try {
      const result = await portal.mutateAsync()
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Details
          </CardTitle>
          <CardDescription>Basic information about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Organization Name</p>
              <p className="font-medium">{partner?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Role</p>
              <Badge variant="outline" className="mt-1 capitalize">
                <Shield className="h-3 w-3 mr-1" />
                {partnerRole || "—"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-medium font-mono text-sm">{partner?.slug || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <Badge variant="secondary" className="capitalize">
                {partner?.plan_tier || "—"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Preview */}
      {partner?.branding && (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Your organization's branding settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {partner.branding.logo_url ? (
                <img 
                  src={partner.branding.logo_url} 
                  alt="Logo" 
                  className="h-16 object-contain"
                />
              ) : (
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: partner.branding.primary_color || "#7c3aed" }}
                >
                  {partner.branding.company_name?.[0] || partner.name[0]}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Primary Color:</span>
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: partner.branding.primary_color || "#7c3aed" }}
                  />
                  <span className="font-mono text-sm">{partner.branding.primary_color || "#7c3aed"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Secondary Color:</span>
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: partner.branding.secondary_color || "#64748b" }}
                  />
                  <span className="font-mono text-sm">{partner.branding.secondary_color || "#64748b"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing & Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : billingInfo ? (
            <>
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-semibold">{billingInfo.subscription.planName}</span>
                    <Badge 
                      variant={billingInfo.subscription.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {billingInfo.subscription.status}
                    </Badge>
                  </div>
                  {billingInfo.subscription.planPrice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${billingInfo.subscription.planPrice}/month
                    </p>
                  )}
                </div>
                {isAdmin && billingInfo.subscription.hasStripeSubscription && (
                  <Button 
                    variant="outline" 
                    onClick={handleManageBilling}
                    disabled={portal.isPending}
                  >
                    {portal.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}
              </div>

              {/* Plan Features */}
              <div>
                <p className="text-sm font-medium mb-2">Plan Features</p>
                <ul className="grid grid-cols-2 gap-2">
                  {billingInfo.features_list.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Upgrade Options (if not on active subscription) */}
              {isAdmin && !billingInfo.subscription.hasActiveSubscription && (
                <div className="border-t pt-6">
                  <p className="text-sm font-medium mb-4">Choose a Plan</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Starter */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div>
                        <h4 className="font-semibold">Starter</h4>
                        <p className="text-2xl font-bold">$79<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => handleCheckout("starter")}
                        disabled={checkout.isPending}
                      >
                        {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                      </Button>
                    </div>

                    {/* Professional */}
                    <div className="border-2 border-primary rounded-lg p-4 space-y-3 relative">
                      <Badge className="absolute -top-2 right-4">Popular</Badge>
                      <div>
                        <h4 className="font-semibold">Professional</h4>
                        <p className="text-2xl font-bold">$249<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => handleCheckout("professional")}
                        disabled={checkout.isPending}
                      >
                        {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                      </Button>
                    </div>

                    {/* Enterprise */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div>
                        <h4 className="font-semibold">Enterprise</h4>
                        <p className="text-2xl font-bold">Custom</p>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => handleCheckout("enterprise")}
                        disabled={checkout.isPending}
                      >
                        {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Contact Sales"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Unable to load billing information</p>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Settings className="h-5 w-5" />
            More Settings Coming Soon
          </CardTitle>
          <CardDescription>
            Additional organization settings will be available in future updates:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Custom branding editor</li>
            <li>Domain management</li>
            <li>Security settings (SSO, 2FA requirements)</li>
            <li>API access configuration</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

