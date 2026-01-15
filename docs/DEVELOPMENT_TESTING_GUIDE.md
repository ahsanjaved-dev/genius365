# Campaign Development & Testing Guide

## Overview

When testing campaigns locally, you need agents with webhook URLs pointing to your local environment (via ngrok). This guide explains how to set up your development environment properly.

## The Webhook URL Problem

VAPI sends webhooks to the `serverUrl` configured on the agent. This URL is set when:

1. An agent is created
2. An agent is synced/updated

The webhook URL is determined by `NEXT_PUBLIC_APP_URL` environment variable:

- **Production**: `https://yourdomain.com` → webhooks go to production
- **Development**: Your ngrok URL → webhooks go to your local server

## Development Setup

### Step 1: Set Up ngrok

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Or download from https://ngrok.com/download

# Start ngrok tunnel (in a separate terminal)
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

### Step 2: Configure Environment Variables

In your `.env.local` file:

```env
# Set this to your ngrok URL for development
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app

# Your VAPI credentials (get from workspace settings)
VAPI_API_KEY=your-vapi-api-key
```

**Important**: Update `NEXT_PUBLIC_APP_URL` each time you restart ngrok (the URL changes).

### Step 3: Create Your Development Test Agent

1. Make sure `NEXT_PUBLIC_APP_URL` is set to your ngrok URL
2. Restart your development server (`npm run dev`)
3. Create a new agent in the UI
4. The agent will be synced to VAPI with YOUR ngrok webhook URL
5. Use this agent for all your local campaign testing

## Team Development Workflow

Each team member should have their own:

1. **ngrok URL** - Each developer runs their own ngrok tunnel
2. **Development agent(s)** - Created with their ngrok URL in `NEXT_PUBLIC_APP_URL`
3. **Test workspace** - Optional, but keeps test data separate from production

### Naming Convention

Name your development agents clearly so the team knows they're for testing:

- `[YourName] - Test Agent`
- `Dev - Campaign Testing - [YourName]`
- `Local Test Agent - [Feature]`

### Example Team Setup

| Developer | ngrok URL                          | Test Agent Name      |
| --------- | ---------------------------------- | -------------------- |
| Ahsan     | `https://ahsan-dev.ngrok-free.app` | `Ahsan - Test Agent` |
| John      | `https://john-dev.ngrok-free.app`  | `John - Test Agent`  |
| Sarah     | `https://sarah-dev.ngrok-free.app` | `Sarah - Test Agent` |

## Production Deployment Checklist

Before deploying to production:

1. ✅ **Verify `NEXT_PUBLIC_APP_URL`** is set correctly in Vercel
2. ✅ **Create production agents** (or resync existing ones in production environment)
3. ✅ **Use the webhook status checker** to verify URLs are correct
4. ✅ **Don't use development agents** for production campaigns

## Troubleshooting

### Webhooks Not Reaching Local Server

1. **Check ngrok is running**: Visit your ngrok URL in browser - should show "Tunnel Status: online"
2. **Check ngrok dashboard**: Open `http://localhost:4040` to see incoming requests
3. **Verify agent webhook URL**: Check in VAPI dashboard that the agent's `serverUrl` matches your ngrok
4. **Check Next.js logs**: Look for webhook requests in your terminal

### Agent Created with Wrong URL

If you created an agent with the wrong `NEXT_PUBLIC_APP_URL`:

1. Update `NEXT_PUBLIC_APP_URL` in `.env.local` to correct ngrok URL
2. Restart your dev server
3. Edit the agent (any field) and save to trigger a resync
4. Or delete and recreate the agent

### ngrok URL Changed

When ngrok restarts, the URL changes. You need to:

1. Update `NEXT_PUBLIC_APP_URL` in `.env.local`
2. Restart your dev server
3. Edit & save your test agent(s) to resync with new webhook URL

### Pro Tip: Static ngrok URLs

With ngrok paid plans, you can get a static subdomain that doesn't change:

```bash
ngrok http 3000 --subdomain=your-static-name
```

This eliminates the need to update `NEXT_PUBLIC_APP_URL` every restart.

## Quick Reference

| Environment | NEXT_PUBLIC_APP_URL                 | Webhook URL                                                            |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Development | `https://your-ngrok.ngrok-free.app` | `https://your-ngrok.ngrok-free.app/api/webhooks/w/{workspace_id}/vapi` |
| Production  | `https://yourdomain.com`            | `https://yourdomain.com/api/webhooks/w/{workspace_id}/vapi`            |

## API Endpoints for Development

### Check Agent Webhook Status

```
GET /api/w/{workspaceSlug}/agents/webhook-status?agentId={agentId}
```

### Resync Single Agent

```
POST /api/w/{workspaceSlug}/agents/{agentId}/sync
```

### Resync All Workspace Agents (Production Fix)

```
POST /api/w/{workspaceSlug}/agents/resync-webhooks
```

## Summary

1. **Each developer** gets their own ngrok URL + test agent(s)
2. **Production** uses production URL with production agents
3. **Never mix** - Don't use the same agent for dev and production
4. **When in doubt** - Create a new test agent with current ngrok URL
