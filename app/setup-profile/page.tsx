"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function SetupProfilePage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-retry dashboard after 2 seconds
    const timer = setTimeout(() => {
      router.push("/dashboard")
      router.refresh()
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Setting up your profile...</p>
      </div>
    </div>
  )
}
