# SimSuite Inbox UI — Redesign Review
**Date:** 2026-03-27
**Agents:** Ariadne (Studio/UI-UX), Scout (Orion/Research-IA), Forge (Hephaestus/Engineering), Sentinel (Argus/Devil's Advocate)
**Status:** COMPLETE — Full Synthesis

---

## 1. Executive Summary

The SimSuite Inbox has a solid architectural foundation being undermined by execution problems. The five-zone layout (nav rail → sidebar → top bar → queue → bottom panels) is fundamentally sound. The queue lane model is correct. The dark Sims aesthetic with gold accents works. What fails is the **information architecture on top of that structure**: three redundant displays of the same data, a bottom panel that consumes 40% of viewport for nothing, color coding that conflates status with interaction state, and a Creator view that dumps full technical detail without hierarchy.

The three views — Casual, Seasoned, Creator — are not differentiated enough to justify their existence. Seasoned is almost visually identical to Casual. Creator has appropriate ambition but no structural discipline. All three share the same redundant displays.

**The core fix is information discipline, not visual overhaul.** Remove duplicates, enforce single sources of truth, collapse zero-state panels, progressively disclose archive contents, dim the sidebar so the queue earns attention, and give each view a distinct density contract.

**Estimated total implementation effort:** 3-5 days across three phases.

---

## 2. What's Actually Wrong

### Root Cause: Information Architecture Failures

**A. Three instances of the same timestamp** — The "Last check" timestamp appears identically in the top bar, the inner sidebar, and the main content header. This is not triple reinforcement. It is triple tax on visual processing. Every scan of the inbox forces the eye to re-confirm the same information three times. It answers exactly one question. Show it once.

**B. Status pills displayed twice** — "8 items | 0 ready | 2 needs review | 4 blocked" appears in the top bar and is redundantly present in the sidebar. The sidebar queue lanes already convey this information in a more actionable form (Ready now (0), Waiting (1), Blocked (3), Done (4)). The pills add broadcast anxiety without adding navigational value.

**C. Queue lanes shown in two locations simultaneously** — The queue lane list (Ready now, Waiting, Blocked, Done, etc.) appears in the left sidebar AND as the active filter/tab row in the main content area. This is not progressive disclosure. This is double exposure. The user processes two identical categorization systems in parallel, creating decision fatigue before they've even acted on anything.

**D. Bottom Decision Needed panel showing all zeros** — Four categorization boxes (SAFE 0, REVIEW 0, ALREADY FINE 0, PREVIEW 0) occupy approximately 20% of vertical viewport permanently. This is not scaffolding. It is a permanent fixture that communicates nothing, signals a feature the user cannot yet use, and pushes actionable content further down the page.

**E. Preview panel empty state is verbose** — The empty state reads like a paragraph: "Select a staged archive or file batch to load the correct inbox preview." It occupies more vertical space than an unselected item card. Empty states should communicate what belongs there in one line, not explain a failure state in four.

**F. Color system conflates three semantic roles** — Orange = review/attention, Red = blocked/error, Gold = active/selected, Green = watching. On a dark theme with borders around every element, these compete rather than complement. More critically: the most alarming information (blocked items in orange/red) gets the most visual prominence, while the most actionable information (items waiting on the user) is comparatively muted. The hierarchy is inverted.

**G. Creator view dumps full detail without structure** — The Creator view shows all 14 files inside an archive by default, with no priority indication (new vs. modified vs. primary script). A Creator needs this detail — but needs it organized, not listed. The difference between Creator and Seasoned is "more stuff visible" rather than "same stuff, better organized."

**H. Blocked items are visually dominant over actionable items** — "Blocked (3)" and "4 blocked" in red/orange receive more visual weight than "Waiting on you (1)" — which is the queue that actually requires user action. A blocked item is blocked by external factors. A waiting item is waiting on the user. Visual priority should reflect action priority.

### The Diagnosis, Not Just the Symptoms

Sentinel correctly identified the meta-problem: these findings are symptoms of a deeper issue. The real question is **"what workflow are we optimizing for, and for whom?"** The symptoms above are what happens when an app tries to be all things to all users without establishing clear density contracts per view. Each view should have a explicit answer to: *what does this user need to see at a glance, and what should require interaction?*

---

## 3. What Each View Should Optimize For

### Casual — "The Pre-Filtered Assistant"
**User:** Someone who checks in occasionally, wants to be guided, is not a power user, may not know what a mod conflict is.

**Core job-to-be-done:** Get notified → make one simple decision → done.

**Density contract:** Low. Show only what requires action. Hide everything else.

**What they need at a glance:**
- How many things need my attention right now?
- What are they? (simple names, not file manifests)
- What do I do? (one clear action per item)

**What they do NOT need:**
- Blocked counts (alarming, not actionable without context)
- File-level detail inside archives
- Technical status language
- Empty panels showing decision-support they can't use yet

**Target feeling:** "This is under control. Someone already filtered the hard stuff. I just need to say yes or no."

### Seasoned — "The Professional Cockpit"
**User:** Daily user who knows the system, wants efficiency, understands queue mechanics, wants to move fast.

**Core job-to-be-done:** Triage fast. Know queue state at a glance. Act without friction.

**Density contract:** Medium. Information-dense where it matters, sparse where it doesn't.

**What they need at a glance:**
- Queue state: how many in each lane?
- What changed since last session? (new items, items that moved)
- Why is something waiting? (not just that it's waiting)
- Quick access to secondary filters

**What they do NOT need:**
- The same queue lane display in two places
- Repeated status text explaining what "Waiting on you" means
- Full archive contents visible by default

**Target feeling:** "I know exactly where I am. I can move through this queue without thinking. Every pixel is earning its keep."

### Creator — "The Technical Workbench"
**User:** Mod creator or power user who understands dependencies, file versions, and conflict chains. Lives in this tool daily.

**Core job-to-be-done:** Full transparency. See everything relevant, collapse what isn't, make precise decisions about conflicts and dependencies.

**Density contract:** High. Everything visible if needed, everything collapsible when not.

**What they need at a glance:**
- Full file contents of archives (which files, which versions, which are new/modified)
- Dependency chains and conflict maps
- Precise decision context (why is this waiting? what conflicts exist?)
- Full receipts: where did this come from, what version is it, what does it replace?

**What they do NOT need:**
- Simplified summaries that strip technical detail
- Zero-state decision panels taking up space
- Visual hand-holding on queue mechanics

**Target feeling:** "I have complete information. I can see exactly what I need. The interface gets out of my way when I'm working fast and lets me dig when I need to."

---

## 4. Recommended Redesign: CASUAL

### Layout Changes

| Zone | Current | Recommended |
|---|---|---|
| Top bar | Status pills visible (anxiety-inducing) | Status pills moved to hover drawer; top bar shows only view tabs + one-line queue summary |
| Sidebar | Workspace + queue lanes + search (all visible) | Workspace collapsed by default; queue lanes simplified to single active-lane indicator |
| Main queue | Filter row + item cards + full file lists | Filter row replaced with breadcrumb; item cards show only filename + one action button |
| Bottom panels | Decision Needed + Preview (40% viewport, both visible) | Both panels collapsed to single 1-line summary bar: "1 decision needed" — expands only on tap |

### Specific UI Changes

1. **Remove top bar status pills entirely.** Replace with: a single, muted summary line in the breadcrumb area — "3 items in queue, 1 needs you." Casual users don't need the breakdown.

2. **Collapse the workspace sidebar section.** The folder path, Watching toggle, and "6 active items" are irrelevant to a Casual user making their first decision. Show a single line: "Watching: Downloads" with a collapsed expander. Restore on tap.

3. **Show queue lanes in sidebar ONLY, as a simple list.** Remove the filter row from the main content area entirely. The sidebar is navigation; the main area is content. Don't mix them.

4. **Item cards for Casual: filename + one action.** No creator tags, no file counts, no "Rechecked" chips. Just: "McCmdCenter_AllModules" + a prominent "Review" or "Approve" button. Everything else is behind the card expansion.

5. **Expand card → shows why it needs review.** One clear explanation: "This conflicts with a version already in your inbox." That's it. No ts4script file lists. No technical detail. Just the conflict explanation.

6. **Bottom panels: collapsed by default.** A single muted bar: "Decision needed: 1 item" — tap to expand if the user wants more context. Do not occupy 40% of viewport with empty panels.

7. **Dim the sidebar to 60% brightness.** The main queue area is where the Casual user lives. The sidebar should recede visually — it's not their primary workspace.

### Density Target for Casual
```
┌─────────────────────────────────────────────────────┐
│ INBOX │ SEASONED │ BALANCED │ SNUG │ PATCH DAY     │
│                    [3 in queue, 1 needs you]   ⚙️   │
├────┬──────────────────────────────────────────────┤
│ ▼  │  Waiting on you                        1 item │
│    │  ────────────────────────────────────────────  │
│    │                                              │
│    │  McCmdCenter_AllModules_2026_1_1.zip         │
│    │  [Review ▼]                                  │
│    │                                              │
│    │  ──────────────────────────────────────────── │
│    │  ▌ Decision needed: 1 item          ▼       │
└────┴──────────────────────────────────────────────┘
```

---

## 5. Recommended Redesign: SEASONED

### Layout Changes

| Zone | Current | Recommended |
|---|---|---|
| Top bar | Status pills visible (same as Casual) | Condensed status strip with hover-reveal drawer; one-line summary visible |
| Sidebar | Full workspace + queue lanes + search | Workspace section stays visible; queue lanes stay; search prominent |
| Main queue | Filter row (redundant with sidebar) + item cards | Remove filter row; sidebar lanes ARE the filter; item cards show moderate detail |
| Bottom panels | Both visible at 40% | Decision panel collapses to 2-line summary when empty; Preview stays compact |

### Specific UI Changes

1. **Top bar: condense status pills to a single icon row.** Compact pills (just the numbers, no labels): `8 │ 0 │ 2 ⚠ │ 4 ✕` — click/hover reveals a drawer with full labels and explanations. Status information preserved, prime real estate freed.

2. **Keep sidebar workspace section visible.** A Seasoned user is checking this daily. They want to see the folder path and watching state without clicking. Keep it but reduce font size.

3. **Remove the queue lane filter row from main content area.** The sidebar lanes are the navigation. Don't show both. The filter row should be eliminated entirely — or replaced with a single active lane breadcrumb in the content header.

4. **Item cards for Seasoned: moderate disclosure.** Show: filename, creator tag, item status (e.g., "Waiting — conflict"), and quick metadata (archive vs. single, file count). Do NOT show file lists by default. Show a compact "Why is this waiting?" explanation inline.

5. **Surface WHY items are waiting, not just that they are.** Seasoned users have seen "Waiting on you" 100 times. They don't need it relabeled. They need: "Waiting — fuller version of mc_cmdcenter already in queue." Give the reason, not the status.

6. **Show queue trend indicators.** Add a small inline signal: "↗ 2 new since this morning" or "↓ 3 resolved" in the main content header. Seasoned users want to know if the queue is moving.

7. **Decision panel: collapse to 2-line summary when empty.** "Decision needed: 0 items. All clear." — tap to expand the full panel if needed. Don't show four empty boxes.

8. **Bottom panel max height: 30% when populated.** The panel is useful for Seasoned users but shouldn't crowd the queue. Set a max-height and scroll within it.

### Density Target for Seasoned
```
┌──────────────────────────────────────────────────────────┐
│ INBOX │ SEASONED │ BALANCED │ SNUG │ PATCH DAY          │
│  8 │ 0 │ 2⚠ │ 4✕        ↗2 new  [Review] [⚙]          │
├────┬────────────────────────────────────────────────────┤
│📁  │  Downloads  [Watching]                               │
│👁  │  ─────────────────────────────────────────────────  │
│    │  Ready now (0)  │  Waiting on you            1      │
│    │  Special (0)    │  ↳ fuller version in queue        │
│    │  Waiting (1)    │                                │
│    │  Blocked (3)    │  McCmdCenter_AllModules.zip      │
│    │  Done (4)       │  mc · Archive · 14 files         │
│    │  Rejected (0)  │  [Rechecked] [Linked 2]          │
│────│─────────────────────────────────────────────────── │
│ 🔍 │  ▌ Decisions: 0 — All clear              [▼]      │
└────┴────────────────────────────────────────────────────┘
```

---

## 6. Recommended Redesign: CREATOR

### Layout Changes

| Zone | Current | Recommended |
|---|---|---|
| Top bar | Status pills + "CREATOR" tab + "FULL RECEIPTS" | Keep status pills (they're useful here), add "Full receipts" as a toggle within the view, not a separate tab |
| Sidebar | Full queue lanes + creator-specific context | Keep all lanes; add Creator-specific quick filters (My Uploads, Dependencies, Conflicts) |
| Main queue | Item cards with full file manifests visible | Structured file manifests with priority/new/modified flags; clear primary action per file |
| Bottom panels | Decision Needed (all zeros) + Preview | Decision panel: ONLY visible when populated; Preview panel: full-width, collapsed by default |

### Specific UI Changes

1. **Status pills stay in top bar for Creator.** A Creator checking their inbox wants full system state at a glance. The broadcast-style status pills are appropriate here — they're not overwhelming for this user type.

2. **Rename "FULL RECEIPTS" tab to something functional.** "Full Receipts" is opaque. If this serves the function of showing complete diagnostic history, call it "DIAGNOSTICS" or "FILE HISTORY." Clarity over cleverness.

3. **Structure archive file lists with priority indicators.** Don't show 14 files in a flat list. Show:
   - **Primary scripts** (bold, top) — the main mod entry points
   - **New files** (green badge) — files not previously in the user's library
   - **Modified files** (yellow badge) — existing files with version changes
   - **Standard files** (muted) — everything else, collapsible
   
   This transforms a flat 14-item list into a structured 3-tier hierarchy.

4. **Decision Needed panel: visible ONLY when populated.** When counts are all zero, the Decision panel should not render at all. Not collapsed — absent. Space reclaimed. When it has content: full 4-box layout, each box shows the actual item names, not just counts.

5. **Creator gets a Conflict Map panel.** Expand the Decision Needed panel concept into a visual conflict/dependency map — showing which items conflict with which, which files are shared, which versions are newer. This is the Creator-specific superpower that Casual and Seasoned don't need.

6. **Bottom panels: tabbed Context Rail.** Preview | Decisions | Conflicts — tab switcher at the bottom of the screen. Each tab shows relevant content only. Empty tabs don't render. Max 25% viewport for the entire rail.

7. **Item cards in Creator: full transparency, well-organized.** Show filename, creator, version, file count, full file list with priority flags, conflict explanation, and dependency links. This is the correct density for this user type. The issue is not how much is shown — it's that it's shown without hierarchy.

8. **Add "Compare" action for Creator.** A Creator comparing two versions of the same mod needs a side-by-side or diff view. This should be a primary action available from the item card.

### Density Target for Creator
```
┌────────────────────────────────────────────────────────────────┐
│ INBOX │ CREATOR │ SNUG │ PATCH DAY                            │
│  8 │ 0 │ 2⚠ │ 4✕        [DIAGNOSTICS]  [⚙]                   │
├────┬──────────────────────────────────────────────────────────┤
│📁  │  Downloads  [Watching]                                   │
│👁  │  ──────────────────────────────────────────────────────── │
│    │  Ready (0) │ Special (0) │ Waiting (1) │ Blocked (3)     │
│    │  ──────────────────────────────────────────────────────── │
│    │  My Uploads │ Dependencies │ Conflicts │ All            │
│────│─────────────────────────────────────────────────────────── │
│    │  McCmdCenter_AllModules_2026_1_1.zip                    │
│    │  mc · Archive · v2026.1.1 · 14 files                    │
│    │  ⚠ Conflicts with fuller version in queue               │
│    │  ─────────────────────────────────────                   │
│    │  PRIMARY SCRIPTS                          [Compare ▼]   │
│    │  ● mc_career.ts4script           [NEW]                 │
│    │  ● mc_cas.ts4script              [MODIFIED]            │
│    │  ○ mc_cheats.ts4script                                │
│    │  ─────────────────────────────────────                   │
│    │  STANDARD PACKAGES (11)                      [▼]       │
│────│───────────────────────────────────────────────────────── │
│ [PREVIEW] │ [DECISIONS: 1] │ [CONFLICTS: 2]                  │
│ ───────────────────────────────────────────────────────────── │
│  Decision: McCmdCenter conflicts with fuller 2026.1.2 build   │
│  [Use This] [Use That] [Keep Both]                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Shared Design System & Layout Changes

These changes apply across all three views and form the foundation for the per-view redesign above.

### 7.1 Timestamp — Single Source of Truth
**Current:** Three instances of "Last check: 27/3/2026, 08:40:32" per view
**Change:** One instance only — top bar, right-aligned, compact format. Move to settings if users need precision control. The sidebar timestamp is deleted. The content header timestamp is deleted.

### 7.2 Status Pills — Broadcast vs. Navigation
**Current:** Status pills ("8 items", "2 needs review", "4 blocked") in top bar competing with navigation
**Change:** Compact numeric-only pills for Creator (they want full state). Hover/click drawer for Casual and Seasoned (click reveals full explanation). The raw numbers should not be the headline.

### 7.3 Queue Lanes — One Canonical Location
**Current:** Sidebar lanes + filter row in main content area
**Change:** Sidebar lanes = navigation (canonical). Filter row = removed. The main content header gets a breadcrumb showing current lane only, not a full lane list. One display of the categorization, not two.

### 7.4 Color System — Three Semantic Roles, Three Palettes
**Current:** Orange, red, gold, green all compete on the same surfaces
**Change:**
- **Status colors** (needs review, blocked, ready): orange/red/green — used ONLY in status chips and lane indicators
- **Interaction state** (active, selected, hover): gold — used ONLY for selection rings, active borders, focus states
- **Semantic highlights** (new, modified, watching): blue/green/yellow — used ONLY as file-level badges, never as panel/chip backgrounds

These three categories must not share visual treatments. A gold border means "this is selected." An orange chip means "this needs review." They cannot look similar.

### 7.5 Empty State Design
**Current:** Four zero-value boxes in Decision panel. A paragraph in Preview empty state.
**Change:**
- Decision panel with all zeros → do not render at all (Creator) or collapse to 1-line summary (Seasoned/Casual)
- Preview empty state → single line: "Select an item to preview" + a relevant icon. No paragraphs. Max 60px height.

### 7.6 Bottom Panels — Context Rail with Max Height
**Current:** Decision Needed + Preview panels occupying ~35-40% of viewport always
**Change:** Unified Context Rail with tab switcher (Preview | Decisions | Conflicts). Max 25% viewport. Scrollable within. Expands on interaction but never dominates the queue by default.

### 7.7 Visual Border Discipline
**Current:** Borders around almost every element — containers, tags, buttons, sections
**Change:**
- Keep borders for: component-level separation (sidebar from content, panel from panel)
- Remove borders for: tags/chips, inline buttons, item card interiors
- Dark theme creates natural separation via background color alone — excessive borders read as wireframe aesthetic
- Apply a single 1px border rule: borders separate major functional zones, not every data element

### 7.8 Sidebar Brightness — Recede, Don't Disappear
**Change:** Reduce sidebar background contrast by ~15-20% (CSS: slightly darker or slightly lighter shade, not the same shade as the main content). The sidebar is orientation infrastructure, not primary workspace. Dim it so the queue area earns the user's attention. This is the Linear 2026 principle applied.

### 7.9 Zero-Count Lanes — Don't Render
**Current:** "Rejected (0)" and "Special setup (0)" lanes are visible even when empty
**Change:** Only render lanes with count > 0. A lane with zero items has no information value and adds visual noise. Exception: in Seasoned/Creator, show lanes with 0 as a collapsed "..." section if the user has previously used them — preserve orientation without noise.

---

## 8. Priority Order for Implementation

### Phase 1 — Quick Wins (1-2 days, low risk)
Changes with no structural dependencies, purely additive or subtractive.

| # | Change | Why First |
|---|---|---|
| 1 | Remove 2 of 3 timestamps | Instant visual relief. Zero functional risk. |
| 2 | Collapse zero-count lanes | Immediate noise reduction. |
| 3 | Decision panel: collapse to 1-line when all zeros | Reclaims 20% viewport instantly. |
| 4 | Preview empty state: single line, max 60px | Reclaims space, improves tone. |
| 5 | Zero-count lanes don't render | Immediate signal-to-noise improvement. |
| 6 | Dim sidebar brightness (CSS only) | Immediate hierarchy improvement, no logic change. |

### Phase 2 — Structural Changes (3-5 days, medium risk)
Changes that require UX decisions and component restructuring.

| # | Change | Why Next |
|---|---|---|
| 7 | Choose canonical queue lane location | Prerequisite for everything else. Decision: sidebar lanes win, filter row goes. |
| 8 | StatusStrip → hover drawer (Seasoned/Casual) | Frees top bar real estate without losing information. |
| 9 | Progressive disclosure on item cards | Primary/secondary card states. Creator keeps full lists; Casual/Seasoned get expand-on-click. |
| 10 | Context Rail with tab switcher | Unifies bottom panels without removing functionality. |

### Phase 3 — Per-View Refinements (1-2 weeks, higher risk)
View-specific density configurations and advanced features.

| # | Change | Risk Mitigation |
|---|---|---|
| 11 | Creator: structured file manifests with priority flags | Implement behind a feature flag. Test with Creator users before shipping. |
| 12 | Seasoned: "Why is this waiting?" inline explanations | Low risk — adds information, doesn't remove. |
| 13 | Seasoned: queue trend indicators | Simple addition, low risk. |
| 14 | Creator: Conflict Map panel | Higher complexity. Build as Creator-only feature, not cross-view. |
| 15 | Per-view density configuration | Requires testing with real users across all three personas before shipping. |

---

## 9. Tradeoffs, Risks, and Things That Must Not Change

### Tradeoffs
- **Visibility vs. simplicity in Creator:** Giving Creator users full transparency means the view will always be dense. The fix is hierarchy within density, not reducing density. Trying to make Creator look like Seasoned will break it for its target users.
- **Broadcast status vs. navigation clarity in top bar:** Removing status pills from Casual/Seasoned top bar means users won't see global queue health at a glance. The drawer solution preserves information but adds a click. This is a known tradeoff — explicit decision to optimize for calm over information density in Casual/Seasoned.
- **Sidebar vs. filter row:** If the sidebar lanes are the canonical navigation, power users who rely on the filter row for quick lane-switching will need to adapt. Provide a keyboard shortcut for lane switching as compensation.

### Risks
- **Removing the 40% bottom panel breaks muscle memory for power users** — Mitigation: preserve the panel, just cap its height and improve its empty state. Don't remove it.
- **Progressive disclosure on item cards loses context for fast scanners** — Mitigation: keep key metadata visible (filename, status, why waiting) even when collapsed. Only hide file lists.
- **Reducing sidebar brightness harms accessibility for users with low vision** — Mitigation: make dimming a preference, not a default. Allow users to set contrast level.
- **Creator file manifest hierarchy adds implementation complexity** — Mitigation: implement as a data transformation on the existing file list, not a new data source. Same data, better presentation.

### Things That Must NOT Change
1. **The queue lane model and categorization logic.** This is the correct mental model.
2. **The dark Sims aesthetic and gold accent system.** It works. It's distinctive.
3. **The folder watching architecture.** Core value proposition.
4. **The action model (Approve/Reject/Block).** Clear, functional, tested.
5. **The five-zone spatial layout.** Nav → Sidebar → Top → Queue → Bottom is sound.
6. **The three-view philosophy.** Casual/Seasoned/Creator should exist — they just need to be genuinely differentiated.
7. **Keyboard navigation.** Every redesign must maintain or improve keyboard-accessible inbox triage.

### Things That Must Change (Non-Negotiable)
1. **Three timestamps → one.** This is noise with zero value.
2. **Decision panel with all zeros must not render four empty boxes.** Either collapse or don't render.
3. **Queue lanes must be in one place, not two.** Choose and commit.
4. **Status pills and queue lane information must not duplicate.** One is enough.
5. **Border discipline must be applied.** Major zones separated, data elements not bordered individually.

---

## 10. Final Recommendation

The SimSuite Inbox is not broken — it's unrefined. The architecture is correct. The problems are information discipline problems, not structural ones.

**The redesign should proceed as a three-phase refinement:**

1. **Phase 1 immediately:** Remove the three most egregious noise sources (timestamps, zero-state boxes, redundant lane displays). This is a half-day of work that will make the inbox noticeably calmer without any risk of functional regression.

2. **Phase 2 within a week:** Implement the Context Rail (tabbed bottom panels with max-height), progressive disclosure on item cards, and the StatusStrip hover drawer. These are the structural changes that justify the three-view differentiation.

3. **Phase 3 within a month:** Implement per-view density configuration, Creator-specific structured file manifests with priority flags, and Conflict Map for Creator. These are the features that make each view genuinely serve its target user.

**The single most important design principle for this redesign:**

> *The queue is the product. Everything else is infrastructure. Infrastructure should be felt, not seen.*

The sidebar is infrastructure. The timestamps are infrastructure. The top bar chrome is infrastructure. They should serve orientation without demanding attention. The queue — the items, the decisions, the actions — is what deserves visual prominence. Every redesign decision should answer: "does this help the user process the queue faster?" If yes, keep it. If it's infrastructure performing its job correctly, it should be nearly invisible.

**On Sentinel's challenge:** The risk assessment is correct. A visual polish-first redesign that strips useful density will silently harm power users. The fix is not to remove information — it's to organize it better, give it hierarchy, and progressively disclose rather than uniformly collapse. The goal is an inbox that earns attention when it deserves it and recedes when it doesn't.

---

*Report compiled 2026-03-27 by Nero (main) from multi-agent synthesis: Ariadne (Studio), Scout (Orion), Forge (Hephaestus — partial), Sentinel (Argus).*
