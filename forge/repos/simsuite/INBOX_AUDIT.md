# SimSuite Downloads Inbox — Full UI/UX Audit
**Date:** 2026-03-25
**Scope:** Downloads inbox only (DownloadsScreen + sub-components)
**Status:** Issues identified; fixes in progress

---

## 🔴 Critical / Bugs

### 1. `specialSetupCount` used client-side per-lane value in TopStrip
- **File:** `DownloadsScreen.tsx` (line ~1175)
- **Problem:** `specialSetupCount={visibleLaneCounts.special_setup}` — this is the count of special_setup items in the *currently selected lane only*, not the total inbox count. If a user is on the "Ready Now" lane, this would show the special_setup count for ready_now items only.
- **Fix:** Changed to `overview?.specialSetupItems ?? 0` ✅ (committed)
- **Note:** The rail and lane picker correctly use `visibleLaneCounts` for per-lane navigation.

### 2. "1 items" grammar error
- **File:** `DownloadsTopStrip.tsx` (line 72)
- **Problem:** `{totalItems} items` — renders "1 items" when count is 1
- **Fix:** Changed to `{totalItems === 1 ? 'item' : 'items'}` ✅ (committed)

### 3. "waiting" label mismatched with needs_review count
- **File:** `DownloadsTopStrip.tsx` (line ~76)
- **Problem:** The chip said "waiting" but the value came from `overview?.waitingOnYouItems ?? overview?.needsReviewItems`. If `waitingOnYouItems = 0` (backend correctly computes it as 0), it falls back to `needsReviewItems`. So the label "waiting" was misleading.
- **Fix:** Changed label to "needs review" ✅ (committed)

---

## 🟡 High — Layout & Information Architecture

### 4. TopStrip has too many simultaneous responsibilities
The TopStrip tries to be all of: status messenger, error shower, counter cluster, progress tracker, undo button, and notification nudge. When everything is active at once (status message + progress + undo), the strip becomes a wall of text and chips with no clear visual hierarchy.

**Recommendation:** Split into two conceptual rows:
- Row 1: Error/status message (full width, prominent when active)
- Row 2: Counter chips + progress + actions

### 5. Stage header competes visually with the queue content
The stage header (`downloads-stage-header`) shows: `[lane chip] [1 selected chip] [Rule: X chip] | [status message]`. In a narrow viewport or with long item names, this wraps unpredictably. The "No selection" chip gives no hint about what to do.

**Recommendations:**
- Add an empty state hint to the "No selection" chip (e.g., "Click an item to inspect")
- Consider collapsing the three chips into a compact breadcrumb pattern

### 6. Lane picker hint text disappears on selection
`downloads-lane-button-hint` (the per-lane explanation) only shows when `isActive = true`. When browsing lanes, you can't see what each lane means until you click it. This forces trial-and-error navigation.

**Recommendation:** Show hint on hover (not just active state), or show a small tooltip on long-press/right-click.

### 7. Queue rows have no visual separation from batch canvas
The queue panel and batch canvas share a visual plane with only a subtle panel card background difference. There's no clear divider. When an item is selected, the batch canvas updates with a fade transition, but it can feel like two separate screens awkwardly forced together.

**Recommendation:** Add a stronger left-border accent to `downloads-batch-canvas` that changes color based on the active lane.

### 8. Footer inconsistency between power and beginner modes
- **beginner:** shows a resize handle with "Resize download queue height"  
- **standard/power:** shows a text card ("Desk rhythm" / "Queue first, receipts second")

This is intentional but underdocumented — a power user who switches to beginner mode loses the explanatory card and gets a resize handle with no tooltip explanation.

---

## 🟡 High — Interaction Design

### 9. No keyboard navigation hint when inbox first loads
The inbox has rich keyboard shortcuts (J/K to navigate, Enter to open proof, A to apply, I to ignore, R to refresh, ? for help) but a new user sees no indication of this. The shortcuts dialog is only shown when ? is pressed.

**Recommendation:** On first load (or first item selection), show a brief toast: "Press ? for keyboard shortcuts" — one time only, dismissible.

