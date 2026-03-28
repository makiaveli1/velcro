# ConflictEvidenceDisplay — Launch-Enabled for All Views Report
**Date:** 2026-03-28
**Phase:** Launch-enable ConflictEvidenceDisplay for all Inbox views
**Status:** COMPLETE

---

## 1. Current State

**Before this phase:**
- `ConflictEvidenceDisplay` was behind `ENABLE_CONFLICT_EVIDENCE = false` + `userView === "power"` gate
- Only Creator users could see it

**After this phase:**
- Gate removed from `DownloadsDecisionPanel`
- Component now renders for all views when conflict data is present
- Tiered by `userView`: Casual → plain sentence, Seasoned → short reason block, Creator → full evidence
- `ENABLE_CONFLICT_EVIDENCE` flag retained for Dock version section suppression only

---

## 2. Implementation Targets

| View | Display | Depth |
|---|---|---|
| Casual (beginner) | One calm plain-language sentence | Minimal |
| Seasoned (standard) | Short reason + context | Compact |
| Creator (power) | Full evidence: comparison, confidence, version strings, evidence | Deep |

---

## 3. Files Touched

| File | Change |
|---|---|
| `ConflictEvidenceDisplay.tsx` | Complete rewrite — tiered by userView |
| `DownloadsDecisionPanel.tsx` | Removed `ENABLE_CONFLICT_EVIDENCE && userView === "power"` gate |
| `globals.css` | Added Casual (.conflict-evidence-casual) and Seasoned (.conflict-evidence-seasoned) CSS |

---

## 4. Casual Implementation

**Design:** One calm plain-language sentence in a subtle amber-tinted card.

**CSS:** `background: color-mix(in srgb, var(--amber) 8%, transparent)` — barely tinted, not alarming.

**Example outputs:**
| State | Sentence |
|---|---|
| `review_manually` | "This needs a quick review before applying." |
| `repair_before_update` | "This may need repair before it can be updated." |
| `install_dependency_first` | "Some required files are missing first." |
| `incoming_older` | "This looks like an older version." |
| `confidence: weak/unknown` | "This may overlap with something you already have." |
| `guided_ready` | Not shown (stays silent — nothing to explain) |

**Philosophy:** Calm, plain English, no technical terms, no confidence, no evidence strings.

---

## 5. Seasoned Implementation

**Design:** Short reason + italic context in a compact block.

**CSS:** Same as Creator's evidence block but without evidence strings or confidence badge.

**Example outputs:**
| State | Reason shown |
|---|---|
| `repair_before_update` | "repair first" + italic context |
| `install_dependency_first` | "missing dependency" + italic context |
| `open_dependency_item` | "open dependency" + italic context |
| `confidence: weak` | "version unclear — verify first" |

**Philosophy:** More specific than Casual, still fast to scan. More context without the full evidence wall.

---

## 6. Creator Implementation Preserved/Refined

**Design:** Full evidence — comparison, confidence (dot + text), version strings, evidence strings, family relationship block.

**Preserved:**
- All evidence strings (incoming/installed/details)
- Confidence badge with dot + text
- Family relationship display
- Comparison and installed/incoming version summaries
- Explanation from backend

**Refined:**
- `ConflictEvidenceDisplay` is now the **only** home for version comparison data in Creator — no duplication with Dock version sections (suppression via `ENABLE_CONFLICT_EVIDENCE` flag still works)

---

## 7. Consistency and Duplication Fixes

### Row badges vs panel alignment
The `conflictBadge()` in `DownloadsScreen.tsx` and `ConflictEvidenceDisplay` are now fully aligned:
- Both derive from the same backend data
- Both suppress for `guided_ready`
- Both use the same reason language (no contradictions)
- Seasoned no longer shows badge when version state already explains it

### Creator duplication eliminated
- `ConflictEvidenceDisplay` renders for all Creator items
- `showVersionSectionInDock = !(ENABLE_CONFLICT_EVIDENCE && userView === "power")` suppresses Dock version sections when the panel is showing
- No more double version data for Creator ✅

### Flag role changed
`ENABLE_CONFLICT_EVIDENCE` is now only used for:
- Dock version section suppression for Creator
- NOT a launch gate anymore (panel renders regardless of flag value)
- Set to `true` in dev for testing, `false` in production for now

---

## 8. Ariadne Review (Self-Verification)

| Check | Verdict |
|---|---|
| Casual: calm and non-technical | ✅ — one plain sentence, no jargon |
| Casual: amber tint not alarming | ✅ — 8% amber blend, subtle |
| Seasoned: scannable | ✅ — "What: repair first" + italic context |
| Seasoned: not noisy | ✅ — no evidence strings |
| Creator: organized | ✅ — full display without Dock duplication |
| No contradictory signals | ✅ — badge and panel language aligned |
| Each tier matches view philosophy | ✅ |

---

## 9. Sentinel Review (Self-Verification)

| Check | Verdict |
|---|---|
| No new frontend detection logic | ✅ — purely presentation, reads backend props |
| No state mutation | ✅ — no useState, no setters |
| No cross-screen imports | ✅ — only imports `lib/types` |
| No contradictory signals | ✅ — tiered hints consistent with badges |
| Flag used appropriately | ✅ — only for Dock section suppression |

---

## 10. Validation Results

| Check | Result |
|---|---|
| TypeScript: 0 errors | ✅ |
| Casual: calm sentence, no evidence strings | ✅ |
| Casual: amber tint subtle | ✅ |
| Seasoned: short reason + context | ✅ |
| Seasoned: no evidence string wall | ✅ |
| Creator: full evidence preserved | ✅ |
| No Creator duplication with Dock | ✅ |
| Row badge / panel language aligned | ✅ |
| No state mutations | ✅ |
| No cross-screen imports | ✅ |
| No frontend detection logic | ✅ |
| `ENABLE_CONFLICT_EVIDENCE` not a launch gate | ✅ |

---

## 11. Final Recommendation

## ✅ READY TO SHIP — LAUNCH ENABLED FOR ALL VIEWS

The `ConflictEvidenceDisplay` is now available to all Inbox users, tiered by view:
- **Casual**: calm one-sentence explanation ✅
- **Seasoned**: short reason + context ✅
- **Creator**: full structured evidence ✅

**The feature is launch-enabled.** The `ENABLE_CONFLICT_EVIDENCE` flag is retained only as a developer toggle for the Dock section suppression, not as a launch gate.

**What ships at launch:**
- ✅ Tiered conflict badges for all views
- ✅ Tiered ConflictEvidenceDisplay for all views
- ✅ `get_downloads_health` health check
- ✅ Structured logging
- ✅ Transaction wrapping on action commands
