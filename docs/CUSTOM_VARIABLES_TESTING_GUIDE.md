# Custom Variables - Complete Testing Guide

## Overview

This guide provides a comprehensive testing journey for the Custom Variables feature in Genius365. Follow each step carefully to verify the complete functionality.

---

## 🗺️ User Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOM VARIABLES USER JOURNEY                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  PHASE 1: SETUP                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  WORKSPACE SETTINGS                                                           │   │
│  │  /w/{workspace}/settings                                                      │   │
│  │                                                                               │   │
│  │  1. Navigate to Settings                                                      │   │
│  │  2. Scroll to "Custom Variables" section                                      │   │
│  │  3. View Standard Variables (locked)                                          │   │
│  │  4. Add Custom Variables (editable)                                           │   │
│  │                                                                               │   │
│  │  Standard Variables:                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ 🔒 first_name  │ 🔒 last_name  │ 🔒 email  │ 🔒 company  │ 🔒 phone    │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                               │   │
│  │  Custom Variables (you create):                                               │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ ✏️ product_interest  │ ✏️ appointment_date  │ ✏️ account_balance       │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                               │
│                                      ▼                                               │
│  PHASE 2: AGENT CREATION                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  AGENT WIZARD                                                                 │   │
│  │  /w/{workspace}/agents/new                                                    │   │
│  │                                                                               │   │
│  │  Step 1: Basic Info → Step 2: Prompts (Variables shown here)                  │   │
│  │                                                                               │   │
│  │  Available Variables Panel:                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ [+ first_name] [+ last_name] [+ company] [+ product_interest] [+ ...]   │ │   │
│  │  │                                                                         │ │   │
│  │  │ Click any variable to insert {{variable_name}} into system prompt       │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                               │   │
│  │  System Prompt Editor:                                                        │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ Hello {{first_name}}! I'm calling from {{company}} about your           │ │   │
│  │  │ interest in {{product_interest}}. Your appointment is scheduled for     │ │   │
│  │  │ {{appointment_date}}...                                                 │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                               │
│                                      ▼                                               │
│  PHASE 3: CAMPAIGN CREATION                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  CAMPAIGN WIZARD                                                              │   │
│  │  /w/{workspace}/campaigns/new                                                 │   │
│  │                                                                               │   │
│  │  Step 1: Details → Step 2: Import CSV → Step 3: Variables → Step 4: Schedule │   │
│  │                                                                               │   │
│  │  Step 3 - Variables Review:                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ STANDARD VARIABLES:                                                     │ │   │
│  │  │ {{first_name}} ✓  {{last_name}}  {{email}}  {{company}} ✓  {{phone}}   │ │   │
│  │  │                                                                         │ │   │
│  │  │ WORKSPACE VARIABLES:                                                    │ │   │
│  │  │ {{product_interest}} ✓  {{appointment_date}} ✓  {{account_balance}}    │ │   │
│  │  │                                                                         │ │   │
│  │  │ CSV VARIABLES (detected from import):                                   │ │   │
│  │  │ {{custom_notes}} ★  {{referral_source}} ★                              │ │   │
│  │  │                                                                         │ │   │
│  │  │ ✓ = Used in agent prompt    ★ = From CSV only                          │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                               │
│                                      ▼                                               │
│  PHASE 4: RUNTIME                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  CALL EXECUTION                                                               │   │
│  │                                                                               │   │
│  │  CSV Row Data:                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ first_name: "John"                                                      │ │   │
│  │  │ company: "Acme Corp"                                                    │ │   │
│  │  │ product_interest: "Solar Panels"                                        │ │   │
│  │  │ appointment_date: "January 25, 2026 at 2:00 PM"                         │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                               │   │
│  │  AI Agent Speaks:                                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ "Hello John! I'm calling from Acme Corp about your interest in          │ │   │
│  │  │  Solar Panels. Your appointment is scheduled for January 25, 2026       │ │   │
│  │  │  at 2:00 PM..."                                                         │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Test Cases

### Phase 1: Workspace Settings - Custom Variables

