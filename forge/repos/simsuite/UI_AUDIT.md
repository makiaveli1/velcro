# SimSuite UI/UX Audit — Mode-Aware Re-Review

**Reviewed by:** Nero (chair)  
**Date:** 2026-03-24  
**Context:** This re-audit applies the experience mode lens to the original 14 findings and surfaces new mode-specific issues. It should be read alongside the original audit (`UI_AUDIT.md`).

---

## How the Mode System Works

Before the findings, here's what each mode's contract actually guarantees:

### Experience Mode Profiles

| | **Casual** | **Seasoned** | **Creator** |
|---|---|---|---|
| **Maps to** | `userView: "beginner"` | `userView: "standard"` | `userView: "power"` |
| **Personality** | "Simple, guided, and calm for day-to-day play sessions" | "Balanced workflow with enough proof to stay confident while you sort" | "Dense, tool-forward, and ready for deeper cleanup or authoring passes" |
| **Library default** | browse (wide table, narrow detail) | browse | inspect (wide detail, narrow table) |
| **Review default** | focus (wide detail, short queue) | balanced | queue (narrow detail, tall queue) |
| **Duplicates default** | sweep (hidden filters) | balanced | compare (wide detail) |
| **Inspector** | Beginner text labels + 2 signal sections | Standard labels + all signals | Power labels + all signals + "full receipt trail" |
| **Settings labels** | "Casual", "Easygoing" | "Seasoned", "Balanced" | "Creator", "Full receipts" |

**Critical mechanism:** All panel sizes, presets, and layouts are **mode-scoped** — each mode has its own saved preferences via `modeScopedKey(mode, key)`. Switching modes resets layouts to mode defaults. This is well-engineered.

---

## Mode Contracts — What Each Mode Promises

### Casual Contract
> "Simple, guided, and calm for day-to-day play sessions."

