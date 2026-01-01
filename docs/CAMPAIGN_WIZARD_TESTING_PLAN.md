# Campaign Wizard Testing Plan

> **Feature**: Multi-Step Campaign Creation Wizard  
> **Version**: 1.0  
> **Last Updated**: January 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Test Environment Setup](#test-environment-setup)
4. [Test Cases](#test-cases)
   - [Step 1: Campaign Details](#step-1-campaign-details)
   - [Step 2: CSV Import](#step-2-csv-import)
   - [Step 3: Variable Mapping](#step-3-variable-mapping)
   - [Step 4: Business Hours Scheduler](#step-4-business-hours-scheduler)
   - [Step 5: Review & Launch](#step-5-review--launch)
5. [Integration Tests](#integration-tests)
6. [Edge Cases](#edge-cases)
7. [Performance Testing](#performance-testing)
8. [Regression Testing](#regression-testing)
9. [Sample Test Data](#sample-test-data)

---

## Overview

This document provides a comprehensive testing plan for the Campaign Wizard feature, which enables users to create outbound calling campaigns through a guided 5-step process.

### Key Features to Test

| Feature | Description |
|---------|-------------|
| Multi-step navigation | Forward/back navigation with validation |
| Agent selection | Selecting AI agent with preview |
| CSV import | Upload, parse, and map CSV columns |
| Column mapping | Map CSV columns to standard/custom fields |
| Variable injection | Dynamic variable placeholders in prompts |
| Business hours | Weekday selection + multiple time slots |
| Timezone handling | Proper timezone selection and display |
| Campaign creation | Full API integration with recipient import |

---

## Prerequisites

Before testing, ensure:

1. ✅ Development server is running (`npm run dev`)
2. ✅ Database migrations are applied
3. ✅ At least one **active AI agent** exists in the workspace
4. ✅ Test user has workspace access (member or higher)
5. ✅ Test CSV files are prepared (see [Sample Test Data](#sample-test-data))

---

## Test Environment Setup

```bash
# 1. Start the development server
cd genius365
npm run dev

# 2. Access the campaigns page
# URL: http://localhost:3000/w/{workspace-slug}/campaigns

# 3. Click "Create Campaign" to start wizard
```

---

## Test Cases

### Step 1: Campaign Details

#### TC-1.1: Required Field Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Leave campaign name empty | ❌ Error: "Campaign name is required" |
| 2 | Don't select agent | ❌ Error: "Please select an AI agent" |
| 3 | Click "Next" without filling | Form should NOT proceed |

#### TC-1.2: Campaign Name Input
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter valid name "Test Campaign" | ✅ Name accepted |
| 2 | Enter 255+ characters | ⚠️ Should truncate or show error |
| 3 | Enter special characters "Test 🎉 Campaign!" | ✅ Should accept |

#### TC-1.3: Agent Selection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open agent dropdown | List of active agents appears |
| 2 | Select an agent | Agent preview card shows with details |
| 3 | Agent has phone number | Phone number displayed in preview |
| 4 | No active agents exist | "No active agents" message with link to create |

#### TC-1.4: Description Field
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Leave description empty | ✅ Optional field, should proceed |
| 2 | Enter 2000+ characters | ⚠️ Should truncate or show error |

#### TC-1.5: Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill required fields, click "Next" | Proceeds to Step 2 |
| 2 | Click "Cancel" | Returns to campaigns list |

---

### Step 2: CSV Import

#### TC-2.1: File Upload
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click upload area | File picker opens |
| 2 | Select non-CSV file (.txt, .xlsx) | ❌ Error: "Please upload a CSV file" |
| 3 | Select valid CSV file | File parsed and column mapping shown |
| 4 | Click "Download template" | Template CSV downloads |

#### TC-2.2: CSV Parsing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload CSV with header only | ❌ Error: "at least one data row" |
| 2 | Upload CSV with 10,001+ rows | ❌ Error: "Maximum 10,000 recipients" |
| 3 | Upload CSV with quoted values | ✅ Values parsed correctly |
| 4 | Upload CSV with empty cells | ✅ Empty cells handled as null |

#### TC-2.3: Column Mapping
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | CSV with "phone" column | Auto-mapped to "Phone Number" |
| 2 | CSV with "first_name" column | Auto-mapped to "First Name" |
| 3 | CSV with "unknown_column" | Auto-mapped to "Custom Variable" |
| 4 | Change mapping dropdown | Mapping updates correctly |
| 5 | Map column to "Skip Column" | Column ignored in import |

#### TC-2.4: Column Mapping Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | No column mapped to Phone | ❌ Error: "map a column to Phone Number" |
| 2 | Multiple columns mapped to Phone | ⚠️ Should use first or warn |

#### TC-2.5: Import Preview
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete mapping, click "Apply" | Preview shows imported recipients |
| 2 | Custom variables detected | Variables shown as badges |
| 3 | Click "Clear & Re-import" | Returns to upload step |

#### TC-2.6: Skip Import (Optional)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Don't upload file, click "Next" | ✅ Proceeds with 0 recipients |
| 2 | Warning shown in Step 5 | "No recipients imported" warning |

---

### Step 3: Variable Mapping

#### TC-3.1: Standard Variables Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Step 3 | Standard variables shown (first_name, etc.) |
| 2 | Click on variable badge | Variable inserted at cursor in greeting |

#### TC-3.2: Custom Variables
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Import CSV with custom columns | Custom variables appear |
| 2 | Edit placeholder format | Placeholder updates correctly |
| 3 | Set default value | Default value saved |
| 4 | Click "Remove" on variable | Variable removed from list |
| 5 | Click "Add Custom Variable" | New empty variable row added |

#### TC-3.3: Greeting Override Toggle
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle "Customize Agent Greeting" ON | Greeting textarea appears |
| 2 | Toggle OFF | Greeting field hidden, value nulled |

#### TC-3.4: Greeting Customization
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter greeting with {{first_name}} | Variable highlighted in preview |
| 2 | Enter greeting with {{custom_var}} | Custom variable replaced in preview |
| 3 | Leave variables empty in recipient | Default value used (or empty) |

#### TC-3.5: Live Preview
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Recipients imported | Preview shows first recipient data |
| 2 | Click "Next" / "Previous" | Cycles through sample recipients |
| 3 | Variables replaced in preview | Real values shown (not placeholders) |

#### TC-3.6: System Prompt Additions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter additional context | Text saved to agent_prompt_overrides |
| 2 | Leave empty | No additional context added |

---

### Step 4: Business Hours Scheduler

#### TC-4.1: Schedule Type Selection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Start Immediately" | Card highlighted, no date picker |
| 2 | Click "Schedule for Later" | Card highlighted, date picker appears |

#### TC-4.2: Scheduled Start
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select future date/time | Date stored correctly |
| 2 | Leave date empty with "Scheduled" | ❌ Error: "Please select a start date" |
| 3 | Select past date | ⚠️ Should warn or prevent |

#### TC-4.3: Business Hours Toggle
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle ON | Day selection and time slots appear |
| 2 | Toggle OFF | Schedule hidden, 24/7 mode |

#### TC-4.4: Timezone Selection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open timezone dropdown | All timezones listed |
| 2 | Select different timezone | Timezone updates |
| 3 | Default timezone | "America/New_York" pre-selected |

#### TC-4.5: Day Selection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check "Monday" | Monday enabled with default slot |
| 2 | Uncheck "Monday" | Monday disabled, slots cleared |
| 3 | Check Saturday/Sunday | Weekend days enabled |

#### TC-4.6: Time Slot Management
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change start time to "09:00" | Time updates |
| 2 | Change end time to "12:00" | Time updates |
| 3 | Click "+" to add slot | New slot added |
| 4 | Add slot "14:00" to "18:00" | Multiple slots per day |
| 5 | Click "X" to remove slot | Slot removed |
| 6 | Try invalid time (end < start) | ⚠️ Should warn |

#### TC-4.7: Weekly Summary
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure schedule | Total hours calculated |
| 2 | Visual bar chart | Active days shown with heights |

---

### Step 5: Review & Launch

#### TC-5.1: Summary Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | All sections visible | Campaign, Agent, Recipients, Schedule shown |
| 2 | Data matches previous steps | All values correctly displayed |

#### TC-5.2: Edit Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Edit" on Campaign Details | Goes to Step 1 |
| 2 | Click "Edit" on Recipients | Goes to Step 2 |
| 3 | Click "Edit" on Variables | Goes to Step 3 |
| 4 | Click "Edit" on Schedule | Goes to Step 4 |

#### TC-5.3: Advanced Settings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change concurrent calls (1-10) | Value updates |
| 2 | Enter invalid value (0, 11) | Constrained to valid range |
| 3 | Change max retries (1-5) | Value updates |
| 4 | Change retry delay | Value updates |

#### TC-5.4: Warnings Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | No recipients imported | Warning shown |
| 2 | Agent has no phone number | Warning shown |
| 3 | Business hours enabled, no days | Warning shown |

#### TC-5.5: Campaign Creation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create Campaign" | Loading state shown |
| 2 | Success | Toast "Campaign created!", redirect to detail |
| 3 | API error | Error toast, stay on page |

---

## Integration Tests

### IT-1: Full Wizard Flow (Happy Path)
```
1. Start wizard
2. Enter "Test Campaign" + select agent
3. Import CSV with 100 recipients
4. Map columns including custom variable
5. Enable greeting override with {{first_name}}
6. Enable business hours (Mon-Fri 9-5)
7. Review and create
8. Verify: Campaign created with 100 recipients
9. Verify: Business hours config saved
10. Verify: Variable mappings saved
```

### IT-2: Minimal Flow (No Recipients)
```
1. Start wizard
2. Enter name + select agent
3. Skip CSV import
4. Skip variable mapping (no recipients)
5. Keep schedule as "Immediate"
6. Create campaign
7. Verify: Campaign created with 0 recipients
8. Verify: Can add recipients later
```

### IT-3: Large Import (10,000 Recipients)
```
1. Prepare CSV with 10,000 rows
2. Import file
3. Verify mapping step performance
4. Complete wizard
5. Verify: All recipients imported
6. Verify: No timeout or errors
```

### IT-4: Campaign Detail Page
```
1. Create campaign with wizard
2. Navigate to campaign detail
3. Verify: Business hours displayed correctly
4. Verify: Variable mappings shown as badges
5. Verify: Custom greeting indicator shown
6. Verify: Schedule summary accurate
```

---

## Edge Cases

### EC-1: Browser/Network Issues
| Scenario | Expected Behavior |
|----------|-------------------|
| Network disconnects during creation | Error toast, data preserved |
| Browser refresh mid-wizard | Data lost, start fresh |
| Multiple tabs creating campaigns | Each independent |

### EC-2: Data Edge Cases
| Scenario | Expected Behavior |
|----------|-------------------|
| CSV with Unicode characters | Parsed correctly |
| CSV with BOM marker | Handled correctly |
| Phone with special format "+1 (555) 123-4567" | Accepted |
| Empty custom variable values | Null or empty string |
| Very long phone numbers (20+ chars) | Truncated or error |

### EC-3: Concurrent Operations
| Scenario | Expected Behavior |
|----------|-------------------|
| Agent deleted while wizard open | Error on create |
| Agent deactivated while wizard open | Error on create |
| Same campaign name exists | Allowed (unique by ID) |

### EC-4: Time-Related Edge Cases
| Scenario | Expected Behavior |
|----------|-------------------|
| Overlapping time slots same day | Should warn or prevent |
| Start time = End time | Should warn |
| Scheduled time in past | Should warn |
| DST transition during campaign | Handle gracefully |

---

## Performance Testing

### PT-1: CSV Import Performance
| Recipients | Expected Time |
|------------|---------------|
| 100 | < 1 second |
| 1,000 | < 3 seconds |
| 5,000 | < 10 seconds |
| 10,000 | < 30 seconds |

### PT-2: Campaign Creation API
| Recipients | Expected Time |
|------------|---------------|
| 0 | < 500ms |
| 100 | < 1 second |
| 1,000 | < 3 seconds |
| 10,000 | < 10 seconds |

### PT-3: UI Responsiveness
| Action | Expected |
|--------|----------|
| Step navigation | < 100ms |
| Dropdown open | < 200ms |
| Variable preview update | < 100ms |

---

## Regression Testing

After any changes, verify:

- [ ] Legacy campaign creation still works (non-wizard API)
- [ ] Existing campaigns display correctly
- [ ] Campaign detail page shows old + new fields
- [ ] Campaign status changes work (start/pause)
- [ ] Recipient import dialog still works
- [ ] Add single recipient still works
- [ ] Campaign deletion still works

---

## Sample Test Data

### Basic CSV Template
```csv
phone_number,first_name,last_name,email,company
+14155551234,John,Doe,john@example.com,Acme Inc
+14155555678,Jane,Smith,jane@example.com,Tech Corp
+14155559012,Bob,Johnson,bob@example.com,Design Co
```

### CSV with Custom Variables
```csv
phone,first_name,last_name,email,company,product_interest,account_balance,signup_date
+14155551234,John,Doe,john@example.com,Acme Inc,Premium Plan,1250.00,2025-01-15
+14155555678,Jane,Smith,jane@example.com,Tech Corp,Basic Plan,500.00,2025-02-20
+14155559012,Bob,Johnson,bob@example.com,Design Co,Enterprise,5000.00,2024-12-01
```

### Large Test CSV Generator
```javascript
// Run in Node.js to generate test CSV
const fs = require('fs');
const count = 1000; // Adjust as needed

let csv = 'phone_number,first_name,last_name,email,company,amount\n';
for (let i = 1; i <= count; i++) {
  csv += `+1555000${String(i).padStart(4, '0')},User${i},Test,user${i}@test.com,Company ${i},${Math.floor(Math.random() * 10000)}\n`;
}
fs.writeFileSync('test_recipients.csv', csv);
console.log(`Generated ${count} recipients`);
```

### Edge Case CSVs

**Unicode Characters:**
```csv
phone_number,first_name,last_name,company
+14155551234,José,García,Café España
+14155555678,田中,太郎,株式会社
+14155559012,Müller,François,Société Générale
```

**Quoted Values:**
```csv
phone_number,first_name,notes
+14155551234,John,"Has comma, in value"
+14155555678,Jane,"Has ""quotes"" inside"
+14155559012,Bob,"Line 1
Line 2"
```

---

## Test Execution Checklist

### Pre-Release Testing
- [ ] All TC-* test cases passed
- [ ] All IT-* integration tests passed
- [ ] Edge cases verified
- [ ] Performance benchmarks met
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] No linting errors

### Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

## Bug Report Template

```markdown
### Bug Title
[Brief description]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- Browser: 
- OS: 
- Screen Size:

### Screenshots/Logs
[Attach if applicable]

### Severity
[ ] Critical [ ] High [ ] Medium [ ] Low
```

---

*This testing plan covers the Campaign Wizard feature implementation. Update as new features are added.*

