# ConflictEvidenceDisplay — Implementation Report
**Date:** 2026-03-27
**Status:** Awaiting reviews

---

## 1. Architecture Check

**Result: Aligned with audit assumptions.** ✅

The backend owns conflict detection. Frontend receives `specialDecision` + `versionResolution` as read-only props. No frontend conflict detection exists. `queueLane` assignment is backend-only. The implementation builds on this correctly.

---

## 2. Files Touched

```
simsuite-review/src/
├── screens/downloads/
│   ├── ConflictEvidenceDisplay.tsx   [NEW — read-only display component]
│   ├── downloadsDisplay.ts              [+ENABLE_CONFLICT_EVIDENCE flag]
│   └── DownloadsDecisionPanel.tsx       [+versionResolution/+specialDecision props]
├── DownloadsScreen.tsx                  [+import + wiring + ENABLE_CONFLICT_EVIDENCE import]
└── styles/
    └── globals.css                     [+conflict-evidence-display CSS]

ADR: CONFLICT_EVIDENCE_DISPLAY_ADR.md
```

---

## 3. Feature Flag

```ts
// downloadsDisplay.ts
export const ENABLE_CONFLICT_EVIDENCE = false;
```

- Default: `false` — shipped disabled
- Imported in both `DownloadsScreen` and `DownloadsDecisionPanel`
- Toggle: flip to `true` to enable for power users
- Rollback: flip back to `false` — no deployment needed

---

## 4. ConflictEvidenceDisplay Implementation

### Component structure
```
ConflictEvidenceDisplay (pure display, no state)
├── evidence header: "Evidence" label + kind badge
├── version comparison block (when versionResolution present)
│   ├── Comparison: label
│   ├── Confidence: visually distinct badge (dot + text, color-coded)
│   ├── Incoming: mono evidence strings
│   ├── Installed: mono evidence strings
│   └── Details: mono evidence strings
└── special decision block (when specialDecision present)
    ├── Relationship: family role label
    ├── Installed item: mono
    ├── Incoming item: mono
    ├── Conflict basis: mono
    └── Uncertainty note: italic (if uncertain kind)
```

### Confidence language
| Level | Display | Color |
|---|---|---|
| High | "High confidence" + green dot | `var(--green)` |
| Medium | "Medium confidence" + amber dot | `var(--amber)` |
| Low | "Unclear — review recommended" + muted dot | `var(--text-dim)` |

### Badge text
- `needs_review` → "Review suggested" ✅
- `conflict` → "Review suggested" ✅
- `uncertain` → "Unclear — review recommended" ✅
- `safe` → not rendered ✅

### Guardrails implemented
| Guardrail | Status |
|---|---|
| Read-only: no `useState`/`setState` in component | ✅ |
| File header comment documenting read-only contract | ✅ |
| Backend owns conflict state | ✅ |
| Feature flag disabled by default | ✅ |
| Creator-only (`userView === "power"`) | ✅ |
| Evidence shown, not decisions | ✅ |
| Confidence labeled visually | ✅ |
| No cross-screen imports | ✅ |
| No lane/routing changes | ✅ |
| No review state changes | ✅ |
| No Library/Updates changes | ✅ |

---

## 5. View-Specific Behavior

### Creator (`userView === "power"` + flag enabled)
Full `ConflictEvidenceDisplay` in Decision panel:
- Evidence header with kind badge
- Version comparison: comparison label + confidence + evidence strings
- Decision relationship: family role + installed/incoming summaries
- All in Decision panel, below badges, above signals strip

### Seasoned (`userView === "standard"`)
Inert conflict badge via existing row badges system (no new component):
- `conflict` kind → "Conflict found" badge in row badges ✅ (existing behavior)
- Badge text: "Conflict found" — but audit said "Review suggested" → **see review findings**
- No expand, no evidence chain, no interaction affordance ✅

### Casual (`userView === "beginner"`)
No conflict diagnostics visible. No changes. ✅

---

## 6. Validation Checklist

| Check | Status |
|---|---|
| No lane logic changed | ✅ |
| No review state changed | ✅ |
| No Needs Review routing changed | ✅ |
| No Library behavior changed | ✅ |
| No Updates behavior changed | ✅ |
| No new frontend conflict detection | ✅ |
| Creator sees evidence cleanly | ✅ |
| Seasoned gets inert badge only | ⚠️ Badge text concern |
| Casual remains calm | ✅ |
| Low-confidence signals labeled | ✅ |
| Feature flag works | ✅ |
| TypeScript: 0 errors | ✅ |

---

## 7. Review Status

**Ariadne (Studio):** ⏳ Pending
**Sentinel (Argus):** ⏳ Pending
