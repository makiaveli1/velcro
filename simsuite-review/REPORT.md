# SimSuite Inbox UI Redesign Review
**Date:** 2026-03-27
**Review scope:** Casual, Seasoned, and Creator views
**Status:** IN PROGRESS — awaiting agent reports

---

## Screenshot Evidence Summary

All three screenshots (Casual/Seasoned/Creator) show the same dark-themed, high-density desktop app with a five-zone layout:

| Zone | Description |
|---|---|
| Zone A | Far-left nav rail (~40px, icon-only) |
| Zone B | Inner left sidebar (~240px): workspace + queue lanes + search |
| Zone C | Top bar (~48px): branding + view tabs + status pills + timestamp + actions |
| Zone D | Main queue area (flex): filter row + queue cards |
| Zone E | Bottom area (~35-40% viewport): Decision Needed + Preview panels |

### The Single Item Problem
All three views show the same item: `McCmdCenter_AllModules_2026_1_1.zip`
- Archive with 14 files (3 ts4script files listed)
- In "Waiting on you" lane
- Conflict: "A fuller MC Command Center pack is already in Inbox"

This makes the density problems especially stark — even with ONE item, the UI feels cluttered.

### View Differences
- **Casual (094722):** Tabs INBOX/SEASONED/BALANCED/SNUG/PATCH DAY. Simpler nav rail (SCAN vs "Run Scan").
- **Seasoned (094758):** Tabs INBOX/SEASONED/BALANCED/SNUG/PATCH DAY. Nav rail has "Run Scan" text visible.
- **Creator (094833):** Tabs INBOX/CREATOR/FULL RECEIPTS/SNUG/PATCH DAY. Creator-specific: "DECISION NEEDED" panel shows SAFE/REVIEW/ALREADY FINE/PREVIEW boxes with counts. Full file manifest visible in item card.

---

## Confirmed Duplication Problems

### 1. Timestamp — Three (3) identical instances per view
- **Top bar** (right side): "Last check 27/3/2026, 08:40:32"
- **Inner sidebar** (under folder path): same timestamp
- **Main content header** (right side): same timestamp

**All three represent the same event: last folder scan.** Three displays = zero additional information.

### 2. Status Pills — Duplicated
- Top bar shows: `● 8 items` `0 ready` `2 needs review [orange]` `4 blocked [red]`
- Inner sidebar shows same (from screenshot 2 analysis)
- Queue lanes in sidebar show: Ready now (0), Special setup (0), Waiting on you (1), Blocked (3), Done (4), Rejected (0)

The top bar and sidebar are telling you the same thing in different formats simultaneously.

### 3. Queue Lanes — Duplicated
- Queue lanes appear in the inner sidebar (primary location)
- Queue lanes ALSO appear as a filter/tab row in the main content area (e.g., "Waiting on you" is shown as the active view with item count)

This means the user sees the same filtering concept twice in the same view.

### 4. Explanatory Text — Repeated
- Lane name "Waiting on you" has a description: "Dependencies, missing files, or a small decision are still in the way."
- This text appears:
  - In the sidebar lane item (when lane is selected)
  - In the Decision Needed panel header
  - Possibly in the main content area header
- That's 3+ instances of the same explanation text

---

## Architecture Issues

### Bottom Panels Taking 40% of Viewport
The Decision Needed + Preview panels occupy roughly 35-40% of the vertical space even when:
- Decision Needed shows all zeros: SAFE (0), REVIEW (0), ALREADY FINE (0), PREVIEW (0)
- Preview panel shows its empty state: "Select a staged archive or file batch to load the correct inbox preview."

This means 40% of the screen is a placeholder prompting the user to select something — AFTER they've presumably already selected an item in the queue above.

### Creator View: Full Transparency vs. Cognitive Overload
The Creator view shows:
- All 14 files inside the archive (ts4script files explicitly listed)
- The DECISION NEEDED panel with 4 categorization boxes
- Full technical detail

This level of transparency is appropriate for creators, but the UI doesn't progressively disclose — it dumps everything at once.

### Visual Noise from Borders
The screenshot analysis confirms "borders around almost every element (containers, tags, buttons, sections)." This creates a "boxed-in" feeling and increases visual competition.

---

## Agent Reports

_Reports will be appended here as they arrive._

---

## Ariadne (Studio) Report — UI/UX Critique

### Per-View Feel: Target vs. Current