**What this means in practice:**
- Guided flows, not dense dashboards
- Calming visual language, minimal competing elements
- Confirmation on potentially destructive actions
- Two signal sections in the Inspector (not all of them)
- Filters for duplicates are hidden by default (don't need to see them yet)
- Explicit next-step guidance

### Seasoned Contract
> "Balanced workflow with enough proof to stay confident while you sort."

**What this means in practice:**
- Equal weight between overview and detail
- All filters visible by default
- Access to proof/evidence without it dominating
- Balanced layout proportions
- Ability to switch between layout presets (browse/inspect/catalog)

### Creator Contract
> "Dense, tool-forward, and ready for deeper cleanup or authoring passes."

**What this means in practice:**
- Wide detail panels, narrower queue/table (inspector-forward)
- All evidence and receipts visible
- Queue-optimized Review layout (queue preset: detail=340, queue=620)
- Dense information display — no hand-holding needed
- Full keyboard-centric workflow potential

---

## Finding-by-Finding: Mode Assessment

### Finding 1.1 — Home Hub Too Busy
- **Casual:** VIOLATION. The Casual contract promises "calm." Five competing focal points (hero, module bands, health chips, metrics, customization overlay) directly violates this. A Casual user opening the app for a casual session (pun intended) is hit with a wall of status data.
- **Seasoned:** Acceptable. The balanced contract supports some density.
- **Creator:** Correct. This is what they asked for.

**Recommendation:** For Casual mode specifically: collapse module bands by default, reduce health chip repetition to one surface, make customization a separate screen rather than an overlay state. The home screen for Casual should be: one clear greeting → one primary CTA → one at-a-glance status → "everything else is here when you need it."

---

### Finding 1.2 — Lane Visual Indistinction
- **Casual:** Important. Casual users are still learning what the lanes mean. Lane headers with color accents and sticky positioning would help them build a mental model.
- **Seasoned:** Moderately important.
- **Creator:** Low priority.

**Recommendation:** Add lane header rows with sticky positioning. This benefits all modes but is most critical for Casual — it's part of building the "guided" mental model.

---

### Finding 1.3 — Settings Three-Column Layout
- **Casual:** VIOLATION. "Simple, guided" + three columns = fragmented attention. The right panel (Current Fit summary) competing with the detail panel creates confusion.
- **Seasoned:** Acceptable. The balanced contract can handle it.
- **Creator:** Fine.

**Recommendation:** For Casual, collapse to two columns. The "Current Fit" summary should float as a small persistent chip (top-right), not occupy a full panel. For Seasoned/Creator: keep as-is.

---

### Finding 2.1 — WorkspaceToolbar Redundancy
- **Casual:** VIOLATION (indirect). The screen name in WorkspaceToolbar duplicates the sidebar active state AND the breadcrumb. For a new user, this redundancy is noise, not signal.
- **Seasoned:** Minor issue.
- **Creator:** Noise they ignore.

**Recommendation:** Reserve WorkspaceToolbar for global actions only (scan, search, settings). Remove screen name and mode chips from the toolbar — they're already visible elsewhere. Casual users benefit most from a clean toolbar.

---

### Finding 2.2 — URL State Not Tracked
- **Casual:** Not a priority. Casual users don't think in URLs. They navigate via the sidebar.
- **Seasoned:** Useful. The balanced user might bookmark a specific screen state.
- **Creator:** High value. Power users absolutely expect deep links.

**Recommendation:** Implement for Seasoned and Creator, not Casual. Skip URL routing for Casual to keep the sidebar-only navigation contract clean.

---

### Finding 2.3 — No Global Search
- **Casual:** Low priority. Casual workflows are linear (download → library → updates). They don't need cross-domain search yet.
- **Seasoned:** Medium priority. As workflows become less linear, search across domains becomes useful.
- **Creator:** High priority. Creator workflows span Library, Downloads, Updates, and Creator Audit. Global search is essential.

**Recommendation:** Build it, but market it as a Creator feature initially. Seasoned users benefit as their usage grows. Casual users won't seek it but will discover it eventually.

---

### Finding 3.1 — Batch Operations Feel Incomplete
- **Casual:** High priority. Batch operations directly support the "simple" contract — instead of 30 individual apply clicks, one button. This is the right kind of simplicity.
- **Seasoned:** High priority.
- **Creator:** Critical.

**Recommendation:** Prioritize completing and thoroughly testing batch operations across all modes. The floating action bar should appear immediately when any item is selected.

---

### Finding 3.2 — No Keyboard Shortcuts
- **Casual:** Irrelevant. Casual users are mouse-first and should not be pressured to use shortcuts.
- **Seasoned:** Medium priority. Some shortcuts would accelerate common workflows without overwhelming.
- **Creator:** Critical. Power users are slowed by mouse-only navigation.

**Recommendation:** Build keyboard shortcuts, but design them so they don't conflict with the Casual experience. A `?` shortcut to show the shortcut reference panel — only visible in Seasoned/Creator modes.

---

### Finding 3.3 — Confirmations Are Inconsistent
- **Casual:** VIOLATION. Casual users need guidance, not "are you sure?" dialogs that appear sometimes and not others. This is a trust and safety issue.
- **Seasoned:** Moderate concern.
- **Creator:** Low concern — they know what they're doing.

**Recommendation:** Audit every destructive action (ignore, delete staging, clear data) and apply a consistent two-stage confirmation pattern. This benefits Casual most but improves trust across all modes.

---

### Finding 4.1 — Typography Scale Is Compressed
- **Casual:** VIOLATION (indirect). 13px body text is harder to read for users who are still building familiarity with the interface. The Casual contract implies readability.
- **Seasoned:** Borderline acceptable.
- **Creator:** Fine for power users.

**Recommendation:** Increase `--body-size` to 14px. This is a global change that benefits everyone without harming any mode's contract.

---

### Finding 4.2 — Plumbob and Theme Terminology Inconsistency
- **Casual:** Not a problem. The Sims vocabulary fits the "day-to-day play sessions" audience perfectly.
- **Seasoned:** Moderate issue. Seasoned users see the mix of Sims vocabulary (Plumbob, Mod WranGLING) alongside functional labels (Scan, Library). It's a slightly disjointed experience.
- **Creator:** Same issue, more pronounced.

**Recommendation:** Decide on a **terminology philosophy** for Seasoned and Creator:
- **Option A (Plain):** Keep Sims vocabulary in theme/decorative elements only. Use plain functional labels everywhere else.
- **Option B (Themed):** Commit fully to Sims vocabulary across the board — rename things to match the world (e.g., "Library" → "Wardrobe", "Mods" → "Build/Buy Items").
- **Option C (Mode-gated):** Casual gets Sims vocabulary. Seasoned/Creator get plain functional labels.

Option C is the most pragmatic — it respects the different audiences.

---

### Finding 4.3 — Color Accessibility: `--text-dim` Fails WCAG AA
- **Casual:** Accessibility issues hit newer users harder — they may not know to look elsewhere or zoom.
- **Seasoned:** Accessibility issue.
- **Creator:** Accessibility issue.

**Recommendation:** Fix globally. Use `--text-soft` or `--text` for any readable body text. Reserve `--text-dim` for timestamps, decorative labels, and placeholder text only.

---

### Finding 4.4 — Settings Descriptions Are Wordy
- **Casual:** VIOLATION. Casual's contract says "simple, guided." A 5-second prose description to compare three mode options is the opposite of simple. The "Simple, guided, and calm" contract is broken here.
- **Seasoned:** Moderate issue.
- **Creator:** Low priority — they skim or ignore descriptions.

**Recommendation:** Replace verbose descriptions with a bullet-point summary. Keep the full descriptions accessible via `?` tooltip. Apply this change globally — it helps all modes.

---

### Finding 5.1 — Loading Transitions Are Visible Flashes
- **Casual:** VIOLATION (indirect). "Calm" implies smooth transitions. A visible loading flash is jarring, even if fast.
- **Seasoned:** Minor issue.
- **Creator:** Minor issue.

**Recommendation:** Pre-warm the next likely screen on sidebar hover. Use a skeleton preview rather than a generic loading message. This is a medium-effort change with high calm-factor payoff for Casual.

---

### Finding 5.2 — Progress Feedback During Watcher Operations
- **Casual:** VIOLATION. Casual users who trigger a scan or refresh need to know something is happening. Silence feels broken.
- **Seasoned:** Informative.
- **Creator:** Informative.

**Recommendation:** Wire up the `progress` field in `DownloadsWatcherStatus` (already in the model) to the UI. Show current file + phase during watcher runs. This is a Casual contract issue primarily.

---

## New Findings Discovered Through Mode Lens

### Finding 6.1 — Casual Mode's "Guided" Contract Has No Guided Flows
**This is the most significant new finding.**

The Casual mode promises "Simple, guided, and calm for day-to-day play sessions." But there are **no actual guided flows** implemented. The "guidance" is limited to:
- Simplified text labels ("Older than installed" vs "Incoming looks older")
- 2 Inspector signal sections instead of all of them
- Hidden duplicate filters

There is no onboarding sequence, no first-download tutorial, no "here's what to do next" flow. For a mode targeting users who want to be guided, this is a hollow promise.

**Specific gaps:**
- No first-run experience when a Casual user first opens Downloads
- No lane explanation ("This is Ready Now — items you can apply directly")
- No contextual nudges ("You have 5 items in Waiting On You — open them when you're ready")
- No "what does this mean?" inline help for lane states

**Recommendation:** This needs a dedicated design pass. Possible implementations:
1. A lightweight onboarding tour (3-4 screens) triggered on first Casual mode use
2. Inline lane explanations on first visit to Downloads
3. A persistent "Guidance Mode" chip in Casual that surfaces context-aware help

---

### Finding 6.2 — Mode Switching Resets Layout But Not Mental Model

When a user switches from Casual to Seasoned:
- Panel sizes reset to Seasoned defaults ✅
- Filter visibility changes ✅
- Inspector labels change ✅

But the user's **mental model** was built in Casual. Switching modes doesn't prepare them for the sudden density change. The Seasoned mode is "louder" and more complex — and there's no transition guidance.

**This is most disruptive when:**
- A user tries Seasoned for a day, then goes back to Casual and finds things feel "dumbed down"
- A user starts in Casual, switches to Seasoned, and is immediately lost

**Recommendation:** Add a brief transition explanation when switching modes — "Seasoned shows more detail and gives you more control. Your Casual layout is saved if you want to go back."

---

### Finding 6.3 — The `density` Control Is Underused

The system has `UiDensity: "compact" | "balanced" | "roomy"` as a separate axis from experience mode. But this control is buried in Settings and not clearly connected to the mode system.

**The opportunity:** For Casual users who want "simple but powerful," the density control could be surfaced as a secondary slider in Settings — "More space vs More information" — independent of the mode selector.

Currently, the density control is functional but discoverable only to users who dig into Settings preferences.

---

### Finding 6.4 — Seasoned/Creator Modes Share the Same Sidebar

All three modes use the same 92px icon sidebar with the same navigation items. The Seasoned and Creator contracts differ significantly in layout presets and information density, but the navigation is identical.

For Casual, this is fine — they only need Home, Downloads, Library.

For Seasoned and Creator, the sidebar could offer mode-specific shortcuts. Creator mode, for example, might surface Creator Audit and Category Audit more prominently since these are Creator-forward workflows.

**Current sidebar structure:** All 10 screens always visible (Home, Downloads, Library, Updates, Organize, Review, Duplicates, Creator Audit, Category Audit, Settings).

**Recommendation:** Consider mode-specific sidebar highlighting or reordering. For Casual, keep it minimal (Home, Downloads, Library, Settings). For Seasoned, all 10 with standard order. For Creator, elevate audit screens.

---

## Revised Priority Matrix — By Mode

### For Casual Mode (Beginner)
| Priority | Finding | Why |
|---|---|---|
| **P0** | **4.3** — text-dim contrast | Accessibility, readability |
| **P0** | **4.4** — verbose settings descriptions | Violates "simple, guided" contract |
| **P0** | **6.1** — no guided flows | The Casual contract's core promise is unfulfilled |
| **P1** | **1.1** — home screen density | Violates "calm" contract |
| **P1** | **3.3** — inconsistent confirmations | Trust and safety |
| **P1** | **5.2** — no progress feedback | "Calm" means knowing what's happening |
| **P2** | **1.2** — lane visual distinction | Learning aid |
| **P2** | **1.3** — settings 3-column | Fragments attention |
| **P2** | **5.1** — loading flashes | Calming transitions |
| **P2** | **4.1** — typography 13px | Readability |
| **P3** | **3.1** — batch ops | Eventually useful |
| **P3** | 2.1, 2.2, 2.3, 3.2, 4.2 | Low priority for Casual |

### For Seasoned Mode (Standard)
| Priority | Finding | Why |
|---|---|---|
| **P0** | **4.3** — text-dim contrast | Accessibility |
| **P0** | **3.1** — batch operations | Efficiency |
| **P1** | **3.2** — keyboard shortcuts | Efficiency |
| **P1** | **2.3** — global search | Growing cross-domain usage |
| **P1** | **4.2** — terminology inconsistency | polish |
| **P2** | **2.2** — URL state | Bookmarking, sharing |
| **P2** | **6.2** — mode transition guidance | Reduces churn |
| **P2** | **6.4** — sidebar elevation | Creator audit is underused |
| **P3** | 1.1, 1.2, 1.3, 3.3, 4.1, 4.4, 5.1, 5.2 | Lower priority |

### For Creator Mode (Power)
| Priority | Finding | Why |
|---|---|---|
| **P0** | **3.2** — keyboard shortcuts | Essential for power users |
| **P0** | **3.1** — batch operations | Essential for scale |
| **P0** | **2.3** — global search | Cross-domain at scale |
| **P0** | **4.3** — text-dim contrast | Accessibility |
| **P1** | **2.2** — URL state | Deep linking expectation |
| **P1** | **6.4** — sidebar elevation | Creator audit workflows |
| **P1** | **4.1** — typography | Power users prefer density |
| **P2** | **6.2** — mode transition guidance | Less critical for Creator |
| **P3** | Everything else | Low priority |

---

## Cross-Mode Recommendations

**Do these globally — no mode-specific logic needed:**
1. **Fix 4.3** (text-dim contrast) — benefits everyone
2. **Fix 4.4** (verbose settings) — bullet-point descriptions globally
3. **Fix 4.1** (typography) — bump to 14px globally
4. **Fix 3.3** (confirmations) — consistent two-stage pattern globally
5. **Fix 5.2** (progress feedback) — wire up `progress` field globally

**Do these per-mode as described above:**
- Home screen density (1.1) — Casual only
- Settings layout (1.3) — Casual only
- Guided flows (6.1) — Casual only, needs dedicated design pass
- Keyboard shortcuts (3.2) — Seasoned/Creator priority
- Global search (2.3) — Seasoned/Creator priority
- URL state (2.2) — Seasoned/Creator priority

---

## Summary

The experience mode system is the most sophisticated UX decision in SimSuite. The problem isn't that it doesn't work — it's that the **Casual contract ("simple, guided, calm") has unfulfilled promises**, while the **Creator contract ("dense, tool-forward") is actually working correctly**.

The two most important things to fix:
1. **For Casual:** Actually deliver on the "guided" promise — the current implementation of Casual is "Seasoned but with shorter labels." That's not the same as truly guided.
2. **For Creator:** Keyboard shortcuts and global search are the missing pieces that would make Creator mode feel genuinely powerful rather than just "Seasoned with a wider inspector."

The good news: the mode-scoped layout system is well-engineered. Any fixes that respect the mode boundaries will slot in cleanly.
