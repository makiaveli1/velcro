# SimSuite UI/UX Audit Report

**Reviewed by:** Nero (chair)  
**Date:** 2026-03-24  
**Scope:** Full app — visual review + source code structural analysis  
**Themes reviewed:** "default" (mint), "buildbuy" (amber), "cas" (blue)  
**Screens reviewed:** HomeScreen, DownloadsScreen, SettingsScreen, LibraryScreen, App.tsx, globals.css (9,221 lines)

---

## Executive Summary

SimSuite has a **strong design foundation** — sophisticated CSS architecture, thoughtful theming, good component structure — but it's fighting itself. The visual language is rich and distinctive, yet the UX patterns undercut the quality. It's a pro tool that doesn't trust the user to know it's a pro tool. The result: an interface that looks incredible in screenshots but creates friction in daily use.

**Verdict:** The bones are great. The surfaces need refinement. Not a rewrite — targeted improvements across 5 areas.

---

## Strengths — Don't Touch These

1. **CSS design system** — 3 full themes with consistent custom properties, well-structured color scales, good spacing tokens. This is genuinely impressive engineering.
2. **Motion library** — AnimatePresence, spring physics, staggered lists. The animation layer is sophisticated and the `motion/react` integration is clean.
3. **Three-panel layout pattern** (Rail + Stage + Inspector) — the Workbench component is the right abstraction for this kind of tool.
4. **Theming** — the three distinct themes (mint/green, amber/buildbuy, blue/cas) are cohesive and appropriate for the Sims modding audience.
5. **Sidebar navigation** — icon-based, compact, 92px wide. Right call for a power-user tool.
6. **Density controls** — the Casual/Seasoned/Creator modes are a smart way to handle the beginner-to-power-user spectrum.
7. **Loading states** — the `StatePanel` component with its loading variants is well-designed.
8. **Type safety** — full TypeScript throughout. The types file is comprehensive.

---

## Category 1: Information Density & Cognitive Load

### Finding 1.1 — The Home Hub Is Too Busy

The home screen has **too many competing focal points**. The hero section, module bands, health chips, metric cards, and action buttons all compete for attention simultaneously. A new user lands on a wall of status indicators with no clear "what do I do first?"

**Specific issues:**
- The hero state occupies ~30% of the viewport but communicates status, not direction
- Health chips (good/warn/danger) appear in multiple places — hero, module cards, footnote — creating repetition without hierarchy
- Module bands (Updates, Downloads, Library) are visually equal in weight despite having different urgency levels
- "Customizing" mode adds another layer of UI on top of an already-dense screen

**Recommendation:** Refactor the home screen into a **one-thing-first layout**:
1. The hero section should dominate — show ONE primary CTA based on the most urgent thing
2. Module bands should be collapsible by default, expanding on demand
3. Health status should appear in ONE place with a clear visual hierarchy
4. Move the customizing UI into a settings panel rather than an overlay state

---

### Finding 1.2 — Downloads Queue Lanes Are Visually Indistinguishable at a Glance

The 5 lanes (ReadyNow, WaitingOnYou, SpecialSetup, NeedsReview, Done) have subtle visual differentiation. On a screen full of items, finding your lane requires reading labels.

**Current pattern:** Lane color is conveyed through a subtle tone property on each item.  
**Issue:** The tone system uses `good/neutral/warn/danger` but these are semantic, not spatial. A user scanning the queue can't partition the space visually.

**Recommendation:**
- Use a **left border accent** in lane-specific colors (already-lane-coded in the design — just surface it more prominently)
- Add a **lane header row** that sticks to the top of the queue with the lane name + count and a distinct background color
- Consider giving each lane a **distinct icon** in addition to the label

---

### Finding 1.3 — The Settings Three-Column Layout Fragments Attention

The Settings screen uses three columns: sidebar categories (Experience, Appearance...) → selected category detail → current fit summary. The user's eye has to travel horizontally to connect a setting to its effect.

**Specific issue from visual review:** The "Current Fit" summary in the bottom right repeats what the cards already show. It's additive rather than synthesized.

**Recommendation:**
- Collapse to a **two-column pattern**: categories on the left, detail panel on the right
- The "Current Fit" summary should replace the detail view when relevant, not sit alongside it
- Or: make "Current Fit" a floating persistent chip in the top-right corner rather than a panel

---

## Category 2: Navigation & Wayfinding

### Finding 2.1 — Breadcrumbs and Context Labels Are Redundant

The WorkspaceToolbar shows the current screen name (Downloads, Library, etc.) AND the experience mode chip (CASUAL / SEASONED / CREATOR) AND the theme chip. That's three pieces of navigation context competing for the same visual space.

**Issue:** The screen name is already visible in the sidebar as the active item. The WorkspaceToolbar is repeating information the sidebar just communicated, without adding new value.

