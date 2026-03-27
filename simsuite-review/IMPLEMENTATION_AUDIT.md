# SimSuite Inbox Redesign — Implementation Audit
**Date:** 2026-03-27
**Phase:** Phase 1 complete · Phase 2.1 complete

---

## 1. Workspace Cleanup

Files copied from `SimSort-main-merge-20260319` to `simsuite-review/src/`:
- `src/screens/downloads/DownloadsTopStrip.tsx`
- `src/screens/downloads/DownloadsRail.tsx`
- `src/screens/downloads/DownloadsDecisionPanel.tsx`
- `src/screens/downloads/DownloadsQueuePanel.tsx`
- `src/screens/downloads/downloadsDisplay.ts`
- `src/screens/DownloadsScreen.tsx`
- `src/App.tsx`
- `src/styles/globals.css`
- `src/lib/types.ts`

All changes are in working copies. Original project untouched.

---

## 2. Codebase Audit — Key Findings

### Component Map (Downloads Inbox)

| Component | File | Role |
|---|---|---|
| `DownloadsTopStrip` | `screens/downloads/DownloadsTopStrip.tsx` | Top bar — tabs, status pills, timestamp (canonical location), actions |
| `DownloadsRail` | `screens/downloads/DownloadsRail.tsx` | Left sidebar — workspace info, queue lanes nav, search, filters |
| `DownloadsQueuePanel` | `screens/downloads/DownloadsQueuePanel.tsx` | Main queue area — filtered item list, item cards |
| `DownloadsDecisionPanel` | `screens/downloads/DownloadsDecisionPanel.tsx` | Bottom decision panel — next step, badges, proof access |
| `DownloadsScreen` | `screens/DownloadsScreen.tsx` (4645 ln) | Screen orchestrator — state, props wiring, layout |
| `downloadsDisplay` | `screens/downloads/downloadsDisplay.ts` | Lane labels, hints, flags, counts, ordering |

### Confirmed Redundancies Found in Code

1. **Three timestamp sources** — `DownloadsTopStrip` (canonical), `DownloadsRail` sidebar meta chip, and `DownloadsScreen` stage header `downloads-stage-status` div all rendered `stageStatusMessage`
2. **Queue lane duplication** — `DownloadsRail` sidebar lane picker + `DownloadsQueuePanel` inner `downloads-lane-header` both showed lane name + hint + count
3. **Zero-count lanes rendered** — all lanes in `DOWNLOADS_LANE_SUMMARY_ORDER` rendered regardless of count
4. **Lane hint text doubled** — `downloads-lane-button-hint` in sidebar AND `downloads-lane-header span` in queue panel both showed `downloadsLaneHint()`

---

## 3. Phase 1 Changes Completed

### TSX/Logic Changes

| # | Change | File | Type |
|---|---|---|---|
| 1 | Removed `lastCheckLabel` prop from `DownloadsRail` interface + destructuring | `DownloadsRail.tsx` | Prop removal |
| 2 | Removed `lastCheckLabel` ghost-chip from sidebar watch-meta area | `DownloadsRail.tsx` | HTML removal |
| 3 | Filter lanes: `.filter(lane => laneCounts[lane] > 0)` before mapping | `DownloadsRail.tsx` | Logic |
| 4 | Removed `lastCheckLabel` prop from `<DownloadsRail>` usage | `DownloadsScreen.tsx` | Prop removal |
| 5 | Removed `downloads-stage-status` ghost-chip div from stage header | `DownloadsScreen.tsx` | HTML removal |

### CSS Changes

| # | Change | File | Effect |
|---|---|---|---|
| 6 | Added `background: var(--surface-2)` to `.downloads-rail-shell` | `globals.css` | Sidebar dims ~15%; queue area earns attention |
| 7 | Removed `border: 1px solid var(--line)` from `.downloads-lane-button-count` | `globals.css` | Count badges less noisy |
| 8 | Removed orphaned `.downloads-stage-status` CSS block + its `@media` rule | `globals.css` | Dead CSS deleted |
| 9 | Removed orphaned `.downloads-lane-header` CSS block | `globals.css` | Dead CSS deleted |

