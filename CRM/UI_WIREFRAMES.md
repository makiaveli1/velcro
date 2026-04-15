# UI Wireframes — Verdantia CRM 2.0

_Structured text wireframes for each major screen. Describe information hierarchy, primary actions, scan patterns, and edge cases._

---

## Screen 1: Dashboard

**Route:** `/` or `/dashboard`
**Purpose:** Today's operational pulse — what needs attention right now

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ◆ Verdantia CRM                                  [⌘K Query] [⚙]        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Dashboard                                    [+ New Contact] [⚙]     │
│  Monday, March 27, 2026                                               │
│                                                                        │
├──────────────────────┬───────────────────┬───────────────────────────┤
│  ● Needs Attention   │  Discovery Queue  │  Follow-ups Today         │
│  4 contacts          │  3 pending        │  2 due                    │
│  [View →]            │  [Review →]       │  [View Queue →]           │
├──────────────────────┴───────────────────┴───────────────────────────┤
│                                                                        │
│  Recent Activity — Last 7 days                              [All →]  │
│  ──────────────────────────────────────────────────────────────────── │
│  ● Mar 27  Sarah O'Brien  Email received — Re: Q2 budget review       │
│  ● Mar 26  James K.       Meeting — 45 min — Project kick-off ✓      │
│  ● Mar 25  Brian McGarry   Follow-up sent ✓                          │
│  ● Mar 24  TechFlow Ltd   Draft proposed — Follow-up on proposal      │
│  ● Mar 23  Lisa M.        Call — 22 min — Pricing discussion           │
│                                                                        │
├─────────────────────────────────────────────────────────────────────── ┤
│  Score Distribution — All Contacts                                     │
│  [████░░░░░ 65-100: 8] [████████░░ 35-64: 14] [██░░░░░░░ 0-34: 3]     │
│                                                                        │
├─────────────────────────────────────────────────────────────────────── ┤
│  Contacts Needing Attention                                            │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 👤 Sarah O'Brien — TechFlow Ltd     Score 28 ━━►━━░░░  Dropped  │
│  │    Last touch: 18 days ago  ·  Overdue follow-up                │
│  │    [Open] [Follow Up Now] [Dismiss]                              │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ 👤 James K. — Freelance              Score 32 ━━░░░░░░  Cold    │
│  │    Last touch: 24 days ago  ·  No active follow-up               │
│  │    [Open] [Create Follow-up] [Mark Low Priority]                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Primary Actions
1. **View Discovery Queue** — most urgent new input
2. **Clear Follow-up** — satisfying completion action
3. **Open Contact** — drill into dossier

### Scan Pattern
Operator scans top row (3 stat cards) → decides which to open → drills into list below.

### Edge Cases
- **Empty dashboard (new install):** "No contacts yet. Connect Outlook to begin discovering relationships." + Connect button.
- **No attention needed:** "All clear. No contacts need attention right now." + celebration state.
- **Loading:** Skeleton cards.

---

## Screen 2: Discovery Queue