| View | Should Feel Like | Currently Feels Like |
|---|---|---|
| **Casual** | A clean, calm inbox. A friend has pre-filtered everything hard. You see what you can act on, nothing else. | A status broadcast with preemptive anxiety. Blocked counts visible before any action taken. |
| **Seasoned** | A professional cockpit. Dense where it matters, sparse where it doesn't. Feels in control, not surveilled. | An Identity crisis — visually identical to Casual with a different button label. No additional context or capability. |
| **Creator** | A technical workbench. Everything visible if needed, everything collapsible when not. Feels empowered. | Dense for density's sake. Full technical detail dumped without hierarchy. Decision Needed panel shows all zeros. |

### Top Hierarchy Problems (ranked by impact)
1. **Timestamp repeated 3x** — zero information value, three visual intrusions. Pick ONE canonical location.
2. **Queue lane duplication** — sidebar lanes + filter row serve the same function. Choose one.
3. **Status pills in top bar competing with navigation** — most alarming info (blocked) most prominent. Inverted priority.
4. **Decision Needed panel with all zeros** — actively hostile use of screen space. Signals capability without delivering it.
5. **Color system conflicts** — orange/red (status) and gold (interaction) compete on same surfaces. Need palette clarification.
6. **Preview empty state verbose** — takes more space than an unselected item card. Backwards.
7. **Blocked items visually dominant over actionable items** — visual hierarchy inverted.

### Collapse/Hide/Move/Remove Recommendations
- **Collapse:** Archive file lists in Casual/Seasoned, "Waiting on you" description text, Decision Needed panel when empty
- **Hide:** 2 of 3 timestamps, status pills from top bar (move to tooltip/drawer), zero-count lanes (Rejected 0)
- **Move:** Queue lane filter row → dropdown if sidebar lanes are primary; file detail → slide-over panel
- **Remove:** Verbose preview empty state, redundant queue lane counts in header, heavy borders between sections

### Per-View Specific Changes
- **Casual:** Hide blocked counts, collapse archive interiors by default, simplify to single-column action list
- **Seasoned:** Surface WHY items are waiting (not just that they are), add queue trend summary, differentiate functionally from Casual
- **Creator:** Collapse decision-needed zeros, structure file lists with priority/new/modified flags, make Full Receipts tab actually diagnostic

### What Should Never Change
- The five-zone layout principle (nav → sidebar → top → queue → bottom panels)
- The queue lane concept and categorization logic
- The dark Sims-themed aesthetic and gold accent system
- Core file management metaphors (archives, scripts, dependencies)

---

## Sentinel (Argus) Report — Devil's Advocate

### Assumptions Challenged

**1. "Redundancy = bad UX" — CHALLENGED**
Redundant timestamps may serve different semantic roles: relative recency (hover), precise moments (debugging), queue moments (workflow). Removing one assumes which question matters. *Distinct duplication serving different depths of attention is not redundancy — it's multi-level information architecture.*

**2. "40% empty panel = layout problem" — CHALLENGED**
Conflating empty state design with panel existence. If the bottom panel is a primary action zone, its existence at 40% is not the problem — the empty state is. Removing it entirely risks breaking workflows for users who rely on it when populated.

**3. "14 files in Creator = overload" — CHALLENGED**
Assuming the reviewer is the target user. Power users *want* dense file previews. A creator with 14 active files needs to see them all. Stripping to 3 files removes information they actively need. *Density is a user-fit problem, not a universal bad.*

### Edge Cases the Redesign Must Handle
- **High-volume scaling**: What happens at 500+ items? Does redesign hide ugliness or actually scale?
- **Keyboard navigation parity**: Whitespace-heavy redesigns often break dense keyboard-accessible rows
- **Empty state onboarding**: 40% bottom panel might be right proportion for first-time user scaffolding
- **Panel collapse memory**: Must remember collapsed/expanded state across sessions
- **Error states**: What does inbox look like when items fail to load or queue assignments break?
- **Power user vs. casual divergence**: Different display paths may serve different user roles intentionally

### What Reviewers Are Missing
- **Users who love the current design** — no user research cited; border-heavy might function as cognitive boundary
- **Workflow context** — Creator view shows 14 files because creators work across multiple assets and need relationship visibility
- **Business logic driving layout** — sidebar + topbar duplication might be dual-path access serving different roles (editor vs. creator)
- **Accessibility implications** — removing visual structure (borders, redundancy) can harm users with cognitive differences who rely on consistent spatial anchoring
- **What "fixed" actually breaks** — dependency chain: if status display is removed, what downstream system relies on that signal?

### Dangerous Things to NOT Lose
- **Action-oriented density** — inbox triage is high-frequency, high-efficiency; stripping density silenty slows down power users
- **Contextual permanence** — users have calibrated attention around specific placement; moving it breaks muscle memory
- **Semantic timestamp clarity** — three timestamps answering three distinct questions is better than one doing triple duty ambiguously
- **Progressive disclosure architecture** — queue lanes in 2 places may represent summary vs. detail views, not duplication
- **Bottom panel as dedicated action zone** — 40% action panel is appropriate if 40% of user time is spent acting on items

