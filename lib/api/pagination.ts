/**
 * Pagination Utilities
 * Phase 1.2.2: Add pagination to all list endpoints
 *
 * Provides standardized pagination for API responses.
 */

import { NextRequest, NextResponse } from "next/server"

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationParams {
  page: number
  pageSize: number
  cursor?: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  cursor?: string
  nextCursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse pagination parameters from a request URL.
 */
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams

  const pageParam = searchParams.get("page")
  const pageSizeParam = searchParams.get("pageSize") || searchParams.get("limit")
  const cursor = searchParams.get("cursor") || undefined

  let page = pageParam ? parseInt(pageParam, 10) : DEFAULT_PAGE
  let pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : DEFAULT_PAGE_SIZE

  // Validate and clamp values
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE
  }

  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = DEFAULT_PAGE_SIZE
  }

  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE
  }

  return { page, pageSize, cursor }
}

// ============================================================================
// OFFSET-BASED PAGINATION
// ============================================================================

/**
 * Calculate offset for database queries.
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Calculate pagination range for Supabase queries.
 * Returns [from, to] indices for .range() method.
 */
export function calculateRange(
  page: number,
  pageSize: number
): [number, number] {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return [from, to]
}

/**
 * Build pagination metadata from query results.
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize)

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

// ============================================================================
// CURSOR-BASED PAGINATION
// ============================================================================

/**
 * Encode a cursor from an ID and timestamp.
 */
export function encodeCursor(id: string, timestamp?: Date): string {
  const payload = {
    id,
    ts: timestamp?.toISOString(),
  }
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

/**
 * Decode a cursor to get the ID and timestamp.
 */
export function decodeCursor(
  cursor: string
): { id: string; timestamp?: Date } | null {
  try {
    const payload = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf-8")
    )
    return {
      id: payload.id,
      timestamp: payload.ts ? new Date(payload.ts) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Build cursor-based pagination metadata.
 */
export function buildCursorPaginationMeta(
  pageSize: number,
  hasNextPage: boolean,
  nextCursor?: string
): Pick<PaginationMeta, "pageSize" | "hasNextPage" | "nextCursor"> {
  return {
    pageSize,
    hasNextPage,
    nextCursor,
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create a paginated API response.
 */
export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({ data, meta })
}

/**
 * Apply pagination to a Supabase query result.
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    meta: buildPaginationMeta(page, pageSize, total),
  }
}

// ============================================================================
// SORTING
// ============================================================================

export type SortOrder = "asc" | "desc"

export interface SortParams {
  sortBy: string
  sortOrder: SortOrder
}

/**
 * Parse sorting parameters from a request URL.
 */
export function parseSortParams(
  request: NextRequest,
  defaultSortBy = "created_at",
  defaultSortOrder: SortOrder = "desc"
): SortParams {
  const searchParams = request.nextUrl.searchParams

  const sortBy = searchParams.get("sortBy") || defaultSortBy
  const sortOrderParam = searchParams.get("sortOrder") || searchParams.get("order")

  let sortOrder: SortOrder = defaultSortOrder
  if (sortOrderParam === "asc" || sortOrderParam === "desc") {
    sortOrder = sortOrderParam
  }

  return { sortBy, sortOrder }
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Parse filter parameters from a request URL.
 * Returns a map of filter key -> value pairs.
 */
export function parseFilterParams(
  request: NextRequest,
  allowedFilters: string[]
): Record<string, string | string[]> {
  const searchParams = request.nextUrl.searchParams
  const filters: Record<string, string | string[]> = {}

  for (const key of allowedFilters) {
    const values = searchParams.getAll(key)
    if (values.length === 1 && values[0] !== undefined) {
      filters[key] = values[0]
    } else if (values.length > 1) {
      filters[key] = values.filter((v): v is string => v !== undefined)
    }
  }

  return filters
}

// ============================================================================
// QUERY BUILDER HELPERS
// ============================================================================

export interface QueryParams {
  pagination: PaginationParams
  sort: SortParams
  filters: Record<string, string | string[]>
}

/**
 * Parse all query parameters from a request.
 */
export function parseQueryParams(
  request: NextRequest,
  options?: {
    defaultSortBy?: string
    defaultSortOrder?: SortOrder
    allowedFilters?: string[]
  }
): QueryParams {
  return {
    pagination: parsePaginationParams(request),
    sort: parseSortParams(
      request,
      options?.defaultSortBy,
      options?.defaultSortOrder
    ),
    filters: parseFilterParams(request, options?.allowedFilters || []),
  }
}

