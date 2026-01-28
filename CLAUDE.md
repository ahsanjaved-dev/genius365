# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Genius365** is a multi-tenant, white-label AI voice agent management platform. Agencies (Partners) manage voice agents across multiple providers (VAPI, Retell, Synthflow) with full workspace isolation.

**Multi-tenancy hierarchy**: Partner (agency) → Workspace (project) → Users

## Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production (runs prisma generate first)
npm run lint             # ESLint
npm run type-check       # TypeScript type checking (no emit)
npm run format           # Prettier formatting

# Database (Prisma)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes (dev only)
npm run db:migrate       # Create and apply dev migration
npm run db:migrate:deploy # Deploy migrations to production
npm run db:studio        # Open Prisma Studio GUI
```

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: Supabase PostgreSQL + Prisma ORM (generated client in `lib/generated/prisma`)
- **Auth**: Supabase Auth (JWT-based)
- **Billing**: Stripe (platform) + Stripe Connect (partner accounts)
- **UI**: Tailwind CSS 4 + shadcn/ui (Radix components)
- **State**: Zustand + TanStack React Query
- **Voice Providers**: VAPI, Retell (Synthflow enum exists but not fully implemented)

## Architecture

### Request Flow

1. **Middleware** (`proxy.ts`): White-label domain routing, session refresh, security headers
2. **Partner Resolution** (`lib/api/partner.ts`): Hostname → Partner lookup with caching
3. **Auth Context** (`lib/api/auth.ts`): Supabase user + partner membership + workspace access
4. **Workspace Context** (`lib/api/workspace-auth.ts`): Workspace-scoped access + paywall enforcement

### Key Directories

- `app/` - Next.js App Router (pages + API routes)
- `components/` - React components grouped by context (agents, workspace, org, super-admin, ui)
- `lib/billing/` - Billing logic, paywall enforcement, usage calculations
- `lib/stripe/` - Stripe integration (metering, credits, Connect)
- `lib/integrations/` - Provider integrations (VAPI, Retell, Inspra)
- `lib/api/` - Partner resolution, auth contexts, workspace auth
- `prisma/schema.prisma` - Full database schema (authoritative model definitions)

### Billing Layers

**Partner billing** (agency pays platform):
- Partner subscription via `white_label_variants.stripe_price_id`
- Partner credits in `billing_credits`, `credit_transactions`

**Workspace billing** (customer pays partner via Stripe Connect):
- Workspace credits via `workspace_credits`, `workspace_credit_transactions`
- Workspace subscriptions via `workspace_subscription_plans`, `workspace_subscriptions`
- Platform takes configurable fee (`STRIPE_CONNECT_PLATFORM_FEE_PERCENT`, default 10%)

**Paywall enforcement**: `lib/billing/workspace-paywall.ts` - blocks mutations when no active subscription and credits ≤ 0

### Data Access Patterns

- **Server components**: Supabase client (RLS policies apply)
- **API routes/webhooks/cron**: Prisma for transactional/billing operations
- **Database connections**: `DATABASE_URL` (pooled, pgbouncer) for queries, `DIRECT_URL` (direct) for migrations

### Org-Level Integrations

Two patterns exist:
- **Legacy**: API keys on agent (`ai_agents.agent_secret_api_key`)
- **Current**: Partner-level keys in `partner_integrations` + workspace assignment via `workspace_integration_assignments`

## Key Environment Variables

```bash
DEV_PARTNER_SLUG=<slug>           # Bypass hostname resolution in development
ENABLE_STRIPE_METERED_BILLING=true # Enable usage-based billing via Stripe meters
CRON_SECRET=<secret>              # Vercel cron job authorization
```

See `lib/env.ts` for all environment variables with validation.

## White-Label Domain Restrictions

Defined in `proxy.ts`:
- **Platform partner**: Full access to all routes
- **White-label partners**: Only `/login`, `/signup`, `/w/*`, `/org/*`, `/api/partner/*`, `/api/w/*`
- Marketing pages return 404 on partner domains

## Important Patterns

### API Route Protection

```typescript
// Workspace-scoped with paywall enforcement
export const POST = withWorkspace(async (req, context) => {
  // context.workspace, context.partner, context.user available
}, { requiredRoles: ['owner', 'admin'] })
```

### Workspace Context (simpler)

```typescript
const context = await getWorkspaceContext(workspaceSlug)
await checkWorkspacePaywall(context.workspace.id, workspaceSlug)
```

## Gotchas

- Prisma requires both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) for proper functioning
- Paywall logic depends on Prisma - throws if DB not configured
- SIP passwords are stored as plaintext (TODO in codebase)
- Sentry configured with 100% trace sampling and PII enabled - may need adjustment in production
- Supabase session refreshed on every request; auth cookies are chunked (`.0`, `.1`, etc.)
- Metered billing uses outbox pattern: events in `StripeUsageEvent` table, retried via `/api/cron/billing-usage-retry`