#### TC-001: View Standard Variables
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/w/{workspace}/settings` | Settings page loads |
| 2 | Scroll to "Custom Variables" section | Section is visible |
| 3 | Observe "Standard Variables" subsection | 5 standard variables shown: `first_name`, `last_name`, `email`, `company`, `phone_number` |
| 4 | Try to edit/delete standard variables | Should NOT be possible (locked icon visible) |

#### TC-002: Add Custom Variable
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Custom Variables section, find "Add New Custom Variable" form | Form visible with fields: Name, Description, Default Value |
| 2 | Enter variable name: `product_interest` | Name field accepts input, auto-converts to snake_case |
| 3 | Enter description: `The product the customer is interested in` | Description field accepts input |
| 4 | Enter default value: `General Inquiry` | Default value field accepts input |
| 5 | Toggle "Required Variable" ON | Switch toggles |
| 6 | Select category: `Business` | Dropdown selection works |
| 7 | Click "Add Variable" button | Variable appears in "Your Custom Variables" list |
| 8 | Verify toast notification | "Custom variable added!" toast appears |

#### TC-003: Edit Custom Variable
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find an existing custom variable in the list | Variable row visible |
| 2 | Click on the variable name | Edit mode activates (inline editing) |
| 3 | Change the description | Description updates |
| 4 | Click outside or blur | Changes saved automatically |
| 5 | Verify toast notification | "Custom variable updated!" toast appears |

#### TC-004: Delete Custom Variable
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find an existing custom variable | Variable row visible |
| 2 | Click the trash icon | Confirmation dialog appears |
| 3 | Click "Delete" in dialog | Variable removed from list |
| 4 | Verify toast notification | "Custom variable deleted!" toast appears |

#### TC-005: Duplicate Variable Name Prevention
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add a variable named `product_interest` | Variable created |
| 2 | Try to add another variable named `product_interest` | Error: "A variable with this name already exists" |

---

### Phase 2: Agent Wizard - Variable Integration

#### TC-006: View Available Variables in Agent Wizard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/w/{workspace}/agents/new` | Agent wizard opens |
| 2 | Complete Step 1 (Basic Info) | Proceed to Step 2 |
| 3 | In Step 2, find "Available Variables" section | Section visible below System Prompt |
| 4 | Verify standard variables are shown | `first_name`, `last_name`, `email`, `company`, `phone_number` buttons visible |
| 5 | Verify workspace custom variables are shown | Custom variables from settings appear (e.g., `product_interest`) |

#### TC-007: Insert Variable into System Prompt
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Agent Wizard Step 2, click `first_name` variable button | `{{first_name}}` inserted at end of system prompt |
| 2 | Verify toast notification | "{{first_name}} inserted into system prompt" toast appears |
| 3 | Click `product_interest` variable button | `{{product_interest}}` inserted at end of system prompt |

#### TC-008: Empty Variables State
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Delete all custom variables from workspace settings | No custom variables exist |
| 2 | Open Agent Wizard, go to Step 2 | "Available Variables" shows only standard variables |
| 3 | Verify message | "Define custom variables in Workspace Settings to use them here" text visible |

---

### Phase 3: Campaign Wizard - Variables Step

