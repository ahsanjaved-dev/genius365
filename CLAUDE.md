# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Genius365** is a white-label AI Voice Agent Management Platform built with Next.js 16. The platform enables agencies (Partners) to manage AI voice agents across multiple providers (VAPI, Retell, Synthflow) with full multi-tenancy, white-labeling, and workspace isolation.

## Development Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production (includes Prisma generation)
npm start                      # Start production server

# Code Quality
npm run lint                   # Run ESLint
npm run format                 # Format with Prettier
npm run type-check             # TypeScript type checking

# Database (Prisma + Supabase)
npm run db:generate            # Generate Prisma Client after schema changes
npm run db:pull                # Introspect database schema from Supabase
npm run db:push                # Push schema to database (dev only)
npm run db:migrate             # Create and apply migrations
npm run db:migrate:deploy      # Deploy migrations to production
npm run db:studio              # Open Prisma Studio (database GUI)
npm run db:reset               # Reset database (dev only - DESTRUCTIVE)
```

## Architecture Overview

### Multi-Tenancy Hierarchy

The platform follows a three-tier hierarchy:

```
Partner (Agency/Organization)
  └─> Workspaces (Client Projects)
       └─> Users (with role-based access)
```

**Partner Level**: White-labeled agencies with custom branding, domains, and plan tiers
**Workspace Level**: Individual client projects with isolated agents, leads, and conversations
**User Level**: Access controlled via PartnerMember and WorkspaceMember roles

### Request Flow Pattern

All authenticated requests follow this pattern:

```
Request → proxy.ts (middleware)
       ├─> Session validation (Supabase)
       ├─> Hostname → Partner resolution
       └─> Route Handler
            ├─> API: getWorkspaceContext(workspaceSlug)
            └─> Page: getPartnerAuthContext()
```

### Partner Resolution (White-Label)

Partners are resolved from hostname via `getPartnerFromHost()`:
1. Exact hostname match in `partner_domains` table
2. Fallback to platform partner (`is_platform_partner = true`)

Example: `app.acme.com` → ACME Agency partner, `localhost:3000` → Platform partner

## Database Architecture

### Primary Data Access

**Supabase**: Used for authentication, RLS policies, and realtime subscriptions
**Prisma**: Used for type-safe queries, complex relations, and transactions

Schema source of truth: `prisma/schema.prisma` (maps to Supabase PostgreSQL)

### Supabase Clients

```typescript
// Browser client (components/hooks)
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Server client (server components, API routes)
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Admin client (bypasses RLS - use carefully!)
import { createAdminClient } from "@/lib/supabase/admin"
const adminClient = createAdminClient()
```

### Prisma Usage

```typescript
import { prisma } from "@/lib/prisma"

// Basic queries
const agents = await prisma.aiAgent.findMany({ where: { workspace_id } })

// Transactions
import { withTransaction } from "@/lib/prisma"
const result = await withTransaction(async (tx) => {
  // atomic operations
})
```

## Authentication Patterns

### Server Components (Pages)

```typescript
import { getPartnerAuthCached } from "@/lib/api/get-auth-cached"

export default async function Page({ params }) {
  const auth = await getPartnerAuthCached()
  if (!auth) redirect("/login")

  // auth.user, auth.partner, auth.partnerRole, auth.workspaces
}
```

### API Routes

```typescript
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
import { apiResponse, unauthorized } from "@/lib/api/helpers"

export async function GET(req, { params }) {
  const { workspaceSlug } = await params
  const ctx = await getWorkspaceContext(workspaceSlug)
  if (!ctx) return unauthorized()

  // ctx.workspace, ctx.user, ctx.adminClient available
  return apiResponse({ data })
}
```

### Auth Context Types

**PartnerAuthContext**: User, partner, partner membership, accessible workspaces
**WorkspaceContext**: Extends PartnerAuthContext with specific workspace data

## Voice Agent Integration Pattern

### Sync Architecture

Agent sync follows a consistent pattern across providers (VAPI, Retell, Synthflow):

```typescript
// lib/integrations/{provider}/agent/
├── config.ts     // API calls to provider
├── mapper.ts     // Map internal format ↔ provider format
├── sync.ts       // Orchestrate sync operations
└── response.ts   // Process provider responses
```

### Sync Flow

```typescript
// 1. Check if sync needed
shouldSyncTo{Provider}(agent) → boolean

// 2. Map to provider format
mapTo{Provider}(agent) → ProviderPayload

// 3. Call provider API
create{Provider}Agent(payload, apiKeys) → response

// 4. Process response & update DB
process{Provider}Response(response, agentId)

// 5. Safe wrapper with error handling
safe{Provider}Sync(agent, "create" | "update" | "delete")
```

### Retell Special Case

Retell requires creating an LLM first, then an Agent:
1. Create LLM → `llm_id`
2. Create Agent with `response_engine: { llm_id }`
3. Store `llm_id` in `agent.config.retell_llm_id`
4. On delete: delete Agent, then delete LLM

## State Management

### React Query (Server State)

```typescript
// Hooks pattern: lib/hooks/use-workspace-{resource}.ts
export function useWorkspaceAgents() {
  return useQuery({
    queryKey: ["workspace-agents", workspaceSlug],
    queryFn: () => fetch(`/api/w/${workspaceSlug}/agents`),
    enabled: !!workspaceSlug,
  })
}

