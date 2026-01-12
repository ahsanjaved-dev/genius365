"use client"

// This provider must be imported as early as possible to set up error suppression
// before Next.js error overlay can catch the errors

import "@/lib/hooks/use-web-call/suppress-sdk-errors"

export function SdkErrorSuppressionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

