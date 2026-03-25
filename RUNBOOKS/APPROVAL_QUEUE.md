# Runbook — Approval Queue

_How leads move from internal work to external action — and how Nero controls that gate._

---

## Purpose

The approval queue is the firewall between internal work and external contact. Nothing goes outside this system without Nero's explicit, written approval. This runbook defines exactly what Nero checks, what gets rejected, and what moves forward.

---

## The Approval Gate — What It Is

The approval queue is not a rubber stamp. It is a genuine quality check. Nero reviews the complete lead package — every artifact — before any outreach is approved.

**The rule is absolute:** No external contact of any kind, for any reason, without written Nero approval. Not even "just to test the system." Not even "I'm pretty sure this one is fine." Written approval, every time.

---

## How a Lead Enters the Queue

A lead enters the approval queue when:
1. All required pipeline stages are complete
2. All required artifacts are present and in the lead folder
3. Scout, Mercury, or Forge marks the lead as QUEUED in STATUS.md
4. Nero receives a notification (via session message or heartbeat note) that a lead is ready for review

**Leads do NOT enter the queue automatically.** If a specialist believes a lead is ready, they formally submit it by updating STATUS.md and notifying Nero.

---

## What Nero Reviews — Complete Checklist

### 1. Pipeline Integrity
- [ ] All required stages are complete and documented in STATUS.md
- [ ] No stages were skipped
- [ ] Every stage has the required artifact
- [ ] Stage history is accurate and dated

### 2. Lead Quality
- [ ] Score ≥ 56 (PITCH-WORTHY) OR there's compelling qualitative justification for override
- [ ] Business is legitimate and operational (verified evidence in BUSINESS.md)
- [ ] Not on suppression list (check SUPPRESSION.md)
- [ ] Not a duplicate (check CRM/INDEX.md)
- [ ] Not a competitor of existing clients
- [ ] Business category is in our target market list
- [ ] Business is in our target geography

### 3. Research Quality
- [ ] BUSINESS.md contains specific, evidenced findings — not generic observations
- [ ] Audit or no-site brief identifies SPECIFIC gaps (not "the design is old")
- [ ] Each gap is tied to a business consequence
- [ ] Competitor context is referenced and specific
- [ ] Review content is quoted (not just "they have good reviews")
- [ ] Mercury/Forge has enough to work with — research isn't thin

### 4. Concept Quality
- [ ] CONCEPT_BRIEF.md is complete
- [ ] Design language is SPECIFIC — not "modern, professional, clean"
- [ ] Colour palette is described with mood and rationale, not just hex codes
- [ ] Typography is specific with rationale tied to the business type
- [ ] Trust architecture is considered and specific
- [ ] CTA model is clear and maps to the customer journey
- [ ] Mobile-first is addressed specifically
- [ ] Differentiation rationale is specific — this concept vs. their current state vs. competitors
- [ ] Content requirements are realistic for what the client can supply
- [ ] Forge has self-certified quality on the sign-off checklist

### 5. Pitch Quality
- [ ] Opening hook is SPECIFIC and evidenced — not a template opener
- [ ] Hook references something real from the research
- [ ] No insults about the business or their current state
- [ ] No vague claims ("modern, mobile-first, SEO-optimised, results-driven")
- [ ] No pressure, urgency, or manipulation tactics
- [ ] CTA is single and low-friction
- [ ] Subject line is specific and non-clickbait
- [ ] Message length is appropriate (email: 150–220 words)
- [ ] Signature is accurate and professional
- [ ] Mercury has self-certified on the pitch quality checklist
- [ ] Nothing in this pitch would embarrass us if forwarded

### 6. Outreach Appropriateness
- [ ] Chosen channel is appropriate for this business type and context
- [ ] Timing is appropriate (not a bad time of day/week to send)
- [ ] Follow-up plan is defined and reasonable
- [ ] This outreach won't create reputation risk
- [ ] We are not contributing to the "spam problem" this business likely receives

---

## Nero's Decision Options

### APPROVED
The lead is cleared for outreach.

**Required fields:**
- Outreach channel confirmed (Email / LinkedIn / Both)
- Send timing (specific date or "as soon as practical")
- Any specific notes for Mercury before deployment
- **Deployment go-ahead issued to Mercury** (separate step — Mercury does not deploy until this is given)

### REJECTED
The lead is not approved. It returns to the appropriate specialist with specific feedback.

**Required fields:**
- Reason for rejection (specific — not "not good enough")
- What needs to change for reconsideration
- Recommendation (return to Scout for more research / return to Forge for concept revision / downgrade or suppress)

**Common rejection reasons:**
- Research is too thin to produce a specific pitch
- Concept is too generic to differentiate
- Pitch hook is template language, not specific observation
- The lead doesn't fit our target market
- The opportunity gap is not real or significant enough
- The outreach would be spam or reputationally risky

### PARKED
The lead has potential but isn't ready now.

**Required fields:**
- Why it's parked (specific — what stage is missing or uncertain)
- What would trigger re-evaluation (specific conditions or timeline)
- Next review date if applicable

**Common parking reasons:**
- Research is adequate but concept could be stronger with one more specific input
- Timing isn't right (seasonal business, they've just launched, etc.)
- We're not confident enough in the opportunity gap to pitch
- The lead is borderline on score but has interesting qualitative signals

---

## Post-Approval Process

### After APPROVAL:

1. Nero updates STATUS.md with approval decision and send timing
2. Nero notifies Mercury with any specific notes
3. **Nero sends explicit deployment go-ahead to Mercury** — approval to proceed is not the same as deployment go-ahead. Approval means "this content is cleared." Deployment go-ahead means "now send it."
4. Mercury executes the send only after receiving explicit deployment go-ahead
5. Mercury logs sent confirmation in STATUS.md with exact timestamp
6. CRM/INDEX.md is updated
7. Campaign tracking is updated if applicable

### After REJECTED:

1. Nero updates STATUS.md with rejection reason
2. Nero notifies the relevant specialist with specific, actionable feedback
3. Lead remains in current stage until specialist addresses feedback
4. Lead re-enters queue only when specialist confirms revisions are complete

### After PARKED:

1. Nero updates STATUS.md with parking reason and re-evaluation trigger
2. Lead stays in queue in PARKED state
3. Review again at specified date or when trigger condition is met

---

## Approval Volume and Cadence

**Nero reviews the queue at minimum:**
- Once per business day when leads are queued
- Immediately when a HIGH PRIORITY lead enters the queue

**Maximum approvals per day:** 5
(This prevents quality slippage from approval volume pressure. If more than 5 leads are ready, prioritise by score and opportunity quality.)

---

## Nero Accountability

Every approval decision is logged in `APPROVAL_NOTE.md` in the lead folder with:
- Date and decision
- Nero's assessment summary
- Specific notes on any concerns or overrides
- Any conditions attached to approval

This creates an audit trail for quality control and learning.

---

## Escalation Path

If a specialist believes Nero is being too conservative or missing something, they may request re-review with specific new information.

Nero's decision stands unless new information is provided that materially changes the quality assessment.

**Nero's role is to protect the system's integrity, reputation, and lead quality. Sometimes that means saying no to a lead that isn't ready, even if it means less outreach volume.**
