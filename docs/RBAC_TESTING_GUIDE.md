# RBAC Testing Guide

> **Last Updated**: January 7, 2026  
> **Purpose**: Comprehensive testing guide for the Role-Based Access Control (RBAC) system

---

## Table of Contents

1. [Overview](#overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Dashboard Permission Matrix](#dashboard-permission-matrix)
4. [SQL Queries for Test Users](#sql-queries-for-test-users)
5. [Testing Steps by Role](#testing-steps-by-role)
6. [API Endpoint Testing](#api-endpoint-testing)
7. [Verification Checklist](#verification-checklist)

---

## Overview

The Genius365 RBAC system operates on two levels:

1. **Partner Level (Organization)**: Controls access to organization-wide resources
2. **Workspace Level (Project)**: Controls access to workspace-specific resources

### Key Changes Made

| Change | Description |
|--------|-------------|
| Dashboard stats scoping | Workspace dashboard now shows workspace-scoped stats by default |
| Partner stats permission | Only partner `admin` and `owner` roles can see organization-wide stats |
| API permission checks | Both stats endpoints now check for appropriate permissions |
| New permissions added | `workspace.dashboard.read`, `workspace.dashboard.stats`, `partner.dashboard.read`, `partner.stats.read` |

---

## Role Hierarchy

### Partner Roles (Organization Level)

| Role | Can View Org Stats | Can Create Workspaces | Can Manage Team |
|------|-------------------|----------------------|-----------------|
| `owner` | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ |
| `member` | ❌ | ❌ | ❌ |

### Workspace Roles (Project Level)

| Role | Can View Dashboard | Can Manage Billing | Can Manage Team |
|------|-------------------|-------------------|-----------------|
| `owner` | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ |
| `member` | ✅ | ❌ | ❌ |
| `viewer` | ✅ | ❌ | ❌ |

---

## Dashboard Permission Matrix

### What Each Role Sees

| Role Combination | Workspace Stats | Organization Stats |
|------------------|-----------------|-------------------|
| Partner Owner + Workspace Owner | ✅ Full | ✅ Full |
| Partner Admin + Workspace Admin | ✅ Full | ✅ Full |
| Partner Member + Workspace Owner | ✅ Full | ❌ Hidden |
| Partner Member + Workspace Admin | ✅ Full | ❌ Hidden |
| Partner Member + Workspace Member | ✅ Limited | ❌ Hidden |
| Partner Member + Workspace Viewer | ✅ Read-only | ❌ Hidden |

### Dashboard Sections Visibility

| Section | Partner Owner/Admin | Partner Member |
|---------|-------------------|----------------|
| Workspace Overview (agents, conversations, minutes, cost) | ✅ | ✅ |
| Organization Overview (total workspaces, total agents, calls today) | ✅ | ❌ |
| Quick Actions - Manage Team | Workspace Admin only | Workspace Admin only |

---

## SQL Queries for Test Users

### Query 1: View Existing Users and Their Roles

```sql
-- View all users with their partner and workspace roles
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  p.name as partner_name,
  pm.role as partner_role,
  w.name as workspace_name,
  w.slug as workspace_slug,
  wm.role as workspace_role
FROM users u
LEFT JOIN partner_members pm ON pm.user_id = u.id AND pm.removed_at IS NULL
LEFT JOIN partners p ON p.id = pm.partner_id AND p.deleted_at IS NULL
LEFT JOIN workspace_members wm ON wm.user_id = u.id AND wm.removed_at IS NULL
LEFT JOIN workspaces w ON w.id = wm.workspace_id AND w.deleted_at IS NULL
ORDER BY u.email, p.name, w.name;
```

### Query 2: Find Users by Role for Testing

```sql
-- Find partner owners
SELECT u.email, p.name as partner_name
FROM users u
JOIN partner_members pm ON pm.user_id = u.id
JOIN partners p ON p.id = pm.partner_id
WHERE pm.role = 'owner' AND pm.removed_at IS NULL;

-- Find partner admins
SELECT u.email, p.name as partner_name
FROM users u
JOIN partner_members pm ON pm.user_id = u.id
JOIN partners p ON p.id = pm.partner_id
WHERE pm.role = 'admin' AND pm.removed_at IS NULL;

-- Find partner members (non-admin, non-owner)
SELECT u.email, p.name as partner_name
FROM users u
JOIN partner_members pm ON pm.user_id = u.id
JOIN partners p ON p.id = pm.partner_id
WHERE pm.role = 'member' AND pm.removed_at IS NULL;
```

### Query 3: Create Test Users with Different Roles

> ⚠️ **Important**: These queries require the user to already exist in `auth.users` (via Supabase Auth signup).

```sql
-- Step 1: Get IDs for existing partner and workspace
SELECT id, name FROM partners WHERE is_platform_partner = true LIMIT 1;
SELECT id, name, slug FROM workspaces LIMIT 1;

-- Step 2: Create a partner member (non-admin) for testing
-- Replace {USER_ID} with actual user ID from auth.users
-- Replace {PARTNER_ID} with partner ID from Step 1
INSERT INTO partner_members (partner_id, user_id, role)
VALUES ('{PARTNER_ID}', '{USER_ID}', 'member')
ON CONFLICT DO NOTHING;

-- Step 3: Add workspace member with 'member' role
-- Replace {WORKSPACE_ID} with workspace ID from Step 1
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('{WORKSPACE_ID}', '{USER_ID}', 'member')
ON CONFLICT DO NOTHING;
```

### Query 4: Change User Roles for Testing

```sql
-- Change partner role (use for testing different role combinations)
UPDATE partner_members 
SET role = 'member'  -- Change to 'owner', 'admin', or 'member'
WHERE user_id = '{USER_ID}' 
AND partner_id = '{PARTNER_ID}';

-- Change workspace role
UPDATE workspace_members 
SET role = 'viewer'  -- Change to 'owner', 'admin', 'member', or 'viewer'
WHERE user_id = '{USER_ID}' 
AND workspace_id = '{WORKSPACE_ID}';
```

### Query 5: View Role Permissions Summary

```sql
-- Get complete role summary for a specific user
SELECT 
  u.email,
  json_agg(DISTINCT jsonb_build_object(
    'partner', p.name,
    'partner_role', pm.role
  )) as partner_roles,
  json_agg(DISTINCT jsonb_build_object(
    'workspace', w.name,
    'workspace_slug', w.slug,
    'workspace_role', wm.role
  )) as workspace_roles
FROM users u
LEFT JOIN partner_members pm ON pm.user_id = u.id AND pm.removed_at IS NULL
LEFT JOIN partners p ON p.id = pm.partner_id
LEFT JOIN workspace_members wm ON wm.user_id = u.id AND wm.removed_at IS NULL
LEFT JOIN workspaces w ON w.id = wm.workspace_id AND w.deleted_at IS NULL
WHERE u.email = 'test@example.com'  -- Replace with actual email
GROUP BY u.email;
```

---

## Testing Steps by Role

### Test Case 1: Partner Owner Testing

**Setup**: User has `partner_role = 'owner'` and `workspace_role = 'owner'`

1. Login with partner owner account
2. Navigate to workspace dashboard (`/w/{slug}/dashboard`)
3. **Expected Results**:
   - ✅ "Workspace Overview" section visible with 4 stat cards
   - ✅ "Organization Overview" section visible with 3 stat cards
   - ✅ "Admin View" badge visible next to Organization Overview
   - ✅ All quick action buttons visible including "Manage Team"
   - ✅ Role badge shows "Owner"

### Test Case 2: Partner Admin Testing

**Setup**: User has `partner_role = 'admin'` and `workspace_role = 'admin'`

1. Login with partner admin account
2. Navigate to workspace dashboard
3. **Expected Results**:
   - ✅ "Workspace Overview" section visible
   - ✅ "Organization Overview" section visible
   - ✅ "Admin View" badge visible
   - ✅ Role badge shows "Admin"

### Test Case 3: Partner Member Testing (Critical Test)

**Setup**: User has `partner_role = 'member'` and `workspace_role = 'member'`

1. Login with partner member account
2. Navigate to workspace dashboard
3. **Expected Results**:
   - ✅ "Workspace Overview" section visible
   - ❌ "Organization Overview" section **NOT visible**
   - ❌ No "Total Workspaces" stat
   - ❌ No "Total Agents (All Workspaces)" stat
   - ❌ No "Total Calls Today (All Workspaces)" stat
   - ✅ Role badge shows "Member"
   - ❌ "Manage Team" quick action button NOT visible

### Test Case 4: Workspace Viewer Testing

**Setup**: User has any partner role and `workspace_role = 'viewer'`

1. Login with viewer account
2. Navigate to workspace dashboard
3. **Expected Results**:
   - ✅ "Workspace Overview" section visible (read-only)
   - ✅ Role badge shows "Viewer"
   - ❌ "Manage Team" quick action button NOT visible

### Test Case 5: API Permission Testing

Test the API endpoints directly:

```bash
# As partner member - should return 403
curl -X GET http://localhost:3000/api/partner/dashboard/stats \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"

# Expected response for non-admin:
# { "error": "You don't have permission to view organization-wide statistics..." }

# As partner admin/owner - should return 200 with data
curl -X GET http://localhost:3000/api/partner/dashboard/stats \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"

# Expected response:
# { "data": { "total_workspaces": 3, "total_agents_all_workspaces": 5, "total_calls_today": 10 } }
```

---

## API Endpoint Testing

### Endpoint 1: Partner Dashboard Stats

**URL**: `GET /api/partner/dashboard/stats`

| Test | Expected Status | Expected Result |
|------|-----------------|-----------------|
| Partner Owner | 200 | Full org stats |
| Partner Admin | 200 | Full org stats |
| Partner Member | 403 | Permission denied |
| Not authenticated | 401 | Unauthorized |

### Endpoint 2: Workspace Dashboard Stats

**URL**: `GET /api/w/{workspaceSlug}/dashboard/stats`

| Test | Expected Status | Expected Result |
|------|-----------------|-----------------|
| Workspace Owner | 200 | Workspace stats |
| Workspace Admin | 200 | Workspace stats |
| Workspace Member | 200 | Workspace stats |
| Workspace Viewer | 200 | Workspace stats |
| Non-member | 401/403 | Unauthorized/Forbidden |

---

## Verification Checklist

### Pre-Testing Checklist

- [ ] Application is running locally or on staging
- [ ] Database is accessible
- [ ] Test users exist with different role combinations
- [ ] Browser DevTools Network tab ready to monitor API calls

### Dashboard UI Checklist

- [ ] **Partner Owner**: Sees both workspace and organization stats
- [ ] **Partner Admin**: Sees both workspace and organization stats
- [ ] **Partner Member**: Only sees workspace stats (no org section)
- [ ] **Workspace Admin**: Sees "Manage Team" button
- [ ] **Workspace Member**: Does NOT see "Manage Team" button
- [ ] **Workspace Viewer**: Does NOT see "Manage Team" button
- [ ] Role badge correctly displays current workspace role

### API Response Checklist

- [ ] `/api/partner/dashboard/stats` returns 403 for partner members
- [ ] `/api/partner/dashboard/stats` returns 200 for partner admins/owners
- [ ] `/api/w/{slug}/dashboard/stats` returns 200 for all workspace members
- [ ] Error messages are descriptive and helpful

### Navigation Checklist

- [ ] Sidebar shows "Billing" only for workspace admins/owners
- [ ] Sidebar shows "Workspace Team" only for workspace admins/owners
- [ ] Sidebar shows "Organization" section only for partner admins/owners
- [ ] Workspace selector shows user's role next to each workspace

---

## Troubleshooting

### Issue: User sees organization stats when they shouldn't

1. Check partner_members table for the user's partner role
2. Verify the `partner_role` is `'member'` not `'admin'` or `'owner'`
3. Clear browser cache and reload

```sql
SELECT pm.role FROM partner_members pm
WHERE pm.user_id = '{USER_ID}' AND pm.removed_at IS NULL;
```

### Issue: User doesn't see any stats

1. Check workspace_members table for workspace access
2. Verify the user is a member of the workspace

```sql
SELECT wm.role FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = '{USER_ID}' 
AND wm.removed_at IS NULL
AND w.slug = '{WORKSPACE_SLUG}';
```

### Issue: API returns 401 Unauthorized

1. Check if session cookie is valid
2. Verify user exists in auth.users
3. Check for expired session

---

## Quick Reference: Role Strings

### Partner Roles
- `owner` - Full organization control
- `admin` - Can manage workspaces and team
- `member` - Limited access, workspace-scoped only

### Workspace Roles
- `owner` - Full workspace control
- `admin` - Can manage workspace and team
- `member` - Can create and edit resources
- `viewer` - Read-only access

---

_This guide should be updated whenever RBAC changes are made to the system._

