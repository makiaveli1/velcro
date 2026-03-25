# Runbook — Website Audit

_How Scout conducts a thorough, evidence-based website audit._

---

## Purpose

A website audit is the primary artifact for businesses that already have a web presence. It must be specific, evidenced, and honest — not a generic list of observations. Every finding must be tied to something real on the site and connected to why it matters for that specific business.

A weak audit produces a weak concept. A strong audit gives Forge everything they need to produce something genuinely custom.

---

## Before You Start

**Confirm you have:**
- The URL of the website (confirmed working at time of audit)
- Access to the business's Google Business Profile (or notes from your research)
- 2–3 competitor websites identified for context
- Business type and service offering clearly understood

**Confirm audit is warranted:**
- Lead score ≥ 41 (AUDIT-WORTHY or PITCH-WORTHY)
- Business has an existing website (even if just a landing page or dormant domain)

If the business has no website, use the **NO_SITE_BUSINESS_ANALYSIS.md** runbook instead.

---

## Audit Methodology

### Step 1 — Load and Observe (No Tools Yet)

Open the site. Don't use any audit tools. Just use the site as a potential customer would.

**Questions to answer from raw observation:**
- What does this site do? Can you tell in 5 seconds?
- What is the primary action the site wants you to take?
- Does the site look like it was designed in the last 5 years?
- Does the site feel like it represents a serious, established business?
- What would make you trust this business more? (Note this — it's your audit finding)

**Record your raw impression before proceeding.**

---

### Step 2 — Visual & Design Audit

Navigate every page of the site. Screenshot key pages.

**What to evaluate:**
- **Overall aesthetic:** Approximate age, design pattern type, layout approach
- **Typography:** Font choices, hierarchy, readability — do the fonts feel default or considered?
- **Colour palette:** Does it feel intentional? Does it match the business type and tone?
- **Imagery:** Real photos or stock? Professional or amateur? Does imagery build or undermine trust?
- **Logo:** Quality, professionalism, whether it looks homemade or designed
- **Consistency:** Do pages feel like part of the same site?
- **Whitespace:** Does it feel breathe or cluttered?
- **Mobile simulation:** Narrow your browser to ~375px. What breaks? What's invisible? What's hard to tap?

**Estimate the design age:** Based on layout patterns, font choices, visual clichés of specific eras (e.g., "2013–2015 based on flat design choices and hero image style").

---

### Step 3 — Trust Signal Inventory

Go through every page. List every trust signal present and absent.

**Check for:**
- [ ] Physical address (and whether it matches GBP)
- [ ] Phone number (and whether it's mobile-tappable)
- [ ] Email address
- [ ] Business hours
- [ ] "About us" page or section — is it substantive or thin?
- [ ] Customer testimonials (where? how many? real or stock?)
- [ ] Google reviews link or embed
- [ ] Industry certifications, licences, insurance
- [ ] Guarantees or warranty information
- [ ] Privacy policy and terms
- [ ] HTTPS (security)
- [ ] Years in business mentioned
- [ ] Professional associations or memberships
- [ ] Portfolio or work samples
- [ ] Social media links

**For each trust signal present:** Where does it live? How prominent is it? Is it effective or buried?

**For each trust signal absent:** Is this a critical gap for THIS business type? What would it take to build this trust without a website?

---

### Step 4 — CTA and Conversion Review

**Map the path to contact:**

1. When you arrive on the site, what's the first thing you see?
2. Where is the phone number? Is it visible without scrolling?
3. Is there a contact form? How many fields? Is it easy or does it feel like a job application?
4. Is there a booking system? Is it prominent?
5. If on mobile, can you call with one tap?
6. How many clicks/clicks does it take to actually contact them?

**Identify friction points:**
- Conflicting CTAs (multiple things competing for attention)
- Hidden contact information
- Forms that ask for too much
- No clear primary action
- Dead ends (pages that end without a next step)

---

### Step 5 — Content and Messaging Review

**Read the actual content.** Don't skim.

- Headlines: Are they specific to this business or generic? Do they differentiate?
- Service descriptions: Do they explain what they actually do, or is it vague?
- Tone: Formal? Casual? Corporate? Does it match the business type?
- Photography: Real or stock? Does it show their actual work/team/space?
- Copy completeness: Are there sections that end mid-thought? Placeholder text?
- Errors: Typos, broken images, outdated information

**Look for the value proposition:** In 2–3 sentences, what does this business say makes them different and better? Is that claim credible?

---

### Step 6 — Technical Basics (Quick Checks)

- **HTTPS:** Present? (If not present and the business handles any form data, flag as critical)
- **Page title:** Descriptive and specific? Or "Home" or blank?
- **Meta description:** Present? Helps with SEO.
- **Heading structure:** Does the page use H1/H2/H3 hierarchy, or is everything bold text?
- **Image alt text:** Do images have alt attributes? (Open DevTools and check a few)
- **Load speed (rough):** How long does the homepage take to load visually?

This is not a full technical SEO audit — it's an observations-only pass. Flag major issues but don't build an SEO report.

---

### Step 7 — Competitor Context

Look at 2–3 competitor websites you identified during discovery.

**For each competitor:**
- What's better about their site? (Specific)
- What's worse?
- Where does the audited site stand in comparison?

**This context goes into your gap analysis.** We need to know if this business is below market standard or just slightly behind leaders.

---

### Step 8 — The Gap Analysis (Critical)

This is where the audit becomes a pitch enabler.

**Identify the top 3–5 specific, evidenced gaps.**

Each gap must have:
- **What it is** — specific and observable (not "the design is old")
- **Why it matters** — tied to a real business outcome for this specific business
- **What it costs them** — in concrete terms where possible

Example of a strong gap:
> **Gap:** No customer testimonials anywhere on the site.
> **Why it matters:** For a trades business, trust is the primary barrier to a first inquiry. Without third-party validation, every new visitor has only the business's own claims to go on.
> **Cost:** Estimated 20–30% of mobile browsers leave without taking action because they can't verify quality before committing to a call.

Example of a weak gap:
> "The website needs a modern redesign and should be mobile-friendly." ← This is generic.

---

## Audit Output

**Complete `WEBSITE_AUDIT.md`** using the template.

**Save evidence to:**
```
ASSETS/{business-name-slug}/
  ├── homepage-screenshot.png
  ├── mobile-screenshot.png
  ├── trust-signals-screenshot.png
  ├── competitor-a.png
  └── competitor-b.png
```

Screenshots are not mandatory but strongly recommended — they evidence your findings and help Forge understand the context.

---

## Audit Quality Bar

**The audit is complete when:**
- You can articulate the top 3 specific gaps with evidence
- You can explain, in business terms, why each gap costs them
- You could write a 2-sentence pitch hook based on your findings
- A non-technical person could read the audit and understand exactly what's wrong and why it matters

**The audit is NOT complete if:**
- It's a list of generic observations ("needs mobile-friendly design")
- It doesn't connect findings to business outcomes
- It relies on tools for findings that should be obvious from observation
- Forge would not be able to produce a specific concept brief from it

---

## If Audit Reveals a Modern, Well-Functioning Site

If the audit finds the website is actually quite good — modern design, functional, trust signals present, good conversion flow:

- **Re-score the lead immediately** — the opportunity gap is smaller than initially estimated
- **Do not force findings** — if there's no real gap, say so
- The lead may need to be downgraded from PITCH-WORTHY to MONITOR
- Document why the site is actually quite good — this is useful information too

**The goal is not to find problems everywhere. The goal is accurate qualification.**

---

## CRM Mandatory Update — Non-Negotiable

**CRM updates are not optional. Work is not done until the CRM reflects it.**

After completing an audit, you MUST complete the following before reporting back:

1. **Update `LEADS/{slug}/STATUS.md`** — log: audit complete, date, key findings summary, recommendation (ready / needs more research / downgrade / suppress), and specific reasons for any recommendation
2. **Update `CRM/INDEX.md`** — update the lead's stage, last activity date, and next action field
3. **Log rejection/skip reasons** — if recommending downgrade or suppress, state the specific reason in STATUS.md
4. **Set next action** — who does what next, and under what condition

**"Work done but CRM not updated" means work is not done.**
