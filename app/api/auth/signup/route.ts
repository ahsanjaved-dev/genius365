import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPartnerFromHost } from "@/lib/api/partner"
import { apiResponse, apiError, serverError } from "@/lib/api/helpers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, firstName, lastName } = body

    if (!userId || !email) {
      return apiError("User ID and email are required")
    }

    const adminClient = createAdminClient()

    // Step 1: Create user record in public.users table
    const { error: userError } = await adminClient.from("users").upsert(
      {
        id: userId,
        email: email,
        first_name: firstName || null,
        last_name: lastName || null,
        role: "org_member", // Default role
        status: "active",
      },
      {
        onConflict: "id",
      }
    )

    if (userError) {
      console.error("Failed to create user record:", userError)
      // Continue - user auth exists
    }

    // Step 2: Get the partner from current hostname (platform partner for inspralv.com)
    const partner = await getPartnerFromHost()

    // Step 3: Auto-add user as member of the partner
    const { data: existingMember } = await adminClient
      .from("partner_members")
      .select("id")
      .eq("partner_id", partner.id)
      .eq("user_id", userId)
      .maybeSingle()

    if (!existingMember) {
      const { error: memberError } = await adminClient.from("partner_members").insert({
        partner_id: partner.id,
        user_id: userId,
        role: "member", // Default role for self-registered users
        joined_at: new Date().toISOString(),
      })

      if (memberError) {
        console.error("Failed to add partner membership:", memberError)
        // Continue - user can still access platform
      }
    }

    return apiResponse({
      success: true,
      message: "User setup complete",
      partner: {
        id: partner.id,
        name: partner.name,
        is_platform_partner: partner.is_platform_partner,
      },
    })
  } catch (error) {
    console.error("POST /api/auth/signup error:", error)
    return serverError()
  }
}
