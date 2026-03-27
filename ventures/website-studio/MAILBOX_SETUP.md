# Mailbox Readiness Checklist
_`studio@verdantia.it` — shared mailbox for outbound outreach_

---

## Purpose

Email outreach via the Website Studio system uses the shared mailbox `studio@verdantia.it` sent through **Microsoft Graph API** (not Gmail, not individual user mailbox).

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

Complete every item before any outreach is sent.

### 1. Mailbox Exists
- [ ] `studio@verdantia.it` exists in Microsoft 365 / Exchange Online
- [ ] Verified by logging into [admin.microsoft.com](https://admin.microsoft.com) → Teams & groups → Shared mailboxes
- **Evidence:** Screenshot of mailbox in M365 admin portal

### 2. Full Access Permission Granted
- [ ] A licensed M365 user account has **Full Access** permission to `studio@verdantia.it`
- [ ] This is the account whose credentials are used for Graph API authentication
- **Evidence:** Screenshot of mailbox permissions in M365 admin showing Full Access grant

### 3. Send As Permission Granted
- [ ] The same user account has **Send As** permission on `studio@verdantia.it`
- [ ] This allows the API to send FROM `studio@verdantia.it` without using delegated send
- **Evidence:** Screenshot of Send As permissions in M365 Exchange admin

### 4. Send As Verified (Manual Test)
- [ ] Logged into Outlook (OWA or desktop) as the licensed user
- [ ] Successfully sent a test email from `studio@verdantia.it` to a personal address
- [ ] The email shows `studio@verdantia.it` as the From address — NOT the user's personal address
- **Evidence:** Test email received at personal inbox, From field confirmed as `studio@verdantia.it`

### 5. Graph API Path Confirmed
- [ ] Azure app registered with `Mail.Send` permission on Microsoft Graph
- [ ] App has been consented to by the tenant admin
- [ ] `clientId`, `tenantId`, and `clientSecret` stored in `CRM/config/graph.json`
- [ ] Token acquisition tested successfully (`node -e "require('./adapters/graph').setupInteractive()"`)
- [ ] **Note:** Shared-mailbox Send As via Graph requires specific permission configuration — see Appendix A below
- **Evidence:** API test call to `POST /me/sendMail` using `studio@verdantia.it` as From succeeds with HTTP 202

### 6. DNS / Domain Verification
- [ ] `verdantia.it` domain is verified in Microsoft 365
- [ ] SPF, DKIM, and DMARC records are configured for the domain
- [ ] `studio@verdantia.it` can receive replies (not bounced)

### 7. Outreach Template Verified
- [ ] A test pitch has been drafted using `studio@verdantia.it` as From
- [ ] Test email passes spam score checks (use [mail-tester.com](https://www.mail-tester.com) or similar)
- [ ] From/Reply-To is correctly set to `studio@verdantia.it`

### 8. Nero Sign-Off
- [ ] Nero has reviewed all evidence above
- [ ] Nero has explicitly written "Outbound approved" in this document
- [ ] Date of approval recorded below

---

## Nero Sign-Off

```
Outbound approved: NO
Approved by: ___________________
Date: ___________________________
Notes: _________________________
```

---

## What Remains Blocked Until Checklist Is Complete

| Action | Status |
|---|---|
| Any outreach send via Graph API | 🔴 Blocked |
| Test sends to real recipients | 🔴 Blocked |
| Mercury draft deployment | 🔴 Blocked |
| Round 1 first outreach | 🔴 Blocked |
| Mailbox existence check | 🔴 Pending |
| Send As permission test | 🔴 Pending |
| Graph API token acquisition | 🔴 Pending |
| First real send | 🔴 Blocked |

---

## After Checklist Is Complete

Once all items are checked and Nero has signed off:

1. Update the sign-off section above with date and name
2. Update OUTREACH_POLICY.md: remove or update the outbound block note
3. Notify that Round 1 outreach is cleared to begin
4. First send should be to a controlled test address before any real leads

---

## Appendix A — Microsoft Graph: Sending As a Shared Mailbox

When sending via Microsoft Graph as a shared mailbox, the API call must use the shared mailbox's SMTP address as the `from` property. The authenticated app identity must have **Send As** permission on the shared mailbox.

**Key requirements:**
1. The Azure AD app needs `Mail.Send` permission (not `Mail.ReadWrite` — read is separate)
2. The app needs `Delegated` token type with `Mail.Send` scope, OR `Application` token type with `Mail.Send` application permission
3. For shared mailbox Send As: the `from` field in the Graph payload must be the shared mailbox SMTP address
4. The app must be consented to by a tenant admin

**Relevant Graph endpoint:**
```
POST https://graph.microsoft.com/v1.0/me/sendMail
```
With `from` field set to `studio@verdantia.it`.

**If Graph shared-mailbox sending is not available** in the current tenant configuration:
- Use a licensed user mailbox as the sending identity
- Update this checklist and OUTREACH_POLICY.md to reflect the actual sending identity
- Do not attempt to work around the limitation with impersonation without legal/IT approval

---

## Sending Method: Graph API Only

**Gmail API is not used for this system.** All outbound email uses Microsoft Graph API against the `studio@verdantia.it` shared mailbox.

If at any point Graph is not available or is rate-limited, outreach pauses — not fallback to personal Gmail or another method.

---

_Last updated: 2026-03-27 — Nero / Website Studio system_
