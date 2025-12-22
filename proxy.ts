// proxy.ts
import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public paths that don't require authentication
const publicPaths = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
  "/accept-workspace-invitation",
  "/pricing",
  "/request-partner",
  "/api/health", // Health check endpoint
]

// Super admin paths require super admin auth (handled in layouts)
const superAdminPaths = ["/super-admin"]

// All dashboard paths require authentication
const protectedPaths = [
  "/select-workspace",
  "/workspace-onboarding",
  "/w/", // All workspace routes
]

/**
 * Build Content Security Policy header
 * Phase 2.4.1: Implement CSP for security
 */
function buildCSP(): string {
  const policies = [
    "default-src 'self'",
    // Scripts: self, inline (for Next.js), eval (for dev)
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    // Styles: self, inline (for Tailwind)
    "style-src 'self' 'unsafe-inline'",
    // Images: self, data URIs, Supabase storage, Google avatars
    "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://avatars.githubusercontent.com",
    // Fonts: self, Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Connect: self, Supabase, voice providers
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.vapi.ai https://api.retellai.com",
    // Frame ancestors: none (prevent clickjacking)
    "frame-ancestors 'none'",
    // Form actions: self only
    "form-action 'self'",
    // Base URI: self only
    "base-uri 'self'",
  ]

  return policies.join("; ")
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Check if path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )

  // Check if path is protected (workspace routes)
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  // Check if super admin path
  const isSuperAdminPath = superAdminPaths.some((path) => pathname.startsWith(path))

  // Redirect unauthenticated users from protected paths to login
  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth pages to workspace selector
  const authPaths = ["/login", "/signup"]
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))

  // Check for redirect parameter - don't redirect if user came from invitation
  const redirectParam = request.nextUrl.searchParams.get("redirect")

  if (isAuthPath && user && !redirectParam) {
    return NextResponse.redirect(new URL("/select-workspace", request.url))
  }

  // Add comprehensive security headers
  const response = supabaseResponse

  // Basic security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // HSTS (Strict Transport Security) - only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }

  // Content Security Policy
  response.headers.set("Content-Security-Policy", buildCSP())

  // Permissions Policy (formerly Feature-Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=()"
  )

  // DNS Prefetch Control
  response.headers.set("X-DNS-Prefetch-Control", "on")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