### 10. Batch action bar covers queue content on smaller screens
The `downloads-batch-action-bar` uses `position: fixed` at the bottom. On a laptop at typical window sizes, it overlaps the queue scroll area with no bottom padding to prevent this.

**Recommendation:** Add `padding-bottom` to `.downloads-queue-panel` equal to the action bar height when batch items are selected.

### 11. The "Filters" section in the rail is easy to miss for beginners
The beginner-mode rail has no filters toggle. The status filter is always visible but minimal. A beginner might not realize they can filter by status at all.

**Recommendation:** Add a small "Filter by type" label or icon hint near the status select in beginner mode.

### 12. Snooze picker is easy to miss
The snooze functionality is buried as a small clock icon in the decision panel actions. Users who want to "deal with this later" may not find it.

**Recommendation:** Consider adding a persistent "Snooze" option to the queue item row's context menu (right-click), or at minimum a tooltip on the clock icon.

---

## 🟠 Medium — Visual Design & Polish

### 13. Lane sticky header uses inline styles
In `DownloadsQueuePanel.tsx`, the beginner-mode sticky lane header has ~15 lines of inline `style={{...}}` for background, border, padding, etc. This should be a CSS class.

**Recommendation:** Create `.downloads-lane-sticky-header` and `.downloads-lane-sticky-header-{lane}` CSS classes.

### 14. "Files shown" grammar in batch stats (Beginner mode)
In `DownloadsBatchCanvas.buildBatchStats`, the "Files shown" label doesn't change for singular: "1 Files shown" (broken English).

**Fix needed:** `{ previewCount === 1 ? 'File shown' : 'Files shown' }` in `buildBatchStats`.

### 15. Batch checkbox alignment in queue rows
The batch checkboxes are small and sit between the list background and the row. When multiple rows are batch-selected, the visual feedback is subtle — just a blue checkbox. The row highlight when batch-selected (`is-batch-selected`) uses the same `row.selected` style, making it hard to distinguish "this row is selected" vs "this row is batch-checked but not the active selection."

### 16. Progress chip mixes progress info without hierarchy
The progress chip shows: `{phase}: {currentFile} ({processedCount}/{totalCount})`. For long filenames, this overflows and wraps in unpredictable ways.

**Recommendation:** Truncate `currentFile` to 30 chars with ellipsis.

### 17. No loading skeleton for the batch canvas
When switching between items, the batch canvas shows an animated fade transition, but there's no skeleton loader. The content disappears instantly, then fades in. With a slow item load, this creates a "flash" of empty space.

**Recommendation:** Add a `SkeletonLoader` overlay to `DownloadsBatchCanvas` when `isLoadingSelection = true`.

### 18. Confirmation dialog — no "Cancel" button explicitly visible
The `DownloadsSetupDialog` shows a confirm button but the cancel action is only accessible via Escape key or clicking outside. For destructive actions (reject), this is fine. For confirm dialogs, some users expect an explicit Cancel.

**Recommendation:** Add an explicit secondary "Cancel" button to all dialog configs (not just destructive ones).

### 19. The casual nudge chip fires too eagerly
The nudge chip (line 115) fires when `!isNudgeDismissed() && (waitingCount > 0 || specialSetupCount > 0 || blockedCount > 0)`. On a fresh launch where the previous session already dismissed it, this would show again. The `isNudgeDismissed()` check should persist across sessions.

---

## 🟢 Low — Content & Language

### 20. "Desk rhythm" footer copy is cryptic for standard users
The power-user footer says "Desk rhythm: Queue first, receipts second." A standard user sees "Keep the queue simple: Scan here, act on the right." These are good but benefit from a tooltip explaining what "receipts" means in context.

### 21. Version compare chip is dense
The `version-compare-chip` (`ArrowUp + "v{incomingVersion} available" + "Open in Library" button`) is squeezed into the queue row meta area. For narrow rows, this overflows.

### 22. No empty state illustration
The queue empty state uses a `StatePanel` with a muted icon. An illustrated empty state (simple SVG) would improve the emotional quality of these moments.

---

## ✅ Already Good

