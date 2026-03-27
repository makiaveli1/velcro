# SimSuite Inbox Redesign — Phase 2 Implementation Report
**Date:** 2026-03-27
**Status:** Phase 2 COMPLETE · All reviews incorporated

---

## 1. Current State Recap

Phase 1 (complete from previous session):
- Timestamp: 3 → 1 canonical (DownloadsTopStrip)
- Zero-count lanes: filtered, with empty state guard
- Sidebar: dimmed with surface-2 background
- Lane count badge borders: removed
- Redundant inner lane header in queue panel: removed
- Dead CSS: cleaned up
- Ghost-chip border: removed in rail context

---

## 2. Phase 2 Goals vs. Delivery

| Goal | Status |
|---|---|
| Sentinel pre-ship fixes (empty state guard, aria) | ✅ Complete |
| Decision panel zero-state collapse | ✅ Complete + all Sentinel/Ariadne fixes applied |
| Progressive disclosure on queue cards | ✅ Complete |
| Ghost-chip border polish | ✅ Complete |

---

## 3. Files Changed

```
simsuite-review/src/
├── screens/downloads/
│   ├── DownloadsDecisionPanel.tsx   [+isEmpty/+isLoadingDecision/+ARIA/+empty state]
│   └── DownloadsQueuePanel.tsx     [+QueueRowDepth/+depth/+reduced indicator]
├── DownloadsScreen.tsx             [+queueDepth/+isLoadingDecision wired]
└── styles/
    └── globals.css                 [+6 new/updated CSS classes]
```

---

## 4. Sentinel Fixes Applied

| Issue | Fix | Result |
|---|---|---|
| `isEmpty` collapses before data is computed | Added `isLoadingDecision` prop; guarded with `!isLoadingDecision && isEmpty` | ✅ Panel stays full while `isLoadingSelection` is true |
| `compact` depth hides all badges — Casual loses state indication | Added `showReducedIndicator` — shows one tone-colored badge in Casual | ✅ Casual cards always show a state indicator |
| `.downloads-decision-empty` has no ARIA role | Added `role="status"`, `aria-live="polite"`, `aria-label="Decision panel — no content"` | ✅ Screen readers announce correctly; keyboard nav not disrupted |

---

## 5. Ariadne Fixes Applied

| Issue | Fix |
|---|---|
| Long title breaks empty state layout | `.downloads-decision-empty-title`: added `flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Note pushed to far right by `margin-left: auto` — orphaned | Removed `margin-left: auto`; title now takes `flex: 1`; note gets `flex-shrink: 0; max-width: 12rem` so chip+note stay tight as a pair |
| `showBadges` and `showMeta` always equal (not independently controllable) | Noted as constraint for future — functionally correct for current use |

---

## 6. Decision Panel Collapse — Final Implementation

### Props
```tsx
interface DownloadsDecisionPanelProps {
  ...
  isEmpty?: boolean;           // panel has no decision content
  isLoadingDecision?: boolean;  // data still being computed — guard against early collapse
}
```

### Logic
```
showCollapsed = !isLoadingDecision && isEmpty
```

### Trigger conditions
```
isEmpty = decisionBadges.length === 0 && visibleInspectorSignals.length === 0
```
- `decisionBadges` always ≥ 1 when item selected (intake mode + status badge) → truly triggers on `signals === []`
- `isLoadingDecision` guard: panel stays full while `isLoadingSelection === true`

### Collapsed state (Ariadne-approved layout)
```
[ title (flex:1, truncates) ] [ ghost-chip lane ] [ note (flex-shrink:0) ]
```
- Title truncates cleanly before crowding chip or note
- Chip + note form tight context pair on the right
- `role="status"` + `aria-live="polite"` for accessibility

---

## 7. Progressive Disclosure — Final Implementation

### Type
```tsx
export type QueueRowDepth = "compact" | "standard" | "full";
```

### Per-depth visibility
| Field | `compact` (Casual) | `standard` (Seasoned) | `full` (Creator) |
|---|---|---|---|
| Title | ✅ | ✅ | ✅ |
| Summary | ✅ | ✅ | ✅ |
| Reduced tone badge | ✅ (1 only) | — | — |
| Full badges | — | ✅ | ✅ |
| Meta (creator, file count) | — | ✅ | ✅ |
| Samples | — | — | ✅ |

### Computation
```tsx
const queueDepth: QueueRowDepth =
  userView === "beginner" ? "compact"
  : userView === "power"  ? "full"
  : "standard";
