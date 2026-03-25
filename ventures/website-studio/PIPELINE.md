# Website Studio — Operating Pipeline

## Pipeline Overview

The pipeline has 11 stages. Every lead moves through sequentially. No skipping. No advancing without the required artifact at each stage.

The pipeline is designed so that a lead can only advance when there's a concrete, reviewable artifact — not a vague intention.

---

## Stage Definitions

### Stage 1 — LEAD_FOUND
**Trigger:** Scout identifies a business with potential website opportunity signals.

**Required artifact:**
- Business name
- Location
- Business category
- Initial signal observed (e.g., "no website found", "2012-era design", "no mobile site")
- Source (how found: local search, directory, competitor context, referral)

**Gate:** Scout scores the lead. If score ≥ 26, advance to Stage 2. Otherwise → IGNORE or MONITOR.

**Output:** New lead record created in `LEADS/{slug}/`

---

### Stage 2 — LEAD_QUALIFIED
**Trigger:** Lead passed initial scorecard threshold (≥ 41 = AUDIT-WORTHY, ≥ 56 = PITCH-WORTHY).

**Required artifact:**
- Completed scorecard with section-by-section scores
- Business category confirmed
- Basic legitimacy check completed (business is real, operational, not disqualified)
- Source notes (how Scout found this business, what signals triggered the find)

**Gate:** Scout confirms business is legitimate and opportunity is real. Mercury reviews score and confirms the category fit.

**Output:** `LEAD_RECORD.md` updated, scorecard section complete.

---

### Stage 3 — BUSINESS_RESEARCHED
**Trigger:** Lead is AUDIT-WORTHY or better and category is confirmed.

