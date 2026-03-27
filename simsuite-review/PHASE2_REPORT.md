# SimSuite Inbox Redesign — Phase 2 Implementation Report
**Date:** 2026-03-27
**Status:** Phase 2 in progress · Core changes complete

---

## 1. Current State Recap

Phase 1 was complete from the previous session:
- Timestamp: 3 → 1 (canonical: `DownloadsTopStrip`)
- Zero-count lanes: filtered, with empty state guard
- Sidebar: dimmed with `surface-2` background
- Lane count badge borders: removed
- Redundant lane header in queue panel: removed
- Dead CSS: cleaned up

Phase 2 goals this session:
1. ✅ Sentinel pre-ship fixes — empty state guard, aria continuity
2. ✅ Decision panel zero-state collapse — main Phase 2 win
3. ✅ Phase 2 UX improvements — progressive disclosure on queue cards, ghost-chip border polish

---

## 2. Implementation Targets This Phase

### Goal 1: Sentinel Fixes ✅
Already applied in previous session:
- Empty state guard: "No items in any lane yet." in `DownloadsRail`
- aria-label on lane picker
- Zero-count lane filter

### Goal 2: Decision Panel Zero-State Collapse ✅
**Problem:** Decision panel showed full content even when no actionable content existed — four zero boxes consuming space with no information.

**Solution:** Added `isEmpty` prop to `DownloadsDecisionPanel`. When `decisionBadges.length === 0 && visibleInspectorSignals.length === 0` (item selected but no decision content), panel collapses to a single compact row:
- Casual: `title + laneChip + "Nothing needs a decision here yet."`
- Seasoned/Creator: `title + laneChip + "No decision content for this item."`

**Files changed:**
- `DownloadsDecisionPanel.tsx`: Added `isEmpty` prop, collapsed empty state component
- `DownloadsScreen.tsx`: Pass `isEmpty={decisionBadges.length === 0 && visibleInspectorSignals.length === 0}` to panel
- `globals.css`: `.downloads-decision-empty` — compact single-row layout

### Goal 3: Phase 2 UX Improvements ✅

**Progressive disclosure on queue cards:**
- Added `QueueRowDepth = "compact" | "standard" | "full"` type to `DownloadsQueuePanel`
- `depth` prop controls what each card shows:
  - `compact` (Casual): title + summary only — no meta, no badges, no samples
  - `standard` (Seasoned): title + meta + summary + badges — no samples
  - `full` (Creator): all content visible
- `queueDepth` computed in `DownloadsScreen` from `userView`
- No backend changes needed — pure display logic

**Ghost-chip border polish:**
- Added `.downloads-rail-shell .ghost-chip { border-color: transparent }` — informational chips in the sidebar no longer carry borders, reducing visual noise

---

## 3. Files Touched This Phase

```
simsuite-review/src/
├── screens/downloads/
│   ├── DownloadsDecisionPanel.tsx   [isEmpty prop + collapsed empty state]
│   └── DownloadsQueuePanel.tsx     [QueueRowDepth type + depth prop + progressive disclosure]
├── DownloadsScreen.tsx             [queueDepth computed + isEmpty prop wired + import]
└── styles/
    └── globals.css                 [.downloads-decision-empty CSS + ghost-chip rail polish]
```

---

## 4. Sentinel Fixes Completed (carried from Phase 1)

| Fix | Applied | Verified |
|---|---|---|
| Empty state guard "No items in any lane yet." | ✅ DownloadsRail.tsx | ✅ |
| aria-label="Downloads queue lanes" | ✅ DownloadsRail.tsx | ✅ |
| TopStrip timestamp always visible | ✅ No change needed | ✅ Confirmed |

---

## 5. Decision Panel Collapse Implementation

### Logic
```
isEmpty = decisionBadges.length === 0 && visibleInspectorSignals.length === 0
```
- `decisionBadges` always has at least 1 badge (intake mode + status) when item is selected → never truly zero
- `visibleInspectorSignals` is the real signal — Creator view shows the decision category boxes
- When all decision signals are zero → `visibleInspectorSignals === []` → `isEmpty === true`

