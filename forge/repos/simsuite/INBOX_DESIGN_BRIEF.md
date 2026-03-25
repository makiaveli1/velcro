# SimSuite — Downloads Inbox Design Brief
**For:** Design Agent
**Date:** 2026-03-25
**Context:** SimSuite is a desktop app (Tauri/Rust + React/TypeScript) for managing Sims game mod downloads. This brief covers the Downloads inbox UI only.
**Screenshots:** Provided separately by the user

---

## 1. What SimSuite Does

SimSuite watches your computer's Downloads folder, detects new Sims mod archives (`.zip`, `.7z`, etc.), and helps you:

1. **Identify** what each download is (creator, version, contents)
2. **Decide** whether it's safe to install, needs review, or should be rejected
3. **Install** it to the correct Sims mod directory safely (with snapshots/rollback)
4. **Sort** it into the right folder structure by creator/content type

The app has a "watcher" that runs in the background on the Downloads folder.

---

## 2. The Three Experience Modes

The app has three experience modes — this is foundational to understanding the UI. They are not just visual themes; they represent different user relationships with the app.

### Mode Overview

| Mode | Label | User Type | Description |
|------|-------|-----------|-------------|
| `casual` | Beginner | New/occasional users | Guided, calm, one thing at a time |
| `standard` | Standard | Regular users | Balanced efficiency, still approachable |
| `power` | Creator | Power users | Full detail, receipts, proof trails |

### Mode in the Design System

```css
:root[data-user-view="casual"]   { --accent: #f0c879; ... }   /* warm gold */
:root[data-user-view="standard"] { --accent: #78f0a1; ... }   /* cool mint (default) */
:root[data-user-view="creator"]  { --accent: #84cfff; ... }   /* soft blue */
```

The entire `--accent` color family shifts per mode, giving each mode a distinct personality without changing component structure.

---

## 3. The Inbox Workflow

A user arrives at the Downloads inbox with this mental model:

```
Downloads folder has new files
        ↓
SimSuite inspects them (scans contents, detects creator, version, conflicts)
        ↓
Items appear in the inbox, sorted into lanes
        ↓
User reviews items lane by lane:
  Ready Now → Safe to install → [Apply] → moves to Sims mod folder
  Needs Review → Uncertain → [Proof] → opens evidence sheet
  Special Setup → Complex install → Guided walkthrough
  Blocked → Conflicts detected → [Reject] or [Fix]
        ↓
Applied items move out; rejected items are archived
```

The inbox is a **staging area** — not long-term storage. Items should flow through, not pile up.

---

## 4. The Lanes

Items in the inbox are organized into lanes. Each lane is a filtered view:

| Lane | `intakeMode` | Meaning |
|------|-------------|---------|
| **Ready Now** | `ready` | All checks passed, safe to apply |
| **Special Setup** | `guided` | Recognized complex install, has guided plan |
| **Waiting on You** | `needs_review` | Needs human judgment before proceeding |
| **Blocked** | `blocked` | Conflicts or safety issues detected |
| **Done** | `applied` | Successfully processed this session |
| **Rejected** | `rejected` | User chose to reject |

Lane counts are shown in the rail and update as items are processed.

---

## 5. Current Layout Structure

### Overall Shell

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (92px) │ Main Content Area                     │
│                │  ┌─────────────────────────────────┐  │
│ [nav items]    │  │ Screen header / toolbar         │  │
│                │  ├─────────────────────────────────┤  │
│                │  │ Workbench (3-column grid)        │  │
│                │  │  Rail │ Stage │ Inspector       │  │
│                │  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Downloads Workbench Grid

```
Workbench (3-column grid):
  Rail (clamp 252-286px) | Stage (1fr) | Inspector (320-780px, resizable)
```

### Current Casual Layout (as of this brief)