### Overall Risk Assessment
- **HIGH risk** if redesign driven by visual polish (border reduction, whitespace) over task analysis
- **HIGH risk** if no user segmentation study precedes it — power vs. casual needs conflict
- **MEDIUM risk** — reviewers partially right on borders/empty state, but fix is surgical (targeted polish), not wholesale rethink
- **LOW risk** only if scoped as "reduce visual noise while preserving density and action architecture" with user testing

**Core risk statement:** Inboxes are productivity tools. An inbox redesign that improves aesthetic appeal at the cost of task efficiency will be silently tolerated and quietly resented. Users don't complain loudly — they just get slower and find workarounds.

**Bottom line:** These findings are symptoms dressed as diagnoses. The real question isn't "how do we fix these 6 things?" — it's **"what workflow are we optimizing for, and for whom?"**

---

## Scout (Orion) Report — Research + IA Patterns

### #1 — ELIMINATE TRIPLAY TIMESTAMP/STATUS REDUNDANCY
**Impact: HIGHEST** | 100% of items, 100% of views

**Research:** NN/G (2019) — "UI complexity increases when a single feature is presented in multiple ways. Users rarely understand duplicates as such." Each redundant instance forces re-processing. Each redundant display taxes every scan.

**Fix:** Full timestamp in queue row (scannable) → relative time in detail header ("2h ago") → kill sidebar timestamp entirely → status badges in ONE place only (queue row). Removes ~15-20% of visual processing overhead per item scan.

### #2 — DIM SIDEBAR; LET MAIN CONTENT EARN ATTENTION
**Impact: HIGH** | Every workflow, every session

**Research:** Linear's own redesign (March 2026): "not every element should carry equal visual weight. While parts central to user's task should stay in focus, ones that support orientation should recede." / "Don't compete for attention you haven't earned."

**Fix:** Sidebar brightness/contrast down 2-3 notches. Filter row treated as content area control surface (same visual weight as list). Queue row stays loud. Compact, smaller tabs.

### #3 — MAX 2 DISCLOSURE LAYERS; HIDE ADVANCED BEHIND SINGLE-LEVEL REVEALS
**Impact: HIGH** | Editors, power users, detail panels

**Research:** NN/G (2022): "rarely good to offer multiple ways to progress to secondary options." / IxDF (2026): "multiple layers confuse users." GitLab Pajamas: "if interaction has 3+ levels of disclosure, it's too complex."

**Fix:** Every detail panel = 1 primary state + 1 secondary "advanced" state. No third level. Use inline accordion over modals. Surface keyboard shortcuts as progressive expertise signal (Raycast/Superhuman model).

### #4 — RIGHT-SIZE EMPTY BOTTOM PANEL; KILL THE 40% VOID
**Impact: MEDIUM-HIGH** | Idle states, empty queues

**Research:** Envy Labs (2024): "Minimal with whitespace is aesthetically pleasing but not the only option. Getting more information on screen is better for context. Too minimal is possible, usually at the expense of your most active users." Linear 2026 refresh: "structure should be felt not seen" — restraint, not emptiness.

**Fix:** Empty state → ~15-20% viewport, top-positioned. Fill remaining space with queued items from other lanes, recent activity, quick-create actions, or keyboard shortcut hints. For idle: show command palette teaser or recent items. Don't go blank.

### #5 — THREE-TIER DENSITY: CASUAL / SEASONED / CREATOR
**Impact: MEDIUM** | Retention, power user satisfaction

**Research:** Envy Labs: "Power users benefit when everything is laid out at once. Extra content and personalization allow adaptation for unique workflows. Keeping density low is a hindrance." Okoone (2025): "Tailoring UI density based on user role improves usability." Adaptive UI research (ScienceDirect 2025): expert vs. novice show genuinely different performance profiles — one size doesn't fit both.

**Three-tier model:**
| Tier | User | Density |
|---|---|---|
| **Casual** | Weekly check-in | Low — primary queue, core actions, full progressive disclosure |
| **Seasoned** | Daily user | Medium — secondary filters visible, keyboard shortcuts shown |
| **Creator** | Power user | High — all lanes, status badges prominent, batch actions exposed, compressed rows |

**Fix:** Detect tier by usage frequency + feature adoption. Allow manual override. WCAG compliance stays constant across all tiers.

### Ranking Summary
| Rank | Change | Driver |
|---|---|---|
| #1 | Kill triplay timestamp/status | Affects 100% of items, always |
| #2 | Dim sidebar | Per-session reorientation cost |
| #3 | Max 2 disclosure layers | Power user efficiency |
| #4 | Right-size empty panel | Idle state UX |
| #5 | Three-tier density modes | Retention + onboarding |

