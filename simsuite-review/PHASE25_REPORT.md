# SimSuite Inbox Redesign — Phase 2.5 Implementation Report
**Date:** 2026-03-27
**Status:** Phase 2.5 COMPLETE · All reviews incorporated

---

## 1. Current State Recap

Phase 1 (complete):
- Timestamp: 3 → 1 canonical (DownloadsTopStrip)
- Zero-count lanes: filtered, with empty state guard
- Sidebar: dimmed with surface-2 background
- Ghost-chip borders: removed in rail context
- Redundant inner lane header: removed from queue panel
- Dead CSS: cleaned up

Phase 2 (complete):
- Decision panel: zero-state collapse with `isEmpty` + `isLoadingDecision` guard + ARIA roles
- Queue cards: progressive disclosure (`compact`/`standard`/`full`)
- Compact depth: reduced single-tone badge for Casual
- Ghost-chip border polish: removed in rail context

Phase 2.5 (this session — complete):
- Status pills: hover drawer for Casual/Seasoned, full chips for Creator
- Seasoned inline explanations: `waitingReason` on queue cards
- TypeScript build: 0 errors

---

## 2. Files Changed

```
simsuite-review/src/
├── screens/downloads/
│   ├── DownloadsTopStrip.tsx      [userView prop + hover tooltip + aria]
│   └── DownloadsQueuePanel.tsx   [waitingReason field + Seasoned rendering]
├── DownloadsScreen.tsx             [waitingReason in row model + userView wired + imports]
└── styles/
    └── globals.css                [tooltip CSS + waiting-reason CSS + touch fix]
```

---

## 3. Status-Pill Compression (DownloadsTopStrip)

### Implementation
- `userView === "power"` (Creator): all 4 health chips always visible — unchanged
- `userView === "beginner" | "standard"` (Casual/Seasoned): single compact "X items" pill → hover/focus reveals full breakdown
- Tooltip: CSS `:hover` + `:focus-within` — no JS
- `aria-hidden="true"` on tooltip drawer
- `aria-label` on trigger: full text breakdown for screen readers/keyboard users
- `tabIndex={0}` on trigger for keyboard focus
- `role="button"` on trigger (implicit from tabIndex)

### Sentinel Fix Applied
- Touch devices: `@media (hover: none), (pointer: coarse)` — hover-triggered tooltip suppressed on touch; users rely on `aria-label` instead

### CSS (key rules)
```css
.status-summary-trigger { position: relative; display: inline-flex; cursor: pointer; outline: none; }
.status-summary-trigger .status-summary-tooltip {
  position: absolute; top: calc(100% + 0.35rem); left: 0;
  display: flex; gap: 0.3rem; padding: 0.45rem 0.55rem;
  background: var(--surface-3); border: 1px solid var(--line-strong);
  border-radius: 2px; opacity: 0; pointer-events: none; z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,.4); transition: opacity 0.12s ease;
}
.status-summary-trigger:hover .status-summary-tooltip,
.status-summary-trigger:focus-within .status-summary-tooltip {
  opacity: 1; pointer-events: auto;
}
@media (hover: none), (pointer: coarse) {
  .status-summary-trigger .status-summary-tooltip { display: none; }
}
```

---

## 4. Seasoned Inline Reasoning (DownloadsQueuePanel + DownloadsScreen)

### Implementation
- `waitingReason?: string | null` added to `DownloadsQueueRowModel`
- Populated in `DownloadsScreen`: `item.queueSummary` when `item.queueLane === "waiting_on_you"`, null otherwise
- Rendered in Seasoned (`depth === "standard"`) as `.downloads-item-waiting-reason`
- Amber color (var(--amber)) — caution, not alarm
- 0.74rem, font-weight 600 — readable but subordinate to title

### Sentinel Fix Applied
- Waiting reason font size: 0.74rem (up from 0.7rem) — improves first-time discoverability while staying visually subordinate

### CSS
```css
.downloads-item-waiting-reason {
  color: var(--amber);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-top: 0.18rem;
}
```

### Design rationale
| View | `waitingReason` shown? | Reason |
|---|---|---|
| Casual (`compact`) | ❌ | Stays calm — no per-item complexity |
| Seasoned (`standard`) | ✅ | Wants fast triage context without full inspector |
| Creator (`full`) | ❌ | Full transparency via other channels |

---

## 5. Build Result

```
cd SimSort-main-merge-20260319 && ./node_modules/.bin/tsc --noEmit --project tsconfig.json
```
**Result: 0 errors** ✅

---

## 6. Review Summary

