# Campaign Module Testing Guide - VAPI Batch Calling

> **Date**: January 2026  
> **Status**: Ready for Testing  
> **Primary Provider**: VAPI (Inspra configured to webhook.site for testing)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Configuration Checklist](#configuration-checklist)
4. [Testing Scenarios](#testing-scenarios)
5. [Console Log Reference](#console-log-reference)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The campaign module now supports **automatic fallback** from Inspra to VAPI:

```
┌─────────────────────────────────────────────────────────────┐
│                    PROVIDER SELECTION FLOW                  │
└─────────────────────────────────────────────────────────────┘

Is INSPRA_OUTBOUND_API_URL set AND not webhook.site?
                │
        ┌───────┴───────┐
        │               │
       YES              NO
        │               │
        ▼               ▼
   Try Inspra      Use VAPI directly
        │               │
   Success?             │
        │               │
    ┌───┴───┐           │
   YES     NO           │
    │       │           │
    ▼       ▼           ▼
 Return   VAPI       VAPI
 Inspra  Fallback   Primary
```

**Current Setup** (webhook.site): System will use VAPI as primary provider.

---

## Prerequisites

### 1. VAPI Account & Phone Numbers
- [ ] VAPI account with API key
- [ ] At least one VAPI phone number for outbound calls
- [ ] Phone number ID (not the phone number itself, but the VAPI UUID)

### 2. Database Configuration
Ensure these are set up in your workspace:

```sql
-- Check if workspace has VAPI integration assigned
SELECT 
  w.name as workspace,
  pi.name as integration_name,
  pi.api_keys->>'default_secret_key' IS NOT NULL as has_api_key,
  pi.config->>'shared_outbound_phone_number_id' as phone_number_id
FROM workspaces w
JOIN workspace_integration_assignments wia ON w.id = wia.workspace_id
JOIN partner_integrations pi ON wia.partner_integration_id = pi.id
WHERE wia.provider = 'vapi';
```

### 3. Agent Requirements
- [ ] Agent synced with VAPI (`external_agent_id` is set)
- [ ] Agent has phone number assigned (one of):
  - `assigned_phone_number_id` → linked to `phone_numbers.external_id` (VAPI ID)
  - Integration has `shared_outbound_phone_number_id` in config

---

## Configuration Checklist

### Environment Variables

```bash
# .env.local

# Inspra - Set to webhook.site for testing (triggers VAPI fallback)
INSPRA_OUTBOUND_API_URL=https://webhook.site/YOUR-UUID-HERE
INSPRA_API_KEY=optional-for-testing

# VAPI keys are stored in database (partner_integrations table)
# NOT in environment variables
```

### Database: Partner Integration Setup

The VAPI configuration must include the **phone number ID** for outbound calls:

```sql
-- Update partner integration with phone number ID
UPDATE partner_integrations
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{shared_outbound_phone_number_id}',
  '"YOUR-VAPI-PHONE-NUMBER-ID"'::jsonb
)
WHERE provider = 'vapi' 
AND partner_id = 'YOUR-PARTNER-ID';
```

**Finding your VAPI Phone Number ID:**
1. Go to VAPI Dashboard → Phone Numbers
2. Click on your phone number
3. Copy the ID (UUID format like `abc12345-def6-7890-ghij-klmnopqrstuv`)

### Verify Agent Setup

```sql
-- Check agent has external_agent_id (synced to VAPI)
SELECT 
  name,
  provider,
  external_agent_id,
  assigned_phone_number_id,
  sync_status
FROM ai_agents 
WHERE workspace_id = 'YOUR-WORKSPACE-ID'
AND deleted_at IS NULL;
```

---

## Testing Scenarios

### Test 1: Single Test Call

**Purpose**: Verify VAPI outbound calling works for a single call.

**Steps**:
1. Navigate to: `/w/{workspaceSlug}/campaigns`
2. Create a new campaign OR use existing one
3. Click on the campaign to view details
4. Find the "Test Call" button
5. Enter your Australian test number (E.164 format: `+61412345678`)
6. Click "Send Test Call"

**Expected Console Logs**:
```
[CampaignTestCall] Making test call to: +61412345678
[CampaignTestCall] VAPI fallback available: true
[CampaignProvider] Test call via VAPI to: +61412345678
[VapiCalls] Creating outbound call from PHONE_NUMBER_ID to +61412345678
[VapiCalls] Outbound call created: CALL_ID status: queued
[CampaignTestCall] Test call queued via: vapi
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Test call queued successfully via vapi",
  "phone": "+61412345678",
  "provider": {
    "used": "vapi",
    "fallbackUsed": false
  }
}
```

---

### Test 2: Campaign Creation with Recipients

**Purpose**: Verify campaign is created and payload is prepared.

**Steps**:
1. Navigate to: `/w/{workspaceSlug}/campaigns/new`
2. Fill in campaign details:
   - Name: "VAPI Test Campaign"
   - Agent: Select your synced VAPI agent
   - Schedule: "Immediate"
3. Add recipients (CSV or manual):
   ```
   phone_number,first_name,last_name
   +61412345678,Test,User1
   +61498765432,Test,User2
   ```
4. Complete wizard and create campaign

**Expected Console Logs**:
```
[CampaignsAPI] Sending READY (immediate) campaign to provider...
[CampaignsAPI] VAPI fallback available: true
[CampaignProvider] Starting batch: campaign-XXX
[CampaignProvider] Recipients: 2
[CampaignProvider] Inspra configured: false
[CampaignProvider] VAPI fallback available: true
[CampaignProvider] Using VAPI (Inspra not configured)
```

**Note**: For "immediate" campaigns, calls won't start until you click "Start Now".

---

### Test 3: Start Campaign (VAPI Batch)

**Purpose**: Verify VAPI batch calling processes all recipients.

**Steps**:
1. From campaign detail page, click "Start Now"
2. Watch console logs for batch processing
3. Verify your phones receive calls

**Expected Console Logs**:
```
[CampaignStart] Starting campaign via unified provider...
[CampaignStart] VAPI fallback available: true
[CampaignProvider] Using VAPI (Inspra not configured)
[VapiBatch] Starting batch: campaign-XXX
[VapiBatch] Total recipients: 2
[VapiBatch] Assistant ID: ASSISTANT-UUID
[VapiBatch] Phone Number ID: PHONE-NUMBER-UUID
[VapiBatch] Creating call to +61412345678 (attempt 1)
[VapiCalls] Outbound call created: CALL-1-ID status: queued
[VapiBatch] Call created successfully: CALL-1-ID
[VapiBatch] Creating call to +61498765432 (attempt 1)
[VapiCalls] Outbound call created: CALL-2-ID status: queued
[VapiBatch] Call created successfully: CALL-2-ID
[VapiBatch] Progress: 2/2 (2 success, 0 failed)
[VapiBatch] Batch complete: campaign-XXX
[VapiBatch] Results: 2 success, 0 failed, 0 skipped
[CampaignStart] Campaign started via: vapi
```

**Expected API Response**:
```json
{
  "success": true,
  "campaign": { ... },
  "batchRef": "campaign-XXX",
  "recipientCount": 2,
  "message": "Campaign started via vapi! Calls are now being processed.",
  "provider": {
    "used": "vapi",
    "fallbackUsed": false
  },
  "vapiResults": {
    "successfulCalls": 2,
    "failedCalls": 0,
    "skippedCalls": 0
  }
}
```

---

### Test 4: Pause Campaign

**Purpose**: Verify campaign pause works (state-based for VAPI).

**Steps**:
1. While campaign is active, click "Pause"
2. Verify status changes to "paused"

**Expected Logs**:
```
[CampaignPause] Pausing campaign: XXX
[CampaignProvider] VAPI pause (state-based): campaign-XXX
[CampaignPause] Campaign paused: XXX
```

**Note**: VAPI doesn't have native batch pause. The pause is state-based - if you resume, remaining calls will be processed.

---

### Test 5: Resume Campaign

**Purpose**: Verify paused campaign can resume.

**Steps**:
1. From paused campaign, click "Resume"
2. Verify calls continue for remaining recipients

**Expected Logs**:
```
[CampaignResume] Resuming campaign via unified provider...
[CampaignResume] VAPI fallback available: true
[CampaignProvider] Using VAPI (Inspra not configured)
[VapiBatch] Starting batch: campaign-XXX
...
```

---

### Test 6: Terminate Campaign

**Purpose**: Verify campaign termination cancels pending calls.

**Steps**:
1. From active/paused campaign, click "Terminate" (or delete)
2. Verify status changes to "cancelled"
3. Verify pending recipients marked as cancelled

**Expected Logs**:
```
[CampaignTerminate] Terminating campaign: XXX
[CampaignProvider] VAPI terminate (state-based): campaign-XXX
[CampaignTerminate] Campaign terminated: XXX
```

---

### Test 7: Business Hours Enforcement

**Purpose**: Verify calls respect business hours when configured.

**Setup**:
1. Create campaign with business hours:
   ```json
   {
     "enabled": true,
     "timezone": "Australia/Sydney",
     "schedule": {
       "monday": [{"start": "09:00", "end": "17:00"}],
       "tuesday": [{"start": "09:00", "end": "17:00"}],
       ...
     }
   }
   ```
2. Try starting campaign outside business hours

**Expected Logs** (outside hours):
```
[VapiBatch] Outside business hours. Next window: 2026-01-15T09:00:00.000Z
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Outside business hours. Next available: 2026-01-15T09:00:00.000Z"
}
```

---

## Console Log Reference

### Success Indicators
| Log Pattern | Meaning |
|-------------|---------|
| `[CampaignProvider] Using VAPI` | VAPI is being used as provider |
| `[VapiBatch] Call created successfully` | Individual call initiated |
| `[VapiBatch] Results: X success, 0 failed` | Batch completed successfully |
| `provider: { "used": "vapi" }` | Response confirms VAPI was used |

### Error Indicators
| Log Pattern | Meaning | Solution |
|-------------|---------|----------|
| `VAPI API key not configured` | No API key in integration | Check partner_integrations.api_keys |
| `VAPI assistant ID not configured` | Agent not synced | Sync agent with VAPI |
| `VAPI phone number ID not configured` | No phone for outbound | Set shared_outbound_phone_number_id |
| `Rate limited, waiting` | VAPI rate limit hit | Will auto-retry after 5s |
| `Outside business hours` | Campaign has business hours | Wait or adjust schedule |

---

## Troubleshooting

### Issue: "No outbound calling provider configured"

**Cause**: Neither Inspra nor VAPI is properly configured.

**Solution**:
1. Check partner integration exists for VAPI:
   ```sql
   SELECT * FROM partner_integrations WHERE provider = 'vapi';
   ```
2. Check integration is assigned to workspace:
   ```sql
   SELECT * FROM workspace_integration_assignments WHERE provider = 'vapi';
   ```

---

### Issue: "VAPI phone number ID not configured"

**Cause**: Integration missing `shared_outbound_phone_number_id` in config.

**Solution**:
```sql
UPDATE partner_integrations
SET config = jsonb_set(
  config,
  '{shared_outbound_phone_number_id}',
  '"YOUR-VAPI-PHONE-ID"'
)
WHERE id = 'YOUR-INTEGRATION-ID';
```

---

### Issue: "Agent has not been synced with the voice provider"

**Cause**: Agent's `external_agent_id` is null.

**Solution**:
1. Go to agent edit page
2. Ensure VAPI API key is assigned
3. Save agent to trigger sync
4. Check `sync_status` is "synced"

---

### Issue: Calls not being received

**Possible Causes**:
1. **VAPI Phone Number**: Verify the phone number in VAPI dashboard is active
2. **Number Format**: Ensure E.164 format (`+61412345678`)
3. **VAPI Quota**: Check VAPI dashboard for call limits
4. **Agent Issue**: Test the agent directly in VAPI dashboard

**Debug Steps**:
1. Make a test call directly via VAPI API:
   ```bash
   curl -X POST https://api.vapi.ai/call \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "assistantId": "YOUR_ASSISTANT_ID",
       "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
       "customer": {
         "number": "+61412345678"
       }
     }'
   ```
2. Check VAPI dashboard for call logs
3. Review VAPI webhook events

---

## Quick Reference: Required IDs

| ID Type | Where to Find | Where to Store |
|---------|---------------|----------------|
| VAPI API Key | VAPI Dashboard → API Keys | `partner_integrations.api_keys.default_secret_key` |
| VAPI Phone Number ID | VAPI Dashboard → Phone Numbers → Click number → Copy ID | `partner_integrations.config.shared_outbound_phone_number_id` |
| VAPI Assistant ID | Created when agent syncs | `ai_agents.external_agent_id` |

---

## Next Steps

1. ✅ Test single call (Test 1)
2. ✅ Test campaign creation (Test 2)
3. ✅ Test campaign start with batch (Test 3)
4. ✅ Test pause/resume (Tests 4-5)
5. ✅ Test terminate (Test 6)
6. ⏳ Implement call status webhooks (Milestone 4)
7. ⏳ Add recipient status tracking from VAPI callbacks