```
┌──────────────┬──────────────────────────────────────────┐
│   RAIL       │         TOP STRIP                        │
│  252-286px   │  [counters] [actions] [nudge chip]      │
│              ├──────────────────────────────────────────┤
│  Watch       │         STAGE                            │
│  folder      │  ┌────────────────────────────────────┐  │
│  info        │  │ Queue panel (max 320-720px, resize)│  │
│              │  │   items with selection             │  │
│  Queue lanes │  ├────────────────────────────────────┤  │
│  (lane       │  │ Batch canvas (fills rest)          │  │
│  picker)     │  │   — empty when nothing selected —  │  │
│              │  └────────────────────────────────────┘  │
│  Search      │                                          │
│  Filter      │  ── nothing in stage when casual ──     │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Problem with casual layout:** The batch canvas occupies half the stage height even when empty. The queue never gets full breathing room. This is the core layout complaint.

### Current Standard/Power Layout (split stage)

```
┌──────────────┬────────────────────────────┬──────────────┐
│   RAIL       │         TOP STRIP          │              │
│              ├────────────────────────────┤   INSPECTOR  │
│  Watch       │  Stage: split grid         │   (320-780px│
│  folder      │  ┌──────────┬───────────┐  │   resizable) │
│              │  │ Queue    │ Batch     │  │              │
│  Queue lanes │  │ panel    │ canvas /  │  │  Decision    │
│              │  │          │ preview   │  │  panel       │
│  Search      │  │          │           │  │              │
│  Filters     │  └──────────┴───────────┘  │              │
└──────────────┴────────────────────────────┴──────────────┘
```

### NEW Casual Layout (implemented, pending design review)

```
┌──────────────┬──────────────────────────────────────────┐
│   RAIL       │         TOP STRIP                        │
│  280-320px   │  Row1: [alert/status if needed]         │
│  (wider)     │  Row2: [counters] [filter] [actions]    │
│              ├──────────────────────────────────────────┤
│  Watch       │         STAGE (queue fills full height)  │
│  folder      │                                          │
│              │  Queue: full-height, relaxed row spacing  │
│  Queue lanes │  (40% more padding than before)          │
│  + hints     │                                          │
│              │  ← Tap item → drawer slides in from right│
│  Search      │                                          │
│  Filter      │                                          │
└──────────────┴──────────────────────────────────────────┘
                ↑ dark backdrop (click to dismiss)
                ┌─────────────────────┐
                │ DECISION DRAWER     │
                │ (480px, fixed right)│
                │ ─ header ──────────  │
                │ title, close button  │
                │ ─ content ────────── │
                │ decision panel       │
                │ apply / reject       │
                │ proof / snooze       │
                └─────────────────────┘
