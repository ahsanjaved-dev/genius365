/**
 * POST /api/partner/billing/portal
 * Creates a Stripe Customer Portal session for managing subscription
 */

import { NextRequest } from "next/server"
import { getPartnerAuthContext, isPartnerAdmin } from "@/lib/api/auth"
import { apiResponse, apiError, unauthorized, forbidden, serverError } from "@/lib/api/helpers"
import { getStripe } from "@/lib/stripe"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await getPartnerAuthContext()
    if (!auth || !auth.partner) {
      return unauthorized()
    }

    // 2. Only partner admins/owners can access billing portal
    if (!isPartnerAdmin(auth)) {
      return forbidden("Only partner admins can access billing")
    }

    // 3. Get partner from database
    if (!prisma) {
      return serverError("Database not configured")
    }
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partner.id },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    })

    if (!partner) {
      return apiError("Partner not found", 404)
    }

    if (!partner.stripeCustomerId) {
      return apiError("No billing account found. Please subscribe to a plan first.")
    }

    // 4. Parse optional return URL from request body
    let returnUrl = `${env.appUrl}/org/settings`
    try {
      const body = await request.json()
      if (body.returnUrl) {
        returnUrl = body.returnUrl
      }
    } catch {
      // No body or invalid JSON - use default return URL
    }

    // 5. Create Customer Portal session
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: partner.stripeCustomerId,
      return_url: returnUrl,
    })

    return apiResponse({
      url: session.url,
    })
  } catch (error) {
    console.error("POST /api/partner/billing/portal error:", error)
    return serverError((error as Error).message)
  }
}

