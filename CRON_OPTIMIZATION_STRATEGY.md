# Cron Job Optimization for Vercel Hobby Plan

> **Last Updated**: January 7, 2026  
> **Current Status**: 1 cron job configured (cleanup-expired-campaigns)  
> **Vercel Hobby Limit**: 2 cron jobs per day maximum

---

## Current State Analysis

### Existing Cron Job

```json
{
  "path": "/api/cron/cleanup-expired-campaigns",
  "schedule": "0 * * * *"  // Every hour (24 times/day)
}
```

⚠️ **PROBLEM**: This schedule runs **24 times per day**, which **exceeds the 2-job-per-day limit** on Hobby plan.

---

## Solution: Consolidated Cron Architecture

Instead of multiple cron endpoints, we'll consolidate into **ONE optimized cron job** that runs twice daily and handles all background tasks.

### Benefits

✅ Stays within Vercel Hobby limits (2 runs/day max)  
✅ Efficient batch processing  
✅ Reduced cold starts  
✅ Easier to monitor  
✅ Scales seamlessly to Pro/Enterprise plans

---

## Implementation Plan

### Step 1: Create Master Cron Job

Replace the current hourly schedule with a consolidated endpoint that runs **twice daily**:

**File: `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/master",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

| Schedule | Frequency | Total/Day |
|----------|-----------|-----------|
| `0 * * * *` | Hourly | 24 ❌ OVER LIMIT |
| `0 0,12 * * *` | 12am, 12pm | 2 ✅ OPTIMAL |
| `0 */12 * * *` | Every 12 hours | 2 ✅ OPTIMAL |

### Step 2: Create Master Cron Orchestrator

**File: `app/api/cron/master/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { cleanupExpiredCampaigns } from "@/lib/campaigns/cleanup-expired"
import { syncAgentsToProviders } from "@/lib/campaigns/sync-agents" // Future task
import { sendCampaignExpiringNotifications } from "@/lib/campaigns/expiring-notifications" // Future task

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("[MasterCron] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    logger.info("[MasterCron] Starting consolidated cron jobs")
    const startTime = Date.now()
    const results = {}

    // ========================================================================
    // Task 1: Cleanup Expired Campaigns
    // ========================================================================
    try {
      logger.info("[MasterCron] Running: Cleanup Expired Campaigns")
      const cleanupResult = await cleanupExpiredCampaigns()
      results.cleanup = {
        success: cleanupResult.success,
        cancelledCount: cleanupResult.cancelledCount,
        errors: cleanupResult.errors,
      }
      logger.info(`[MasterCron] Cleanup complete: ${cleanupResult.cancelledCount} cancelled`)
    } catch (error) {
      logger.error("[MasterCron] Cleanup failed", {
        message: error instanceof Error ? error.message : String(error),
      })
      results.cleanup = { success: false, error: "Cleanup failed" }
    }

    // ========================================================================
    // Task 2: Send Expiring Campaign Notifications (Future)
    // ========================================================================
    // try {
    //   logger.info("[MasterCron] Running: Send Expiring Notifications")
    //   const notifyResult = await sendCampaignExpiringNotifications()
    //   results.notifications = notifyResult
    // } catch (error) {
    //   logger.error("[MasterCron] Notifications failed", { error })
    // }

    // ========================================================================
    // Task 3: Sync Agents to Providers (Future - Heavy Operation)
    // ========================================================================
    // try {
    //   logger.info("[MasterCron] Running: Sync Agents")
    //   const syncResult = await syncAgentsToProviders()
    //   results.sync = syncResult
    // } catch (error) {
    //   logger.error("[MasterCron] Sync failed", { error })
    // }

    const duration = Date.now() - startTime
    logger.info(`[MasterCron] All tasks completed in ${duration}ms`, { results })

    return NextResponse.json({
      success: true,
      duration,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("[MasterCron] Unexpected error", {
      message: errorMessage,
      error: error instanceof Error ? error.stack : String(error),
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "master-cron",
    status: "ready",
    description: "Consolidated cron orchestrator (runs every 12 hours)",
    tasks: [
      {
        name: "cleanup-expired-campaigns",
        description: "Cancel campaigns that have passed their expiry date",
        enabled: true,
      },
      {
        name: "send-expiring-notifications",
        description: "Notify users of campaigns expiring within 24 hours",
        enabled: false,
        note: "Implement when needed",
      },
      {
        name: "sync-agents-to-providers",
        description: "Sync agent changes to VAPI/Retell/Synthflow",
        enabled: false,
        note: "Heavy operation - consider for every 12 hours or call on-demand",
      },
    ],
  })
}
```

### Step 3: Keep Legacy Endpoint (Soft Deprecation)

For backward compatibility and on-demand usage, keep the original endpoint but remove it from cron schedule:

**File: `app/api/cron/cleanup-expired-campaigns/route.ts`** (No changes needed)

```typescript
// Can be called manually/on-demand for testing or emergency cleanup
// Not scheduled in vercel.json anymore
```

### Step 4: Update vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/master",
      "schedule": "0 0,12 * * *"
    }
  ]
}
```

---

## Alternative Approaches

### Option A: Different Time-Based Tasks (Advanced)

If you need different tasks at different frequencies:

```typescript
// Master cron runs twice daily
// But only executes specific tasks based on time/day

const masterCron = async () => {
  const now = new Date()
  const hours = now.getHours()

  // Every 12 hours
  await cleanupExpiredCampaigns()

  // Only at midnight (daily)
  if (hours === 0) {
    await generateDailyReports()
  }

  // Only on Sundays (weekly)
  if (now.getDay() === 0) {
    await generateWeeklyAnalytics()
  }
}
```

### Option B: Use Third-Party Job Services (Future)

When you upgrade or need more frequent jobs:

**Services to Consider:**
- **Inngest** - Event-driven job queue (free tier generous)
- **QStash** - By Upstash (serverless queues)
- **Bull + Redis** - Self-hosted (requires Redis)
- **AWS Lambda + EventBridge** - Enterprise scale

Benefits:
- Run jobs every minute or second
- Retry logic & error handling
- Job monitoring dashboard
- Works on any plan

### Option C: Event-Driven Triggers (Alternative)

Instead of scheduled cron, trigger cleanup when:

```typescript
// lib/campaigns/cleanup-on-action.ts

// Trigger cleanup when:
// 1. User creates a campaign with expiry
// 2. Campaign status changes
// 3. On /api/campaigns POST/PATCH (add hook)

export async function triggerCleanupIfNeeded() {
  // Check if cleanup needed since last run
  const lastCleanup = await getLastCleanupTime()
  const hoursAgo = (Date.now() - lastCleanup.getTime()) / (1000 * 60 * 60)

  // Only run if 6+ hours since last cleanup
  if (hoursAgo >= 6) {
    await cleanupExpiredCampaigns()
  }
}
```

---

## Implementation Checklist

- [ ] Create `app/api/cron/master/route.ts`
- [ ] Update `vercel.json` to new schedule
- [ ] Test master endpoint locally: `curl -X POST http://localhost:3000/api/cron/master`
- [ ] Test with `CRON_SECRET` header
- [ ] Deploy to Vercel
- [ ] Monitor first runs in Vercel Dashboard
- [ ] Keep legacy endpoint as on-demand backup
- [ ] Document in team wiki

---

## Monitoring & Debugging

### View Cron Logs in Vercel

1. Go to **Project Settings** → **Functions**
2. Check **Cron Invoker** logs
3. See execution times and errors

### Local Testing

```bash
# Test the master cron endpoint
curl -X POST http://localhost:3000/api/cron/master \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should see in terminal logs:
# [MasterCron] Starting consolidated cron jobs
# [MasterCron] Running: Cleanup Expired Campaigns
# [MasterCron] All tasks completed in XXXms
```

### Error Handling

The master cron is designed to:
- ✅ Continue if one task fails
- ✅ Log all failures individually
- ✅ Return partial success (some tasks worked)
- ✅ Never crash the entire job

---

## Future Enhancements

### Phase 1 (Current - Hobby Plan)
- ✅ Consolidate to 2 runs/day
- ✅ Cleanup expired campaigns
- ✅ Maintain backward compatibility

### Phase 2 (Pro Plan)
- 🔄 Add expiring campaign notifications
- 🔄 Add agent sync task
- 🔄 Can increase frequency if needed

### Phase 3 (Enterprise)
- 🔄 Migrate to Inngest/QStash
- 🔄 Enable per-minute job execution
- 🔄 Add distributed job processing

---

## Cost Analysis

| Plan | Cron Jobs/Day | Cost Impact | Notes |
|------|--------------|------------|-------|
| **Hobby** | 2 | Free | Current setup |
| **Pro** | Unlimited | Included | Same cost structure |
| **Enterprise** | Custom | Custom | Dedicated support |

**No cost increase by consolidating!** You stay on Hobby plan with same limits.

---

## Summary

**Current State**: 1 cron running 24x/day (exceeds Hobby limit)  
**Recommended**: 1 consolidated cron running 2x/day  
**Impact**: ✅ Complies with limits, ✅ Better performance, ✅ Same features

This approach is:
- **Simple**: Single endpoint to manage
- **Scalable**: Easy to add more tasks
- **Efficient**: Fewer cold starts
- **Safe**: Error handling for all tasks
- **Future-proof**: Ready to migrate to premium services


