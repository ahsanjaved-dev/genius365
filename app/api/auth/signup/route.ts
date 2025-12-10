import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password, companyName } = await request.json()

    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: "Email, password, and company name are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const supabase = await createClient()

    const adminClient = createAdminClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
        },
        emailRedirectTo: `${request.nextUrl.origin}/api/auth/callback`,
      },
    })

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    const baseSlug =
      companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-") || "org"

    let finalSlug = baseSlug
    let counter = 0

    while (true) {
      const { data: existingOrg } = await adminClient
        .from("organizations")
        .select("id")
        .eq("slug", finalSlug)
        .single()

      if (!existingOrg) break

      counter++
      finalSlug = `${baseSlug}-${counter}`
    }

    const { data: orgData, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: companyName,
        slug: finalSlug,
      })
      .select()
      .single()

    if (orgError) {
      console.error("Organization creation error:", orgError)
      return NextResponse.json(
        { error: "Failed to create organization. Please contact support." },
        { status: 500 }
      )
    }

    const { error: userError } = await adminClient.from("users").insert({
      id: authData.user.id,
      organization_id: orgData.id,
      email: email,
      role: "owner",
      last_login_at: new Date().toISOString(),
    })

    if (userError) {
      console.error("User profile creation error:", userError)
      await adminClient.from("organizations").delete().eq("id", orgData.id)
      return NextResponse.json(
        { error: "Failed to create user profile. Please contact support." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully! Check your email to confirm your account.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error: any) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
