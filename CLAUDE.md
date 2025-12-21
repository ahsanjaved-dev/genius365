# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application for managing AI voice agents (VAPI, Retell, Synthflow). It uses the App Router with TypeScript, React 19, Supabase for backend/auth, and Stripe for payments. The platform supports multi-tenancy with Partners and Workspaces.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code with Prettier
npm run format

# Type check without emitting files
npm run type-check
```

## Architecture

### Multi-Tenancy Model

The application uses a three-tier hierarchy:

1. **Partners** - Top-level organizations (can be platform partners or regular partners)
2. **Workspaces** - Belong to partners, contain agents/conversations/members
3. **Users** - Can be members of multiple partners and workspaces with different roles

### Routing Structure

- **`app/(auth)/`** - Authentication pages (login, signup, password reset)
- **`app/w/[workspaceSlug]/`** - Workspace-scoped pages (dashboard, agents, conversations, analytics, members, settings)
- **`app/api/w/[workspaceSlug]/`** - Workspace-scoped API routes
- **`app/super-admin/`** - Platform administration interface
- **`app/select-workspace/`** - Workspace selector after login
- **`app/workspace-onboarding/`** - New workspace setup flow

### Authentication & Authorization

The platform uses a sophisticated multi-tenant auth system:

1. **Supabase Clients**:
   - `lib/supabase/client.ts` - Browser client for client components
   - `lib/supabase/server.ts` - Server client for server components/actions
   - `lib/supabase/admin.ts` - Admin client with service role (bypasses RLS)
   - `lib/supabase/middleware.ts` - Session handling in middleware

2. **Auth Contexts** (in `lib/api/`):
   - `getPartnerAuthContext()` - Returns user, partner (from hostname), partner role, and accessible workspaces
   - `getWorkspaceContext(workspaceSlug)` - Validates workspace access and returns workspace + user context
   - `withWorkspace()` - HOF wrapper for workspace-scoped API routes with automatic auth validation

3. **Partner Resolution**:
   - Partners are resolved by hostname using `getPartnerFromHost()` in `lib/api/partner.ts`
   - Each partner can have custom domains or use platform subdomains

4. **Middleware** (`proxy.ts`):
   - Handles session updates
   - Enforces authentication on protected routes (`/w/`, `/select-workspace`, etc.)
   - Redirects unauthenticated users to `/login`
   - Redirects authenticated users away from auth pages to `/select-workspace`

### Database Types

- **`types/database.types.ts`** - Supabase-generated types and Zod schemas
- **`types/api.types.ts`** - API-specific types and interfaces

Key types:
- `PartnerAuthContext` - Full auth context including user, partner, roles, workspaces
- `WorkspaceContext` - Auth context + validated workspace
- `AccessibleWorkspace` - Workspace with user's role
- Roles: `PartnerMemberRole`, `WorkspaceMemberRole`

### State Management

- **Zustand** stores in `lib/hooks/`
- **React Query** for server state (see hooks like `use-workspace-agents.ts`, `use-workspace-members.ts`)
- **Context Providers** in `lib/providers/` and `context/`

### Voice Agent Integrations

Located in `lib/integrations/`:

- **VAPI** (`vapi/`) - VAPI.ai integration
  - `web-call.ts` - Browser-based calling
  - `agent/` - Agent CRUD operations

- **Retell** (`retell/`) - Retell.ai integration
  - `web-call.ts` - Browser-based calling
  - `agent/` - Agent CRUD operations

Both integrations support:
- Creating/updating agents with provider-specific configs
- Web calling from browser (components in `components/agents/test-call-*.tsx`)
- Secret API key management (stored encrypted in database)
- Public API key management for client-side SDK usage

### UI Components

Uses **shadcn/ui** (Radix UI + Tailwind):
- Config: `components.json`
- Base components: `components/ui/`
- Feature components:
  - `components/workspace/` - Workspace layout, sidebar, header, selector
  - `components/agents/` - Agent cards, test calling, deletion
  - `components/auth/` - Authentication forms
  - `components/super-admin/` - Platform admin tools

Path aliases configured in `components.json`:
- `@/components` → `components/`
- `@/lib` → `lib/`
- `@/types` → `types/`
- `@/hooks` → `lib/hooks/`

### Audit Logging

All significant actions are logged via `lib/audit.ts`:
- Creates immutable audit trail in `audit_log` table
- Captures: user, partner, workspace, action, entity details, IP, user agent
- Never throws errors (logging failures shouldn't break functionality)
- Use `createAuditLog()` after state changes
- Common actions: user.login, agent.created, member.invited, settings.updated, etc.

### Environment Variables

Managed through `lib/env.ts` with validation:

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `NEXT_PUBLIC_APP_URL` (defaults to http://localhost:3000)
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Plans & Billing

Plan tiers defined in `config/plans.ts`:
- **starter**: 5 agents, 1000 min/month, 2 integrations
- **professional**: 25 agents, 5000 min/month, unlimited integrations
- **enterprise**: Unlimited everything

Stripe integration for subscription management.

## Development Patterns

### Creating New API Routes

For workspace-scoped endpoints:

```typescript
import { withWorkspace } from "@/lib/api/workspace-auth"
import { apiResponse } from "@/lib/api/helpers"

