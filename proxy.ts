// proxy.ts
import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public paths that don't require authentication
const publicPaths = ["/", "/login", "/forgot-password", "/reset-password", "/accept-invitation"]

// Super admin paths require super admin auth (handled in layouts)
const superAdminPaths = ["/super-admin"]

// All dashboard paths require authentication
const protectedPaths = [
  "/dashboard",
  "/agents",
  "/conversations",
  "/integrations",
  "/analytics",
  "/billing",
  "/settings",
  "/departments",
  "/users",
  "/onboarding",
]

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Check if path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )

  // Check if path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  // Check if super admin path
  const isSuperAdminPath = superAdminPaths.some((path) => pathname.startsWith(path))

  // Redirect unauthenticated users from protected paths to login
  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirectedFrom", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth pages to dashboard
  const authPaths = ["/login"]
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))
  const isSetupFlow = request.nextUrl.searchParams.get("setup") === "true"

  if (isAuthPath && user && !isSetupFlow) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Add security headers
  const response = supabaseResponse
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
