# ⚡ Quick Start: Deploy Cron Optimization

> Deploy in 5 minutes!

---

## TL;DR - The Problem & Solution

| | Before | After |
|---|--------|-------|
| **Cron Runs/Day** | 24 | 2 ✅ |
| **Hobby Plan Limit** | 2 | 2 ✅ |
| **Status** | ❌ Over limit | ✅ Compliant |
| **Fix Time** | - | Already done! |

---

## What Changed?

### vercel.json
```diff
{
  "crons": [
    {
-     "path": "/api/cron/cleanup-expired-campaigns",
-     "schedule": "0 * * * *"
+     "path": "/api/cron/master",
+     "schedule": "0 0,12 * * *"
    }
  ]
}
```

### What You Get

✅ New consolidated cron orchestrator: `app/api/cron/master/route.ts`  
✅ Runs 2x daily (compliant with Hobby limits)  
✅ Same cleanup functionality  
✅ Ready for future tasks  
✅ Better error handling  
✅ Better monitoring  

---

## Deploy Instructions

### Option 1: Direct Push (Recommended)

```bash
cd genius365
git status
# Should show:
# Modified:   vercel.json
# New file:   app/api/cron/master/route.ts
# New file:   CRON_OPTIMIZATION_STRATEGY.md
# New file:   CRON_JOBS_README.md
# New file:   CRON_DEPLOYMENT_SUMMARY.md
# New file:   CRON_VISUAL_GUIDE.md

git add .
git commit -m "fix: optimize cron for Vercel Hobby plan - 2x daily instead of hourly"
git push origin main
```

### Option 2: Create PR (Safer for Review)

```bash
git checkout -b fix/cron-optimization
git add .
git commit -m "fix: optimize cron for Vercel Hobby plan - 2x daily instead of hourly"
git push origin fix/cron-optimization
# Then create PR on GitHub
```

---

## After Deployment

### ✅ Verify in Vercel Dashboard

1. Go to your Vercel project
2. Click **Settings** → **Functions** (or look for **Cron**)
3. You should see:
   - **Endpoint**: `/api/cron/master`
   - **Schedule**: `0 0,12 * * *`
   - **Status**: Active

### ✅ Wait for Next Execution

- **Next run**: Next UTC 00:00 or 12:00
- **Check logs**: Deployments → Function Logs
- **Look for**: `[MasterCron] Starting consolidated cron execution`

---

## Local Testing (Optional)

### Test the Endpoint

```bash
# Start dev server
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/cron/master \
  -H "Authorization: Bearer test-secret"
```

### Expected Output

```json
{
  "success": true,
  "totalDurationMs": 234,
  "results": {
    "cleanupExpiredCampaigns": {
      "success": true,
      "cancelledCount": 0,
      "errorCount": 0,
      "durationMs": 234
    }
  },
  "timestamp": "2026-01-07T12:00:00.000Z"
}
```

---

## Monitoring

### What to Watch

```
Vercel Dashboard → Deployments → Function Logs

Look for lines like:
✅ [MasterCron] Starting consolidated cron execution
✅ [MasterCron] Task 1/3: Cleanup Expired Campaigns - Starting
✅ [MasterCron] All tasks completed in XXXms
```

### If Something Goes Wrong

1. Check logs in Vercel dashboard
2. Review error messages
3. Verify environment variable `CRON_SECRET` is set (if custom)
4. Check database connectivity

---

## FAQ

### Q: Will this break anything?
**A**: No! Old endpoint still works for manual testing. New endpoint is just added.

### Q: How long until it runs?
**A**: Next UTC 00:00 or 12:00 (whichever comes first)

### Q: Can I test it now?
**A**: Yes! Call manually: `curl -X POST /api/cron/master`

### Q: Do I need to change anything else?
**A**: No! Everything is handled. Just deploy and it works.

### Q: What if I need hourly cron?
**A**: You'd need to upgrade to Pro plan. Hobby plan only allows 2/day.

---

## Documentation

Three files provided for reference:

1. **`CRON_DEPLOYMENT_SUMMARY.md`** ← Start here for full overview
2. **`CRON_JOBS_README.md`** ← Operations & troubleshooting
3. **`CRON_OPTIMIZATION_STRATEGY.md`** ← Advanced strategies
4. **`CRON_VISUAL_GUIDE.md`** ← Visual diagrams

---

## Next Steps

- [x] Code changes made ✅
- [x] TypeScript errors fixed ✅
- [ ] Deploy to Vercel (git push)
- [ ] Verify first execution in logs
- [ ] Monitor for 24 hours
- [ ] Done!

---

## Support

**Need help?**

1. Check `CRON_JOBS_README.md` troubleshooting section
2. Review Vercel logs in dashboard
3. Look at CRON_OPTIMIZATION_STRATEGY.md for detailed explanations

---

## Timeline

```
NOW         ──────────────────► NEXT 00:00 UTC or 12:00 UTC
│                               │
├─ Deploy code                  └─ Cron runs automatically
├─ Vercel reads vercel.json     └─ Check logs
└─ New schedule active          └─ Verify success
```

---

## Success Criteria

After deployment, you should see:

- ✅ No Vercel deployment error about cron jobs
- ✅ New schedule showing in Vercel dashboard
- ✅ Execution logs appearing at 00:00 and 12:00 UTC
- ✅ Status: "success" in logs
- ✅ Zero code breaking changes

---

**Ready to deploy? Just push the code!** 🚀

```bash
git push origin main
```

That's it! The rest is automatic.