- Lane sticky headers with color accents (implemented correctly)
- Keyboard shortcuts (? opens dialog, J/K navigate, Enter opens proof)
- Batch selection with checkbox in each row
- Confirmation dialogs on all destructive actions (reject, batch reject, undo)
- Progress feedback wired to TopStrip (phase, currentFile, counts)
- Loading skeletons in queue panel
- Mode-aware language (beginner vs standard vs power)
- Casual guided tours
- Command palette (Cmd+K)
- Motion animations for selection transitions
- The rail lane picker with per-lane counts and hints

---

## Priority Fix Order

1. ✅ Fix `specialSetupCount` (use overview backend total)
2. ✅ Fix "1 items" grammar
3. ✅ Fix "waiting" → "needs review" label
4. [ ] Fix "Files shown" grammar in `buildBatchStats`
5. [ ] Add skeleton loader to batch canvas on selection change
6. [ ] Fix lane sticky header inline styles → CSS class
7. [ ] Truncate progress chip `currentFile` at 30 chars
8. [ ] Add explicit Cancel button to confirmation dialogs
9. [ ] Add `padding-bottom` to queue panel when batch bar visible
10. [ ] Show keyboard shortcut hint on first item selection (toast, one-time)

---

## ✅ Completed this pass (2026-03-25 afternoon)

### TopStrip redesign
- Split into alert row (full width, prominent) + always-visible data row
- Processing state pulses; idle status is subdued ghost text
- "No selection" → "← Select an item" with `title` tooltip
- Commit: `c001971`

### Lane picker hints on hover
- CSS updated so hint text is hidden by default, shown on hover or active
- Commit: `c001971`

### First-time keyboard shortcut toast
- Added `isKeyboardHintDismissed()` / `setKeyboardHintDismissed()` to guidedFlowStorage
- Toast appears on first item selection, auto-dismisses after 8s, persistent across sessions
- Bottom-left overlay with kbd hint and dismiss button
- Commit: `c001971`

### Batch canvas visual separation
- Lane-specific left-border accent (4px solid per-lane colour)
- New CSS classes: `.downloads-batch-canvas-lane-*`
- Commit: `c001971`

### Batch checkbox feedback
- `is-batch-selected` now uses distinct accent tint with inset left border
- Different from `is-selected` (which uses strong accent gradient)
- Commit: `c001971`

### Beginner filters discoverability
- Label changed from "Show" → "Filter"
- Commit: `c001971`

---

## 🟠 Remaining Medium/Low (deferred for now)

### Stage header still competing with queue
- The three-chip header is more compact now ("← Select an item" hint added)
- Full breadcrumb redesign deferred — needs more UX thinking

### Batch action bar overlap
- Fixed with padding-bottom on queue dock ✅ (committed earlier as `94ed01a`)

### Version compare chip overflows narrow rows
- Low priority — defer

### Empty state illustrations missing
- Low priority — defer

### Snooze picker discoverability
- Already has `title="Remind me later"` tooltip ✅ — no action needed

### Footer inconsistency between modes
- Low priority — defer

### Command palette already exists
- Cmd+K shortcut already wired ✅ — audit item #9 is partially addressed
  (toast added for beginners specifically, but power users also benefit from Cmd+K)

---

## Final Status (2026-03-25)

### All critical/high bugs fixed ✅
1. GROUP_CONCAT DISTINCT two-arg bug → single arg ✅ (`b285a0b`)
2. specialSetupCount from per-lane count → backend overview total ✅ (`94ed01a`)
3. "1 items" grammar → singular/plural ✅ (`94ed01a`)
4. "waiting" label → "needs review" ✅ (`94ed01a`)
5. Progress chip file truncation ✅ (`94ed01a`)
6. Batch stats "Files shown" grammar ✅ (`94ed01a`)
7. Lane sticky header inline styles → CSS class ✅ (`94ed01a`)
8. Batch action bar overlap → padding-bottom ✅ (`94ed01a`)

### Structural improvements done ✅
9. TopStrip split: alert row + data row ✅ (`c001971`)
10. Lane hints on hover ✅ (`c001971`)
11. Keyboard shortcut toast ✅ (`c001971`)
12. Batch canvas left-border accent per lane ✅ (`c001971`)
13. Batch checkbox distinct from selected item ✅ (`c001971`)
14. Beginner filter label clearer ✅ (`c001971`)
15. Stage header hint text ✅ (`c001971`)