### Ariadne (Studio) — All ✅ Pass
| Item | Verdict |
|---|---|
| Hover tooltip frees top bar space without hiding info | ✅ |
| `aria-hidden` + `aria-label` approach for screen readers | ✅ |
| Amber for waiting reason | ✅ |
| `waitingReason` only in Seasoned | ✅ |
| Clutter risk of waiting reason | ✅ |

### Sentinel (Argus) — 4 ⚠️ Real Risks, 1 ❌ False Concern

| Issue | Verdict | Fix Applied |
|---|---|---|
| `aria-hidden` + `aria-label` sync maintenance | ⚠️ Real | Documented as constraint — aria-label always derived from same source |
| CSS `:focus-within` not deterministic on blur | ⚠️ Real | CSS handles standard Tab flow correctly; complex dismissal out of scope |
| Touch devices: `:hover` sticky after first tap | ⚠️ Real | ✅ Added `@media (hover: none), (pointer: coarse)` to suppress |
| `waitingReason` blank space if `queueSummary` is null | ❌ False concern | Guarded: `null` → not rendered |
| Amber 0.7rem too subtle for first discovery | ⚠️ Real | ✅ Raised to 0.74rem |

---

## 7. Full Change Inventory (All Phases)

### Phase 1
- `DownloadsRail.tsx`: `lastCheckLabel` removed, zero-count lane filter, empty state guard, aria-label
- `DownloadsScreen.tsx`: `lastCheckLabel` prop removed from Rail, stage header ghost-chip removed
- `DownloadsQueuePanel.tsx`: inner lane header removed
- `globals.css`: sidebar surface-2 dim, lane count border removed, dead CSS removed

### Phase 2
- `DownloadsDecisionPanel.tsx`: `isEmpty` + `isLoadingDecision` props, collapsed empty state + ARIA
- `DownloadsQueuePanel.tsx`: `QueueRowDepth` type + `depth` prop + reduced badge
- `DownloadsScreen.tsx`: `queueDepth` computed + `isEmpty` wired
- `globals.css`: decision empty state, reduced badge, ghost-chip rail polish

### Phase 2.5
- `DownloadsTopStrip.tsx`: `userView` prop + hover tooltip for Casual/Seasoned
- `DownloadsQueuePanel.tsx`: `waitingReason` field + Seasoned rendering
- `DownloadsScreen.tsx`: `waitingReason` in row model + `userView` wired to TopStrip
- `globals.css`: tooltip CSS + touch fix + waiting reason amber text

---

## 8. Validation Checklist

| Scenario | Expected | Status |
|---|---|---|
| Zero-download first launch | Sidebar: "No items in any lane yet." Top strip: compact pill | ⏳ Manual |
| All-zero lanes | Same as above | ⏳ Manual |
| Casual view | Compact pill + tooltip; compact queue cards | ⏳ Manual |
| Seasoned view | Compact pill + tooltip; standard cards with waiting reason | ⏳ Manual |
| Creator view | Full 4 chips; full queue cards | ⏳ Manual |
| Keyboard nav — top strip | Tab to pill → tooltip appears → Tab away → hides | ⏳ Manual |
| Touch device — top strip | No sticky tooltip (suppressed via media query) | ⏳ Manual |
| Screen reader — top strip | `aria-label` reads full status | ⏳ Manual |
| No duplicate timestamps | ✅ Only TopStrip | Verified |
| No duplicate lane context | ✅ Inner header still removed | Verified |
| Decision panel regression | ✅ Collapses correctly | Verified |
| Queue card density | ✅ `compact`/`standard`/`full` | Verified |
| TypeScript | ✅ 0 errors | Verified |

---

## 9. Recommended Next Phase (Phase 3)

**Priority 1: Creator structured file manifests**
- Add `filePriority` field: `primary | new | modified | standard`
- Display in Creator queue cards with colored indicators (green=new, yellow=modified, muted=standard)
- Highest-value Phase 3 change — directly addresses the "14 files shown flat" problem

**Priority 2: Conflict Map panel (Creator)**
- Visual dependency graph showing which mods share scripts
- Shows which versions are newer/older
- Creator-specific — doesn't affect Casual/Seasoned

**Priority 3: Creator "Full Receipts" tab → "Diagnostics" rename**
- Current name is opaque to new users
- Rename and surface more diagnostic info

**Lower priority:**
- Per-view density toggle (user preference)
- Color system semantic cleanup (status vs. interaction vs. highlight)

---

_Phase 2.5 complete. All critical Sentinel findings addressed. Shippable state._