export const GET = withWorkspace(async (request, { user, workspace }) => {
  // workspace access automatically validated
  // workspace contains: id, name, slug, role (user's role in this workspace)

  return apiResponse({ data: /* ... */ })
}, { requiredRoles: ["owner", "admin"] }) // optional role enforcement
```

### Working with Supabase

```typescript
// Server Components / Server Actions
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client Components
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Admin operations (bypasses RLS - use carefully)
import { createAdminClient } from "@/lib/supabase/admin"
const adminClient = createAdminClient()
```

### Adding Audit Logs

```typescript
import { createAuditLog } from "@/lib/audit"
import { getRequestMetadata } from "@/lib/audit"

const { ipAddress, userAgent } = getRequestMetadata(request)

await createAuditLog({
  userId: user.id,
  workspaceId: workspace.id,
  action: "agent.created",
  entityType: "agent",
  entityId: newAgent.id,
  newValues: { name: newAgent.name },
  metadata: { provider: "vapi" },
  ipAddress,
  userAgent,
})
```

### Fetching Auth Context

```typescript
// In server components/actions - get full partner context
import { getPartnerAuthContext } from "@/lib/api/auth"
const auth = await getPartnerAuthContext()
// Returns: user, partner, partnerRole, workspaces[], supabase, adminClient

// For workspace-specific operations
import { getWorkspaceContext } from "@/lib/api/workspace-auth"
const ctx = await getWorkspaceContext(slug, ["owner", "admin"]) // optional roles
// Returns: user, partner, workspace (with validated access)
```

### Using React Query Hooks

```typescript
// Custom hooks wrap React Query for workspace data
import { useWorkspaceAgents } from "@/lib/hooks/use-workspace-agents"
import { useWorkspaceMembers } from "@/lib/hooks/use-workspace-members"

const { agents, isLoading, createAgent, updateAgent, deleteAgent } =
  useWorkspaceAgents(workspaceSlug)
```

## Key Conventions

- **Server vs Client**: Prefer server components by default. Use `"use client"` only when needed (hooks, interactivity, browser APIs)
- **Error Handling**: API routes use helpers from `lib/api/helpers.ts` (`apiResponse`, `unauthorized`, `forbidden`, `serverError`)
- **Route Parameters**: Next.js 15+ async params - always `await params` before accessing
- **Styling**: Tailwind CSS with shadcn/ui components. Use `cn()` utility from `lib/utils.ts` for conditional classes
- **Forms**: React Hook Form + Zod for validation (schemas in `types/database.types.ts`)
- **Never commit**: `.env*` files (in `.gitignore`)

## Next.js Configuration

In `next.config.ts`:
- Image domains allowed: `avatars.githubusercontent.com`, `lh3.googleusercontent.com`
- Server Actions body size limit: 2mb
