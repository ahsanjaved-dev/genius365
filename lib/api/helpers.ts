import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types/database.types"

export function apiResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status })
}

export function apiError(error: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status })
}

export function serverError(message = "Internal server error"): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status: 500 })
}

export function notFound(resource = "Resource"): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 })
}

export function unauthorized(): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden(): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