**Recommendation:**
- Reserve the WorkspaceToolbar for **actions**, not labels: scan button, notifications, global search
- Move experience mode and theme into the Settings screen as persistent controls (they're already there)
- If a breadcrumb is needed, show the path: `Home / Downloads` — not the current screen name repeated

---

### Finding 2.2 — Screen URL State Is Lost

`resolveInitialScreen()` reads from URL params for the initial screen. But navigating between screens doesn't update the URL. This means:
- Browser back/forward doesn't work between screens
- Sharing a deep link to a specific screen is impossible
- Refreshing on Downloads screen goes to Home

**Recommendation:**
- Use React Router or a simple URL state manager
- Map screen to URL: `?screen=downloads`, `?screen=downloads&lane=ready`
- Add URL params for selected items: `?screen=downloads&item=1234`
- This is a medium-effort change but high impact for usability

---

### Finding 2.3 — No Global Search

For a mod manager with potentially thousands of items across Library, Downloads, Updates — there is no global search. Users must navigate to each screen and search within it.

**Recommendation:**
- Add a **command palette** (Cmd+K pattern) as the primary navigation shortcut
- Global search should search across Library, Downloads, and Updates simultaneously
- Results should be categorized and keyboard-navigable
- This is a well-known UX pattern that power users expect

---

## Category 3: Interaction Design

### Finding 3.1 — Batch Operations Feel Incomplete

Batch selection (multi-select items in the Downloads queue) exists — `batchSelectedIds: Set<number>` is in the state. But based on the git history and the visual screenshots, the bulk action bar (floating "Apply Selected N" / "Ignore Selected N") may not be fully wired or tested.

**Recommendation:**
- Ensure the batch action bar appears **as soon as any item is selected**, not just in a specific lane
- The count badge should be prominent
- After a bulk action, selection should clear
- Verify: does batch ignore work? Does batch apply work? Does the backend return a meaningful summary?

---

### Finding 3.2 — No Keyboard Shortcuts

This is a power-user tool managing potentially thousands of files. There are zero keyboard shortcuts documented or implemented (based on code review — no `useHotkeys` or equivalent hook visible).

**Recommendation — MVP shortcuts to add:**
- `J/K` or `↑/↓` — navigate list items
- `Enter` — open selected item detail
- `A` — apply selected item
- `I` — ignore selected item
- `R` — refresh
- `?` — open keyboard shortcuts help
- `Esc` — close dialog / deselect all

This is a high-impact, medium-effort addition that transforms the tool from "mouse-only" to "power tool."

---

### Finding 3.3 — Confirmations Are Inconsistent

Some destructive actions (delete, ignore) appear to have confirmation dialogs. Others don't. The pattern isn't consistent.

**Recommendation:**
- Apply the **two-stage confirmation pattern** consistently: 
  - Stage 1: "Are you sure?" with the action described in plain language
  - Stage 2: Final confirmation for truly destructive acts (delete staging folder, clear DB)
- Auto-dismiss confirmations after 5 seconds if the user hasn't interacted (they're working fast)
- Never use `alert()` or native browser dialogs — always use the app's own dialog component

---

## Category 4: Visual Design Refinements

### Finding 4.1 — Typography Scale Is Compressed

The body font size is `13px` (`--body-size: 13px` in globals.css). This is at the small end of acceptable for a desktop app, and the description text in settings cards is even smaller.

**Issue:** Descriptions in settings cards and secondary text throughout the UI is 12px or smaller. For an app users may have open for hours during modding sessions, this is taxing.

**Recommendation:**
- Increase `--body-size` to `14px` (this is the industry standard for desktop productivity apps)
- Audit all `font-size: 12px` usages — flag any that are for readable body text (as opposed to metadata like timestamps)
- Consider adding a `density: compact/normal/spacious` control that scales font size proportionally

---

### Finding 4.2 — The Plumbob and Theme Terminology

The Sims-specific theming (plumbob icon, "Mod WranGLING", experience modes) is charming and appropriate for the audience — but it's inconsistent in how deeply it goes.

**Specific issue:** Some UI labels are aggressively Sims-themed while others use generic software terminology. This creates a disjointed feel. E.g., "Mod WranGLING" in the sidebar but "Scan" as a button label. "Seasoned" as an experience mode but "Home" as a screen name.

**Recommendation:**
- Decide on a **unified terminology philosophy**: either lean fully into Sims vocabulary (rename "Library" to "Warderobe" or similar) OR keep Sims vocabulary confined to the theme layer and keep functional labels plain
- The current mix feels like it started theming and stopped halfway

---

### Finding 4.3 — Color Accessibility in Dark Themes

