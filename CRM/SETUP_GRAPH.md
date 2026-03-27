# Microsoft Graph Setup Guide

## Overview

The CRM uses Microsoft Graph to scan your Outlook email and calendar to discover new contacts automatically. This guide walks you through Azure app registration and authentication.

---

## Step 1: Register an Azure App

1. Go to [https://portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**

2. Fill in:
   - **Name**: `Verdantia CRM`
   - **Supported account types**: "Accounts in this organizational directory only" (single tenant)
   - **Redirect URI**: leave blank for now — we'll use the device code flow

3. Click **Register**

4. Copy the **Application (client) ID** and **Directory (tenant) ID** — you'll need both

---

## Step 2: Configure API Permissions

In your new app registration:

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `offline_access` — allows token refresh
   - `Mail.Read` — read email messages and calendars
   - `Calendars.Read` — read calendar events
   - `Contacts.Read` — read contacts

4. Click **Grant admin consent** (required for single-tenant apps)

---

## Step 3: Enable Public Client Flow

The CRM uses the **device code flow** (no redirect URI needed):

1. Go to **Authentication** in your app registration
2. Under **Allow public client flows**, enable **Yes** for "Treat application as a public client"
3. Click **Save**

---

## Step 4: Copy Config

Copy the example config and fill in your credentials:

```bash
cp config/graph.json.example config/graph.json
```

Edit `config/graph.json`:

```json
{
  "clientId": "YOUR_APPLICATION_CLIENT_ID",
  "tenantId": "YOUR_DIRECTORY_TENANT_ID"
}
```

---

## Step 5: Authenticate

```bash
cd ventures/website-studio/CRM
node -e "require('./adapters/graph').setupInteractive()"
```

This will:
- Print a URL and device code
- You visit the URL, enter the code, and sign in
- A token is saved to `config/graph_token.json`

The token is valid for ~60 days and auto-refreshes after that.

---

## What gets scanned

| Source | What's extracted |
|---|---|
| Email (sent/received) | Senders and recipients from real email threads |
| Calendar events | Attendees from meetings (excluding large meetings 10+) |

## What's filtered out

| Pattern | Why |
|---|---|
| Internal company domain | Your own domain is noise |
| `noreply@`, `no-reply@` | Automated senders |
| Newsletter domains | Newsletter senders |
| Meetings with 10+ attendees | Large group meetings |
| High-volume sender patterns | Bots, automation systems |

## Required env vars

```bash
# Your email domain (for internal filtering)
export MY_EMAIL_DOMAIN=verdantia.ie

# Optional: override port
export PORT=3100

# Optional: enable email draft approval
export CRM_ENABLE_DRAFT_APPROVAL=true
```

---

## Troubleshooting

**"No graph.json config found"**
→ Copy `config/graph.json.example` to `config/graph.json` and fill in credentials.

**"Not authenticated — run setup()"**
→ Run `node -e "require('./adapters/graph').setupInteractive()"` to authenticate.

**"Token refresh failed"**
→ Token expired and refresh failed. Run the setup command again.

**Rate limiting**
→ The Graph adapter handles 429s gracefully with backoff. Discovery scans are batched.
