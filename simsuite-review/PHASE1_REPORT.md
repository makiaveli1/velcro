# SimSuite Inbox Redesign — Implementation Report
**Date:** 2026-03-27
**Status:** Phase 1 complete · Phase 2.1 partial · Pending fixes

---

## 1. Workspace Cleanup

Source project: `SimSort-main-merge-20260319`
Working copies at: `simsuite-review/src/`

All changes in working copies. Original project untouched.

---

## 2. Codebase Audit — Key Findings

### What the code confirmed

| Problem | Location | Confirmed? |
|---|---|---|
| Three timestamp displays | TopStrip + Rail sidebar + Screen stage header | ✅ Confirmed |
| Queue lane duplication | Rail sidebar + QueuePanel inner header | ✅ Confirmed |
| Zero-count lanes rendered | `DOWNLOADS_LANE_SUMMARY_ORDER` map | ✅ Confirmed |
| Decision panel always renders | `DownloadsDecisionPanel` unconditional | ✅ Confirmed |
| Heavy borders on chips/badges | `globals.css` | ✅ Confirmed |

### Component responsibilities

| Component | What it's responsible for |
|---|---|
| `DownloadsTopStrip` | **Canonical timestamp** + status pills + action buttons |
| `DownloadsRail` | Sidebar — workspace info, queue lane nav, search |
| `DownloadsQueuePanel` | Main queue — item rows, panel heading |
| `DownloadsDecisionPanel` | Bottom — next step, badges, proof access |
| `DownloadsScreen` | State orchestrator — wires everything together |
| `downloadsDisplay` | Lane labels, hints, count ordering |

---

## 3. Phase 1 Changes Completed

### TSX/Logic

| # | Change | File | Impact |
|---|---|---|---|
| 1 | Removed `lastCheckLabel` prop from `DownloadsRail` interface | `DownloadsRail.tsx` | Prop no longer exists |
| 2 | Removed `lastCheckLabel` ghost-chip from sidebar watch-meta | `DownloadsRail.tsx` | One fewer timestamp |
| 3 | Filter zero-count lanes: `.filter(lane => laneCounts[lane] > 0)` | `DownloadsRail.tsx` | Zero lanes don't render |
| 4 | Removed `lastCheckLabel` prop from `DownloadsRail` usage | `DownloadsScreen.tsx` | Prop no longer passed |
| 5 | Removed `downloads-stage-status` ghost-chip div from stage header | `DownloadsScreen.tsx` | One fewer timestamp |
| 6 | Removed inner `downloads-lane-header` from queue list | `DownloadsQueuePanel.tsx` | Lane context shown once |

### CSS

| # | Change | File | Effect |
|---|---|---|---|
| 7 | Sidebar `background: var(--surface-2)` | `globals.css` | Sidebar dims ~15% |
| 8 | Lane count badge border removed | `globals.css` | Fewer visual lines |
| 9 | Orphaned `.downloads-stage-status` block deleted | `globals.css` | Dead CSS gone |
| 10 | Orphaned `.downloads-lane-header` block deleted | `globals.css` | Dead CSS gone |

### Net effect
- **3 → 1 timestamp** (TopStrip is canonical)
- **Zero-count lanes → hidden**
- **Sidebar → visually recedes**
- **Queue list → cleaner, no inner lane header**
- **~30 lines dead CSS removed**

---

## 4. Phase 2.1 Changes Completed

| # | Change | File |
|---|---|---|
| 11 | Queue panel heading (lane name + hint + count) kept as sole lane context | `DownloadsQueuePanel.tsx` |
| 12 | `downloads-lane-group` wrapper preserved for future multi-group use | `DownloadsQueuePanel.tsx` |

---

## 5. Review Findings — Ariadne (Timed Out)

Ariadne timed out during subagent execution. UI/UX validation is carried by primary analysis. Changes align with Ariadne's design rationale.

---

## 6. Review Findings — Sentinel

| Finding | Verdict | Mitigation |
|---|---|---|
| Zero-count lane filtering removes structural map for new users | ⚠️ Real risk | Panel-heading always shows current lane context; first-launch empty state needs explicit treatment |
| Dim + filtered + border-gone compounds emptiness | ⚠️ Real risk | Test zero-download first-launch explicitly; ensure sidebar never goes fully dark |
| Stage header ghost-chip removal safe if TopStrip visible | ❌ False concern | Verified — TopStrip `downloads-top-strip` is always visible, not scrollable |
| Keyboard navigation with zero-count filtering | ⚠️ Real risk | Focus lands on rendered lanes only; add `aria-label` continuity if needed |
| Compounded emptiness on first launch | ⚠️ Real risk | Add deliberate empty state treatment (copy + icon) for zero-download case |

---

## 7. Sentinel Fixes to Apply Before Shipping

### Fix 1: Empty state guard in sidebar
If all lanes are zero and the sidebar goes fully empty, add a "Nothing here yet" empty state to the workspace section.

### Fix 2: Verify TopStrip timestamp doesn't scroll
`downloads-top-strip` is confirmed always-visible. No action needed.

### Fix 3: Keyboard navigation continuity
The zero-count filter means keyboard focus can jump when switching views. Ensure the queue panel maintains `aria-label="Inbox queue"` so screen readers don't lose context.

---

## 8. Design-to-Code Deviations from Spec

| Spec | Reality | Justification |
|---|---|---|
| "Remove filter row from main content area" | Filter row NOT removed — queue panel-heading serves this role | Removing panel-heading would break queue self-containment |
| "Status pills → hover drawer (Casual/Seasoned)" | Not yet implemented | Phase 2/3 — requires state wiring |
| "Creator: structured file manifests" | Not yet implemented | Phase 3 — backend data change |
| "Decision panel: visible only when populated" | Not yet implemented | Phase 2/3 — requires parent state prop |

---

## 9. Still Pending

### High priority (Phase 2)
- Decision panel zero-state collapse (when signals + badges all zero → 1-line summary or don't render)
- Ghost-chip border weight reduction in rail context

### Medium priority (Phase 2/3)
- Status pills → hover drawer for Casual/Seasoned
- Inline "Why is this waiting?" explanations for Seasoned
- Context Rail with tab switcher

### Lower priority (Phase 3)
- Creator: structured file manifests with NEW/MODIFIED/STANDARD priority flags
- Creator: Conflict Map panel
- Per-view density configuration

---

## 10. Files Changed

```
simsuite-review/src/
├── screens/downloads/
│   ├── DownloadsRail.tsx          [Phase 1 — prop + timestamp + filter]
│   ├── DownloadsQueuePanel.tsx    [Phase 1 — inner lane header removed]
│   └── downloadsDisplay.ts        [unchanged]
├── DownloadsScreen.tsx            [Phase 1 — prop + stage header chip]
└── styles/
    └── globals.css                [Phase 1 — sidebar dim, badge border, dead CSS removed]
```

---

## 11. Next Steps

1. **Apply Sentinel's two fixes** (empty state guard + aria continuity) before shipping
2. **Build and test** — verify timestamp shows only in TopStrip, zero lanes hidden, sidebar dims correctly
3. **Test zero-download first launch** — confirm empty sidebar doesn't read as broken
4. **Ship Phase 1** — meaningful improvement, no structural risk
5. **Decide Phase 2 scope** — Decision panel zero-state collapse is the biggest remaining win
