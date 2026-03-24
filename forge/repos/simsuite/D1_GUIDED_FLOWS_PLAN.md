# SimSuite D1 — Casual Guided Flows: Implementation Plan

**Produced by:** Forge (builder agent)  
**Approved by:** Nero (chair)  
**Date:** 2026-03-24  
**Status:** Design complete — ready for implementation

---

## 1. Research Findings — What Already Exists

### Existing "beginner" (Casual) Mode Differences

The codebase uses `userView === "beginner"` (which maps to `casual` experience mode via `experienceModeToLegacyView`) as the guard for all Casual-specific UX. Currently it only handles:

- **Text substitution** via `uiLanguage.ts` — alternate labels (e.g., `"Library"` → `"My CC"`)
- **Simplified filter UI** — single status dropdown instead of advanced filters
- **Fewer inspector signals** — DecisionPanel passes 2 signals max for Casual vs. all for Creator
- **Different placeholder copy** — empty state body text differs per view mode

### What's Completely Absent

- **Zero onboarding/tour components** — no `*tour*`, `*onboard*`, `*walkthrough*`, or `*firstRun*` files
- **No lane explanations** — lane `hint` text only renders when a lane is already active
- **No contextual nudges** in DownloadsTopStrip
- **No first-visit conditional banners** anywhere in the Downloads flow
- **No localStorage keys** for any guided-flow dismissal state

### Key File Locations

| What | File |
|---|---|
| Lane labels + hints | `src/screens/downloads/downloadsDisplay.ts` |
| Top strip (no nudge today) | `src/screens/downloads/DownloadsTopStrip.tsx` |
| Lane picker rail | `src/screens/downloads/DownloadsRail.tsx` |
| Queue panel + empty states | `src/screens/downloads/DownloadsQueuePanel.tsx` |
| Inspector (DecisionPanel) | `src/screens/downloads/DownloadsDecisionPanel.tsx` |
| Home screen | `src/screens/HomeScreen.tsx` |
| Text/i18n for Casual | `src/lib/uiLanguage.ts` |
| Settings screen | `src/screens/SettingsScreen.tsx` |

---

## 2. The 5 Guided Flows

### Flow 1: First-Run Downloads Tour
**Type:** Modal overlay, 4 steps  
**Trigger:** First time a Casual user opens Downloads, unless `simsuite:casual:downloads-tour-dismissed` is set

| Step | Title | Body |
|---|---|---|
| 1 | "Your Downloads inbox" | "New mods land here before they go to your game. SimSuite checks each one so nothing Sneaky gets through." |
| 2 | "Five waiting lanes" | "**Ready now** = safe. **Waiting on you** = needs a choice. **Special setup** = has rules. **Needs review** = look closer. **Done** = all sorted." |
| 3 | "How to apply a mod" | "Click any item → review the summary → hit Apply. Nothing touches your game until you say so." |
| 4 | "You're in control" | "Nothing moves without you. If something looks wrong, hit Ignore. SimSuite will wait." |

**Dismissal:** "Skip tour" on steps 1-3; "Got it" on step 4. Both set localStorage key permanently.

**Design:** Full-screen semi-transparent backdrop, centered card (max 480px), numbered step dots, Prev/Next navigation, motion-animated step transitions using existing `m` motion patterns.

---

### Flow 2: Lane Explanations
**Type:** Dismissible banner above the queue  
**Trigger:** First time a Casual user views each lane; each lane has its own dismissal key

| Lane | Title | Body |
|---|---|---|
| `ready_now` | "Safe and ready" | "These files have passed the safety check. They're good to move to your game whenever you are." |
| `waiting_on_you` | "Needs your input" | "These need something from you — maybe a creator name, a type, or a choice. Click one to get started." |
| `special_setup` | "Has its own rules" | "These mods come with special instructions. SimSuite will walk you through what needs attention." |
| `blocked` | "Stopped for safety" | "SimSuite blocked these to protect your game. Check the warning, then decide." |
| `done` | "Already sorted" | "These are applied or tucked away. Click any one to undo and move it somewhere else." |

**Dismissal:** "Got it" button sets `simsuite:casual:lane-${laneId}-explained = "true"` permanently.

**Design:** Soft amber/muted background, small dismiss button top-right, appears below panel heading and above queue list, fade-in animation.

---