#### TC-009: Campaign Wizard Shows Variables Step
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/w/{workspace}/campaigns/new` | Campaign wizard opens |
| 2 | Complete Step 1 (Details) - select an agent | Proceed to Step 2 |
| 3 | Complete Step 2 (Import Recipients) - upload CSV | Proceed to Step 3 |
| 4 | Verify Step 3 is "Variables" | Variables step visible with icon |
| 5 | Verify step indicator shows 5 steps | Progress bar shows 5 steps total |

#### TC-010: Variables Step Shows All Variable Types
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Campaign Wizard Step 3 (Variables) | Variables step content loads |
| 2 | Verify "Standard Variables" section | Shows: `first_name`, `last_name`, `email`, `company`, `phone_number` |
| 3 | Verify "Workspace Variables" section | Shows custom variables from workspace settings |
| 4 | Verify "CSV Variables" section | Shows additional columns from uploaded CSV |
| 5 | Verify "Variables Used in Agent Prompts" summary | Shows which variables are actually used in the selected agent's prompts |

#### TC-011: Variable Usage Indicators
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select an agent that uses `{{first_name}}` and `{{product_interest}}` in its prompt | Agent selected |
| 2 | Go to Variables step | Variables step loads |
| 3 | Verify `first_name` has checkmark (✓) | Indicates variable is used in agent prompt |
| 4 | Verify `product_interest` has checkmark (✓) | Indicates variable is used in agent prompt |
| 5 | Verify unused variables don't have checkmark | No checkmark on unused variables |

---

### Phase 4: End-to-End Flow

#### TC-012: Complete User Journey
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | **SETTINGS**: Add custom variables: `product_interest`, `appointment_date` | Variables created |
| 2 | **AGENT**: Create agent with prompt using `{{first_name}}`, `{{company}}`, `{{product_interest}}`, `{{appointment_date}}` | Agent created |
| 3 | **CAMPAIGN**: Create campaign, select agent, upload CSV with matching columns | Campaign wizard progresses |
| 4 | **VARIABLES STEP**: Verify all variables shown with correct indicators | Variables displayed correctly |
| 5 | **REVIEW**: Complete campaign creation | Campaign created |
| 6 | **VERIFY**: Check that campaign has correct variable mappings | Variables ready for substitution |

---

## 📝 Sample Data

### Sample Custom Variables to Add

Add these variables in Workspace Settings:

| Variable Name | Description | Default Value | Required | Category |
|--------------|-------------|---------------|----------|----------|
| `product_interest` | The product the customer is interested in | General Inquiry | Yes | Business |
| `appointment_date` | Scheduled appointment date and time | TBD | No | Contact |
| `account_balance` | Customer's current account balance | $0.00 | No | Business |
| `referral_source` | How the customer heard about us | Direct | No | Custom |
| `preferred_time` | Customer's preferred contact time | Morning | No | Contact |

### Sample System Prompt with Variables

```
You are a professional sales representative for {{company}}. You are calling {{first_name}} {{last_name}} 
regarding their interest in {{product_interest}}.

Key Information:
- Customer Name: {{first_name}} {{last_name}}
- Company: {{company}}
- Product Interest: {{product_interest}}
- Appointment: {{appointment_date}}
- Account Balance: {{account_balance}}
- Referral Source: {{referral_source}}
- Preferred Contact Time: {{preferred_time}}

Your Goals:
1. Greet the customer warmly using their first name
2. Confirm their interest in {{product_interest}}
3. If they have an appointment, remind them: {{appointment_date}}
4. Answer any questions about our products
5. If appropriate, schedule a follow-up or close the sale

Tone: Professional, friendly, and helpful. Personalize the conversation using the customer's name.
```

### Sample Agent Greeting with Variables

```
Hello {{first_name}}! This is Alex from {{company}}. I'm calling about your recent inquiry 
regarding {{product_interest}}. Do you have a few minutes to chat?
```

### Sample CSV File

Save this as `campaign_test_data.csv`:

```csv
phone_number,first_name,last_name,email,company,product_interest,appointment_date,account_balance,referral_source,preferred_time,custom_notes
+14155551001,John,Smith,john.smith@example.com,Acme Corp,Solar Panels,January 25 2026 at 2:00 PM,$1250.00,Google Search,Morning,Interested in residential installation
+14155551002,Sarah,Johnson,sarah.j@techstart.io,TechStart Inc,Home Battery,January 26 2026 at 10:00 AM,$0.00,Referral,Afternoon,Referred by John Smith
+14155551003,Michael,Williams,m.williams@globaltech.com,GlobalTech,EV Charger,January 27 2026 at 3:30 PM,$500.00,Facebook Ad,Evening,Has Tesla Model 3
+14155551004,Emily,Brown,emily.brown@innovate.co,Innovate Co,Solar + Battery Bundle,January 28 2026 at 11:00 AM,$2000.00,LinkedIn,Morning,Commercial property owner
+14155551005,David,Davis,david.d@startup.io,StartupIO,Solar Panels,January 29 2026 at 4:00 PM,$750.00,Trade Show,Afternoon,Met at SolarCon 2025
+14155551006,Jennifer,Miller,jen.miller@enterprise.com,Enterprise Ltd,Home Battery,January 30 2026 at 9:00 AM,$1500.00,Email Campaign,Morning,Existing solar customer
+14155551007,Robert,Wilson,r.wilson@smallbiz.net,SmallBiz Net,EV Charger,January 31 2026 at 1:00 PM,$0.00,Website,Afternoon,New homeowner
+14155551008,Lisa,Moore,lisa.m@consulting.co,Consulting Co,Solar + Battery Bundle,February 1 2026 at 2:30 PM,$3000.00,Partner Referral,Evening,Multiple properties
+14155551009,James,Taylor,james.t@retail.com,Retail Corp,Solar Panels,February 2 2026 at 10:30 AM,$800.00,Google Search,Morning,Retail store owner
+14155551010,Amanda,Anderson,amanda.a@health.org,HealthOrg,Home Battery,February 3 2026 at 3:00 PM,$1200.00,Conference,Afternoon,Healthcare facility
```

---

## 🔍 Debugging Checklist

If variables don't appear correctly:

### In Workspace Settings
- [ ] Check browser console for API errors
- [ ] Verify `GET /api/w/{slug}/settings` returns workspace with `settings.custom_variables`
- [ ] Check if variables are being saved (refresh page and verify persistence)

### In Agent Wizard
- [ ] Verify `useWorkspaceCustomVariables()` hook is returning data
- [ ] Check if workspace settings are loaded before rendering variables
- [ ] Verify the agent wizard is on Step 2 (Prompts step)

### In Campaign Wizard
- [ ] Verify Step 3 is the Variables step (check step number)
- [ ] Check if `StepVariables` component is imported and rendered
- [ ] Verify `useWorkspaceCustomVariables()` hook is returning data
- [ ] Check if CSV columns are being parsed correctly
- [ ] Verify selected agent has a system prompt with variable placeholders

### API Verification
```bash
# Get workspace settings (should include custom_variables)
curl -X GET "http://localhost:3000/api/w/{workspace-slug}/settings" \
  -H "Authorization: Bearer {token}"

