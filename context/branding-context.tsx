"use client"

import { createContext, useContext, useEffect } from "react"
import type { Organization, OrganizationBranding } from "@/types/database.types"

interface BrandingContextValue {
  branding: OrganizationBranding
  organization: Organization
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function useBranding() {
  const context = useContext(BrandingContext)
  if (!context) throw new Error("useBranding must be used within BrandingProvider")
  return context
}

interface BrandingProviderProps {
  organization: Organization
  children: React.ReactNode
}

export function BrandingProvider({ organization, children }: BrandingProviderProps) {
  const branding = organization.branding || {}

  // Apply CSS custom properties for branding colors
  useEffect(() => {
    const root = document.documentElement
    if (branding.primary_color) {
      root.style.setProperty("--brand-primary", branding.primary_color)
      // Generate HSL variations for hover/active states
      root.style.setProperty("--brand-primary-hover", adjustColor(branding.primary_color, -10))
    }
    if (branding.secondary_color) {
      root.style.setProperty("--brand-secondary", branding.secondary_color)
    }
    return () => {
      root.style.removeProperty("--brand-primary")
      root.style.removeProperty("--brand-primary-hover")
      root.style.removeProperty("--brand-secondary")
    }
  }, [branding])

  return (
    <BrandingContext.Provider value={{ branding, organization }}>
      {children}
    </BrandingContext.Provider>
  )
}

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt))
  const B = Math.max(0, Math.min(255, (num & 0xff) + amt))
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`
}
