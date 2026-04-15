# Microsoft Graph Setup Guide

## Overview

The CRM uses Microsoft Graph to scan your Outlook email and calendar to discover new contacts automatically. This guide walks you through configuring the already-registered Azure app and authenticating.

---

## Step 1: Azure App (Already Registered ✅)

The Azure app is registered. Verify the details:

- **App name:** Verdantia CRM
- **Client ID:** `89f55189-c396-4444-b4fe-b03301c26d68`
- **Tenant ID:** `8669ffe2-3fed-463c-a64b-eff1dd4a34c8`
- **Object ID:** `6d56d72e-bc69-4eea-bf25-13975188124b`

To verify: [https://portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **Verdantia CRM**

---

## Step 1b: Configure the App for Device Code Flow

1. In the app registration → **Authentication**
2. Under **Platform configurations**, click **Add a platform**
3. Select **Mobile and desktop applications**
4. Add redirect URI: `http://localhost`
5. Under **Advanced settings**, enable **Treat as public client**: **Yes**
6. Click **Save**

---

## Step 1c: Add API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add all four:
   - `Mail.Send.Shared` ← for sending as `studio@verdantia.it`
   - `Mail.Read` ← for reading email / contact discovery
   - `Calendars.Read` ← for reading calendar / meeting attendee discovery
   - `offline_access` ← for refresh tokens
4. Click **Grant admin consent** (required for single-tenant apps)
5. Confirm all four show a green **Granted** status

---

## Step 2: Authenticate

The config is pre-filled with the registered app credentials. Authenticate with:

```bash
cd ventures/website-studio/CRM
node -e "require('./adapters/graph').setupInteractive()"
```

This will:
- Print a URL and device code
- Visit the URL, enter the code, and sign in with the licensed M365 user account
- A token is saved to `config/graph_token.json`
- Token auto-refreshes when it expires

**Important:** Authenticate as the M365 user who has Full Access + Send As permissions on `studio@verdantia.it`. The Graph token is tied to this user account.

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
# Internal domain filter (emails from this domain are excluded from discovery)
export MY_EMAIL_DOMAIN=verdantia.it

# Optional: override port
export PORT=3100

# Optional: enable email draft approval
export CRM_ENABLE_DRAFT_APPROVAL=true
```

---

## Troubleshooting

**"No graph.json config found"**
→ The config should be at `config/graph.json`. Run the setup command to authenticate.

**"Not authenticated — run setup()"**
→ Run `node -e "require('./adapters/graph').setupInteractive()"` to authenticate.

**"Token refresh failed"**
→ Token expired and refresh failed. Run the setup command again.

**"Token refresh failed, trying device flow"**
→ Refresh token is invalid or revoked. Run setup again.

**Graph permissions error (403)**
→ The app permissions have not been consented by an admin. Go to Azure → API permissions → click **Grant admin consent**.

**Rate limiting (429)**
→ Discovery adapter handles backoff automatically. Discovery scans are batched — not real-time.