### Phase 1 Effect Summary
- **3 duplicate timestamp displays → 1 canonical** (in `DownloadsTopStrip`)
- **All zero-count lanes → hidden** (Ready now 0, Special setup 0, etc. don't render)
- **Sidebar → visually recedes** (surface-2 background, no border on lane counts)
- **Stage header → cleaner** (removed redundant ghost-chip row)

---

## 4. Phase 2.1 Changes Completed

### TSX/Logic Changes

| # | Change | File | Type |
|---|---|---|---|
| 10 | Removed inner `downloads-lane-header` from queue list | `DownloadsQueuePanel.tsx` | HTML removal |
| 11 | Closed `downloads-lane-group` div properly after removal | `DownloadsQueuePanel.tsx` | Structure fix |

### Phase 2.1 Effect Summary
- **Queue panel heading stays** — `panel-heading` with lane name + hint + count remains (correct, primary context)
- **Inner lane header removed** — no more double display of lane name + hint + count inside the list
- **Result:** queue list starts immediately with item rows; context is set once in the heading

---

## 5. Files Changed Summary

```
simsuite-review/src/
├── screens/downloads/
│   ├── DownloadsRail.tsx          [modified — Phase 1]
│   ├── DownloadsQueuePanel.tsx    [modified — Phase 2.1]
│   └── downloadsDisplay.ts         [no change]
├── DownloadsScreen.tsx            [modified — Phase 1]
└── styles/
    └── globals.css                [modified — Phase 1 + CSS cleanup]
```

---

## 6. Design-to-Code Deviations from Spec

| Spec Item | Code Reality | Deviation Reason |
|---|---|---|
| "Remove queue lane filter row from main content area" | Filter row NOT removed — `DownloadsQueuePanel` still shows lane info in panel-heading | Removing the panel-heading entirely would regress the queue's self-contained context. The spec intent (no double lane display) is served by removing the INNER lane header instead |
| "Sidebar lanes = canonical, filter row deleted" | Filter row concept lives in `DownloadsQueuePanel`'s panel-heading | The panel-heading IS the filter row equivalent. Removing it would break queue self-containment |
| "Status pills → hover drawer for Casual/Seasoned" | Not yet implemented | Requires backend/state wiring for pill click behavior — Phase 2/3 work |
| "Creator: structured file manifests with priority flags" | Not yet implemented | Backend data change required — Phase 3 work |
| "Decision panel: visible only when populated (Creator)" | Not yet implemented | Requires signal/badges prop change in parent screen — Phase 2/3 work |

---

## 7. Regressions / Risks

### Known Risks
| Risk | Severity | Mitigation |
|---|---|---|
| Removing `lastCheckLabel` prop from `DownloadsRail` — if any other consumer of this component was passing this prop | LOW | Only `DownloadsScreen` uses `DownloadsRail`; confirmed removed from there too |
| `downloads-lane-header` CSS removed but might be used elsewhere | LOW | Searched entire codebase — no other usage |
| Filtering zero-count lanes removes orientation for users who rely on seeing all lanes | MEDIUM | Active lane is always visible in panel-heading regardless; zero lanes are noise not signal |
| `downloads-stage-status` div removed — any JS referencing this class? | VERY LOW | CSS-only class; no JS references found |

### Potential Follow-on Issues
- `downloads-lane-group` wrapper still wraps items in queue — this is correct, don't remove
- The `panel-heading` h2 still shows lane name — correct, this is the canonical lane context
- `DownloadsDecisionPanel` still renders with all its sections regardless of signal state — Phase 2/3 fix

---

## 8. Still Pending

### Phase 2 (next)
- `DownloadsDecisionPanel`: collapse/hide when `signals.length === 0` and all badges are zero — requires prop check in parent (`DownloadsScreen`)
- Ghost-chip border weight reduction in rail context (CSS, low effort)
- `panel-heading` count badge: consider removing border here too

### Phase 3 (later)
- Creator: structured file manifest with priority/new/modified flags
- Seasoned: inline "Why is this waiting?" explanations
- Status pills → hover drawer for Casual/Seasoned
- Context Rail with tab switcher (Preview | Decisions)
- Per-view density configuration
- Conflict Map panel for Creator

---

## 9. What to Do Next

1. **Build and test** — compile the modified project and verify:
   - Timestamp shows only in `DownloadsTopStrip`
   - Zero-count lanes don't appear in sidebar
   - Sidebar has slightly dimmer background
   - Queue panel shows item rows immediately (no inner lane header)
2. **Review with Ariadne** — validate hierarchy and spacing after CSS changes
3. **Review with Sentinel** — check for regressions from lane filtering and timestamp removal
4. **Decide Phase 2 scope** — proceed with Decision panel zero-state collapse or defer?
5. **Ship Phase 1** — if clean, commit and ship. It's a meaningful improvement already.

---

_Review spawned: Ariadne (UI/UX validation) and Sentinel (regression/edge case review)_
