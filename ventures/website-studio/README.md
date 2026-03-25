# Website Studio — System Overview

**Purpose:** Autonomous lead generation and custom website concept studio.  
**Built for:** Likwid (Gbemi Akadiri) / Verdantia Ltd  
**Running inside:** OpenClaw (Nero, Forge, Scout, Mercury)  
**Date established:** 2026-03-25

---

## What This System Does

Finds businesses with real website opportunity gaps → researches them deeply → produces a custom website concept → drafts a tailored pitch → queues everything for human approval → sends only when Nero explicitly approves.

Nothing goes out without approval. Nothing goes out without being specific. Nothing goes out without being evidenced.

---

## The Agents and Their Roles

| Agent | Role |
|---|---|
| **Nero** | Chair, final approval gate, orchestration, final judgment |
| **Scout** | Lead discovery, business research, website audits, no-site briefs, opportunity scoring |
| **Forge** | Concept briefs, design direction, mockup planning |
| **Mercury** | Pitch drafts, outreach drafting, follow-up drafting, messaging strategy. Mercury drafts and prepares — Mercury never deploys, sends, or initiates any external communication without explicit Nero approval. |

**All specialist work routes through Nero. Nero is always the final voice.**

---

## Core Files

| File | Purpose |
|---|---|
| `POSITIONING.md` | What this service is, the angle, the offer ladder |
| `TARGET_MARKETS.md` | Who we target, who we avoid, first test segment |
| `LEAD_SCORECARD.md` | How leads are scored and qualified |
| `PIPELINE.md` | 11-stage workflow from lead found to won/lost |
| `OUTREACH_POLICY.md` | Hard rules on what we do and don't do externally |
| `CHANNEL_POLICY.md` | Approved channels, contact point standards, risky lead rules |
| `DESIGN_STANDARD.md` | What Forge must deliver in every concept |
| `CRM/INDEX.md` | Master lead tracking |
| `CRM/SUPPRESSION.md` | Do-not-contact list |

---

## Runbooks

| Runbook | Owner | Trigger |
|---|---|---|
| `LEAD_DISCOVERY.md` | Scout | New discovery sessions |
| `WEBSITE_AUDIT.md` | Scout | Existing-website leads, Stage 4 |
| `NO_SITE_ANALYSIS.md` | Scout | No-site leads, Stage 4 |
| `CONCEPT_BRIEF.md` | Forge | Post-audit, Stage 5 |
| `PITCH_DRAFTING.md` | Mercury | Post-concept, Stage 6 |
| `APPROVAL_QUEUE.md` | Nero | Every lead reaching Stage 7 |
| `FOLLOW_UP_POLICY.md` | Mercury | Post-send, Stage 10 |

---

## Pipeline Stages

```
1. LEAD_FOUND
2. LEAD_QUALIFIED
3. BUSINESS_RESEARCHED
4. WEBSITE_AUDITED / NO_SITE_BRIEF_CREATED
5. CONCEPT_DIRECTION_CREATED
6. PITCH_DRAFTED
7. APPROVAL_QUEUED  ← Gate: Nero approval required
8. APPROVED         ← Nero explicit approval to proceed
9. OUTREACH_SENT    ← Only on explicit Nero go-ahead
10. FOLLOW_UP_PENDING
11. WON / LOST / NO_RESPONSE
```

**No skipping. No external contact without explicit Nero approval at every stage.**

---

## Key Policies

- **No autonomous outbound** — everything requires explicit Nero approval
- **Two-gate deployment rule** — Nero approves content AND separately approves deployment; Mercury never sends without explicit deployment go-ahead
- **No mass outreach** — maximum 5 sends per day, 20 leads added per week
- **No generic concepts** — concepts must be custom to the business
- **No suppression violations** — suppression list checked before any send
- **Quality over quantity** — a single excellent lead is worth more than 50 mediocre ones
- **Respect over spam** — follow-up limits are hard stops
- **Channel discipline (Round 1)** — email only, no LinkedIn, no contact forms without explicit approval

---

## First Campaign

- **Target:** Dublin trades + professional services
- **Geography:** Dublin (citywide)
- **Batch size:** 20–30 leads in first collection run
- **First outreach:** After 5 leads are fully qualified and approved
- **Campaign tracking:** `CAMPAIGNS/dublin-trades-round-1/`

---

## Quick-Start for Each Agent

### Scout
1. Read `TARGET_MARKETS.md` to confirm segment
2. Read `LEAD_SCORECARD.md` before qualifying any lead
3. Run discovery sessions (max 20 leads/week)
4. Complete full research → audit/brief → submit to queue
5. Use `RUNBOOKS/LEAD_DISCOVERY.md` for session structure

### Forge
1. Only start after Scout's audit/brief is complete
2. Read `DESIGN_STANDARD.md` before drafting concept
3. Use `RUNBOOKS/CONCEPT_BRIEF.md` — do not improvise
4. Self-review against quality checklist before submitting

### Mercury
1. Only start after Forge's concept brief is approved
2. Use `RUNBOOKS/PITCH_DRAFTING.md` — hooks must be specific
3. All pitch drafts marked DRAFT — not external until Nero approves
4. **Mercury drafts and prepares. Mercury does NOT send, deploy, or initiate any outreach independently — only Nero approves deployment**
5. Route ALL responses (positive or negative) to Nero immediately

### Nero
1. Review queued leads daily
2. Use `RUNBOOKS/APPROVAL_QUEUE.md` — check every item on the checklist
3. Approve / reject / park with specific written notes
4. Explicitly confirm send timing before any outreach goes out
5. Monitor follow-up sequence and approve each follow-up touch

---

## Questions

If any agent is unsure about process, quality standards, or whether to proceed — stop and ask Nero. Getting it right is more important than getting it done.

---

_This system is designed to run with minimal input after setup. But the approval gate never goes away. Nero is always the final voice._
