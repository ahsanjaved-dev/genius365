"use client"

/**
 * Dynamic Agent Wizard Wrapper
 * Phase 4.1.2: Implement dynamic imports for heavy components
 *
 * Lazy loads the agent wizard to reduce initial bundle size.
 */

import dynamic from "next/dynamic"
import { FullPageLoader } from "@/components/shared/loading-spinner"
import type { CreateWorkspaceAgentInput } from "@/types/api.types"

// Dynamically import the heavy agent wizard component
export const AgentWizard = dynamic(
  () =>
    import("./agent-wizard").then((mod) => ({
      default: mod.AgentWizard,
    })),
  {
    loading: () => <AgentWizardSkeleton />,
    ssr: false, // Disable SSR for this heavy client component
  }
)

// Loading skeleton for the wizard
function AgentWizardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Progress indicator skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              {step < 4 && (
                <div className="h-0.5 w-8 bg-muted animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded" />

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-24 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="flex justify-between">
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

// Re-export the type for consumers
export type { CreateWorkspaceAgentInput }

