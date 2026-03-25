# Runbook — Lead Discovery

_How Scout finds and logs high-quality leads._

---

## Purpose

Lead discovery is the entry point of the entire system. If Scout finds the wrong leads, everything downstream suffers. This runbook defines exactly how to find leads that are worth pursuing — and how to avoid wasting time on businesses that aren't.

**Principle:** Better to find 5 excellent leads than 50 mediocre ones.

---

## Where to Look

### Primary Sources (High Quality)

**1. Local Search — Google Maps / Google Business Profile**
- Search for business categories in target geography
- Example: "plumbers Dublin 2", "physiotherapy South Dublin", "electricians Dublin"
- What to look for: GBP listings without a website link, outdated website links, social-only listings
- Why it's good: These are people who care about local presence but haven't invested in a proper website

**2. Directory Scans — TrueROI, Golden Pages, Yelp, Bord Bia (food), etc.**
- Systematic scans of directory categories in target geography
- What to look for: Businesses without websites or with obvious outdated sites
- Why it's good: Directory data is structured and often has recent information

**3. Review Sites — Google Reviews, TrustPilot, Houzz, Booking sites**
- Find businesses with strong reviews but weak digital presence
- What to look for: High-review-count businesses with no website, or websites that don't match their review volume
- Why it's good: Active positive reviews = real, operational business

**4. Competitor Context**
- When researching a business, note their competitors
- A competitor with a weak site is a potential lead
- Note: do NOT pitch competitors of businesses we're already working with

### Secondary Sources (Use with Judgment)

**5. Industry-Specific Directories**
- e.g., The RSAI for trades, ISCP for complementary therapy, FHI for hospitality
- Good for targeted category research
- Quality varies — verify legitimacy before adding

**6. Local News / Community Sites**
- New business openings, business awards, local press mentions
- Good for finding legitimate new businesses
- Quality signal — they've been publicly recognised

**7. Google Alerts**
- Set alerts for "[category] Dublin" and similar
- Catch new entrants who may not have websites yet
- Low effort, long-term lead flow

---

## What Signals to Score

When evaluating a potential lead, check these before opening a full scorecard:

### Instant Disqualifiers
- No Google Business Profile and no other online presence — can't verify legitimacy
- Business appears to be a chain or franchise with existing corporate web presence
- Obvious template/site that looks modern and functional
- Business is in a category with no digital customer journey (very rare)
- Search shows the business is already well-served by a modern, high-quality website

### Green Flags (High Opportunity Signals)
- Active GBP with reviews but no website link
- Social media page with good following/engagement but no website
- Directory listing that hasn't been updated since 2018 or earlier
- A website that clearly hasn't been touched in 5+ years
- Competitors have significantly better websites
- Business with clear service offering, address, and phone but no website
- Business receiving community recognition (awards, press, etc.) with weak online presence

---

## How to Research a Lead (Fast)

Target time: 5–8 minutes per lead for initial qualification.

**Step 1 — Google Business Profile check**
- Search the business name + location
- Is there a GBP? Is it complete? How many reviews? What's the rating?
- Does the GBP link to a website? Is the website functional?

**Step 2 — Quick website check (if site exists)**
- Open the website
- Spend 30 seconds: does it look modern or outdated?
- Is it mobile-friendly? (Test with a narrow browser window)
- Does it have clear trust signals and contact info?
- Is there a Google Maps embed, contact form, phone number?

**Step 3 — Competitive context**
- Search for 2–3 similar businesses in the area
- Are competitors doing significantly better online?
- What's the market baseline?

**Step 4 — Legitimacy check**
- Can you find a business address, phone number, and business name consistently?
- Are there any red flags (BBB complaints, legal issues, no reviews at all despite being established)?

**Step 5 — Scoring**
Run the scorecard. If score ≥ 41, proceed to full research. If score 26–40, mark as MONITOR and note why.

---

## How to Log a Lead

**Creating the lead folder:**
```
LEADS/{business-name-slug}/
```

**Initial file to create:** `LEAD_RECORD.md` (from TEMPLATES/)

**Minimum required for LEAD_FOUND stage:**
- Business name (exact)
- Location (area, not full address unless public)
- Business category
- Initial signal observed
- Source (how found)
- Initial score (at least Section A + Section B completed)
- Date found

**Do not create a lead folder for businesses you haven't at least briefly researched. No placeholder folders.**

---

## How to Avoid Junk Leads

**Junk leads look like:**
- Businesses that are clearly not operational (closed, abandoned, etc.)
- Sole traders with no online presence at all and no evidence of active customer base
- Businesses in categories where digital presence doesn't matter
- Businesses with no differentiation from competitors (and therefore no concept angle)
- Businesses that are already being pitched by every other web design service in Dublin

**How to avoid them:**
- Always check the GBP and reviews before adding
- If a business has zero reviews and no directory presence, dig deeper before adding
- If a business is listed on 15 different web design service websites as a client, skip it
- Quality check: could you write a specific, evidenced opening hook for this business? If not, skip it.

---

## Lead Volume Guidelines

- Maximum 20 new leads per week
- Maximum 50 leads in active research queue at any time
- If queue is full: pause discovery, focus on processing existing leads
- Quality of qualified leads matters more than quantity found

---

## Discovery Session Structure

When running a discovery session:

1. Choose a category and geography (e.g., "Dublin 2 plumbers" or "South Dublin physiotherapists")
2. Search systematically — don't just grab the first 5 results
3. Score each lead quickly (5–8 minutes)
4. Only add leads scoring 41+ to the pipeline
5. Save 41–55 scores as AUDIT-WORTHY, 56+ as PITCH-WORTHY
6. Log all findings in the CRM immediately after the session

**Do not let discovery run unsupervised for extended periods without reviewing outputs. Check weekly.**

---

## Discovery Complete

When discovery session is done:
- Update CRM/INDEX.md with new leads
- Notify Nero of new leads requiring assignment
- Set MONITOR leads with a review date if appropriate

---

## CRM Mandatory Update — Non-Negotiable

**CRM updates are not optional. Work is not done until the CRM reflects it.**

After any discovery session or lead action, you MUST complete the following before reporting back:

1. **Create lead folders** — for every qualified lead found, create `LEADS/{slug}/LEAD_RECORD.md`
2. **Update `CRM/INDEX.md`** — add all new leads with name, category, score, stage, source, and date found
3. **Log rejected leads** — for every lead reviewed and rejected, note the reason in your session notes (name, score, reason rejected)
4. **Update each `STATUS.md`** — for each new qualified lead, create STATUS.md with stage LEAD_QUALIFIED, date, and next action
5. **Set suppression** — any lead that meets suppression criteria must be added to `CRM/SUPPRESSION.md` immediately

**"Work done but CRM not updated" means work is not done.**
