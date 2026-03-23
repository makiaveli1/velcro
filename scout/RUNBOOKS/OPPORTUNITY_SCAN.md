# OPPORTUNITY_SCAN.md — Opportunity Scan Runbook

_When researching market opportunities, do this._

---

## What Is an Opportunity Scan?

Finding underserved needs, unmet demands, or gaps in the market that could be addressed — backed by evidence, not intuition.

---

## Step 1 — Define the Market Scope

- What market or segment?
- Geographic focus?
- Customer segment (SMB, mid-market, enterprise, consumer)?
- Price range?

---

## Step 2 — Identify Evidence Sources

- G2/Capterra unmet needs (negative reviews of existing tools)
- Reddit discussions (what are people complaining about?)
- Twitter/X threads (pain points in specific niches)
- Industry newsletters (what are practitioners saying they lack?)
- Job boards (what are companies struggling to hire for?)
- Forum posts, Slack communities, Discord servers
- Google Trends / search demand data
- Competitor gaps identified in COMPETITOR_SCAN

---

## Step 3 — Pattern Recognition

Look for:
- Recurring complaints across multiple sources
- "I wish there was a tool that..." patterns
- underserved niches (small but willing to pay)
- price/value mismatches (people paying too much for too little)
- underserved geographies or industries
- regulatory changes creating new needs

---

## Step 4 — Assess Each Opportunity

For each potential opportunity:

**Problem** — what is the unmet need?
**Evidence** — specific quotes, data, examples
**Market size signal** — demand indicators (search volume, discussion volume, competitor revenue signals)
**Competitive intensity** — how many players already solving this?
**Fit with current capabilities** — does this align with what we can actually build/deliver?
**Confidence** — HIGH / MEDIUM / LOW

---

## Step 5 — Prioritization

Rank opportunities by:
1. Evidence strength (how well-documented is the need?)
2. Market size signal (is there demand or just speculation?)
3. Competitive gap (is the market already saturated?)
4. Strategic fit (does this align with Verdantia's direction?)

---

## Deliverable Format

```
## Opportunity Scan: [market/segment]

### Identified Opportunities

#### Opportunity 1: [name]
- **Problem:** [what's underserved]
- **Evidence:** [specific sources + quotes]
- **Demand signal:** [demand indicators]
- **Competition:** [existing players]
- **Fit:** [HIGH/MEDIUM/LOW + reason]
- **Confidence:** [level + reason]

#### Opportunity 2: ...

### Top Opportunities
[ranked by evidence + fit]

### Red Flags
[opportunities that look promising but have hidden problems]

### Confidence
HIGH / MEDIUM / LOW overall — [reason]
```

---

## Quality Rules

- Every opportunity needs at least 2 independent sources
- Speculation must be labeled as "Inferred" or "Hypothesis"
- Do not overclaim market size — say what the signal is, not what it proves
- If an opportunity is already crowded, say so and explain the differentiation challenge
