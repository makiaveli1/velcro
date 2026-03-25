# Website Studio CRM — Master Index

_Last updated: 2026-03-25 (Brian McGarry: APPROVAL_QUEUED | CPK + Larkfield: verified, parked pending channel policy)_

---

## Active Leads

| Lead Name | Category | Score | Stage | Next Action | Last Activity |
|---|---|---|---|---|---|
| Brian McGarry Plumber | Plumber | 44 | **APPROVAL_QUEUED** | Awaiting Nero approval for outreach | 2026-03-25 |
| CPK Heating & Plumbing | Plumber | 42 | MONITOR | Irish entity confirmed active. Email absent (phone-only). Awaiting channel policy decision. | 2026-03-25 |
| Larkfield Plumbing Contractors Ltd | Plumber | 41 | MONITOR | Irish Ltd confirmed. Phone-only contact. No email. Parked — no email outreach route. | 2026-03-25 |
| Emergency Plumbers Dublin | Plumber | 40 | MONITOR | GBP verification + website audit needed | 2026-03-25 |
| Active Electrical | Electrician | 39 | MONITOR | GBP verification + contact details | 2026-03-25 |
| Donard Electrical Services Ltd | Electrician | 37 | MONITOR | GBP verification + contact details | 2026-03-25 |
| Church Heating & Plumbing Ltd | Plumber | 37 | MONITOR | GBP verification + contact details | 2026-03-25 |
| 1-2-1 Plumbing & Heating | Plumber | 37 | MONITOR | GBP verification + contact details | 2026-03-25 |
| Niall O'Connor Electrical Services | Electrician | 37 | MONITOR | Contact details + GBP verification | 2026-03-25 |
| North Dublin Plumbers | Plumber | 37 | MONITOR | GBP verification + legitimacy check | 2026-03-25 |
| Kavanagh Heating & Plumbing | Plumber | 36 | MONITOR | Website status + contact verification | 2026-03-25 |
| First Choice Heating & Plumbing | Plumber | TBC | RESEARCHING | Website check + score | 2026-03-25 |

---

## Pipeline Stage Counts

| Stage | Count |
|---|---|
| LEAD_FOUND | 0 |
| LEAD_QUALIFIED | 0 |
| BUSINESS_RESEARCHED | 0 |
| MONITOR | 9 |
| WEBSITE_AUDITED / NO_SITE_BRIEF_CREATED | 0 |
| CONCEPT_DIRECTION_CREATED | 0 |
| PITCH_DRAFTED | 0 |
| APPROVAL_QUEUED | **1** |
| APPROVED | 0 |
| OUTREACH_SENT | 0 |
| FOLLOW_UP_PENDING | 0 |
| WON | 0 |
| LOST / NO_RESPONSE | 0 |

---

## Metrics (Current Campaign — Dublin Trades Round 1)

| Metric | Count | Notes |
|---|---|---|
| Total leads found | 12 | Discovery complete |
| Total leads qualified (AUDIT-WORTHY+) | 3 | Brian McGarry, CPK, Larkfield |
| Total leads MONITOR | 9 | Awaiting further research or channel policy change |
| Total leads APPROVAL_QUEUED | 1 | Brian McGarry — awaiting Nero approval |
| Total leads APPROVED | 0 | — |
| Total leads outreach sent | 0 | No outreach yet |
| Response rate | N/A | |
| Won deals | 0 | |
| Active deals | 0 | |

---

## Outreach Sends — Round 1

| Lead | Send Date | Channel | Touch | Outcome | Notes |
|---|---|---|---|---|---|
| _(none yet)_ | | | | | |

---

## Suppression List

See: `SUPPRESSION.md`

---

## Parked Leads

| Lead | Reason Parked | Parked Date | Revisit Condition |
|---|---|---|---|
| Larkfield Plumbing Contractors Ltd | Phone-only contact. No email found. Email-only Round 1 policy blocks outreach. | 2026-03-25 | Revisit if channel policy expands to phone, or if email becomes available |
| CPK Heating & Plumbing | Irish entity verified active. Website needs full audit. Contact is phone-only. Email policy concern. | 2026-03-25 | Full website audit needed. If audit is strong, revisit email-based outreach possibility |

---

## Per-Lead Records

Each lead: `LEADS/{slug}/` containing:
- `LEAD_RECORD.md` — core info, scorecard, stage history
- `BUSINESS.md` — full research (when completed)
- `WEBSITE_AUDIT.md` — (for existing-site leads)
- `NO_SITE_BRIEF.md` — (for no-site leads)
- `CONCEPT_BRIEF.md` — (when completed)
- `PITCH.md` — pitch draft (when completed)
- `STATUS.md` — current stage, all decisions, approval history

---

## Round 1 Campaign Status

- **Campaign:** dublin-trades-round-1
- **Phase:** APPROVAL_QUEUED — Brian McGarry
- **Next:** Nero approves Brian McGarry → Mercury deploys on explicit go-ahead
- **Remaining leads:** CPK and Larkfield parked. 9 MONITOR leads awaiting further research.

---

## Data Hygiene Rules

1. **Stage must always be current** — update STATUS.md immediately when stage changes
2. **Never delete a lead record** — move to LOST/NO_RESPONSE instead
3. **Suppress immediately** when opt-out or rejection occurs
4. **No duplicates** — check CRM before creating new lead record
5. **Outreach sends logged with timestamp** — in STATUS.md and in this INDEX
6. **"Work done but CRM not updated" means work is not done** — non-negotiable
