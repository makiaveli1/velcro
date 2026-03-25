# Website Studio CRM — Master Index

_Last updated: 2026-03-25 (Discovery Session: Dublin Trades Round 1)_

---

## Active Leads

| Lead Name | Category | Score | Stage | Next Action | Last Activity | Owner |
|---|---|---|---|---|---|---|
| Brian McGarry Plumber | Plumber | 44 | CONCEPT_CREATED | Mercury: draft pitch; Brian: supply RGI status + testimonials | 2026-03-25 | Discovery |
| CPK Heating & Plumbing | Plumber | 42 | LEAD_QUALIFIED | Website quality check + contact | 2026-03-25 | Discovery |
| Larkfield Plumbing Contractors Ltd | Plumber | 41 | LEAD_QUALIFIED | Website quality check + contact | 2026-03-25 | Discovery |
| Emergency Plumbers Dublin | Plumber | 40 | MONITOR | Website audit + GBP verification | 2026-03-25 | Discovery |
| Active Electrical | Electrician | 39 | MONITOR | GBP verification + contact | 2026-03-25 | Discovery |
| Donard Electrical Services Ltd | Electrician | 37 | MONITOR | GBP verification + contact | 2026-03-25 | Discovery |
| Church Heating & Plumbing Ltd | Plumber | 37 | MONITOR | GBP verification + contact | 2026-03-25 | Discovery |
| 1-2-1 Plumbing & Heating | Plumber | 37 | MONITOR | GBP verification + contact | 2026-03-25 | Discovery |
| Niall O'Connor Electrical Services | Electrician | 37 | MONITOR | Contact details search + GBP | 2026-03-25 | Discovery |
| North Dublin Plumbers | Plumber | 37 | MONITOR | GBP verification + legitimacy check | 2026-03-25 | Discovery |
| Kavanagh Heating & Plumbing | Plumber | 36 | MONITOR | Website status confirmed + contact | 2026-03-25 | Discovery |
| First Choice Heating & Plumbing | Plumber | TBC | RESEARCHING | Website check + score | 2026-03-25 | Discovery |

---

## Pipeline Stage Counts

| Stage | Count |
|---|---|
| LEAD_FOUND | 0 |
| LEAD_QUALIFIED | 2 |
| BUSINESS_RESEARCHED | 0 |
| CONCEPT_CREATED | 1 |
| MONITOR | 9 |
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

- **Total leads found:** 12
- **Total leads qualified (AUDIT-WORTHY+):** 3
- **Total leads MONITOR:** 9
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

---

## Discovery Session Notes (2026-03-25)

### Scope
- Geography: Dublin (citywide — Dublin 1 through Dublin 24)
- Categories: Plumbers AND Electricians only
- Round: 1 of multiple planned discovery sessions

### Sources Used
- Google search (general + specific queries)
- Google Maps / Places results
- Golden Pages (goldenpages.ie) — primary directory source
- TrueROI — searched but returned no plumber listings
- Facebook business pages
- Knocklyon Network directory
- MyTown.ie
- constructionireland.ie
- infoisinfo-ie.com

### Key Patterns Noticed
- Most established Dublin plumbers/electricians have functional websites
- Smaller operators (sole traders) more likely to have NO website
- Ltd companies tend to have websites even if outdated
- Golden Pages subdomains (xxx.goldenpages.ie) are common for businesses without own website — these are NOT independent websites
- Strong lead candidates typically appear in 3+ directory listings with no own-domain website
- Phone (087/086) mobile numbers often the only contact for sole traders