```

---

## 6. The Components

### 6.1 TopStrip (new two-row layout)

**Purpose:** Status messenger + counters + actions. Always visible at top of stage.

**Row 1 (conditional):** Shows when there's an alert, error, or undoable action. Full width, colored background.

**Row 2 (always visible):**

_Counters (when no filter is active):_
- `[dot] 8 items` — total inbox count (mint/green accent)
- `6 ready` — ready now count
- `2 needs review` — needs review count (amber if > 0)
- `2 blocked` — blocked/error count (red if > 0)

_Counters (when a filter is active):_
- `X items` — the filtered count (prominent)
- `Needs review` — the active filter chip
- `× Clear filter` — clickable chip to remove filter

_Actions (always):_
- Progress chip (when syncing): `"Scanning: filename.zip (4/12)"`
- Last check timestamp (ghost text, subdued)
- `[Refresh]` button
- `[Review]` button
- Nudge chip (casual mode only, when items need attention)

**Current issues being reviewed:**
- Still too much going on when everything is active simultaneously
- Counter chips can wrap on narrow windows

### 6.2 Rail (left sidebar within the workbench)

**Sections top to bottom:**

1. **Header:** "Downloads" title + "Workspace" eyebrow + watcher status badge
2. **Watch folder card:** The path being watched, active item count, last check time
3. **Queue lanes:** Lane picker — 6 lane buttons, each showing lane name + count
   - Each button: lane icon + name + count badge + hint text (shown on hover/active)
   - Active lane highlighted with accent color
4. **Search:** Text input to filter items by name/creator
5. **Status filter (casual):** Always-visible dropdown ("All items" / "Ready" / "Needs review" / etc.)
6. **More filters toggle (standard/power):** Opens a popover with status filter + tidy style preset selector
7. **Tip card (casual):** Explains how the inbox works

**CSS dimensions:**
- Casual: `clamp(280px, 22vw, 320px)` — wider than before
- Standard/Power: `clamp(252px, 18vw, 286px)`

### 6.3 Queue Panel

**What it shows:** The list of download items in the currently active lane.

**Per item row:**
- Left border: 2px solid, color-coded by intake mode (green=ready, amber=review, red=blocked, blue=special, gray=done)
- Left accent gradient: soft fill fading to transparent (11% width)
- Item name (truncated)
- Creator name (from GROUP_CONCAT — may show multiple)
- Item count / file count
- Status badge
- Version indicator (if newer version available)
- Batch checkbox (top-left corner of row)
- Selected item: strong accent background gradient

**In casual mode:**
- Rows have 40% more vertical padding
- 0.28rem gap between rows
- Full stage height

**Sticky header (casual only):** Shows lane name + count, sticky to top of scroll, lane-colored left border

**Batch action bar:** When items are batch-selected, a fixed bar appears at bottom with "Apply X items" / "Reject X items"

### 6.4 Batch Canvas (standard/power mode only — not rendered in casual)

**What it shows:** Preview of the selected item — what files it contains, what the safe next step is, what needs review.

**States:**
- Empty: "Select a download item to inspect" (shown when nothing selected)
- Loading: Spinner + "Loading batch details"
- Ready item: Safe count + review count + unchanged count + preview items list
- Guided item: Guided preview panel (the plan steps)
- Review item: Special review panel (evidence + review actions)
- Blocked item: Blocked review panel

**Batch stats display (per mode):**
- Casual: 2 stats (Needs care + Files shown)
- Standard: 3 stats (Safe + Review + Already fine + Preview)
- Power: 4 stats (all of the above)

**Left-border accent:** 4px solid lane color to visually separate from queue

### 6.5 Decision Drawer (casual mode — new)

**What it is:** A 480px fixed overlay that slides in from the right when an item is selected.

**Structure:**
```
┌──────────────────────────────┐
│ [eyebrow: Inbox item]       │
│ [title: item name]     [×]  │  ← sticky header, close button
├──────────────────────────────┤
│ [lane label chip]            │
│ [queue summary text]         │
│ [badges]                    │
│                              │
│ ── Signals section ──        │
│ (check results, version      │
│  info, creator signals)      │
│                              │
│ ── Next step ──              │
│ [Next step title]            │
│ [Next step description]     │
│ [Apply button] / [Reject]    │
│ [Proof] [Snooze]             │
│                              │
│ [Idle note if nothing to do] │
└──────────────────────────────┘
```

**Behavior:**
- Dark backdrop (rgba 0.25) behind it — click to dismiss
- Spring animation (stiffness 320, damping 34)
- Queue stays visible behind it
- Sticky header with item name + close button

### 6.6 Decision Panel / Inspector (standard/power mode)

**What it shows:** The full decision panel for the selected item — more detailed than the casual drawer, includes proof trail access, receipt history, and deeper signals.

**Contains:**
- Item title + lane label
- Queue summary
- Intake mode badges
- Signals (check results, version comparison, creator trust signals)
- Next step card (title + description + Apply/Reject)
- Action buttons: Apply, Reject, Proof, Snooze
- Proof sheet toggle (shows the full evidence)
- Idle note when no action is available

### 6.7 Stage Header (within the stage)

**What it shows:** The current context — which lane you're in, whether an item is selected, the tidy style/rule preset, and watcher status.

```
[lane chip] [1 selected / ← Select an item] [Rule: Default]  |  Last check 2 min ago
```

In casual mode: no preset chip shown.

### 6.8 Proof Sheet

**What it is:** A full-screen modal overlay that shows the complete evidence for an item — file contents, creator info, version history, safety checks.

**Navigation:** Opens from the Decision Panel (Apply/Reject bar) or via keyboard shortcut `P`.

---

## 7. Design Tokens (Current)

### Color Palette

```
Background / Surface:
  --bg:          #071217   (deepest background)
  --bg-deep:     #040b0f
  --surface:     #0d191d
  --surface-2:   #122128
  --surface-3:   #172931
  --surface-4:   #0a1418

Text:
  --text:        #eef4ef   (primary text, near-white)
  --text-soft:   #afc0b8  (secondary text)
  --text-dim:    #7f928a   (tertiary / ghost text)

Lines:
  --line:        rgba(205, 223, 214, 0.10)
  --line-strong: rgba(205, 223, 214, 0.18)

Accent (shifts per mode — see below)
  --accent:       #78f0a1   (mint green — standard mode)
  --accent-strong: #8ff8b4
  --accent-soft:  rgba(120, 240, 161, 0.10)
  --accent-line:  rgba(120, 240, 161, 0.32)
  --accent-ink:   #071116   (text on light accent backgrounds)

Amber (warnings, needs review):
  --amber:        #f2c47b
  --amber-soft:   rgba(242, 196, 123, 0.08)
  --amber-line:   rgba(242, 196, 123, 0.22)

Danger (errors, blocked):
  --danger:       #ff8484
  --danger-soft:  rgba(255, 132, 132, 0.08)
  --danger-line:  rgba(255, 132, 132, 0.24)

