# Campaigns Module - Testing Guide

## Overview

The Campaigns module enables batch outbound calling with AI voice agents. This guide covers testing the complete workflow before telephony integration.

---

## Prerequisites

1. **Active Workspace** - You must be logged into a workspace
2. **AI Agent** - At least one active agent (VAPI or Retell) configured
3. **Integration** - Agent should have valid API keys configured

---

## Test Scenarios

### 1. Create Campaign (Happy Path)

**Steps:**

1. Navigate to `Campaigns` in the sidebar
2. Click **"New Campaign"**
3. Fill in:
   - Campaign Name: `Test Holiday Campaign`
   - Description: `Testing batch calling functionality`
   - Select an active agent
4. Configure settings:
   - Business Hours Only: Toggle ON
   - Set hours: 9:00 AM - 6:00 PM
   - Timezone: Your local timezone
5. Click **"Create Campaign"**

**Expected Result:**

- Campaign created with "Draft" status
- Redirected to campaign detail page
- Stats show 0 recipients

---

### 2. Import Recipients via CSV

**Steps:**

1. Open the created campaign
2. Click **"Import CSV"**
3. Download the template or use `test-recipients.csv`
4. Upload the file
5. Preview shows all recipients
6. Click **"Import"**

**Expected Result:**

- Recipients imported successfully
- Toast shows "Imported X recipients"
- Stats update to show total recipients
- Table displays all phone numbers

---

### 3. Add Single Recipient Manually

**Steps:**

1. In campaign detail, click **"Add"**
2. Enter:
   - Phone: `+1 555 999 0001`
   - First Name: `Manual`
   - Last Name: `Test`
3. Click **"Add Recipient"**

**Expected Result:**

- Recipient added to the table
- Total recipients count increments

---

### 4. Duplicate Phone Number Handling

**Steps:**

1. Try adding a phone number that already exists
2. Or import a CSV with duplicate phone numbers

**Expected Result:**

- Single add: Error message "This phone number already exists"
- CSV import: Duplicates skipped, count shown in result

---

### 5. Delete Recipient

**Steps:**

1. Click the 3-dot menu on a recipient row
2. Select "Remove"
3. Confirm deletion

**Expected Result:**

- Recipient removed from list
- Total count decrements

---

### 6. Campaign Status Transitions

| From         | Action                  | To        | Validation                             |
| ------------ | ----------------------- | --------- | -------------------------------------- |
| Draft        | Start (no recipients)   | Draft     | Error: "Add recipients first"          |
| Draft        | Start (with recipients) | Active    | `started_at` timestamp set             |
| Active       | Pause                   | Paused    | -                                      |
| Paused       | Resume                  | Active    | -                                      |
| Draft/Paused | Delete                  | Cancelled | Soft delete with `deleted_at`          |
| Active       | Delete                  | Active    | Error: "Cannot delete active campaign" |

---

### 7. Filter Recipients by Status

**Steps:**

1. Open a campaign with recipients
2. Use the status filter dropdown
3. Select different statuses (Pending, Completed, Failed)

**Expected Result:**

- Table filters to show only matching recipients
- Count updates accordingly

---

### 8. Filter Campaigns by Status

**Steps:**

1. On campaigns list page
2. Use status filter dropdown
3. Select Draft, Active, Completed, etc.

**Expected Result:**

- Only matching campaigns shown
- Stats cards reflect filtered data

---

### 9. Pagination

**Steps:**

1. Import 100+ recipients
2. Scroll to bottom of recipients table

**Expected Result:**

- Pagination controls appear
- "Page X of Y" displayed
- Previous/Next buttons work

---

### 10. Campaign Progress Display

**Steps:**

1. View a campaign with some completed calls (simulated)

**Expected Result:**

- Progress bar shows correct percentage
- Stats cards show:
  - Total recipients
  - Pending calls
  - Answered calls
  - Failed calls

---

## Edge Cases to Test

### Empty States

- [ ] New workspace with no campaigns
- [ ] Campaign with no recipients
- [ ] Filter that returns no results

### Validation

- [ ] Create campaign without name → Error
- [ ] Create campaign without agent → Error
- [ ] Add recipient without phone → Error
- [ ] Import empty CSV → Error
- [ ] Import CSV without phone column → Error
- [ ] Import >10,000 recipients → Error

### Phone Number Formats

Test these formats in CSV import:

```
+14155551234      ✓ E.164 format
4155551234        ✓ Auto-prefixes +1
(415) 555-1234    ✓ Cleaned and formatted
415-555-1234      ✓ Cleaned and formatted
+44 20 7946 0958  ✓ International
```

---

## API Endpoint Testing (Optional)

Use these curl commands to test APIs directly:

```bash
# List campaigns
curl -X GET "http://localhost:3000/api/w/{workspaceSlug}/campaigns" \
  -H "Cookie: your-session-cookie"

# Create campaign
curl -X POST "http://localhost:3000/api/w/{workspaceSlug}/campaigns" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "API Test Campaign",
    "agent_id": "your-agent-uuid",
    "schedule_type": "immediate"
  }'

# Import recipients
curl -X POST "http://localhost:3000/api/w/{workspaceSlug}/campaigns/{id}/recipients" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "recipients": [
      {"phone_number": "+14155551234", "first_name": "John"},
      {"phone_number": "+14155555678", "first_name": "Jane"}
    ]
  }'
```

---

## Known Limitations (Pre-Telephony)

1. **No actual calls** - Start/Pause changes status but doesn't initiate calls
2. **No real-time updates** - Progress doesn't auto-update (requires refresh)
3. **No call outcomes** - Recipients stay in "Pending" status
4. **No telephony numbers** - Will need phone number configuration

---

## After Telephony Implementation

Once telephony is connected, verify:

- [ ] Starting campaign initiates outbound calls
- [ ] Call outcomes update in real-time
- [ ] Retry logic works for failed calls
- [ ] Business hours enforcement works
- [ ] Concurrent call limits are respected
- [ ] Conversation records are linked to recipients

---

## Reporting Issues

When reporting bugs, include:

1. Steps to reproduce
2. Expected vs actual behavior
3. Browser console errors (if any)
4. Network tab response (if API-related)