---

## Forge (Hephaestus) Report — Component Architecture
**Status: TIMED OUT** — supplemented with primary analysis

### Primary Component Map (from primary analysis)
Based on screenshot evidence:

| Component | Current Responsibility | Issues |
|---|---|---|
| `NavRail` | Global app navigation (far-left icon strip) | Functions correctly; no change needed |
| `SidebarWorkspace` | Folder path, Watching toggle, active count, timestamp | Redundant timestamp; mixes workspace info with queue navigation |
| `SidebarQueueLanes` | Queue filtering (Ready, Special, Waiting, Blocked, Done, Rejected) | Duplicated in filter row; mixed with workspace info |
| `SidebarSearch` | Archive/file/creator search | Functional; minor visual competition |
| `TopBar` | Branding, view tabs, status pills, timestamp, actions | Overloaded: status + timestamp + navigation all compete |
| `QueueFilterRow` | Active lane label, item count, rule toggle, timestamp | Redundant with sidebar lanes; timestamp 3rd instance |
| `QueueItemCard` | Single item display: checkbox, filename, tags, metadata, file list | Archive list visible in Casual/Seasoned (wrong); too much inline |
| `DecisionNeededPanel` | Categorization: SAFE/REVIEW/ALREADY FINE/PREVIEW | Shows all zeros; occupies 20% viewport doing nothing |
| `PreviewPanel` | Item detail preview | Verbose empty state; competes with DecisionNeeded for space |
| `BottomActionBar` | Primary actions (Approve, Reject) | Functional; positioned below the fold |

### Proposed Restructuring

**Zone A (NavRail):** No change. Keep as-is.

**Zone B (Inner Sidebar):** Split into two sub-components:
- `WorkspacePanel` — folder path, Watching toggle, item count only. No timestamp (move to settings). Collapsed by default in Casual.
- `QueueLanesNav` — standalone queue lane list. Remove from filter row. This is navigation, not content.

**Zone C (Top Bar):** Split into:
- `ViewTabs` — tabs only (INBOX/SEASONED/etc.)
- `StatusStrip` — condensed status pills, moved to a single hover-revealed drawer, not always visible
- `TimestampBadge` — ONE instance only, top bar right zone, compact
- `GlobalActions` — Refresh, Review, Settings

**Zone D (Main Queue):** 
- `FilterRow` — use dropdown for lane selection if sidebar lanes are primary; otherwise remove and use sidebar alone
- `QueueList` — item cards with progressive disclosure: filename + status visible, file list collapsed by default except in Creator
- `QueueItemCard` — primary: checkbox + filename + creator tag + status chip; secondary (on expand): file list; tertiary (on hover): quick actions

**Zone E (Bottom):**
- `DecisionPanel` — collapsed to 1-line summary bar when all counts are zero; expands to 3-column layout only when populated
- `PreviewPanel` — reduced to 20% viewport max when empty; uses compact empty state with single-line prompt
- Merge the two into a `ContextRail` with tab switcher: PREVIEW | DECISIONS

### Effort Estimates
| Change | Effort | Dependencies |
|---|---|---|
| Remove 2 of 3 timestamps | LOW | Config change, no component restructure |
| Condense StatusStrip to drawer | MEDIUM | Hover/tooltip pattern, state management |
| Collapse Decision panel on zero-state | LOW | Conditional rendering |
| Queue lanes: sidebar OR filter row, not both | MEDIUM | UX decision first (which is canonical?) |
| Progressive disclosure on item cards | MEDIUM | Component split (primary/secondary) |
| Context rail with tab switcher | MEDIUM-HIGH | New shared container component |
| Dim sidebar brightness | LOW | CSS only |
| Zero-count lane removal | LOW | Filter before render |

### Implementation Priority
1. **Phase 1 (Quick wins, 1-2 days):** Remove 2 of 3 timestamps. Collapse zero-count lanes. Reduce empty Decision panel to summary bar. Dim sidebar brightness. Replace verbose empty state with single-line prompt.
2. **Phase 2 (Structural, 3-5 days):** Choose canonical queue lane location (sidebar OR filter row). Implement StatusStrip as hover drawer. Progressive disclosure on item cards (primary/secondary states).
3. **Phase 3 (Refactors, 1-2 weeks):** Context rail with tab switcher (Preview | Decisions). Per-view density configuration. Keyboard navigation audit.

### What NOT to Change
- NavRail component and icon navigation model
- Queue lane logic and categorization
- Dark Sims aesthetic / gold accent system
- Core action model (Approve/Reject/Block)
- Folder watching architecture