export function useCreateWorkspaceAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => fetch(`/api/w/${slug}/agents`, { method: "POST", ... }),
    onSuccess: () => queryClient.invalidateQueries(["workspace-agents", slug]),
  })
}
```

### Cache Layer

In-memory cache with TTL (no Redis yet): `lib/cache/index.ts`

```typescript
await cacheGetOrFetch(key, fetchFn, ttl)
await cacheSet(key, value, ttlSeconds)
CacheInvalidation.invalidateWorkspace(workspaceId)
```

## API Response Patterns

Always use helpers from `lib/api/helpers.ts`:

```typescript
apiResponse(data, status = 200)     // Success
apiError(message, status = 400)     // Client error
unauthorized()                      // 401
forbidden(message)                  // 403
notFound(resource)                  // 404
serverError(message)                // 500
getValidationError(zodError)        // Extract first Zod error
```

## Security Headers

`proxy.ts` applies CSP and security headers to all responses:
- Permissive CSP for voice providers (VAPI, Retell, Daily.co, LiveKit, Krisp)
- X-Frame-Options, X-XSS-Protection, X-Content-Type-Options
- HSTS in production

`next.config.ts` sets baseline headers and `Cache-Control: no-store` for `/api/*`

## RBAC Pattern

```typescript
import { hasWorkspacePermission, hasPartnerPermission } from "@/lib/rbac/permissions"

// Check permission
hasWorkspacePermission("admin", "workspace.agents.delete") → boolean
hasPartnerPermission("owner", "partner.workspaces.create") → boolean

// API route protection
withWorkspace(handler, { requiredRoles: ["owner", "admin"] })
```

**Workspace Roles**: `owner`, `admin`, `member`, `viewer`
**Partner Roles**: `owner`, `admin`, `member`

## Route Protection (proxy.ts)

```typescript
publicPaths = ["/", "/login", "/signup", "/pricing", "/request-partner", ...]
protectedPaths = ["/select-workspace", "/workspace-onboarding", "/w/"]
superAdminPaths = ["/super-admin"]
```

Unauthenticated users on protected paths → redirect to `/login`
Authenticated users on auth pages → redirect to `/select-workspace`

## Email System

```typescript
import { sendWorkspaceInvitation } from "@/lib/email/send"

await sendWorkspaceInvitation(email, workspaceName, inviterName, link, role, expiresAt, partnerName, message)
```

Templates: `lib/email/templates/*.tsx` (React Email components)

## Plan Tiers

Defined in `config/plans.ts`:
- **Starter**: 5 agents, 1,000 min/month, 2 integrations
- **Professional**: 25 agents, 5,000 min/month, unlimited integrations
- **Enterprise**: Unlimited everything, custom domain, SLA

## Environment Variables

### Required
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Database (Prisma)
DATABASE_URL="postgresql://...:[PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...:[PASSWORD]@...pooler.supabase.com:5432/postgres"
```

**DATABASE_URL**: Pooled connection (port 6543) for runtime queries
**DIRECT_URL**: Direct connection (port 5432) for migrations only

Get from: Supabase Dashboard → Settings → Database → Connection string

### Optional
```bash
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
FROM_EMAIL
SUPER_ADMIN_EMAIL
```

## Key Conventions

- **Path Aliases**: Use `@/*` for imports (maps to project root)
- **Next.js 15+**: Always `await params` in route handlers and pages
- **Server Components**: Default for pages; use `"use client"` only when needed
- **Styling**: Tailwind CSS with `cn()` utility for conditional classes
- **Forms**: React Hook Form + Zod validation
- **Dynamic Imports**: Use for heavy components (wizards, modals) to reduce bundle size
- **Optimistic Updates**: Implement for delete/update operations with React Query

## Common Tasks

### Add Workspace-Scoped Page
1. Create `app/w/[workspaceSlug]/new-feature/page.tsx`
2. Add nav link in `components/workspace/workspace-sidebar.tsx`
3. Create API route: `app/api/w/[workspaceSlug]/new-feature/route.ts`
4. Create hook: `lib/hooks/use-workspace-new-feature.ts`

### Add Partner-Level Feature
1. Create page: `app/org/new-feature/page.tsx`
2. Create API: `app/api/partner/new-feature/route.ts`
3. Use `getPartnerAuthContext()` for auth
4. Check role with `hasPartnerPermission()`

### Add New Voice Provider
1. Create `lib/integrations/newprovider/agent/` directory
2. Implement: `config.ts`, `mapper.ts`, `sync.ts`, `response.ts`
3. Update `AgentProvider` enum in schema
4. Update agent creation API to call sync
5. Add `web-call.ts` if provider supports browser calls

## Important Files Reference

| File | Purpose |
|------|---------|
| `proxy.ts` | Middleware: session, redirects, CSP, security headers |
| `lib/api/auth.ts` | `getPartnerAuthContext()` - main auth context |
| `lib/api/workspace-auth.ts` | `getWorkspaceContext()` - workspace-scoped auth |
| `lib/api/partner.ts` | `getPartnerFromHost()` - partner resolution |
| `lib/api/helpers.ts` | API response utilities |
| `lib/rbac/permissions.ts` | RBAC permission matrix |
| `lib/prisma/client.ts` | Prisma singleton with connection pooling |
| `prisma/schema.prisma` | Database schema (source of truth) |
| `types/database.types.ts` | Core types + Zod schemas |
| `config/plans.ts` | Plan tiers and feature limits |

## Architecture Gotchas

1. **`withWorkspace()` exists but isn't widely used**: Most routes call `getWorkspaceContext()` directly
2. **In-memory cache only**: `lib/cache/index.ts` uses `Map` - no Redis adapter yet
3. **Two database clients**: Use Supabase for auth/RLS, Prisma for complex queries/transactions
4. **Agent sync is async**: External provider APIs may fail; check `sync_status` and `needs_resync`
5. **Partner resolution is cached**: Invalidate with `CacheInvalidation.invalidatePartner()`
