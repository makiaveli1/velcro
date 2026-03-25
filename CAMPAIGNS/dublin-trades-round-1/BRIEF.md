# Campaign — Dublin Trades Round 1

**Campaign ID:** `dublin-trades-round-1`
**Campaign start:** 2026-03-25
**Target geography:** Dublin citywide (Dublin 1–24)
**Target segment:** Trades + Professional Services
**Campaign owner:** Nero (orchestration), Scout (discovery), Forge (concept), Mercury (pitch)
**Status:** PLANNING — not yet active

---

## Campaign Brief

### Why This Segment

Trades and professional services in Dublin represent the highest-opportunity, lowest-friction first target for this system:

- **High digital maturity gap:** Most trades businesses in Dublin have either no website or a 2010-era static page
- **Clear customer journey:** Customers search for trades services online and evaluate based on web presence and reviews
- **Easy to research:** Google Business Profile + directory listings give us enough to score and qualify without deep industry expertise
- **Leverages existing infrastructure:** Gbemi already has outreach assets from the Verdantia cold outreach work (mockups, email templates, Gmail API)
- **Concrete CTA model:** Primary action is almost always a phone call or contact form — easy to design for
- **Reputation-dependent:** Trust signals (years in business, licences, insurance, reviews) are critical and often absent — our trust architecture design thinking applies directly

### Target Categories (in priority order)

1. **Plumbers** — High search volume, weak web presence common, phone CTA dominant
2. **Electricians** — Similar to plumbers, regulatory element (Safe Electric) adds trust signal opportunity
3. **Painters / Decorators** — Visual category, photography-heavy — strong concept potential
4. **Roofers** — Complex category, high-value jobs, trust-critical
5. **HVAC / Heating Engineers** — Technical category, certification-heavy trust signals
6. **Carpenters / Joiners** — Portfolio opportunity (before/after), but often lack photography
7. **Professional services** (accountants, solicitors, immigration consultants) — Lower priority for round 1

---

## Target Volume

| Metric | Target |
|---|---|
| Leads discovered | 20–30 |
| Leads qualified (AUDIT-WORTHY+) | 10–15 |
| Leads fully researched + audited | 8–12 |
| Concepts drafted | 6–10 |
| Pitches drafted | 5–8 |
| Leads approved for outreach | 5 (first batch) |
| Outreach sends (Round 1) | 5 |
| Responses targeted | 1–2 |
| Meetings/calls booked target | 1 |

---

## Phase 1 — Lead Discovery (Days 1–3)

### Who: Scout

**Action:** Run 2–3 discovery sessions targeting:
- Dublin plumbers (search: "plumbers Dublin" via Google Maps + TrueROI)
- Dublin electricians
- Dublin painters/decorators
- Dublin roofers

**Method:**
1. Google Maps / Google Business Profile search by category + area
2. TrueROI / Golden Pages directory scan
3. Quick score (5–8 min per lead)
4. Add 20–30 leads scoring ≥ 41 to CRM
5. Mark AUDIT-WORTHY vs PITCH-WORTHY

**Output:** 20–30 leads in CRM/INDEX.md, lead folders created with LEAD_RECORD.md

### Constraints
- No outreach during this phase
- Quality check: could I write a specific hook for every lead I'm adding?
- If directory scan returns mostly businesses with modern websites, expand geography or change category

---

## Phase 2 — Research and Audit (Days 3–7)

### Who: Scout (with Nero checkpoint at Day 5)

**Action:** Complete full research for top 10–12 leads:
- BUSINESS.md for each
- WEBSITE_AUDIT.md or NO_SITE_BRIEF.md
- Score update if new information changes initial score

**Output:** 10–12 fully researched leads ready for concept phase

**Checkpoint (Day 5):** Nero reviews research quality on first 3 completed leads. If research is thin or generic, returns to Scout with specific feedback before more work is done.

---

## Phase 3 — Concept Briefs (Days 7–10)

### Who: Forge

**Action:** Produce CONCEPT_BRIEF.md for top 8–10 leads (based on research quality)

**Constraint:** If research is thin on any lead, return to Scout before drafting concept. Do not improvise.

**Output:** 8–10 concept briefs in lead folders

---

## Phase 4 — Pitch Drafts (Days 10–12)

### Who: Mercury

**Action:** Draft PITCH.md for leads with strong concepts

**Constraint:** If pitch cannot be made specific (because research or concept is thin), flag to Nero. Do not force a generic pitch.

**Output:** 5–8 pitch drafts

---

## Phase 5 — Approval Queue (Day 12)

### Who: Nero

**Action:** Review complete lead packages for 5 leads

**Decision per lead:** APPROVED / REJECTED / PARKED

**Output:** 5 leads approved for first outreach batch

---

## Phase 6 — First Outreach Sends (Days 13–14)

### Who: Mercury (on explicit Nero go-ahead)

**Action:** Send initial pitch to 5 approved leads

**Rules:**
- Send 1 per day ( stagger timing)
- Follow-up schedule set in STATUS.md
- Monitor for responses

---

## Success Metrics — Round 1

| Metric | Target | Acceptable | Below Target |
|---|---|---|---|
| Discovery yield (qualified / found) | 50% | 40% | <40% |
| Research completion rate (researched / qualified) | 80% | 70% | <70% |
| Concept rate (concepts / researched) | 70% | 60% | <60% |
| Pitch rate (pitches / concepts) | 70% | 60% | <60% |
| Approval rate (approved / pitched) | 80% | 70% | <70% |
| Response rate (responses / sent) | 20–40% | 10–20% | <10% |
| Meeting rate (meetings / responses) | 50% | — | <50% |

**Soft success criteria:**
- No negative responses (opt-outs, complaints)
- All 5 first-batch leads handled professionally
- Genuine learning about what resonates in pitch responses

---

## What Success Looks Like (Round 1)

**Minimum viable success:**
- 5 leads fully qualified and approved
- 5 outreach sends completed without incident
- At least 1 response (positive or soft decline)
- Learning documented for Round 2

**Real success:**
- 5 sends, 1–2 genuine responses, 1 meeting/call booked
- Specific insights on what pitch angle works best
- System quality confirmed end-to-end

---

## What Happens After Round 1

1. Document lessons learned in `CAMPAIGNS/dublin-trades-round-1/RESULTS.md`
2. Update runbooks if any process gaps identified
3. Nero decides on Round 2 scope (same segment or expand)
4. Suppress all no-response leads from Round 1

---

## Campaign Structure

```
CAMPAIGNS/dublin-trades-round-1/
├── BRIEF.md          ← this file
├── RESULTS.md        ← outcomes log (created during campaign)
└── LEADS/           ← symlinks or copies of relevant lead folders
```

---

## First Action Required

**Scout:** Begin discovery session for Dublin plumbers.  
**Target:** 8–10 leads in first session.  
**Scope:** Dublin citywide.  
**Start:** Anytime after this campaign is approved.

---

## Nero Authorization

**This campaign is:** PLANNING / APPROVED / REJECTED

**Nero sign-off required before Phase 1 begins.**

Date: 2026-03-25  
By: Nero
