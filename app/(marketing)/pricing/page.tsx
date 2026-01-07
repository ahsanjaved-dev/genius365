import { PricingCard } from "@/components/marketing/pricing-card"
import { getPartnerFromHost } from "@/lib/api/partner"
import { workspacePlans, formatLimit } from "@/config/plans"
import { CheckCircle, Sparkles, Building2 } from "lucide-react"

export default async function PricingPage() {
  const partner = await getPartnerFromHost()
  const primaryColor = partner.branding.primary_color || "#7c3aed"

  const { free, pro, agency } = workspacePlans

  return (
    <div className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Start free, upgrade when ready
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Begin with $10 in free credits. No credit card required. Upgrade to Pro when you need more power.
          </p>
        </div>

        {/* Pricing Cards - 3 Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Free Plan */}
          <PricingCard
            name={free.name}
            price={0}
            description={free.description}
            features={free.featuresList}
            ctaText={free.ctaText}
            ctaHref={free.ctaHref}
            primaryColor={primaryColor}
          />

          {/* Pro Plan - Highlighted */}
          <PricingCard
            name={pro.name}
            price={pro.monthlyPriceCents / 100}
            description={pro.description}
            features={pro.featuresList}
            ctaText={pro.ctaText}
            ctaHref={pro.ctaHref}
            highlighted={pro.isPopular}
            primaryColor={primaryColor}
          />

          {/* Agency Plan */}
          <PricingCard
            name={agency.name}
            price={null}
            description={agency.description}
            features={agency.featuresList}
            ctaText={agency.ctaText}
            ctaHref={agency.ctaHref}
            primaryColor={primaryColor}
          />
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-4">Compare Plans</h2>
          <p className="text-center text-muted-foreground mb-12">
            Everything you need to know about each plan
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-6 font-semibold">Feature</th>
                  <th className="text-center py-4 px-6 font-semibold">Free</th>
                  <th className="text-center py-4 px-6 font-semibold bg-primary/5 rounded-t-lg">
                    Pro
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold">Agency</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6 font-medium">Monthly Price</td>
                  <td className="text-center py-4 px-6 text-green-600 font-semibold">Free</td>
                  <td className="text-center py-4 px-6 bg-primary/5 font-semibold">$99/mo</td>
                  <td className="text-center py-4 px-6">Custom</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Starting Credits</td>
                  <td className="text-center py-4 px-6 text-green-600">${free.features.freeCredits}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">—</td>
                  <td className="text-center py-4 px-6">—</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">AI Agents</td>
                  <td className="text-center py-4 px-6">{formatLimit(free.features.maxAgents)}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{formatLimit(pro.features.maxAgents)}</td>
                  <td className="text-center py-4 px-6">{formatLimit(agency.features.maxAgents)}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Minutes per Month</td>
                  <td className="text-center py-4 px-6">Pay-as-you-go</td>
                  <td className="text-center py-4 px-6 bg-primary/5">
                    {pro.features.maxMinutesPerMonth.toLocaleString()} included
                  </td>
                  <td className="text-center py-4 px-6">Custom</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Provider Integrations</td>
                  <td className="text-center py-4 px-6">{formatLimit(free.features.maxIntegrations)}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{formatLimit(pro.features.maxIntegrations)}</td>
                  <td className="text-center py-4 px-6">{formatLimit(agency.features.maxIntegrations)}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Storage</td>
                  <td className="text-center py-4 px-6">{free.features.storageGB}GB</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{pro.features.storageGB}GB</td>
                  <td className="text-center py-4 px-6">{formatLimit(agency.features.storageGB)}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">API Access</td>
                  <td className="text-center py-4 px-6">{free.features.hasApiAccess ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{pro.features.hasApiAccess ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6">{agency.features.hasApiAccess ? "✅" : "❌"}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Priority Support</td>
                  <td className="text-center py-4 px-6">{free.features.hasPrioritySupport ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{pro.features.hasPrioritySupport ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6">{agency.features.hasPrioritySupport ? "✅" : "❌"}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Custom Branding</td>
                  <td className="text-center py-4 px-6">{free.features.hasCustomBranding ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{pro.features.hasCustomBranding ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6">{agency.features.hasCustomBranding ? "✅" : "❌"}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Advanced Analytics</td>
                  <td className="text-center py-4 px-6">{free.features.hasAdvancedAnalytics ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6 bg-primary/5">{pro.features.hasAdvancedAnalytics ? "✅" : "❌"}</td>
                  <td className="text-center py-4 px-6">{agency.features.hasAdvancedAnalytics ? "✅" : "❌"}</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">White-Label Platform</td>
                  <td className="text-center py-4 px-6">❌</td>
                  <td className="text-center py-4 px-6 bg-primary/5">❌</td>
                  <td className="text-center py-4 px-6">✅</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-4 px-6">Custom Domain</td>
                  <td className="text-center py-4 px-6">❌</td>
                  <td className="text-center py-4 px-6 bg-primary/5">❌</td>
                  <td className="text-center py-4 px-6">✅</td>
                </tr>
                <tr className="hover:bg-muted/50">
                  <td className="py-4 px-6">Dedicated Account Manager</td>
                  <td className="text-center py-4 px-6">❌</td>
                  <td className="text-center py-4 px-6 bg-primary/5">❌</td>
                  <td className="text-center py-4 px-6">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan Explainer */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-muted/30 rounded-xl border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Free &amp; Pro Plans</h3>
            </div>
            <p className="text-muted-foreground">
              For individuals and teams building AI voice agents. Start free with $10 in credits, 
              then upgrade to Pro when you need more agents, included minutes, and advanced features.
            </p>
          </div>
          <div className="p-6 bg-muted/30 rounded-xl border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Agency Plan</h3>
            </div>
            <p className="text-muted-foreground">
              For agencies and resellers who want to offer this platform to their own clients. 
              Get your own branded platform, custom domain, and create your own pricing plans.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-center text-muted-foreground mb-12">
            Got questions? We've got answers.
          </p>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "How does the Free plan work?",
                answer:
                  "Start with $10 in free credits—no credit card required. Use them to build and test your AI agents. Once your credits are used up, you can add more credits or upgrade to Pro for included minutes.",
              },
              {
                question: "What's included in Pro?",
                answer:
                  "Pro includes 3,000 minutes per month, 25 AI agents, unlimited integrations, priority support, custom branding, and API access. Perfect for growing businesses.",
              },
              {
                question: "What happens if I exceed my minutes?",
                answer:
                  "On Pro, overage minutes are billed at $0.08/minute. On Free, you simply add credits as needed—we'll notify you when running low.",
              },
              {
                question: "Can I change plans later?",
                answer:
                  "Yes! Upgrade from Free to Pro anytime. If you downgrade, changes take effect at the end of your billing cycle.",
              },
              {
                question: "What's the Agency plan?",
                answer:
                  "Agency is for businesses who want to resell or white-label our platform. You get your own branded domain, can create custom pricing plans for your customers, and earn revenue share. Contact us to learn more.",
              },
            ].map((faq, index) => (
              <div key={index} className="border rounded-lg p-6 hover:border-primary/50 transition-colors">
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl border border-primary/20">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of businesses using AI voice agents to transform their customer experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/signup?plan=free"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
            >
              Start Free
            </a>
            <a
              href="/signup?plan=pro"
              className="inline-flex items-center justify-center rounded-lg border border-primary text-primary px-6 py-3 font-medium hover:bg-primary/10 transition-colors"
            >
              Get Pro - $99/mo
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