### Deferred (low priority / design decisions needed)
- Empty state illustrations (low priority, no functional impact)
- Version compare chip overflow (low priority, cosmetic)
- Footer inconsistency between modes (low priority)
- Snooze picker discoverability (tooltip already exists ✅)

**Total commits today:** 7 (plus the 3 from this morning)
**Build:** Rust ✅ + TypeScript ✅

---

## ✅ Filter-aware TopStrip counters (ca3ad1f)

- `statusFilter` now threaded into TopStrip
- When filtered: single prominent counter + active filter chip + "× Clear filter" button
- When All: all four counters as before
- Nudge chip (beginner) suppressed when filtered — doesn't make sense in filtered context
- `totalItems` in TopStrip = filtered inbox count when filtered, else overview total

---

## ✅ Decision Drawer for Casual Mode (715d675)

Casual mode redesign:
- Batch canvas removed from stage grid → queue fills full height
- Selecting an item → slide-in drawer from right (480px overlay)
- Queue stays visible in background for context (backdrop click-to-dismiss)
- Casual rail wider (22vw, up to 320px)
- Casual queue rows: 40% more vertical padding, better gaps

Design rationale:
- Split view (standard/power) = efficiency mode: queue + preview visible simultaneously
- Drawer view (casual) = calm mode: full queue focus, decision drawer when ready to act

---

## ✅ Phase 1 PRD Implementation (98e2f52)

**PRD:** `C:\Users\likwi\Downloads\product_requirements_document.md` (October 26, 2023)

### What's implemented (Phase 1 — UI Design & Frontend):

**Casual Mode:**
- ✅ Warm gold accent (`--accent: #f0c879`)
- ✅ Calm and cozy aesthetic
- ✅ Spacious full-height queue (queue fills full stage, batch canvas removed from stage flow)
- ✅ 480px decision drawer (slide-in from right, spring animation, backdrop, click-to-dismiss)
- ✅ One task at a time focus

**Standard Mode:**
- ✅ Cool mint accent (`--accent: #78f0a1`)
- ✅ Efficient and functional
- ✅ Split-screen workbench: queue + batch canvas + inspector all visible simultaneously
- ✅ Dynamic layout — queue and batch canvas share the stage, inspector is always visible

**Power/Creator Mode:**
- ✅ Soft blue accent (`--accent: #84cfff`)
- ✅ Three-column workbench: rail + stage(2-col split) + inspector
- ✅ Fixed slim rail: 252px (was variable clamp — now fixed per PRD spec)
- ✅ High-density queue: smaller row heights, compact lane buttons
- ✅ Batch canvas: file structures, conflict flags (SpecialReviewPanel), version comparison signals
- ✅ Full Decision Inspector: proof trail, receipt history, version comparison
- ✅ TopStrip: detailed progress chip + small functional counters
- ✅ Trust signals: shown in inspector via signals system (setup clue, version, linked family)

**All Modes:**
- ✅ Mode switching via Settings (one deliberate click — intentional, not casual toggle)
- ✅ CSS variable-based theming (`data-user-view` attribute)
- ✅ Keyboard shortcuts (? / Cmd+K)
- ✅ Confirmation dialogs on destructive actions

### Out of Scope (per PRD):
- ❌ Proof Sheet full-screen evidence modal — not implemented
- ❌ Empty queue illustrations (cozy illustrations for Casual) — not implemented
- ❌ Guided Setup walkthrough screen — not implemented
- ❌ Backend integration for proof trail data generation — backend signals exist
- ❌ User preferences mode persistence — already implemented via UiPreferencesContext

### CSS changes (98e2f52):
- `:root[data-user-view="creator"] .downloads-rail-shell`: fixed 252px
- `:root[data-user-view="creator"] .downloads-lane-button`: compact padding 0.38rem 0.5rem
- `:root[data-user-view="creator"] .downloads-lane-button-count`: 0.68rem font