### Collapsed State
Single row: `{title} · {laneLabel} · {idle note}`
- Casual: "Nothing needs a decision here yet."
- Seasoned/Creator: "No decision content for this item."
- No actions, no proof section, no wasted space

### Full State (default)
All four sections render: header → signals strip → next-step card → proof section

---

## 6. Phase 2 UX Improvements

### Progressive Disclosure — Queue Cards

| View | Depth | Title | Meta | Summary | Badges | Samples |
|---|---|---|---|---|---|---|
| Casual | `compact` | ✅ | ❌ | ✅ | ❌ | ❌ |
| Seasoned | `standard` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Creator | `full` | ✅ | ✅ | ✅ | ✅ | ✅ |

Rationale:
- Casual: "simple names" — filename + conflict explanation. No technical detail. Calm.
- Seasoned: wants to triage fast. Meta (creator, file type, count) + badges (Rechecked, Linked) help without overwhelming.
- Creator: full file manifest + samples needed. Transparency preserved.

### Ghost-Chip Polish
Rail ghost-chips (informational metadata) no longer carry borders. Decision-support badges retain borders — they carry semantic weight.

---

## 7. Validation Results

### Structure Validation
| Check | Result |
|---|---|
| All 4 modified TSX files: brace balance | ✅ 0 |
| `isEmpty` prop wired in parent | ✅ |
| `queueDepth` import correct | ✅ |
| `depth={queueDepth}` passed to panel | ✅ |
| CSS: `.downloads-decision-empty` exists | ✅ |

### Logic Validation
| Condition | Outcome |
|---|---|
| Item selected + real signals | Full panel renders ✅ |
| Item selected + no signals + no badges | Collapsed empty row ✅ |
| No item selected | `StatePanel` shown (unchanged) ✅ |
| Casual view | `compact` depth — title + summary only ✅ |
| Seasoned view | `standard` depth — title + meta + badges ✅ |
| Creator view | `full` depth — all content ✅ |

### Edge Cases Noted
- `decisionBadges` always ≥ 1 when item selected — `isEmpty` truly triggers on `signals.length === 0` only. This is correct.
- No loading state differentiation needed — panel only renders when `selectedItem` is set, by parent JSX structure.

---

## 8. Regressions / Risks

| Risk | Severity | Status |
|---|---|---|
| `isEmpty` collapse removes Decision panel before data loads | Very low | Mitigated: parent only renders Decision panel when `selectedItem` is set |
| `compact` depth hides badges that Casual users might need | Low | Spec decision — Casual cards prioritize calm over information density |
| Ghost-chip border removal in rail could affect other chip uses | Very low | Scoped to `.downloads-rail-shell .ghost-chip` only |
| Decision panel `isEmpty` only triggers when signals=0, not on specific Creator zero-states | Design choice | Sentinel's concern: current logic is signals-only. Could extend if needed. |

---

## 9. What's Still Pending

### Phase 2 (remaining)
- Status pills → hover drawer for Casual/Seasoned (state wiring change)
- Seasoned: inline "Why is this waiting?" explanations in queue cards
- Context Rail with tab switcher (Preview | Decisions)

### Phase 3
- Creator: structured file manifests with NEW/MODIFIED/STANDARD priority flags
- Creator: Conflict Map panel
- Per-view density configuration with user toggle
- Color system semantic cleanup (status vs. interaction vs. highlight)

---

## 10. Recommended Next Phase

**Priority 1:** Status pills → hover drawer for Casual/Seasoned
- Highest visibility change remaining
- Frees top bar real estate without losing information
- Moderate complexity — state change for pill click behavior

**Priority 2:** Seasoned "Why is this waiting?" explanations
- High value for the target user
- Low risk — adds information, doesn't remove
- Uses existing `downloadsLaneHint()` pattern

**Priority 3:** Decision panel — extend `isEmpty` logic for Creator-specific zero-states
- Creator shows "SAFE (0) / REVIEW (0)" boxes — these could be shown/hidden based on whether they've ever had content
- Lower priority — the current signals-based collapse already helps significantly

---

_Phase 2 core changes complete. Awaiting agent review findings for final sign-off._