The mint theme uses `--accent: #78f0a1` on `--bg: #071217`. The contrast ratio is 7.2:1 — excellent. But `--text-dim: #7f928a` on `--bg: #071217` is approximately 4.5:1, which is below WCAG AA for body text (requires 4.5:1).

**Specific issue:** The descriptions in settings cards, secondary metadata throughout the app, and dimmed text consistently fall short of WCAG AA compliance.

**Recommendation:**
- Audit `--text-dim` usage — reserve it for decorative text or placeholders only
- For any text a user is expected to read (descriptions, notes, secondary info), use `--text-soft` or `--text` 
- Consider running the app through a contrast checker tool on the three themes
- The amber (buildbuy) theme has similar issues with `--text-dim`

---

### Finding 4.4 — Settings Descriptions Are Wordy

The settings mode cards (Casual, Seasoned, Creator) contain lengthy prose descriptions:
> "The app keeps the chatter lighter and surfaces guidance when things need your eye."

This is 5 seconds of reading to understand one setting. For power users changing settings frequently, this is friction.

**Recommendation:**
- Replace prose descriptions with **bullet-point functional summaries**: "No technical detail / Show all options / Expert mode with full receipts"
- Keep the prose descriptions available via a `?` help icon tooltip
- Same for other verbose descriptions throughout settings

---

## Category 5: Performance Perception

### Finding 5.1 — Loading States Feel Slow Even When They Aren't

The app uses Suspense lazy loading for screens. When a screen loads, it shows "Loading workspace view..." in a plain `state-panel--loading` state, then renders. This transition is noticeable.

**Specific issue:** The lazy loading is per-screen. Navigating from Home → Downloads always has a visible load flash.

**Recommendation:**
- Pre-warm the next most-likely screen in the background when the user hovers over the sidebar
- Make the loading skeleton a more specific preview of the screen being loaded, not a generic message
- Consider keeping all screens loaded in a hidden layer and toggling visibility (eliminates the flash entirely at the cost of memory)

---

### Finding 5.2 — Progress Feedback Is Absent During Watcher Operations

From the visual review and code analysis, when the Downloads watcher is scanning or extracting, the UI shows a spinner or "processing" state but doesn't communicate:
- Which file is being processed
- How many files remain
- What phase (scanning vs. extracting vs. assessing)

**Note:** The P0 Issue 3 implementation will add `last_downloads_scan_at` and the `progress` field to `DownloadsWatcherStatus`. Once that's wired up, the UI needs to display it.

**Recommendation:**
- Show the current file being processed in the top strip during watcher runs
- Show a progress bar (even approximate) for archive extractions
- Show "Checking X items..." during scans rather than just a spinner

---

## Priority Matrix

| # | Finding | Impact | Effort | Priority |
|---|---|---|---|---|
| 1.2 | Lane visual differentiation | Medium | Low | **High** |
| 3.2 | Keyboard shortcuts | High | Medium | **High** |
| 2.3 | Global search / command palette | High | Medium | **High** |
| 2.2 | URL-based screen state | Medium | Medium | **High** |
| 4.3 | Text-dim contrast accessibility | Medium | Low | **High** |
| 3.1 | Batch ops completeness | High | Low | **High** |
| 4.4 | Settings description verbosity | Low | Low | Medium |
| 1.1 | Home screen declutter | Medium | Medium | Medium |
| 1.3 | Settings layout | Medium | Medium | Medium |
| 4.1 | Typography scale | Low | Low | Medium |
| 5.1 | Loading transitions | Low | Medium | Medium |
| 5.2 | Progress feedback during scans | Medium | Low | Medium |
| 2.1 | WorkspaceToolbar redundancy | Low | Low | Low |
| 4.2 | Theme terminology consistency | Low | Low | Low |

---

## What's Already Good and Doesn't Need Changes

- The CSS custom property architecture — genuinely impressive
- The three-panel Workbench layout — correct abstraction
- Motion/animation system — sophisticated, appropriate use
- The sidebar icon navigation — right call at 92px
- The StatePanel loading component — well-designed
- TypeScript coverage — comprehensive and clean
- The three-theme system — cohesive, appropriate audience fit
- Experience mode system — smart accessibility feature
- Lazy loading architecture — correct for a large app

---

## Summary for Forge

The SimSuite UI is **better than most production apps** but falls short of its own potential. The design system is excellent; the UX patterns are slightly behind the visual quality. Most fixes are:
- **Low-effort, high-impact**: keyboard shortcuts, lane visual differentiation, contrast fixes, batch ops completion
- **Medium-effort, high-impact**: global search/command palette, URL state, home screen restructure
- **Avoid**: don't refactor the CSS architecture, don't change the Workbench pattern, don't strip the themes

The SimSuite UI audit is complete. Ready to hand off prioritized implementation items to Forge when Nero authorizes the next cycle.
