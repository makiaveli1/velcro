# Mailbox Readiness Checklist
_`studio@verdantia.it` — shared mailbox for outbound outreach_

---

## Purpose

Email outreach via the Website Studio system uses the shared mailbox `studio@verdantia.it` sent through **Microsoft Graph API** (not Gmail, not individual user mailbox). The shared mailbox is pre-existing; this checklist covers the remaining setup.

**Outbound is hard-blocked until every item on this checklist is complete.** No outreach is sent, test or otherwise, until the checklist is fully satisfied.

---

## The Hard Gate

```
OUTBOUND STATUS: 🔴 BLOCKED
Mailbox: studio@verdantia.it
Until: All items below are checked off
```

This status does not change until Nero personally verifies and signs off.

---

## Pre-Flight Checklist

### 1. Mailbox Exists ✅ (Pre-Confirmed)
- [x] `studio@verdantia.it` shared mailbox exists in Microsoft 365 / Exchange Online
- [x] Verified by checking [admin.microsoft.com](https://admin.microsoft.com) → Teams & groups → Shared mailboxes
- **Note:** This item is pre-confirmed. The mailbox exists. Setup begins from this point.

### 2. Full Access Permission Granted
- [ ] A licensed M365 user account has **Full Access** permission to `studio@verdantia.it`
- [ ] This is the account whose credentials are used for Graph API authentication
- **Evidence:** Screenshot of mailbox permissions in M365 admin showing Full Access grant to the user account

### 3. Send As Permission Granted
- [ ] The same user account has **Send As** permission on `studio@verdantia.it`
- [ ] This is distinct from Full Access — both must be granted separately
- [ ] In M365 Exchange Admin: recipient permissions → send as
- **Evidence:** Screenshot of Send As permissions in Exchange admin showing grant to the user account

### 4. Send As Verified (Manual OWA Test)
- [x] Logged into Outlook on the web (OWA) as the licensed user
- [x] Opened the shared mailbox: in OWA, right-click the folder pane → Open another mailbox → enter `studio@verdantia.it`
- [x] Sent a test email from `studio@verdantia.it` to a personal address
- [x] The email received shows `studio@verdantia.it` as the From address — confirmed by user (2026-03-28 00:22)
- **Evidence:** User confirmed — OWA test works ✅

### 5. Azure App Registered (Graph API)
- [x] Azure AD app registered in the tenant
- [x] Redirect URI configured (device code flow — `http://localhost` is sufficient)
- [x] **Correct permission:** `Mail.Send.Shared` — Delegated (not `Mail.Send`)
- [x] `offline_access` also granted for token refresh
- [x] Permissions consented to by a tenant admin
- **Evidence:**
  - App name: `Verdantia CRM`
  - Client ID: `89f55189-c396-4444-b4fe-b03301c26d68`
  - Tenant ID: `8669ffe2-3fed-463c-a64b-eff1dd4a34c8`
  - Object ID: `6d56d72e-bc69-4eea-bf25-13975188124b`
  - Permissions: `Mail.Send.Shared`, `Mail.Read`, `Calendars.Read`, `offline_access` (Delegated)
  - ✅ All permissions consented and granted

### 6. Graph Credentials Stored
- [x] `clientId`, `tenantId` stored in `CRM/config/graph.json`
- [x] Token acquisition tested: device code flow completed successfully
- [x] Token saved to `CRM/config/graph_token.json` — expires 2026-03-28 01:32 GMT
- [ ] Test call: `POST /me/sendMail` with `from: studio@verdantia.it` returns HTTP 202
  - ⚠️ **Send As permission from Exchange Admin must be confirmed before this will work**
- **Evidence:**
  - Authenticated as: `oluwagbemi@verdantia.it` (confirmed via `/me` endpoint)
  - Messages accessible: ✅
  - Calendar accessible: ✅
  - Token expires: 01:32 GMT

### 7. Sent Items Path Confirmed
- [ ] Understand the Sent Items behavior for the chosen sending method (see below)
- [ ] Test sent item appears where expected after the Graph API test call
- [ ] A process exists to retrieve sent outreach if needed
- **Recommendation:** See the **Sent Items Decision** section below — this is a deliberate architectural choice

### 8. DNS / Domain Verification
- [ ] `verdantia.it` domain is verified in Microsoft 365
- [ ] SPF, DKIM, and DMARC records are configured correctly
- [ ] `studio@verdantia.it` can receive replies (not hard-bounced on inbound)

### 9. Outreach Template Verified
- [ ] A real pitch draft sent via the Graph API test call above
- [ ] Test email passes a spam score check ([mail-tester.com](https://www.mail-tester.com) or similar)
- [ ] From/Reply-To is correctly set to `studio@verdantia.it`
- [ ] Signature is accurate: name, role, `studio@verdantia.it`

### 10. Nero Sign-Off
- [ ] Nero has reviewed all evidence items above
- [ ] Nero has explicitly written "Outbound approved: YES" in the sign-off block below
- [ ] Date of approval recorded

---

## Sent Items Decision

When sending via Graph API as a shared mailbox, sent items handling is a deliberate choice.

### How it works

| Sending approach | Where sent item is saved |
|---|---|
| Graph `/me/sendMail` as user (no special config) | User's own Sent Items — **not** the shared mailbox |
| Graph with `saveToSentItems: true` parameter | User's own Sent Items (parameter does not redirect to shared mailbox) |
| Write to shared mailbox Sent Items directly after send | Shared mailbox Sent Items — correct location |

### The issue

The Graph `/me/sendMail` endpoint always writes to the **authenticated user's Sent Items folder**, even when sending as a shared mailbox via the `from` field. There is no native Graph parameter to redirect sent items to the shared mailbox's folder.

For Website Studio, this means outreach sent "from" `studio@verdantia.it` would have sent items land in the **user's Sent Items**, not in the shared mailbox. This creates a traceability gap: outreach history is siloed in the individual account.

### Recommendation for Website Studio: User Sent Items with a CRM copy

**Use the user account's Sent Items as the record of sent outreach, and maintain a CRM copy as the authoritative log.**

Rationale:
- The CRM already tracks outreach sends via `email_drafts` table and `interactions` table — these are the primary record
- Sent items in a shared mailbox are primarily useful for multi-person access, not solo operation
- Adding `MailboxSettings.ReadWrite` to change Sent Items behavior adds unnecessary scope for v1
- The CRM interaction log is more searchable and structured than hunting through mailbox folders

**If the shared mailbox Sent Items is preferred** (e.g., if multiple people need access to sent outreach without a shared CRM): after each send via Graph, make a secondary `PATCH /me/mailFolders/{id}/messages/{id}` call to copy the sent item to the shared mailbox's Sent Items folder. This requires `MailboxSettings.ReadWrite` permission. Raise as a future enhancement.

### Decision recorded here:

```
SENT ITEMS APPROACH: User Sent Items + CRM copy (v1)
Shared mailbox Sent Items sync: Not implemented in v1
Reviewed: _______________
```

---

## Graph API: Correct Permission Model

### The mistake to avoid

`Mail.Send` (Delegated) alone does **not** allow sending as a shared mailbox. `Mail.Send` allows a user to send from their own mailbox. To send *as* a shared mailbox, the correct permission is:

### `Mail.Send.Shared` (Delegated)

This is the specific delegated permission that authorizes sending on behalf of a shared mailbox the user has been granted access to.

**Required combination for shared mailbox sending:**

```
1. Azure AD app registered
2. Delegated permissions:
   - Mail.Send.Shared     ← allows sending AS the shared mailbox (from field)
   - offline_access       ← allows token refresh without re-authentication
3. The user account must ALSO have:
   - Full Access permission to the shared mailbox (Exchange-level, not Graph)
   - Send As permission to the shared mailbox (Exchange-level, not Graph)
```

**The Exchange-level permissions (Full Access + Send As) are administered in M365/Exchange Admin, not in Azure AD. Both are required.**

### App permission vs. delegated permission

| Type | What it means | Use case |
|---|---|---|
| **Delegated** | App acts on behalf of a signed-in user | Website Studio: use this |
| **Application** | App acts as itself (no user) | Requires app-only auth; more complex |

Website Studio uses **Delegated** permissions. The user authenticates interactively (device code flow); the app sends on their behalf with the shared mailbox identity.

### Endpoint and payload

```
POST https://graph.microsoft.com/v1.0/me/sendMail

{
  "message": {
    "from": { "address": "studio@verdantia.it" },
    "toRecipients": [{ "emailAddress": { "address": "recipient@example.com" } }],
    "subject": "...",
    "body": { "contentType": "HTML", "content": "..." }
  },
  "saveToSentItems": false   ← always false; CRM is the record
}
```

**Note on `saveToSentItems`:** Even when set to `true`, this saves to the user's Sent Items, not the shared mailbox. For v1, always set to `false` and rely on the CRM as the sent item record.

---

## Nero Sign-Off

```
Outbound approved: NO
Sent Items approach: User Sent Items + CRM copy (v1)
Approved by: ___________________
Date: ___________________________
Notes: _________________________
```

---

## What Remains Blocked Until Checklist Is Complete

| Action | Status |
|---|---|
| Any outreach send via Graph API | 🔴 Blocked — Send As API test not yet run |
| Test sends to real recipients | 🔴 Blocked |
| Mercury draft deployment | 🔴 Blocked |
| Round 1 first outreach | 🔴 Blocked |
| Full Access permission (Exchange) | ✅ Confirmed done |
| Send As permission (Exchange) | ✅ Confirmed done |
| Manual Send As test (OWA) | ✅ Confirmed — 2026-03-28 00:22 |
| Azure app `Mail.Send.Shared` | ✅ Granted |
| Graph token acquired | ✅ Active — oluwagbemi@verdantia.it |
| Send As API test | 🔴 Pending — needs Graph API send test |
| DNS/domain | 🔴 Pending |
| Outreach template | 🔴 Pending |

---

## After Checklist Is Complete

Once all items are checked and Nero has signed off:

1. Update the sign-off section above with date and name
2. Outreach is cleared to begin
3. First send: test to a controlled personal address, confirm delivery and From header
4. Monitor for 3–5 sends, confirm Sent Items / CRM logging is accurate
5. Update OUTREACH_POLICY.md if any policy language references changed as a result of this setup

---

## Sending Method: Graph API Only

**Gmail API is not used for this system.** All outbound email uses Microsoft Graph API against the `studio@verdantia.it` shared mailbox.

If Graph is unavailable or rate-limited at any point: outreach pauses. No fallback to personal Gmail, SMTP relay, or other sending methods without explicit Nero approval and documentation update.

---

_Last updated: 2026-03-27 (evening patch) — Nero / Website Studio system_
