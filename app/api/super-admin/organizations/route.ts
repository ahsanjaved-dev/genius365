import { NextRequest } from "next/server"
import { getSuperAdminContext } from "@/lib/api/super-admin-auth"
import { apiResponse, apiError, unauthorized, serverError } from "@/lib/api/helpers"
import { z } from "zod"

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  plan_tier: z.enum(["starter", "professional", "enterprise", "custom"]).default("starter"),
  trial_days: z.number().min(0).max(90).default(14),
})

export async function GET(request: NextRequest) {
  try {
    const context = await getSuperAdminContext()
    if (!context) return unauthorized()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search")
    const plan_tier = searchParams.get("plan_tier")
    const status = searchParams.get("status")

    let query = context.supabase
      .from("organizations")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (plan_tier) {
      query = query.eq("plan_tier", plan_tier as any)
    }

    if (status) {
      query = query.eq("subscription_status", status as any)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: organizations, error, count } = await query

    if (error) {
      console.error("List organizations error:", error)
      return apiError("Failed to fetch organizations")
    }

    return apiResponse({
      data: organizations,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("GET /api/super-admin/organizations error:", error)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getSuperAdminContext()
    if (!context) return unauthorized()

    const body = await request.json()
    const validation = createOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return apiError(validation.error.issues[0].message)
    }

    const { name, email, plan_tier, trial_days } = validation.data

    const baseSlug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-") || "org"

    let finalSlug = baseSlug
    let counter = 0

    while (true) {
      const { data: existingOrg } = await context.supabase
        .from("organizations")
        .select("id")
        .eq("slug", finalSlug)
        .single()

      if (!existingOrg) break

      counter++
      finalSlug = `${baseSlug}-${counter}`
    }

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + trial_days)

    const { data: organization, error: orgError } = await context.supabase
      .from("organizations")
      .insert({
        name,
        slug: finalSlug,
        plan_tier,
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        created_by: context.superAdmin.id,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orgError) {
      console.error("Create organization error:", orgError)
      return apiError("Failed to create organization")
    }

    return apiResponse(
      {
        organization,
        invitation_link: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?org=${organization.id}`,
      },
      201
    )
  } catch (error) {
    console.error("POST /api/super-admin/organizations error:", error)
    return serverError()
  }
}
