# Website Studio CRM — Master Index

_Last updated: 2026-03-25_

---

## Active Leads

| Lead Name | Category | Score | Stage | Next Action | Last Activity | Owner |
|---|---|---|---|---|---|---|
| _(none yet — CRM initializing)_ | | | | | | |

---

## Pipeline Stage Counts

| Stage | Count |
|---|---|
| LEAD_FOUND | 0 |
| LEAD_QUALIFIED | 0 |
| BUSINESS_RESEARCHED | 0 |
| WEBSITE_AUDITED / NO_SITE_BRIEF_CREATED | 0 |
| CONCEPT_DIRECTION_CREATED | 0 |
| PITCH_DRAFTED | 0 |
| APPROVAL_QUEUED | 0 |
| APPROVED | 0 |
| OUTREACH_SENT | 0 |
| FOLLOW_UP_PENDING | 0 |
| WON | 0 |
| LOST / NO_RESPONSE | 0 |

---

## Metrics (Current Campaign)

- **Total leads found:** 0
- **Total leads qualified (AUDIT-WORTHY+):** 0
- **Total leads pitched (APPROVED+):** 0
- **Response rate:** N/A
- **Conversion rate:** N/A
- **Won deals:** 0
- **Active deals in progress:** 0

---

## Suppression List

See: `SUPPRESSION.md`

---

## Per-Lead Records

Each lead has its own folder: `LEADS/{slug}/`

Required files per lead:
- `LEAD_RECORD.md` — core info, scorecard, stage history
- `BUSINESS.md` — full research
- `WEBSITE_AUDIT.md` OR `NO_SITE_BRIEF.md` — audit or brief
- `CONCEPT_BRIEF.md` — Forge's concept direction
- `PITCH.md` — Mercury's pitch draft
- `STATUS.md` — current stage, approval history, outcomes

---

## Lead Folder Naming Convention

Format: `LEADS/{business-name-slug}/`

Examples:
- `LEADS/dublin-elite-plumbing/`
- `LEADS/bells-wellness-clinic/`
- `LEADS/nova-home-renovations/`

Slugs are lowercase, hyphenated, no special characters.

---

## Campaign Tracking

Each campaign has its own subfolder: `CAMPAIGNS/{campaign-slug}/`

Contains:
- `BRIEF.md` — what this campaign targets and why
- `RESULTS.md` — outcomes log
- `LEADS/` — symlinks or copies of lead folders relevant to this campaign

---

## Data Hygiene Rules

1. **Stage must always be current** — update STATUS.md immediately when stage changes
2. **Never delete a lead record** — move to LOST/NO_RESPONSE instead
3. **Suppress immediately** when opt-out or rejection occurs
4. **No duplicates** — check CRM before creating new lead record
5. **No manual CRM edits** — all updates via structured STATUS.md files
6. **Outreach sends logged with timestamp** — in STATUS.md and in `CAMPAIGNS/{slug}/RESULTS.md`