**Route:** `/discovery`
**Purpose:** Review contacts discovered from Outlook email and calendar

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Discovery Queue                                    [Auto-Add: OFF]  │
│  3 contacts awaiting review                           [Threshold: 50]  │
│                                                                        │
│  Signal filter: [All ▾]  Sort: [Newest ▾]        [Select all □]      │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ [□]  ●●●○ High signal                                              │ │
│  │                                                                       │ │
│  │  Mark Doyle                                                         │ │
│  │  mark@doyleconstruction.ie  ·  Construction  ·  Dublin             │ │
│  │                                                                       │ │
│  │  Source: Calendar meeting — "Q1 Review" (Jan 15)                   │ │
│  │  Signal: 3 email threads · 2 meetings · Last: Mar 20               │ │
│  │                                                                       │ │
│  │  Email preview: "Hi — following up on the website redesign..."     │ │
│  │                                                                       │ │
│  │  [✓ Approve]  [✕ Reject]  [⏭ Skip + Block Domain]                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ [□]  ●●○○ Medium signal                                             │ │
│  │                                                                       │ │
│  │  Fiona Kane                                                        │ │
│  │  fiona@kaneventdesign.com  ·  Events  ·  Cork                      │ │
│  │                                                                       │ │
│  │  Source: Email thread — "Re: Collaboration opportunity"            │ │
│  │  Signal: 1 email thread · Last: Mar 22                             │ │
│  │                                                                       │ │
│  │  [✓ Approve]  [✕ Reject]  [⏭ Skip Pattern ▾]                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ [□]  ●○○○ Low signal                                               │ │
│  │                                                                       │ │
│  │  noreply@newsletter.ie                                             │ │
│  │  Source: Email sender — no reply                                   │ │
│  │  [✕ Reject]  [⏭ Skip]                                             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────── │
│  Decisions since last auto-add review: 12 / 50                        │
│  [Auto-Add suggestion appears at 50 — you'll be notified]             │
└────────────────────────────────────────────────────────────────────────┘
```

### Primary Actions
1. **Approve** — adds contact to CRM
2. **Reject** — removes from queue, no record
3. **Skip + Block** — adds skip pattern (domain, email prefix) to prevent future noise

### Skip Pattern Builder
When user clicks "Skip + Block":
```
Block pattern:
(•) Block this domain: @doyleconstruction.ie
( ) Block this email prefix: mark@
( ) Block this company: Doyle Construction

Reason (optional):
[Auto-detected as internal/vender noise      ▾]

[Cancel] [Add Skip Rule + Reject]
```

### Edge Cases
- **Queue empty:** "Discovery queue is clear. New contacts from Outlook will appear here."
- **Bulk selection:** Select multiple → [Approve Selected] [Reject Selected]
- **Undo:** Toast "Mark Doyle added to contacts" with [Undo] for 8 seconds

---

## Screen 3: Contacts List

**Route:** `/contacts`
**Purpose:** Full contact list with powerful search and filter

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Contacts                                          [+ Add Contact]     │
│  247 total  ·  8 new this week                                           │
│                                                                        │
│  [🔍 Search contacts...                        ] [⌘K]                  │
│                                                                        │
│  Filters:  Priority [All ▾]   Score [All ▾]   Co. [All ▾]   [Clear]  │
│                                                                        │
│  Sort: [Last Touched ▾]  [↓]                                              │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ○  Name / Company           Score   Priority   Last Touch   Follow-up │
│  ────────────────────────────────────────────────────────────────────── │
│  ●  Sarah O'Brien            28 ━━►━━━░░░  ⚠️ CRITICAL  18 days   ⚠️   │
│     TechFlow Ltd                                                            │
│                                                                        │
│  ○  James K.                 32 ━━━░░░░░░░  HIGH       24 days   —     │
│     Freelance                                                             │
│                                                                        │
│  ○  Brian McGarry            62 ━━━━━━━━░░░  NORMAL      3 days   Mar30 │
│     McGarry Plumbing                                                       │
│                                                                        │
│  ○  Lisa M.                  71 ━━━━━━━━░░░  NORMAL      1 day    —    │
│     Meridian Capital                                                       │
│                                                                        │
│  ●  Robert Walsh            54 ━━━━━━░░░░░  NORMAL      7 days   Apr2  │
│     Walsh & Co Solicitors                                                 │
│                                                                        │
│  ────────────────────────────────────────────────────────────────────── │
│  Showing 1-20 of 247                          [Load More]               │
└────────────────────────────────────────────────────────────────────────┘
```

### Score Display
Visual mini-bar inline: `62 ━━━━━━━━░░░` (10-char width, filled proportional to score)
Color matches score gradient.

### Row Interactions
- Hover: row background shifts to `--bg-overlay`, action icons appear (right side)
- Click row: navigate to Contact Dossier
- Action icons: [💬] [📅] [✉️] [✏️] — log call, create follow-up, create draft, edit

### Filter Panel (Expandable)
```
Priority:   [■] Critical  [■] High  [■] Normal  [■] Low
Score:      [All ▾] or range slider
Company:    [All ▾] — dropdown with autocomplete
Last Touch: [All ▾] / [7 days ▾] / [30 days ▾] / [90+ days ▾]
Tags:       [All ▾] — multi-select
Has:        [□] Follow-up pending  [□] Draft proposed  [□] Overdue
```

### Edge Cases
- **Search no results:** "No contacts match 'xyz'. Try a different search or [Clear filters]."
- **Empty:** "No contacts yet. [Add your first contact] or [connect Outlook to discover]."
- **Loading:** 5 skeleton rows.

---

## Screen 4: Contact Dossier

**Route:** `/contacts/:id`
**Purpose:** Full relationship view for one contact — the heart of the CRM

### Layout — Collapsed (Default View)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back to Contacts                                                    │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ 👤  Brian McGarry                              [Edit] [⋮ More] │
│  │     McGarry Plumbing · Plumber · Dublin                         │
│  │     📧 brian@mcgarryplumbing.ie  📞 086-123-4567               │
│  │                                                                    │
│  │     Score: 62  ━━━━━━━━░░░░  [What affects this? ▾]           │
│  │     Priority:  ⚠️ NORMAL  ·  Last touch: 3 days ago            │
│  │                                                                    │
│  │     Relationship: Client Prospect  ·  Active                    │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ Relationship Summary ──────────────────────────────────────────┐ │
│  │ [Auto-generated · Last updated Mar 25]           [↻ Regenerate]  │ │
│  │                                                                    │ │
│  │ Brian runs McGarry Plumbing, a one-person operation in Dublin... │ │
│  │ Prefers direct phone calls over email. Serious about quality...  │ │
│  │ Key topics: website redesign, local SEO, Google Business...     │ │
│  │                                                                    │ │
│  │ Comms style: Direct, practical. Responds well to short emails.  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Context Cards ─────────────────────────────────────────────────┐  │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐        │  │
│  │ │ 🏢 Business    │ │ 📍 Location    │ │ 💡 Prefers    │        │  │
│  │ │ McGarry Plumb- │ │ Dublin 12     │ │ Phone over    │        │  │
│  │ │ ing, 1-person │ │ Residential    │ │ email         │        │  │
│  │ └────────────────┘ └────────────────┘ └────────────────┘        │  │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Timeline ───────────────────────────────────────────────────────┐  │
│  │ ● Mar 24 — Draft proposed: Follow-up on proposal     [View →]  │  │
│  │ ● Mar 20 — Meeting: 45 min — Project kick-off ✓               │  │
│  │ ● Mar 15 — Email sent — Re: Website proposal                  │  │
│  │ ● Mar 12 — Discovery: approved from queue                      │  │
│  │                              [Show full timeline (12 entries)]  │  │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Follow-ups ─────────────────────────────────────────────────────┐  │
│  │ ⚠️ Due Mar 30 — "Follow up on proposal decision"    [Snooze ▾] │  │
│  │ ✓ Completed Mar 15 — "Send proposal document"                   │  │
│  │                         [+ Add Follow-up]                       │  │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  [✉️ Generate Draft]  [📅 Create Follow-up]  [📞 Log Call]            │
└────────────────────────────────────────────────────────────────────────┘
```

### Layout — Expanded (Timeline Tab)

Switch between Summary / Timeline / Context / Drafts tabs:

```
│  [Summary]  [Timeline]  [Context]  [Drafts]  [Company]  │
```

**Timeline tab:**
Full chronological interaction list with expand/collapse per entry.
Meeting entries show action items inline:
```
● Mar 20 — Meeting: Project kick-off — 45 min
   ├─ ✓ Action: Send contract draft — James K.
   ├─ ○ Action: Schedule design review — Brian McGarry  
   └─ ○ Action: Set up Google Analytics — James K.
```

### Score Breakdown (What Affects This?)

Click on score → inline expandable:

```
Relationship Score: 62 / 100
────────────────────────────────────────────────
Recency (max 30pts)     18 / 30
  Last interaction: 3 days ago ✓

Frequency (max 25pts)   12 / 25
  ~2.5 interactions/month (target: 4+)

Priority (max 20pts)     8 / 20
  Priority level: Normal

Signal Quality (max 25pts)  19 / 25
  Mix: meeting + email (mixed = higher)
  Auto-detected as active prospect

────────────────────────────────────────────────
[How is this calculated? →]
```

### Primary Actions
1. **Generate Draft** — opens draft flow
2. **Create Follow-up** — inline form
3. **Log Interaction** — log email/call/note without leaving page

### Edge Cases
- **New contact (no data):** Summary shows "Not enough data yet. Interact with this contact to build their profile." + [Log first interaction].
- **No company:** Company card hidden.
- **No follow-ups:** "No follow-ups set. [Create one →]".

---

## Screen 5: Companies

**Route:** `/companies`
**Purpose:** Company-level view — all contacts at an org, news, activity

```
┌────────────────────────────────────────────────────────────────────────┐
│  Companies — 34 organizations                                          │
│                                                                        │
│  [🔍 Search companies...]                                              │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 TechFlow Ltd                                                   │ │
│  │    techflow.ie  ·  Technology  ·  Dublin                          │ │
│  │    3 contacts  ·  Score avg: 54  ·  Last activity: 2 days ago   │ │
│  │                                                                    │ │
│  │    [Sarah O'Brien 71] [Robert Walsh 54] [Chris L. 38]            │ │
│  │                                                                    │ │
│  │    News: 1 item  ·  [View Company →]                             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Meridian Capital                                              │ │
│  │    meridiancapital.ie  ·  Finance  ·  Dublin                     │ │
│  │    1 contact  ·  Score avg: 71  ·  Last activity: 1 day ago       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Company Detail View

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back to Companies                                                   │
│                                                                        │
│  TechFlow Ltd                                          [Edit] [⋮]     │
│  techflow.ie  ·  Technology  ·  Dublin  ·  ~50 employees               │
│                                                                        │
│  ┌─ Contacts (3) ──────────────────────────────────────────────────┐   │
│  │  Sarah O'Brien (CEO) — 71 ━━━━━━━━░░  [Open →]               │   │
│  │  Robert Walsh (CTO) — 54 ━━━━━━░░░░  [Open →]                │   │
│  │  Chris L. (Dev) — 38 ━━━░░░░░░░░░  [Open →]                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ News ──────────────────────────────────────────────────────────┐   │
│  │ ● Mar 25 — TechFlow raises €2M Series A — Silicon Republic    │   │
│  │   Signal: funding ·  [View source →]                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─ Activity Summary ─────────────────────────────────────────────┐   │
│  │  Across all contacts: 12 interactions this month              │   │
│  │  Most recent: Mar 24 — Sarah O'Brien · Email received          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 6: Follow-ups Queue

**Route:** `/followups`
**Purpose:** All pending follow-ups — manage, snooze, complete

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Follow-ups                                                              │
│                                                                         │
│  [Today (2)] [This Week (4)] [Overdue (1)] [All (18)]    [+ New]      │
│                                                                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ⚠️ OVERDUE — 1                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📅 Sarah O'Brien — TechFlow Ltd                                  │  │
│  │    "Confirm meeting time for Q2 review"                          │  │
│  │    Was due: Mar 25  ·  2 days overdue                            │  │
│  │                                                                    │  │
│  │    [Complete ✓]  [Snooze ▾]  [Edit]  [Delete]                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  TODAY — 2                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📅 Brian McGarry — McGarry Plumbing                              │  │
│  │    "Follow up on proposal decision"                              │  │
│  │    Due: Today                                                    │  │
│  │    [Complete ✓]  [Snooze ▾]  [Edit]                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📅 Robert Walsh — Walsh & Co                                     │  │
│  │    "Send contract amendment"                                     │  │
│  │    Due: Today (recurring: weekly)                                │  │
│  │    [Complete ✓]  [Snooze ▾]  [Edit]                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  THIS WEEK — 4                                                         │
│  ...similar cards...                                                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Snooze Options
```
Snooze:
( ) 1 hour
( ) Today evening
( ) Tomorrow morning
( ) In 3 days
( ) Next week
(•) Custom: [___________] 
[Cancel] [Snooze]
```

### Edge Cases
- **Empty:** "All clear. No pending follow-ups."
- **Recurring indicator:** Small 🔁 badge + "Weekly" label

---

## Screen 7: Meetings

**Route:** `/meetings`
**Purpose:** Meeting feed from Graph calendar — summaries and action items

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Meetings                                                              │
│  [Past ▾] [Upcoming]                          [Sync from Outlook ↻]    │
│                                                                         │
│  ── UPCOMING (3) ───────────────────────────────────────────────────── │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📅 Wed, Apr 2 · 10:00 AM — 10:45 AM                              │  │
│  │    Q2 Planning Session                                           │  │
│  │    Attendees: Sarah O'Brien, Robert Walsh, Chris L.               │  │
│  │    [Join →]                                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ── PAST (recent) ──────────────────────────────────────────────────── │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📅 Mar 20 · 2:00 PM — 45 min                           [Summary ▾] │  │
│  │    Project kick-off call                                          │  │
│  │    Attendees: Brian McGarry                                       │  │
│  │                                                                    │  │
│  │    Summary: Discussed website scope, timeline, and budget...       │  │
│  │                                                                    │  │
│  │    Action Items (1):                                              │  │
│  │    ○ Send contract draft to Brian — due: Mar 27                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📅 Mar 18 · 11:00 AM — 30 min                           [Summary ▾] │  │
│  │    Discovery call — Lisa M.                                       │  │
│  │    ...                                                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Edge Cases
- **No meetings:** "No meetings synced from Outlook. [Connect Outlook →]"
- **No summary yet:** "Summary being generated..." with spinner, then reveal

---

## Screen 8: Draft Workspace

**Route:** `/drafts`
**Purpose:** Email draft management with two-phase approval

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Email Drafts                                            [⚙ Settings]   │
│                                                                         │
│  [Proposed (2)] [Approved (1)] [History (12)]                          │
│                                                                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PROPOSED — 2 drafts awaiting approval                                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ To: brian@mcgarryplumbing.ie                                      │  │
│  │ Subject: Following up — Website Proposal                          │  │
│  │ Contact: Brian McGarry · Created: Mar 24, 10:30 AM                 │  │
│  │                                                                       │ │
│  │ Context used:                                                      │  │
│  │ • Last contact: Mar 20 (meeting — project kick-off)               │  │
│  │ • Follow-up reason: "Follow up on proposal decision"              │  │
│  │ • Company: McGarry Plumbing, 1-person operation                  │  │
│  │                                                                       │  │
│  │ ─────────────────────────────────────────────────────────────    │  │
│  │ Hi Brian,                                                         │  │
│  │                                                                       │  │
│  │ Following our call on Tuesday, I'm sending over the revised...     │  │
│  │ ─────────────────────────────────────────────────────────────    │  │
│  │                                                                       │  │
│  │ [Preview Full Draft]  [Approve ✓]  [Request Changes]  [Discard]  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ To: fiona@kaneventdesign.com                                      │  │
│  │ Subject: Re: Collaboration opportunity                            │  │
│  │ [Preview]  [Approve ✓]  [Request Changes]  [Discard]             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Draft Preview (Expand)
Full email shown in a read-only compose-like view:
```
From: Gbemi <gbemi@verdantia.ie>
To: brian@mcgarryplumbing.ie
Subject: Following up — Website Proposal

---

Hi Brian,

Following our call on Tuesday, I'm sending over the revised proposal 
document as discussed. 

Quick recap of what we covered:
• Timeline: 4-6 weeks from sign-off
• Investment: €2,400 - €3,200 (depending on scope)
• Next step: Your review and any questions

I've attached the proposal PDF. Happy to jump on a quick call if 
easier — let me know.

Best,
Gbemi

---
⚙️ Generated by Verdantia CRM · [View full context →]
```

### Edge Cases
- **Drafts disabled:** "Email drafts are currently disabled. [Enable in Settings →]"
- **Empty proposed:** "No drafts pending approval."
- **Feature gate notice:** First-time users see "Email drafts require approval before sending. This is intentional — you're always in control."

---

## Screen 9: Settings

**Route:** `/settings`
**Purpose:** Configuration, connections, feature flags

### Sections

```
┌────────────────────────────────────────────────────────────────────────┐
│  Settings                                                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Microsoft Outlook ──────────────────────────────────────────────┐   │
│  │  [●] Connected as: gbemi@verdantia.ie                          │   │
│  │  Permissions: Contacts · Calendar · Email                       │   │
│  │  Last sync: 10 minutes ago                          [Sync Now]  │   │
│  │                                                    [Disconnect] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Contact Discovery ─────────────────────────────────────────────┐   │
│  │  Auto-add mode:  [OFF ▾]                                        │   │
│  │     Currently: Manual approval required for all contacts        │   │
│  │                                                                   │   │
│  │  Decisions made: 12 / 50                                        │   │
│  │  ████████████░░░░░░░░░░░░░░░░░░  24%                          │   │
│  │                                                                   │   │
│  │  At 50 decisions, you'll be asked if you want to enable auto-add  │   │
│  │                                                                   │   │
│  │  Discovery sources:                                              │   │
│  │    [✓] Outlook email threads                                    │   │
│  │    [✓] Calendar meetings                                        │   │
│  │    [ ] LinkedIn (coming soon)                                    │   │
│  │                                                                   │   │
│  │  Noise filters:                                                   │   │
│  │    [✓] Block newsletters and noreply                            │   │
│  │    [✓] Block internal/company domains                            │   │
│  │    [✓] Block meetings with 10+ attendees                         │   │
│  │    [+ Add domain filter]                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Relationship Intelligence ────────────────────────────────────┐   │
│  │  Score auto-update:  [Daily ▾]                                   │   │
│  │  Summary generation:  [Weekly ▾]                                 │   │
│  │  Nudge notifications:  [Enabled ▾]                              │   │
│  │                                                                   │   │
│  │  LLM Provider:  [OpenAI ▾]  Model: [gpt-4o-mini ▾]              │   │
│  │  Embeddings:   [Local (Ollama) ▾]  Model: [nomic-embed-text ▾] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Email Drafts ──────────────────────────────────────────────────┐  │
│  │  [✓] Enable email draft generation                              │  │
│  │                                                                   │  │
│  │  ⚠️ Safety: All drafts require explicit approval before         │  │
│  │     they can be created in your email client                    │  │
│  │                                                                   │  │
│  │  Draft tone:  [Professional ▾]                                  │  │
│  │               (Professional / Warm / Casual)                     │  │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Daily Digest ──────────────────────────────────────────────────┐  │
│  │  [✓] Send daily digest to webchat                               │  │
│  │  Time: [9:00 AM ▾]                                              │  │
│  │  Quiet hours: [OFF ▾] — no digest on weekends                   │  │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Data ───────────────────────────────────────────────────────────┐  │
│  │  Export all contacts: [Export CSV →]  [Export JSON →]           │  │
│  │  Import contacts:   [Import →]                                  │  │
│  │  Danger zone:       [Delete all data →]                         │  │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 10: NL Query Interface

Not a separate route — embedded in the app shell (query bar at top). Also available as a full-screen overlay (`⌘K`).

### Query → Results Mapping

| Query Pattern | Response |
|---|---|
| `Tell me about [name]` | Contact dossier link + score + last touch |
| `Who at [company]?` | Company card with all contacts |
| `Follow up with [name] in [time]` | Creates follow-up, confirms |
| `Who needs attention?` | Contacts with score < 40 or overdue follow-ups |
| `What changed this week?` | Activity digest: new contacts, interactions, score changes |
| `Stats` | Dashboard stats snapshot |
| `Create a follow-up for [name]` | Follow-up creation form |
| `Show my contacts sorted by score` | Contacts list, sorted |
| `[clear]` | Dismisses results |

### Fallback (low confidence)
```
🤔  Not sure I understood that.
Try: "Tell me about [name]", "Who at [company]?", "Who needs attention?"
[Open full search →]
```

---

## Edge Cases Across All Screens

| Scenario | Handling |
|---|---|
| Network error loading data | Toast: "Couldn't load contacts. [Retry]" + cached data shown if available |
| No Outlook connected | Full-screen connect prompt on Discovery / Meetings / Dashboard sections |
| Slow data load | Skeleton screens, not spinners |
| Very long name/company | Truncate with ellipsis at 2 lines |
| 1000+ contacts | Virtual scrolling (pagination or infinite scroll) |
| Draft approved but email fails | Status changes to "approval_failed" + alert + manual retry option |
| Auto-add threshold reached | Modal: "You've made 50 decisions. Enable auto-add mode?" + explain what it means |

---

## Interaction Principles Summary

1. **One primary action per screen** — make it obvious and easy
2. **Progressive disclosure** — show summary, reveal detail on click/hover
3. **Inline creation** — create follow-ups, log interactions without leaving the dossier
4. **Keyboard-first** — ⌘K for search, arrow keys for lists, Enter to confirm
5. **Undo by default** — destructive actions have 8-second undo window
6. **Confirmation for irreversible actions** — bulk delete, suppress contact, clear data
7. **No silent mutations** — every API write shows immediate optimistic UI update with rollback on failure
