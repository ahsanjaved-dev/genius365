"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Loader2, Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react"

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode preference on mount
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(prefersDark)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error("Please enter both email and password")
      }

      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const { data: superAdmin, error: superAdminError } = await supabase
        .from("super_admin")
        .select("id")
        .eq("id", authData.user.id)
        .single()

      if (superAdminError || !superAdmin) {
        await supabase.auth.signOut()
        throw new Error("Access denied. You are not authorized as a super admin.")
      }

      router.push("/super-admin")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = email && password && !loading

  return (
    <div className="superadmin-theme min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 dark:bg-slate-900 ">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 dark:text-white">
              Welcome back
            </h1>
            <p className="text-muted-foreground">Sign in to your administrator account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground dark:text-white"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@genius365.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                  className="pl-9 h-10 bg-background text-foreground placeholder:text-foreground/50 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground dark:text-white "
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                  className="pl-9 pr-10 h-10 bg-background text-foreground placeholder:text-foreground/50 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={loading} className="w-full h-10 font-medium">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-primary/5 border border-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>This area is restricted to platform administrators only.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Gradient Panel (desktop only) */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-8 lg:p-16 bg-linear-to-br from-primary/10 via-primary/5 to-background dark:from-purple-950 dark:via-slate-900 dark:to-slate-950 border-l border-border">
        <div className="max-w-lg text-center">
          {/* Content */}
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight dark:text-white">
            Platform Administration
          </h2>
          <p className="text-lg text-muted-foreground mb-8 dark:text-slate-300">
            Secure access to manage partners, workspaces, and platform-wide settings.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0 dark:text-purple-400" />
              <div className="text-left">
                <p className="font-semibold text-foreground dark:text-white">Partner Management</p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Manage all agencies and their configurations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0 dark:text-purple-400" />
              <div className="text-left">
                <p className="font-semibold text-foreground dark:text-white">Billing & Usage</p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Monitor platform usage and billing metrics
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0 dark:text-purple-400" />
              <div className="text-left">
                <p className="font-semibold text-foreground dark:text-white">Security & Access</p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Control authorization and platform security
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
