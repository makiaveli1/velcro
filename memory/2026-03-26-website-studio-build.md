# Website Studio — System Build Log
**Date:** 2026-03-25
**Built by:** Nero + Scout + Forge + Mercury

---

## What Was Built

A fully operational autonomous lead generation and custom website concept studio system for Verdantia Ltd. Runs inside OpenClaw. Designed to find businesses with real website opportunity gaps, research them deeply, produce a custom concept, draft a tailored pitch, and queue everything for human approval before any external action.

**Core principle:** Nothing goes external without explicit Nero approval. Mercury drafts. Nero approves. Scouts researches. Forge concepts. All routes through Nero.

---

## System Location

`/home/likwid/.openclaw/workspace/ventures/website-studio/`

CRM cockpit (web UI): `ventures/website-studio/CRM/cockpit/`
Run with: `cd cockpit && npm install && node server.js` → http://localhost:3099

---

## Core Architecture

### Agents & Roles
- **Nero:** Chair, final approval gate, orchestration
- **Scout:** Lead discovery, business research, website audits, no-site briefs, opportunity scoring
- **Forge:** Concept briefs, design direction, mockup planning
- **Mercury:** Pitch drafts, outreach drafting, follow-up drafting, messaging strategy

**All specialist work routes through Nero. Specialists never deploy, send, or initiate any external communication without explicit Nero approval.**

---

## Key Files

### Positioning & Strategy
- `POSITIONING.md` — service angle, offer ladder (Tier 1 audit → Tier 2 homepage concept → Tier 3 full build → Tier 4 conversion refresh → Tier 5 maintenance)
- `TARGET_MARKETS.md` — primary: Dublin trades/professional services; secondary: clinics/wellness; tertiary: boutique hospitality
- `LEAD_SCORECARD.md` — 0-100 scoring rubric across 4 sections: Website Presence (30pts), Site Quality & Trust (30pts), Business Legitimacy (20pts), Opportunity Multipliers (20pts)
- `PIPELINE.md` — 11-stage pipeline from LEAD_FOUND to WON/LOST/NO_RESPONSE
- `OUTREACH_POLICY.md` — hard rules, channel standards, suppression
- `CHANNEL_POLICY.md` — Round 1 email-only; contact point standards; risky lead definitions

### Design & Operations
- `DESIGN_STANDARD.md` — Forge's design brief requirements; what "custom, modern, premium" means; category-specific guidance
- `RUNBOOKS/` — 7 runbooks: LEAD_DISCOVERY, WEBSITE_AUDIT, NO_SITE_ANALYSIS, CONCEPT_BRIEF, PITCH_DRAFTING, APPROVAL_QUEUE, FOLLOW_UP_POLICY
- **All runbooks end with mandatory CRM update section — non-negotiable**

### Templates
- `TEMPLATES/` — LEAD_RECORD, WEBSITE_AUDIT, NO_SITE_BRIEF, CONCEPT_BRIEF, PITCH_DRAFT, FOLLOW_UP_DRAFT, APPROVAL_NOTE

### CRM
- `CRM/INDEX.md` — master lead tracking, pipeline counts, campaign status, data hygiene rules
- `CRM/SUPPRESSION.md` — do-not-contact list
- `CRM/cockpit/` — local web dashboard (Node.js + Express + vanilla HTML/CSS/JS)

---

## Two-Gate Deployment Rule

**Content approval ≠ deployment approval.**

1. Nero approves pitch content during the normal approval queue
2. Nero separately approves deployment (the act of sending) — for each touch, each channel

Mercury drafts and prepares. Mercury never sends without explicit deployment go-ahead from Nero.

---

## Round 1 Campaign — Dublin Trades

**Status:** APROVAL_QUEUED — Brian McGarry Plumber

### Lead Pipeline (12 leads found, 2026-03-25)

| Lead | Score | Stage |
|---|---|---|
| Brian McGarry Plumber | 44 | APPROVAL_QUEUED |
| CPK Heating & Plumbing | 42 | MONITOR (parked — phone-only, email policy) |
| Larkfield Plumbing Contractors Ltd | 41 | MONITOR (parked — phone-only) |
| Emergency Plumbers Dublin | 40 | MONITOR |
| Active Electrical | 39 | MONITOR |
| Donard Electrical Services Ltd | 37 | MONITOR |
| Church Heating & Plumbing Ltd | 37 | MONITOR |
| 1-2-1 Plumbing & Heating | 37 | MONITOR |
| Niall O'Connor Electrical Services | 37 | MONITOR |
| North Dublin Plumbers | 37 | MONITOR |
| Kavanagh Heating & Plumbing | 36 | MONITOR |
| First Choice Heating & Plumbing | TBC | RESEARCHING |

### Brian McGarry — Full Pipeline Complete
- **Slug:** brian-mcgarry-plumber
- **Location:** 117 St. Brendan's Crescent, Walkinstown, Dublin 12
- **Contact:** brianmcgarry90@gmail.com | 087 618 2500
- **No website.** No Google Business Profile.
- **Revenue gap estimate:** €3,750–€15,000/year in lost Dublin 12 homeowners
- **Pitch:** "I searched 'plumber Dublin 12' on Google — the local map pack shows 3 businesses. Brian McGarry wasn't one of them."
- **Concept:** Mobile-first single-page. Deep charcoal + copper palette. Sticky tap-to-call bar. 11 years Dublin 12 as trust anchor.
- **Awaiting:** Nero deployment approval → Mercury sends on go-ahead

### CPK Heating & Plumbing — Verified Active
- **CRO:** 393227 — active Irish Ltd since 2004
- **UK entity dissolved Oct 2024** — separate from Irish entity (confirmed)
- **Website:** cpkheatingandplumbing.ie — 2/10 design quality, AI boilerplate, 404s on /about and /contact, phone-only contact
- **Parked:** phone-only contact, email absent, email-only policy

### Larkfield Plumbing — Verified Active
- **Irish Ltd confirmed.** No website. Phone-only contact.
- **Parked:** no email for outreach route

---

## CRM Cockpit

Built by Forge. Node.js + Express backend, vanilla HTML/CSS/JS frontend.
**Critical:** Lead STATUS.md files MUST have YAML frontmatter (`stage: APPROVAL_QUEUED`) — the cockpit reads from frontmatter, not markdown.

Run: `cd ventures/website-studio/CRM/cockpit && node server.js`

---

## Key Decisions Made

1. Round 1: Dublin only, plumbers + electricians only, email-only, 10-15 leads, 5 sends max, audit-led approach (Tier 1 free audit offer first, not paid concept pitch)
2. Phone NOT added as fallback channel — email-only policy stands for Round 1
3. Larkfield + CPK parked until channel policy or contact situation changes
4. CRM updates are mandatory in every runbook — "work done but CRM not updated" means work is not done

---

## What's Next

- Nero approves Brian McGarry → Mercury deploys on explicit go-ahead
- After Brian: CPK full website audit → concept brief → pitch draft
- After Brian results: Round 2 scope decision
- Larkfield revisit if channel policy expands or email found

---

## Pending / Deferred
- ACP/Claude Code wiring for Forge — not yet needed, normal path works fine
- Scout instantiation for research-heavy sessions — functional but not formally instantiated
- Steward instantiation — pending cron/automation infra
- Google workspace (gog) — pending Gmail/Calendar becoming part of daily flow
- Phone/SMS outreach capability — deferred from Round 1
