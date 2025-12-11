import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const protectedPaths = [
    "/dashboard",
    "/agents",
    "/conversations",
    "/integrations",
    "/analytics",
    "/billing",
    "/settings",
  ]

  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const authPaths = ["/login", "/signup"]
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  const isSetupFlow = request.nextUrl.searchParams.get("setup") === "true"

  if (isAuthPath && user && !isSetupFlow) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
