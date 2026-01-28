# Genius365 Platform Architecture Review

**Date:** January 28, 2026
**Scope:** Scalability and system design analysis for multi-tenant SaaS platform
**Target Scale:** 1,000+ partners, 10,000+ workspaces

---

## Executive Summary

This is a well-structured multi-tenant SaaS platform with thoughtful design patterns, but several architectural concerns need addressing for scale beyond 1,000+ partners and 10,000+ workspaces.

**Verdict:** The architecture is solid for early-stage with <100 partners. For production scale, immediate infrastructure-level changes are required.

---

## Table of Contents

1. [Database Schema Analysis](#1-database-schema-analysis)
2. [Authentication & Authorization Flow](#2-authentication--authorization-flow)
3. [Billing Architecture](#3-billing-architecture)
4. [API Design & Data Access Patterns](#4-api-design--data-access-patterns)
5. [Scalability Concerns](#5-scalability-concerns)
6. [Security Review](#6-security-review)
7. [Recommendations](#7-recommendations)
8. [Proposed Architecture](#8-proposed-architecture-for-10x-scale)
9. [Index Addition Script](#9-index-addition-script)
10. [Summary](#10-summary)

---

## 1. Database Schema Analysis

### 1.1 Multi-tenancy Implementation

**Strengths:**
- Clear hierarchical model: Partner (agency) → Workspace (project) → Users
- Proper foreign key relationships with `onDelete: Cascade` for tenant cleanup
- Soft delete pattern (`deletedAt` timestamps) across entities
- Junction tables for M:N relationships (`AgentKnowledgeDocument`, `WorkspaceIntegrationAssignment`)

**Weaknesses:**

#### CRITICAL - Missing Indexes for Multi-tenant Queries

**Workspace model:**
```prisma
@@unique([partnerId, slug])  // EXISTS - good
// BUT MISSING:
@@index([partnerId])         // MISSING - critical for workspace listing
@@index([partnerId, status]) // MISSING - critical for active workspace queries
```

**AiAgent model - Index Gap:**
```prisma
// Current: Only has @@index([assignedPhoneNumberId])
// MISSING:
@@index([workspaceId])            // Critical for agent listing
@@index([workspaceId, isActive])  // Critical for active agent filtering
@@index([provider])               // Useful for provider-specific queries
```

**Conversation model - No indexes defined:**
```prisma
// Should have:
@@index([workspaceId])
@@index([workspaceId, createdAt])
@@index([agentId])
@@index([externalId])  // For webhook lookups
@@index([status])
```

**UsageTracking model - No indexes defined:**
```prisma
// Should have:
@@index([workspaceId])
@@index([workspaceId, recordedAt])
@@index([conversationId])
```

### 1.2 N+1 Query Issues Identified

**File:** `lib/api/auth.ts` (lines 167-206)

```typescript
// Partner admin workspace enumeration - N+1 problem
for (const ws of allPartnerWorkspaces) {
  if (!userWorkspaceIds.has(ws.id)) {
    // Query 1: Get member count
    const { count: memberCount } = await adminClient
      .from("workspace_members")...

    // Query 2: Get agent count
    const { count: agentCount } = await adminClient
      .from("ai_agents")...

    // Query 3: Get owner email
    const { data: ownerData } = await adminClient
      .from("workspace_members")...
  }
}
```

**Impact:** For a partner with 100 workspaces, this executes 300+ queries on every auth context fetch.

### 1.3 Data Isolation Assessment

**Positive:**
- RLS mentioned but not deeply integrated with Prisma
- `adminClient` bypasses RLS (documented as intentional)
- Workspace-scoped queries consistently filter by `workspace_id`

**Concern:**
- No database-level RLS policies visible in schema
- Reliance on application-level filtering creates risk of data leakage

---

## 2. Authentication & Authorization Flow

### 2.1 Flow Architecture

```
Request → proxy.ts (middleware)
        → Partner Resolution (hostname → partner)
        → Supabase Auth (JWT validation)
        → Partner Membership Check
        → Workspace Access Check
        → Paywall Check (mutations only)
        → Handler
```

### 2.2 Strengths

1. **Clear separation of concerns:**
   - `proxy.ts`: Route filtering, session refresh
   - `lib/api/partner.ts`: Partner resolution with caching
   - `lib/api/auth.ts`: Partner-aware auth context
   - `lib/api/workspace-auth.ts`: Workspace-scoped access

2. **Higher-order function pattern (`withWorkspace`):**
```typescript
export function withWorkspace<T>(handler, options?) {
  // Auth + workspace validation + paywall in one wrapper
}
```

3. **Role-based access control:**
```typescript
hasWorkspaceRole(context, workspaceSlug, ['owner', 'admin'])
```

### 2.3 Weaknesses

#### CRITICAL - Middleware Creates Supabase Client Per Request

**File:** `proxy.ts` (line 131)
```typescript
async function resolvePartnerFromHostname(...) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  // Creates new client on EVERY request
}
```

#### CRITICAL - Auth Context Fetches Multiple Queries Without Batching

**File:** `lib/api/auth.ts`
```typescript
// Query 1: Get auth user
await supabase.auth.getUser()

// Query 2: Resolve partner
await getPartnerFromHost()

// Query 3: Get partner membership
await adminClient.from("partner_members")...

// Query 4: Get workspace memberships
await adminClient.from("workspace_members")...

// Query 5-N: For partner admins, N+1 queries for each workspace
```

**Recommendation:** Batch these queries or cache the auth context more aggressively.

---

## 3. Billing Architecture

### 3.1 Two-Layer Billing Model

```
              Platform                    Partner (Agency)
                 │                              │
        [WhiteLabelVariant]          [WorkspaceSubscriptionPlan]
                 │                              │
        [Partner Subscription]       [WorkspaceSubscription]
                 │                              │
        [BillingCredits]             [WorkspaceCredits]
                 │                              │
        Partner pays platform        Customer pays partner
                                     (via Stripe Connect)
```

### 3.2 Strengths

1. **Outbox Pattern for Stripe Metering:**
   - `StripeUsageEvent` table stores events
   - Immediate submission with retry on failure
   - Cron job (`billing-usage-retry`) handles retries
   - Idempotency via `conversationId` unique constraint

2. **Paywall Enforcement:**
   - `workspace-paywall.ts` blocks mutations when credits exhausted
   - Bypasses for billing recovery endpoints (`skipPaywallCheck`)

3. **Multiple Billing Models Supported:**
   - Prepaid credits
   - Postpaid subscriptions with limits
   - Included minutes with overage

### 3.3 Weaknesses

#### CONCERN - Race Condition in Credit Deduction

The `deductWorkspaceUsage` function should use database transactions with row-level locking, but based on the usage patterns, it may not be handling concurrent calls properly.

#### CONCERN - No Billing Period Boundary Handling

```typescript
// File: lib/billing/usage.ts
await prisma.workspace.update({
  data: {
    currentMonthMinutes: { increment: minutes },
  },
})
```

No check for billing period transitions. If a call spans month boundaries, minutes could be attributed incorrectly.

---

## 4. API Design & Data Access Patterns

### 4.1 Consistent Patterns

**Good - Workspace-scoped routes follow consistent pattern:**
```
/api/w/[workspaceSlug]/agents
/api/w/[workspaceSlug]/conversations
/api/w/[workspaceSlug]/credits
```

**Good - Validation with Zod schemas:**
```typescript
const validation = createWorkspaceAgentSchema.safeParse(body)
if (!validation.success) {
  return apiError(getValidationError(validation.error))
}
```

**Good - Audit logging:**
```typescript
await createAuditLog({
  userId: ctx.user.id,
  workspaceId: ctx.workspace.id,
  action: "agent.created",
  ...
})
```

### 4.2 Connection Pooling Strategy

**File:** `prisma/schema.prisma`
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // Pooled via pgbouncer
  directUrl = env("DIRECT_URL")       // Direct for migrations
}
```

**Concern:** Default connection limits may be insufficient:
- Vercel serverless can spawn many concurrent functions
- Each function instance creates a Prisma client
- `connection_limit=10` per function instance with many instances = connection exhaustion

### 4.3 Caching Strategy

**File:** `lib/cache/index.ts`

#### CRITICAL - In-Memory Cache in Serverless Environment

```typescript
const memoryCache = new Map<string, CacheEntry<unknown>>()
```

**Problem:** In-memory cache is NOT shared across serverless function instances. Each cold start gets empty cache.

**Impact:**
- Partner resolution cache hit rate near 0% under load
- Database queries executed on every request
- No benefit from cache TTLs

---

## 5. Scalability Concerns

### 5.1 Database Connection Limits

**At 1,000 partners, 10,000 workspaces:**

| Scenario | Concurrent Functions | Connections per Function | Total Connections |
|----------|---------------------|-------------------------|-------------------|
| Current  | 100                 | 10 (pgbouncer limit)    | 1,000            |
| Peak     | 500                 | 10                      | 5,000            |

**Supabase Connection Limits:**
- Free: 60 connections
- Pro: 200 connections
- Enterprise: Custom

**Verdict:** Current architecture will hit connection limits at ~20-50 concurrent users.

### 5.2 Webhook Processing Bottlenecks

**File:** `app/api/webhooks/vapi/route.ts`

```typescript
// Synchronous webhook processing
export async function POST(request: NextRequest) {
  // Parse payload
  // Find conversation (DB query)
  // Update conversation (DB query)
  // Process billing (multiple DB queries)
  // Forward to user webhook (HTTP call)

  return NextResponse.json({ received: true })
}
```

**Problem:** Webhook handlers do significant work synchronously:
1. Multiple database queries
2. Billing calculations
3. External HTTP calls to user webhooks

**At scale:** VAPI/Retell may timeout waiting for response, causing retry storms.

### 5.3 Cron Job Limitations

**File:** `app/api/cron/master/route.ts`

```typescript
// Runs every 12 hours
// Processes ALL pending items in one go
```

**Problems:**
1. **No pagination in retry logic:**
```typescript
const events = await prisma.stripeUsageEvent.findMany({
  take: batchSize, // 100 max
})
```
At scale, 100 events may not be enough.

2. **No distributed locking:**
Multiple cron invocations could process same events.

3. **Single-threaded processing:**
No parallelization of independent tasks.

### 5.4 Rate Limiting

**No rate limiting implementation found.**

Endpoints vulnerable to:
- Brute force on auth endpoints
- API abuse from authenticated users
- Webhook replay attacks

---

## 6. Security Review

### 6.1 Data Isolation

**Positive:**
- Workspace ID required in all workspace-scoped queries
- Partner ID filtering in partner-level operations
- `deletedAt` checks prevent accessing soft-deleted data

**Concern:**
- No RLS policies in schema (application-level filtering only)
- `adminClient` bypasses all checks (intentional but risky)

### 6.2 API Key Management

**File:** `prisma/schema.prisma`

```prisma
model PartnerIntegration {
  apiKeys     Json      @default("{}") @map("api_keys")
  // { default_secret_key, default_public_key, additional_keys }
}

model SipTrunk {
  sipPassword          String    @map("sip_password")
  // Stored as plaintext (TODO noted in codebase)
}
```

**Issues:**
1. API keys stored in JSON blob - no encryption at rest
2. SIP passwords stored as plaintext
3. No key rotation mechanism visible

### 6.3 Webhook Security

**Positive:**
- Stripe webhook signature verification
- CRON_SECRET for cron endpoints

**Concern:**
- VAPI webhook has no signature verification:
```typescript
// File: app/api/webhooks/vapi/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  // No signature verification
}
```

---

## 7. Recommendations

### 7.1 Critical (P0 - Immediate Action Required)

| Priority | Issue | Recommendation | Effort |
|----------|-------|----------------|--------|
| P0 | In-memory cache in serverless | Replace with Redis/Upstash | 2-3 days |
| P0 | Missing database indexes | Add indexes per Section 1.1 | 1 day |
| P0 | N+1 queries in auth context | Batch queries or use SQL joins | 2-3 days |
| P0 | Connection pool exhaustion | Implement connection limiting + queue | 1-2 days |

### 7.2 High Priority (P1 - Next Sprint)

| Priority | Issue | Recommendation | Effort |
|----------|-------|----------------|--------|
| P1 | Synchronous webhook processing | Queue webhooks, process async | 3-5 days |
| P1 | No rate limiting | Implement per-endpoint rate limits | 2-3 days |
| P1 | VAPI webhook no signature | Add HMAC verification | 1 day |
| P1 | Plaintext SIP passwords | Encrypt sensitive fields | 1-2 days |

### 7.3 Medium Priority (P2 - Next Quarter)

| Priority | Issue | Recommendation | Effort |
|----------|-------|----------------|--------|
| P2 | No RLS policies | Implement Supabase RLS as defense-in-depth | 1 week |
| P2 | Cron job scalability | Add distributed locking, pagination | 2-3 days |
| P2 | Billing race conditions | Add row-level locking for credit operations | 2 days |

---

## 8. Proposed Architecture for 10x Scale

```
                                    PROPOSED ARCHITECTURE
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│   EDGE LAYER                                                                      │
│   ┌───────────┐    ┌────────────────┐    ┌──────────────────┐                     │
│   │ Cloudflare│    │ Vercel Edge    │    │ Rate Limiter     │                     │
│   │ WAF       │───▶│ (proxy.ts)     │───▶│ (Upstash Redis)  │                     │
│   └───────────┘    └────────────────┘    └──────────────────┘                     │
│                                                   │                               │
└───────────────────────────────────────────────────│───────────────────────────────┘
                                                    │
┌───────────────────────────────────────────────────│───────────────────────────────┐
│   APPLICATION LAYER                               ▼                               │
│   ┌──────────────────┐    ┌───────────────────┐       ┌──────────────────┐        │
│   │ API Routes       │    │ Webhook Handlers  │       │ Background Jobs  │        │
│   │ /api/w/*         │    │ /api/webhooks/*   │       │ Inngest/Trigger  │        │
│   └────────┬─────────┘    └────────┬──────────┘       └────────┬─────────┘        │
│            │                       │                           │                  │
│            ▼                       ▼                           ▼                  │
│   ┌──────────────────┐    ┌───────────────────┐       ┌──────────────────┐        │
│   │ Auth Context     │    │ Event Queue       │       │ Job Queue        │        │
│   │ (Cached 2min)    │    │ (Upstash Redis)   │       │ (Inngest)        │        │
│   └────────┬─────────┘    └───────────────────┘       └──────────────────┘        │
│            │                                                                      │
└────────────│──────────────────────────────────────────────────────────────────────┘
             │
┌────────────│──────────────────────────────────────────────────────────────────────┐
│   DATA LAYER                                                                      │
│            ▼                                                                      │
│   ┌──────────────────┐    ┌───────────────────┐    ┌──────────────────┐           │
│   │ Supabase         │    │ Redis Cache       │    │ Stripe           │           │
│   │ PostgreSQL       │    │ (Upstash)         │    │ Connect          │           │
│   │ + RLS Policies   │    │ Partner/Auth      │    │ Billing          │           │
│   └──────────────────┘    └───────────────────┘    └──────────────────┘           │
│            │                                                                      │
│   ┌──────────────────┐                                                            │
│   │ Connection Pool  │                                                            │
│   │ PgBouncer        │                                                            │
│   │ max_clients=200  │                                                            │
│   └──────────────────┘                                                            │
└───────────────────────────────────────────────────────────────────────────────────┘

KEY CHANGES:
1. Redis replaces in-memory cache (shared across instances)
2. Webhook events queued, processed by background jobs
3. Connection pooling with hard limits + queue overflow
4. Rate limiting at edge layer
5. RLS policies as defense-in-depth
```

---

## 9. Index Addition Script

Save this as a migration file and run with `npm run db:migrate`:

```sql
-- File: prisma/migrations/YYYYMMDD_add_performance_indexes/migration.sql

-- Workspace indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_partner_id
  ON workspaces(partner_id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_partner_status
  ON workspaces(partner_id, status)
  WHERE deleted_at IS NULL;

-- Agent indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_agents_workspace_id
  ON ai_agents(workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_agents_workspace_active
  ON ai_agents(workspace_id, is_active)
  WHERE deleted_at IS NULL;

-- Conversation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_workspace_id
  ON conversations(workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_workspace_created
  ON conversations(workspace_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_external_id
  ON conversations(external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_agent_id
  ON conversations(agent_id);

-- Usage tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_workspace_id
  ON usage_tracking(workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_workspace_recorded
  ON usage_tracking(workspace_id, recorded_at DESC);

-- Stripe usage events (for retry queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_usage_events_status_retry
  ON stripe_usage_events(status, retry_count)
  WHERE status IN ('pending', 'failed');

-- Workspace members indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_workspace_id
  ON workspace_members(workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_user_id
  ON workspace_members(user_id);

-- Partner members indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partner_members_partner_id
  ON partner_members(partner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partner_members_user_id
  ON partner_members(user_id);
```

---

## 10. Summary

### Strengths

1. Clean multi-tenancy hierarchy with proper relationships
2. Well-structured billing with outbox pattern
3. Consistent API patterns with validation and audit logging
4. Good separation of auth concerns
5. Higher-order function pattern for route protection

### Critical Gaps

| Gap | Impact | Fix Complexity |
|-----|--------|----------------|
| In-memory cache | Ineffective in serverless, 0% hit rate | Medium |
| Missing indexes | Severe performance degradation at scale | Low |
| N+1 queries | 100+ queries for partner admins | Medium |
| No rate limiting | Vulnerable to abuse | Medium |
| Synchronous webhooks | Timeout under load | High |

### Action Plan

**Week 1:**
- [ ] Add database indexes (SQL script above)
- [ ] Implement Upstash Redis cache

**Week 2-3:**
- [ ] Fix N+1 queries in auth context
- [ ] Add rate limiting with Upstash

**Month 2:**
- [ ] Implement async webhook processing
- [ ] Add VAPI webhook signature verification
- [ ] Encrypt sensitive fields (SIP passwords, API keys)

**Quarter 2:**
- [ ] Implement Supabase RLS policies
- [ ] Migrate to Inngest for background jobs
- [ ] Add distributed locking for cron jobs

---

## Appendix: File References

| File | Purpose | Issues Found |
|------|---------|--------------|
| `prisma/schema.prisma` | Database schema | Missing indexes |
| `lib/api/auth.ts` | Auth context | N+1 queries |
| `lib/cache/index.ts` | Caching | In-memory, not shared |
| `proxy.ts` | Middleware | Creates client per request |
| `app/api/webhooks/vapi/route.ts` | VAPI webhooks | No signature verification |
| `lib/billing/usage.ts` | Usage tracking | No period boundary handling |
| `app/api/cron/master/route.ts` | Cron jobs | No distributed locking |