**Required artifact (by Scout):**
- Google Business Profile findings (reviews, photos, posts, consistency)
- Social media audit (which platforms, how active, what they post, follower/engagement levels)
- Directory presence (TrueROI, golden pages, industry directories, Google Maps)
- Market context (who are their competitors, what are competitors' websites like, what's the market standard)
- Customer journey notes (how do customers find and choose this type of business)
- Business strengths and story (what's interesting about this business, what makes them worth a pitch)
- Any press, awards, certifications, notable associations

**Gate:** Scout produces evidence pack. Mercury confirms the research is deep enough to inform a concept. If research is thin, return to Scout for more work.

**Output:** `BUSINESS.md` completed with full research context.

---

### Stage 4 — WEBSITE_AUDITED | NO_SITE_BRIEF_CREATED

**Branch A — Existing website:**
**Trigger:** Business has a website.

**Required artifact (by Scout):**
- Visual audit (design age, layout, typography, imagery quality, colour usage)
- Mobile experience review (responsive, load speed, usability on phone)
- Trust signal audit (contact info, testimonials, certifications, about page, privacy policy)
- CTA/conversion review (what's the ask, how clear, how many steps to contact)
- Content quality review (copy, messaging, photography, video)
- Performance/accessibility notes (load time if measurable, HTTPS, obvious accessibility issues)
- SEO basics (title tags, meta description, heading structure, image alt text)
- Biggest specific gaps (the 3–5 most impactful problems with this site)

**Output:** `WEBSITE_AUDIT.md` — specific, evidenced, not generic.

**Branch B — No website:**
**Trigger:** Business has no website (or only a social media page).

**Required artifact (by Scout):**
- What the business currently looks like online (Google Maps, Facebook, directories, review sites)
- What customers say about them (review content — what do people say they loved, what do they wish was different)
- What information is currently available to a potential customer researching this business
- What information is completely absent that SHOULD be there
- The specific opportunity gap (what problem does this create for the business)
- Recommended website type and priorities (what should the site do first, second, third)

**Output:** `NO_SITE_BRIEF.md` — specific, evidenced, actionable.

**Gate:** Audit/brief must identify concrete, specific gaps — not vague observations. Generic audits go back to Scout.

---

### Stage 5 — CONCEPT_DIRECTION_CREATED
**Trigger:** Stage 4 artifact is complete and specific enough to base a concept on.

**Required artifact (by Forge, based on Scout's research):**
- `CONCEPT_BRIEF.md` — custom direction for this specific business
- Design language notes (colour direction, typography direction, visual tone)
- Layout and structure recommendation (homepage priority order, key sections)
- Trust architecture plan (what trust signals to feature, where, how)
- CTA model (primary action, secondary action, user journey to conversion)
- Mobile-first notes
- Content recommendations (what they need to supply, what's missing)
- Why this concept fits this specific business (not generic reasoning)
- Optional: reference mood board or style direction links

**Gate:** Concept must be specific to this business — no template language. If concept feels generic, it goes back to Forge. Mercury confirms the concept tells the right story for outreach.

**Output:** `CONCEPT_BRIEF.md` complete.

---

### Stage 6 — PITCH_DRAFTED
**Trigger:** Concept direction is approved internally.

**Required artifact (by Mercury):**
- Tailored outreach pitch (email primary, LinkedIn secondary if B2B context)
- Subject line options (2–3 variants)
- Opening hook (specific observation about their business or market — not generic)
- Body (what we noticed, why it matters, what it could look like solved — no pressure)
- CTA (clear, low-friction next step — e.g., "would you be open to a 15-minute call to see what we found?")
- Signature block (who it's from, credentials, contact)
- All marked clearly as DRAFT — not for external use until approved

**Gate:** Mercury produces pitch. Pitch must be specific to this business and concept — not a template fill. Generic pitches go back to Mercury.

**Output:** `PITCH.md` — draft only, clearly labeled.

---

### Stage 7 — APPROVAL_QUEUED
**Trigger:** All required artifacts are complete.

**Required artifacts for queue:**
- `LEAD_RECORD.md` (complete)
- `BUSINESS.md` (complete)
- `WEBSITE_AUDIT.md` OR `NO_SITE_BRIEF.md` (complete)
- `CONCEPT_BRIEF.md` (approved by Forge)
- `PITCH.md` (draft)

**Process:**
- Scout/Mercury/Forge mark ready
- Nero reviews the full package
- Nero approves / rejects / parks with notes
- If approved: lead moves to Stage 8
- If rejected: lead goes to PARKED with reason documented
- If parked: lead is dormant but not deleted

**Output:** `STATUS.md` updated. Approval note added.

---

### Stage 8 — APPROVED
**Trigger:** Nero approves the lead for external outreach.

**Required:**
- Nero written approval in `STATUS.md`
- All artifacts reviewed and approved
- Outreach channel confirmed (email, LinkedIn, or both)
- Send timing noted

**At this stage the lead is ready for external contact — but only on explicit Nero go-ahead.**

---

### Stage 9 — OUTREACH_SENT
**Trigger:** Nero confirms send timing and approves deployment.

**Required:**
- Nero explicit approval to send (not just approval to proceed)
- Outreach artifact finalised (final review by Nero if any concerns)
- Suppression check confirmed (business not in do-not-contact list)

**Process:**
- Mercury sends via appropriate channel (email via outreach system, LinkedIn via connection)
- Sent confirmation logged in `STATUS.md` with timestamp
- Source system updated (sent-log.json for outreach system)

---

### Stage 10 — FOLLOW_UP_PENDING
**Trigger:** Outreach sent, no response yet.

**Required follow-up policy:**
- First follow-up: Day 4 after initial send
- Second follow-up: Day 10 after initial send
- Final follow-up: Day 21 after initial send
- Maximum 3 total touches (initial + 2 follow-ups)

**After 3 touches with no response:** → NO_RESPONSE → move to LOST/NO_RESPONSE

**If response received:** → Move to appropriate stage (contacted, interested, meeting booked, etc.)

**Follow-up drafts must be approved by Nero before sending.**

---

### Stage 11 — WON | LOST | NO_RESPONSE
**WON:** Lead responded positively, meeting/call booked, or deal in progress. Log outcome and next step.

**LOST:** Lead explicitly declined or went dark after meaningful engagement.

**NO_RESPONSE:** 3 touches sent, no response. Move to suppression. Re-evaluate in 6 months only if significant new context (new website launched, new location, etc.).

---

## Pipeline Summary Table

| Stage | Owner | Artifact | Gate |
|---|---|---|---|
| 1. LEAD_FOUND | Scout | Basic lead info + signal | Score ≥ 26 |
| 2. LEAD_QUALIFIED | Scout + Mercury | Scorecard complete | Score ≥ 41 |
| 3. BUSINESS_RESEARCHED | Scout | Evidence pack / BUSINESS.md | Research is specific |
| 4. AUDITED/BRIEF | Scout | WEBSITE_AUDIT.md or NO_SITE_BRIEF.md | Gaps are specific |
| 5. CONCEPT_CREATED | Forge | CONCEPT_BRIEF.md | Concept is custom |
| 6. PITCH_DRAFTED | Mercury | PITCH.md (draft) | Pitch is specific |
| 7. QUEUED | Scout+Mercury+Forge | All above complete | Nero approval |
| 8. APPROVED | Nero | Written approval | Nero signs off |
| 9. SENT | Mercury | Outreach sent | Nero confirms send |
| 10. FOLLOW_UP | Mercury | Follow-up draft | Nero approves |
| 11. WON/LOST | Nero | Outcome logged | Final status |

---

## Pipeline Rules

1. **No skipping stages.** Ever.
2. **No advancing without the required artifact.**
3. **No external contact at any stage without explicit Nero approval.**
4. **Suppression list is checked at every stage.**
5. **If a lead is rejected at any stage, document why.**
6. **Pipeline state is always current in `STATUS.md`.**