### Flow 3: Context-Aware Nudge
**Type:** Inline chip in DownloadsTopStrip  
**Trigger:** Casual + `waitingCount > 0` + `nudge-dismissed` not set

**Message:** `"You have {N} item(s) waiting in {LaneName} — review when you're ready"`  
(Lane = first non-zero from: waiting_on_you → special_setup → blocked → ready_now)

**Appearance:** Soft amber `is-warn` chip — non-alarming  
**Dismissal:** Click navigates to that lane AND sets dismissed; explicit X button dismisses only

---

### Flow 4: Inspector Guidance for Casual
**Type:** Plain-English summary block in DecisionPanel  
**Trigger:** Always shown for Casual (no localStorage needed)

**Addition above the signal list:**
```
Lane: [laneLabel] — [one-line plain-English meaning]
Action available: [Apply] — tap to move this to your game
```

Uses existing `laneLabel` and `primaryActionLabel` props with a plain-English reframe. No new component — conditional render inside `DownloadsDecisionPanel`.

---

### Flow 5: Home Screen CTA
**Type:** Prominent card between hero and module stack  
**Trigger:** Casual + `overview.waitingOnYouItems > 0` (data-conditional, not dismissible)

**Design:** Large friendly card with inbox icon. Text: `"You have {N} item(s) waiting in Downloads"` / sub: `"Review them before they touch your game"` / button: `"Review waiting items →"` that navigates to Downloads with lane pre-selected.

---

## 3. New Components

### `src/components/CasualGuidedTours.tsx` (new)
The 4-step onboarding modal overlay.

```
<CasualTourOverlay>      // backdrop + centered card
  <CasualTourStep step={n}>
    <TourTitle />
    <TourBody />
    <TourStepDots />
    <TourNav />          // Prev / Skip / Next / Got it
  </CasualTourStep>
</CasualTourOverlay>
```
Props: `onComplete: () => void`, `onDismiss: () => void`  
State: `currentStep: number` (local useState)

### `src/lib/guidedFlowStorage.ts` (new)
Centralized localStorage utilities for all guided flow keys.

```typescript
export function isDownloadsTourDismissed(): boolean
export function setDownloadsTourDismissed(): void
export function isLaneExplained(lane: DownloadQueueLane): boolean
export function setLaneExplained(lane: DownloadQueueLane): void
export function isNudgeDismissed(): boolean
export function setNudgeDismissed(): void
```

---

## 4. File Changes

### New Files
- `src/components/CasualGuidedTours.tsx`
- `src/lib/guidedFlowStorage.ts`

### Existing Files to Modify
| File | Change |
|---|---|
| `src/screens/DownloadsScreen.tsx` | Mount `DownloadsTour` modal on mount when conditions met |
| `src/screens/downloads/DownloadsTopStrip.tsx` | Add Casual nudge chip (Flow 3) |
| `src/screens/downloads/DownloadsQueuePanel.tsx` | Add lane explanation banner (Flow 2) |
| `src/screens/downloads/DownloadsDecisionPanel.tsx` | Add plain-English action summary block (Flow 4) |
| `src/screens/HomeScreen.tsx` | Add big CTA card (Flow 5) |
| `src/styles/globals.css` | Add CSS for: tour overlay, tour card, lane banner, nudge chip, home CTA |

---

## 5. Implementation Order

1. **`guidedFlowStorage.ts`** — build utilities first, everything depends on it
2. **`CasualGuidedTours.tsx`** — the tour modal, Flow 1
3. **`DownloadsScreen.tsx`** — wire the tour mount logic
4. **Flow 2 — Lane explanations** in `DownloadsQueuePanel`
5. **Flow 3 — Nudge** in `DownloadsTopStrip`
6. **Flow 4 — Inspector guidance** in `DownloadsDecisionPanel`
7. **Flow 5 — Home CTA** in `HomeScreen`
8. **CSS** — add all styles in one pass after components are built

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Tour re-shows on re-mount if localStorage write is async | Use synchronous `localStorage.setItem` |
| Lane banner竞争 with existing empty states | Gate banner render with `items.length > 0 && !isExplained` |
| Nudge overlaps existing top strip layout | Use existing chip pattern (`ghost-chip`, `health-chip`) rather than new elements |
| Tour backdrop blocks scroll during mount | `pointer-events: none` on backdrop, `overflow: hidden` on body during tour |
| Home CTA conflicts with hero tone system | CTA card uses its own styling, not tied to hero tone |
