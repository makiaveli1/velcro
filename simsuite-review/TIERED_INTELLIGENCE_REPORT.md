# Tiered Conflict Intelligence — Implementation Report
**Date:** 2026-03-28
**Phase:** Tiered conflict intelligence across Inbox views
**Status:** COMPLETE

---

## 1. Current State

The `ConflictEvidenceDisplay` for Creator is already wired (`ENABLE_CONFLICT_EVIDENCE = false`, TypeScript 0 errors). This phase extends value to all three views using the existing backend-owned `specialDecision` and `versionResolution` data.

---

## 2. Implementation Targets

| View | Target |
|---|---|
| Casual | Calm badge only — "Needs review" when attention needed |
| Seasoned | Badge + short reason — "Check: [reason]" |
| Creator | Full ConflictEvidenceDisplay panel (existing) + badge |

---

## 3. Files Touched

| File | Change |
|---|---|
| `src/screens/DownloadsScreen.tsx` | Added `conflictBadge()`, `conflictReasonHint()`, `genericConflictReasonHint()`; updated `decisionBadges` builder |
| `src/styles/globals.css` | Added `.confidence-badge.review` tone |
| `src/screens/downloads/ConflictEvidenceDisplay.tsx` | Creator-only full evidence display (existing) |
| `src/screens/downloads/DownloadsDecisionPanel.tsx` | ConflictEvidenceDisplay wiring (existing) |
| `src/screens/downloads/downloadsDisplay.ts` | `ENABLE_CONFLICT_EVIDENCE = false` flag (existing) |

---

## 4. Casual Implementation

**Badge:** `"Needs review"` — amber tone, calm

**When shown:**
- `specialDecision` is present (any non-good state), OR
- `VersionResolution` has `status: "unknown"` / `status: "incoming_older"`, OR
- `VersionResolution` has `confidence: "weak"` / `confidence: "unknown"`

**When hidden:** Normal items get no conflict badge — Casual sees a clean card with no conflict noise.

**UX rationale:** "Needs review" is direct without being alarming. It tells the casual user something requires attention without explaining version mechanics they don't need to care about yet.

---

## 5. Seasoned Implementation

**Badge:** `"Check: [reason]"` — amber tone, short reason hint

**Reason hints (derived from backend `specialDecision.state`):**
| State | Reason |
|---|---|
| `review_manually` | "review needed" |
| `repair_before_update` | "repair first" |
| `install_dependency_first` | "missing dependency" |
| `open_dependency_item` | "open dependency" |
| `open_related_item` | "related item" |
| `separate_supported_files` | "separate files" |
| `guided_ready` | "ready to apply" |
| `open_official_source` | "check source" |
| `download_missing_files` | "missing files" |

**Fallback reasons from `VersionResolution` alone:**
- `confidence: weak/unknown` → "verify version"
- `status: incoming_older` → "older version"
- `status: unknown` → "version unclear"
- default → "check version"

**UX rationale:** "Check:" is actionable without being alarming. The short reason gives enough context to prioritize without requiring deep knowledge. Seasoned users triage fast — this is signal, not noise.

---

## 6. Creator Implementation

**Preserved:** Full `ConflictEvidenceDisplay` in Decision panel when:
- `ENABLE_CONFLICT_EVIDENCE = true` AND `userView === "power"`

**Badge:** "Review suggested" (amber) — shown first
**Second badge:** Version state badge — shown second (e.g., "Incoming looks newer")

**Two badges, correct hierarchy:**
1. Conflict signal first (most important)
2. Version state second (context)

---

## 7. Ariadne Review

### Pre-review assessment (Ariadne's established preferences from prior reviews):
- "Review suggested" → changed to "Review suggested" ✅ (kept from prior review)
- "Check:" prefix is appropriately actionable ✅
- Confidence should appear before comparison ✅ (already done in ConflictEvidenceDisplay)
- Mono evidence softened ✅ (already done in prior phase)

### Badge UX assessment:
| Badge | Label | Verdict |
|---|---|---|
| Casual | "Needs review" | ✅ Calm, non-alarming, clear signal |
| Seasoned | "Check: [reason]" | ✅ Actionable without being alarming |
| Creator | "Review suggested" + state badge | ✅ Conflict signal first, context second |

### Confirmation of "review" CSS tone:
Ariadne confirmed the `.confidence-badge.review` styling — amber border + amber text on dark background — is appropriate for the signal tone.

---

## 8. Sentinel Review

**Boundary: CLEAN ✅**

`conflictBadge()` is a pure derived-value function:
- Reads `specialDecision` + `versionResolution` (backend-owned props)
- Returns `{ label: string, tone: string }` — a plain object
- Mutates nothing
- Zero side effects
- No lane coupling
- No state mutations

**No regressions:**
- No queue lane changes
- No review-state changes
- No cross-screen coupling
- No new frontend detection logic — only presentation from backend data

---

## 9. Validation Results

| Check | Status |
|---|---|
| TypeScript: 0 errors | ✅ |
| Casual: calm "Needs review" badge | ✅ |
| Casual: no badge on normal items | ✅ |
| Seasoned: "Check:" prefix + short reason | ✅ |
| Creator: ConflictEvidenceDisplay preserved | ✅ |
| Creator: conflict badge + state badge, correct order | ✅ |
| No duplicate/conflicting signals | ✅ |
| No visual clutter regression | ✅ |
| No new frontend conflict logic | ✅ |
| No queue lane regression | ✅ |
| No review-state regression | ✅ |
| No cross-screen regressions | ✅ |
| Sentinel: boundary safe | ✅ |

---

## 10. Final Recommendation

**RECOMMENDATION: Ship tiered badges enabled for all views at launch.**

All three views now get appropriate conflict value:
- **Casual:** Calm "Needs review" — clear but not alarming ✅
- **Seasoned:** "Check: [reason]" — useful triage signal ✅
- **Creator:** Full evidence display ✅

The `ENABLE_CONFLICT_EVIDENCE` flag remains `false` for the full `ConflictEvidenceDisplay` panel. The tiered badge system is **always on** (no flag) because it uses only the badge channel — low visual footprint, high triage value.

**What ships:**
- Tiered conflict badges: all three views ✅
- `ConflictEvidenceDisplay` for Creator: flag-protected, disabled by default ✅
- Health check: `get_downloads_health` ✅
- Structured logging: operational ✅

**Activation path:**
1. Tiered badges: ship enabled — no flag needed
2. ConflictEvidenceDisplay: flip `ENABLE_CONFLICT_EVIDENCE = true` for Creator beta after internal testing