# Add a custom variable
curl -X PATCH "http://localhost:3000/api/w/{workspace-slug}/settings" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "custom_variable_operation": {
      "action": "add",
      "variable": {
        "name": "product_interest",
        "description": "The product the customer is interested in",
        "default_value": "General Inquiry",
        "is_required": true,
        "category": "business"
      }
    }
  }'
```

---

## ✅ Test Completion Checklist

- [ ] **TC-001**: View Standard Variables
- [ ] **TC-002**: Add Custom Variable
- [ ] **TC-003**: Edit Custom Variable
- [ ] **TC-004**: Delete Custom Variable
- [ ] **TC-005**: Duplicate Variable Name Prevention
- [ ] **TC-006**: View Available Variables in Agent Wizard
- [ ] **TC-007**: Insert Variable into System Prompt
- [ ] **TC-008**: Empty Variables State
- [ ] **TC-009**: Campaign Wizard Shows Variables Step
- [ ] **TC-010**: Variables Step Shows All Variable Types
- [ ] **TC-011**: Variable Usage Indicators
- [ ] **TC-012**: Complete User Journey

---

## 📊 Expected Database State After Testing

After completing all tests, your workspace should have:

**Workspace Settings (`workspaces.settings` JSONB):**
```json
{
  "timezone": "America/New_York",
  "custom_variables": [
    {
      "id": "uuid-1",
      "name": "product_interest",
      "description": "The product the customer is interested in",
      "default_value": "General Inquiry",
      "is_required": true,
      "category": "business",
      "is_standard": false,
      "created_at": "2026-01-21T..."
    },
    {
      "id": "uuid-2",
      "name": "appointment_date",
      "description": "Scheduled appointment date and time",
      "default_value": "TBD",
      "is_required": false,
      "category": "contact",
      "is_standard": false,
      "created_at": "2026-01-21T..."
    }
  ]
}
```

**Agent Config (`ai_agents.config` JSONB):**
```json
{
  "system_prompt": "You are a professional sales representative for {{company}}. You are calling {{first_name}}...",
  "first_message": "Hello {{first_name}}! This is Alex from {{company}}...",
  "voice_id": "...",
  "language": "en"
}
```

---

## 🎯 Success Criteria

The Custom Variables feature is working correctly when:

1. ✅ Standard variables are visible and locked in workspace settings
2. ✅ Custom variables can be added, edited, and deleted
3. ✅ Agent wizard shows all available variables (standard + custom)
4. ✅ Variables can be inserted into agent prompts with one click
5. ✅ Campaign wizard has a dedicated Variables step (Step 3 of 5)
6. ✅ Variables step shows standard, workspace, and CSV variables
7. ✅ Variables used in agent prompts are highlighted with checkmarks
8. ✅ The complete flow from settings → agent → campaign works end-to-end

