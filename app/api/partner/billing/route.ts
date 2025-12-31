/**
 * GET /api/partner/billing
 * Returns the current billing/subscription status for a partner
 */

import { getPartnerAuthContext } from "@/lib/api/auth"
import { apiResponse, unauthorized, serverError } from "@/lib/api/helpers"
import {prisma} from "@/lib/prisma"
import { plans } from "@/config/plans"

export async function GET() {
  // #region agent log
  console.log('[DEBUG] billing/route.ts:GET:start - Billing GET started');
  fetch('http://127.0.0.1:7243/ingest/73ff7d8d-39c6-4e58-af5c-d4236b1101af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/route.ts:GET:start',message:'Billing GET started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // 1. Authenticate
    let auth;
    try {
      auth = await getPartnerAuthContext()
      // #region agent log
      console.log('[DEBUG] billing/route.ts:GET:auth - Auth result:', { authIsNull: auth === null, hasPartner: !!auth?.partner, partnerId: auth?.partner?.id, hasUser: !!auth?.user });
      fetch('http://127.0.0.1:7243/ingest/73ff7d8d-39c6-4e58-af5c-d4236b1101af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/route.ts:GET:auth',message:'Auth context result',data:{authIsNull:auth===null,authIsUndefined:auth===undefined,hasPartner:auth?.partner!==undefined,partnerId:auth?.partner?.id,hasUser:auth?.user!==undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
    } catch (authErr) {
      // #region agent log
      console.log('[DEBUG] billing/route.ts:GET:authError - Auth threw:', String(authErr));
      fetch('http://127.0.0.1:7243/ingest/73ff7d8d-39c6-4e58-af5c-d4236b1101af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/route.ts:GET:authError',message:'Auth context threw error',data:{error:String(authErr)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw authErr;
    }
    if (!auth || !auth.partner) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/73ff7d8d-39c6-4e58-af5c-d4236b1101af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/route.ts:GET:unauthorized',message:'Returning unauthorized',data:{authIsNull:auth===null,partnerIsNull:auth?.partner===null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      return unauthorized()
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/73ff7d8d-39c6-4e58-af5c-d4236b1101af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/route.ts:GET:prismaQuery',message:'About to query prisma',data:{partnerId:auth.partner.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (!prisma) {
      return serverError("Database not configured")
    }

    // 2. Get partner billing info from database
    const partner = await prisma.partner.findUnique({
      where: { id: auth.partner.id },
      select: {
        id: true,
        name: true,
        planTier: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })

    if (!partner) {
      return unauthorized()
    }

    // 3. Get plan details
    const planKey = partner.planTier as keyof typeof plans
    const planDetails = plans[planKey] || plans.starter

    return apiResponse({
      partner: {
        id: partner.id,
        name: partner.name,
      },
      subscription: {
        planTier: partner.planTier,
        planName: planDetails.name,
        planPrice: planDetails.price,
        status: partner.subscriptionStatus,
        hasActiveSubscription: partner.subscriptionStatus === "active",
        hasStripeCustomer: !!partner.stripeCustomerId,
        hasStripeSubscription: !!partner.stripeSubscriptionId,
      },
      features: planDetails.features,
      features_list: planDetails.features_list,
    })
  } catch (error) {
    // #region agent log
    console.log('[DEBUG] billing/route.ts:GET:catch - Error caught:', String(error));
    fetch('http://127.0.0.1:7243/ingest/73ff7d8d-39c6-4e58-af5c-d4236b1101af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/route.ts:GET:catch',message:'Caught error in billing route',data:{error:String(error),stack:(error as Error).stack?.slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
    // #endregion
    console.error("GET /api/partner/billing error:", error)
    return serverError((error as Error).message)
  }
}