Mint (secondary accent):
  --mint:         #9ff3d3
  --mint-soft:    rgba(159, 243, 211, 0.08)
  --mint-line:    rgba(159, 243, 211, 0.24)
```

### Mode-Specific Accent Colors

```css
/* Casual (warm gold) */
:root[data-user-view="casual"] {
  --accent:      #f0c879;
  --accent-strong: #f6d9a2;
  --accent-soft: rgba(240, 200, 121, 0.10);
  --accent-line: rgba(240, 200, 121, 0.30);
  --accent-ink:  #170f0b;
  --amber:       #ffca70;
  --danger:      #ff8f78;
}

/* Standard (cool mint — default) */
:root[data-user-view="standard"] {
  --accent:      #78f0a1;
  --accent-strong: #8ff8b4;
  --accent-soft: rgba(120, 240, 161, 0.10);
  --accent-line: rgba(120, 240, 161, 0.32);
  --accent-ink:  #071116;
  --amber:       #f2c47b;
  --danger:      #ff8484;
}

/* Power / Creator (soft blue) */
:root[data-user-view="creator"] {
  --accent:      #84cfff;
  --accent-strong: #a8deff;
  --accent-soft: rgba(132, 207, 255, 0.10);
  --accent-line: rgba(132, 207, 255, 0.32);
  --accent-ink:  #0a1520;
  --amber:       #f1cf8a;
  --danger:      #ff9f9f;
}
```

### Lane Colors (semantic — same across modes)

```
Ready Now:       var(--accent)         (mode accent color)
Special Setup:   var(--tone-info)      (#84cfff — soft blue)
Waiting on You:  var(--tone-warn)      (amber)
Blocked:         var(--tone-danger)   (red)
Done:            var(--text-dim)      (gray)
Rejected:        var(--text-dim)      (gray)
```

### Typography

```
Body font size:  14px (--body-size)
Font family:     system-ui, -apple-system, sans-serif
Mono (paths):    "Cascadia Code", "Consolas", "Monaco", monospace

Scale (approximate):
  eyebrow:       0.68rem, uppercase, letter-spacing 0.08em, bold
  chip:          0.72rem
  body:          14px
  title (h2):    1rem, font-weight 600
  heading (h1):  larger
```

### Spacing

```
--shell-gap:   0.75rem   (outer gaps)
--panel-gap:   0.65rem   (between panels)
--panel-pad:   0.75rem   (inside panels)
--control-height: 32px   (buttons, inputs)
--sidebar-width: 92px

Queue row padding:  0.55rem × 0.6rem (standard)
                    0.85rem × 1rem   (casual — 40% more)
Queue row gap:      0.35rem (standard)
                    0.5rem   (casual)
```

### Shadows

```
--shadow: 0 18px 36px rgba(1, 6, 8, 0.18)
--panel-sheen: linear-gradient(180deg, rgba(255,255,255,0.028), transparent 24%)
```

---

## 8. What "Calm, Cozy" Means Here

This is the core design intent for casual mode. It should feel like:

- **A well-organized desk**, not a control room
- **One decision at a time**, not a dashboard of everything at once
- **Clear next action**, not ambiguous options
- **Reassuring**, not intimidating
- **Slow and intentional**, not fast and efficient

The current implementation is too dense and too panel-happy for this. Every visible section feels like it demands attention. The redesign should push toward:

- More whitespace, less chrome
- Single-focus: the queue OR the decision, not both simultaneously in casual
- Warm, friendly language (not technical jargon)
- Soft transitions and gentle animations (nothing jarring)
- The mode accent color (warm gold for casual) should reinforce this feeling

---

## 9. What's Already Been Fixed (Recent Changes)

These are already improved — don't revert them:

1. ✅ TopStrip split into alert row + data row
2. ✅ Lane hints show on hover (not just active)
3. ✅ Keyboard shortcut toast on first item selection (one-time, 8s auto-dismiss)
4. ✅ Batch canvas has per-lane left-border accent
5. ✅ Batch-selected rows have distinct visual from fully-selected rows
6. ✅ Filter-aware counters: shows filtered count + "× Clear filter" when filtered
7. ✅ Queue rows: 40% more vertical padding in casual mode
8. ✅ Casual rail: wider (280–320px)
9. ✅ Decision drawer: slide-in overlay for casual mode (queue fills full stage)
10. ✅ Progress chip truncates long filenames at 30 chars
11. ✅ "Files shown" → "File shown" / "Files shown"
12. ✅ `specialSetupCount` uses backend overview total (not per-lane count)
13. ✅ Stage header hint: "← Select an item" instead of silent empty state

---

## 10. Open Design Questions (For the Agent to Consider)

These are things the agent should think about creatively:

### Q1: How should the TopStrip feel in casual mode specifically?
Currently it shows 4 chips + progress + actions. Is this too much for a "calm" mode? Should casual mode show fewer, larger, more human counters? Should the TopStrip be calmer/less prominent in casual?

### Q2: What should the decision drawer feel like?
It's 480px wide, fixed right, with a backdrop. Does this feel right? Should it be wider (more breathing room inside)? narrower (less intrusive)? Should the backdrop be lighter or darker?

### Q3: Empty states — what story do they tell?
The queue's empty state just shows muted text. What would make an empty queue feel hopeful rather than dead? What about a gentle illustration or a more encouraging message?

### Q4: The rail in casual mode — too much still?
The rail has: watch folder card, 6 lane buttons with counts, search, filter dropdown, tip card. Is this still overwhelming for a "calm" experience? What can be collapsed, hidden, or rethought?

### Q5: What does "breathing room" actually look like for queue rows?
We increased padding 40%. Is that enough? Too much? Should row height be taller, with more visual hierarchy between the item name and its metadata?

### Q6: Mode-specific visual personality
Casual uses warm gold, standard uses cool mint, power uses soft blue. Beyond color, should each mode have different typography scale, different spacing density, different component shapes (rounded vs sharp)?

### Q7: The lane sticky header in casual
Currently it's a colored strip at the top of the scroll. Does this feel right for a calm UI, or is it too "system-like"?

---

## 11. Technical Constraints (For Implementing the Design)

- **Framework:** React + TypeScript (Tauri desktop app)
- **Styling:** Plain CSS with CSS custom properties (design tokens). No Tailwind, no CSS-in-JS.
- **Animation:** Framer Motion (`motion/react`) — `m` component, `AnimatePresence`, `transition` props
- **Icons:** Lucide React — use existing icons, don't introduce new icon libraries
- **Fonts:** System font stack only (no Google Fonts or custom fonts)
- **State:** React `useState`/`useEffect`/`useDeferredValue` — no external state library
- **No design tools access:** The agent produces a `design.md` document with recommendations. Implementation is separate.
- **Images/SVGs:** Simple inline SVGs acceptable (like the notification bell in the nudge chip)
- **Responsive:** The app runs in a desktop window. No mobile considerations needed.

---

## 12. Key Files Reference

```
src/screens/DownloadsScreen.tsx          — Main screen, layout orchestration
src/screens/downloads/DownloadsTopStrip.tsx    — Counter strip + alert row
src/screens/downloads/DownloadsRail.tsx        — Left rail (lane picker, search, filters)
src/screens/downloads/DownloadsQueuePanel.tsx  — Queue list + sticky header
src/screens/downloads/DownloadsBatchCanvas.tsx — Preview panel (standard/power only)
src/screens/downloads/DownloadsDecisionPanel.tsx — Decision panel content
src/components/layout/Workbench.tsx     — 3-column workbench grid
src/components/layout/WorkbenchInspector.tsx — Right inspector panel
src/styles/globals.css                  — All CSS (design tokens + components)
src/lib/guidedFlowStorage.ts            — Persistent localStorage (nudge dismissed, keyboard hint dismissed)
src/components/UiPreferencesContext.tsx — Density, theme, layout size state
```

---

## 13. Design Principles to Uphold

1. **Mode-first thinking:** Every design decision must consider how it feels in casual, standard, AND power modes. The personality shift should be meaningful.
2. **Calm for casual:** Casual mode should not feel like a lite version of power mode. It should feel like a different product designed for different needs.
3. **Progressive disclosure:** Don't show everything at once. Show what's needed for the current decision, reveal more on demand.
4. **Confirmation before action:** Destructive actions (reject, undo) always require confirmation.
5. **Language matches mode:** "Apply" (power), "Keep" (standard), "Safe next step" (casual) — same action, appropriate language per mode.
6. **Graceful empty states:** An empty queue should feel good, not broken. A selected item with no content should be informative, not blank.
7. **One primary action:** In casual mode, there should almost always be one clear primary action visible. Not five buttons — one.

---

*This brief was compiled from implementation analysis, UI audit, and design intent documentation. The user will provide screenshots separately. The agent should produce a `design.md` with specific, implementable recommendations.*
