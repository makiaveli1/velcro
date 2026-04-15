# Verdantia CRM — Setup Guide

## Quick Start

```bash
cd ventures/website-studio/CRM
cp config/graph.json.example config/graph.json
cp config/llm.json.example config/llm.json

# Start the API server
node server.js
# → http://localhost:3100

# Run the daily digest (after Graph + LLM are configured)
node cron/daily.js
```

---

## 1. Microsoft Graph — Contact Discovery

### Register Azure App

1. Go to [https://portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Name: `Verdantia CRM` · Account type: single tenant
3. After registering, copy the **Application (client) ID** and **Directory (tenant ID)**

### Configure Permissions

In your app → **API permissions** → **Add permission** → **Microsoft Graph** → **Delegated**:
- `offline_access`
- `Mail.Read`
- `Calendars.Read`
- `Contacts.Read`

Click **Grant admin consent**.

### Enable Device Code Flow

In **Authentication** → enable **Treat application as a public client**.

### Fill in Config

```bash
cp config/graph.json.example config/graph.json
```

Edit `config/graph.json`:
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "tenantId": "YOUR_TENANT_ID"
}
```

### Authenticate

```bash
node -e "require('./adapters/graph').setupInteractive()"
```

This prints a URL and device code. Complete the login in your browser. Token auto-refreshes.

### Set Your Email Domain

```bash
export MY_EMAIL_DOMAIN=verdantia.it
```

---

## 2. LLM — Summaries and Email Drafts

### Get a MiniMax API Key

Sign up at [https://www.minimax.io](https://www.minimax.io) and get an API key from your dashboard.

### Fill in Config

```bash
cp config/llm.json.example config/llm.json
```

Edit `config/llm.json`:
```json
{
  "model": "MiniMax-M2.7",
  "baseUrl": "https://api.minimax.io/anthropic",
  "apiKey": "YOUR_API_KEY"
}
```

Or set via environment:
```bash
export LLM_API_KEY=your_key_here
export LLM_MODEL=MiniMax-M2.7
```

---

## 3. Daily Digest Cron

The daily digest runs at **8:30 AM Mon–Fri** via OpenClaw cron (already configured). To run manually:

```bash
node cron/daily.js
```

Options:
- `--dry-run` — no changes persisted
- `--quiet-hours` — skip notification
- `--no-notify` — don't send webchat message

---

## 4. Environment Variables Summary

```bash
export MY_EMAIL_DOMAIN=verdantia.it      # Internal domain filter
export LLM_API_KEY=your_key            # LLM provider key
export LLM_MODEL=MiniMax-M2.7          # Model name
export CRM_ENABLE_DRAFT_APPROVAL=true   # Enable draft approval flow
export PORT=3100                        # API server port
```

---

## 5. Troubleshooting

**"No graph.json config found"**
→ `cp config/graph.json.example config/graph.json` then fill in credentials.

**"LLM not configured"**
→ Set `LLM_API_KEY` env var or create `config/llm.json`.

**Discovery returns 0 contacts**
→ Run `node -e "require('./adapters/graph').setupInteractive()"` to authenticate.

**Token expired**
→ Re-run the authentication command above.

**Rate limiting (429)**
→ Discovery adapter handles backoff automatically. Reduce scan frequency if needed.