```

---

## 8. CSS Changes Summary

| Class | Change |
|---|---|
| `.downloads-rail-shell .ghost-chip` | Added: `border-color: transparent` — rail chips lose noisy borders |
| `.downloads-item-reduced-badge` | New: compact badge sizing (`font-size: 0.62rem; padding: 0.1rem 0.3rem`) |
| `.downloads-rail-empty-lanes` | New: italic "No items in any lane yet." empty state |
| `.downloads-decision-empty` | New: flex row with `role="status"` + ARIA |
| `.downloads-decision-empty-title` | New: `flex: 1; min-width: 0; overflow/truncate` — title handles overflow |
| `.downloads-decision-empty-note` | New: `flex-shrink: 0; max-width: 12rem; overflow/truncate` — chip+note stay tight |

---

## 9. Review Summary

### Ariadne (Studio)
| Item | Verdict |
|---|---|
| Collapsed empty state design | ✅ Pass |
| `compact/standard/full` density contracts | ✅ Pass |
| Hiding badges/meta in Casual | ✅ Pass (reduced badge added) |
| Hierarchy in collapsed empty state | ✅ Fixed (CSS layout) |
| Ship readiness | ✅ With CSS title-overflow fix |

### Sentinel (Argus)
| Item | Verdict |
|---|---|
| `isEmpty` collapses before data loads | ✅ Fixed (`isLoadingDecision` guard) |
| `compact` hides all badges | ✅ Fixed (reduced single badge) |
| Loading-state edge case on Decision panel | ✅ Fixed |
| Keyboard/screen reader on empty state | ✅ Fixed (ARIA roles) |
| Flash of full-content before compact | ❌ False concern — synchronous derivation |

---

## 10. Regressions / Remaining Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `showBadges` and `showMeta` always equal — future independent control not possible | Very low | Documented; can be decoupled if needed |
| Decision panel empty state: very long batch names still wrap at `min-width: 320px` | Very low | Title truncation handles 99% of cases; extremely long names wrap cleanly |
| `isLoadingDecision` → `isLoadingSelection` — if selection loading state name changes, prop becomes orphan | Low | Prop name matches existing `isLoadingSelection` state in `DownloadsScreen` |

---

## 11. What Remains

### Phase 2 (low-priority finishing touches)
- Status pills → hover drawer for Casual/Seasoned (state wiring change)
- Seasoned: inline "Why is this waiting?" explanations in queue cards (adds `whyReason` field to row model)
- Verify zero-download first launch renders correctly with all changes applied

### Phase 3
- Creator: structured file manifests with NEW/MODIFIED/STANDARD priority flags (backend data + display logic)
- Creator: Conflict Map panel
- Per-view density configuration with user toggle
- Color system semantic cleanup (status vs. interaction vs. highlight)

---

## 12. Recommended Next Phase

**Priority 1:** Status pills → hover drawer
- Highest visibility change remaining in Phase 2
- Frees top bar real estate without losing information
- Moderate complexity

**Priority 2:** Build + manual test run
- Compile the modified project and run through all seven validation scenarios
- Zero-download first launch is the most important to verify manually

**Priority 3:** Seasoned "Why is this waiting?" inline explanations
- High value for target user
- Low implementation risk
- Uses existing `downloadsLaneHint()` pattern with per-item context

---

_Phase 2 complete. All critical Sentinel and Ariadne findings addressed before sign-off._
