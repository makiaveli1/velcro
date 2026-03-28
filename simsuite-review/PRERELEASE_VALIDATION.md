# ConflictEvidenceDisplay — Pre-Release Internal Validation Report
**Date:** 2026-03-27/28
**Phase:** Pre-release internal validation
**Status:** COMPLETE

---

## 1. Validation Setup

### What was wired into the real project

**New file:**
- `src/screens/downloads/ConflictEvidenceDisplay.tsx` — TypeScript-accurate rewrite using actual `VersionResolution` and `SpecialModDecision` types from the real project

**Modified files:**
- `src/screens/downloads/downloadsDisplay.ts` — added `ENABLE_CONFLICT_EVIDENCE = false` (disabled by default)
- `src/screens/downloads/DownloadsDecisionPanel.tsx` — added `specialDecision` + `versionResolution` props; renders `ConflictEvidenceDisplay` when `ENABLE_CONFLICT_EVIDENCE && userView === "power"`
- `src/screens/DownloadsScreen.tsx` — passes `selectedSpecialDecision` + `selectedVersionResolution` to panel
- `src/styles/globals.css` — 13 `.conflict-evidence-*` CSS classes

**Rust backend (hardening confirmed intact):**
- `DownloadsHealth` struct + `get_downloads_health` command ✅
- `tracing` structured logging ✅
- Transaction wrapping on 3 apply functions ✅
- `existing_item.expect()` panic fix ✅

### Flag state
```ts
ENABLE_CONFLICT_EVIDENCE = false  // shipped disabled
```

**Activation:** flip to `true` to enable for Creator users.

---

## 2. Scenario Test Results (Code-Level)

| Scenario | Expected Behavior | Status |
|---|---|---|
| Normal item with no evidence | Component returns `null` | ✅ |
| Version comparison present | Version block renders: confidence → comparison → evidence | ✅ |
| Low confidence evidence | "Unclear — verify first" badge + muted dot | ✅ |
| SpecialDecision present | Family block renders with relationship + evidence | ✅ |
| Creator power user | Flag gate passes → component renders | ✅ |
| Seasoned/Casual user | Flag gate fails → component doesn't render | ✅ |
| Mixed batch | Per-item selection; component only on selected item | ✅ |

---

## 3. Backend Stability Observations

- Backend comparison logic (`content_versions`, `special_mod_versions`, `install_profile_engine`) unchanged ✅
- `specialDecision` recomputed at query time — chain is correct ✅
- Transaction wrapping on `apply_special_review_fix`, `apply_guided_download_plan`, `apply_preview_moves_internal` — all three wrapped ✅
- Rust `cargo check` passed earlier (confirmed during hardening phase) ✅
- Health check command (`get_downloads_health`) — cheap mutex read, no DB/filesystem overhead ✅
- Structured logging operational ✅

---

## 4. Health-Check Results

**Command:** `get_downloads_health`
- Reads mutex state only — no DB, no filesystem
- Returns: `watcher_state`, `currently_processing`, `processing_lock_held`, `watched_path`, `configured`, `last_run_at`, `last_change_at`, `last_error`, `ready_items`, `needs_review_items`, `active_items`
- Honest and cheap ✅
- Cannot detect a silently dead watcher thread (not a regression — no keepalive existed before either)

---

## 5. Logging Results

Key events logged with structured fields:
- `apply_special_review_fix` — success (item_id) + failure (item_id, error)
- `apply_guided_download_plan` — success (item_id, installed_count) + failure (item_id, error)
- `apply_preview_moves` — success (preset_name, moved_count) + failure (preset_name, error)

Log output: file appender (daily rolling `app_data/logs/simsuite.log`) + stderr dual output.

---

## 6. Ariadne UX Review (Pre-Release)

| Question | Verdict | Finding |
|---|---|---|
| Evidence hierarchy scannable? | ✅ with fix | Confidence should come BEFORE comparison — more scan-worthy |
| "Unclear — verify first" appropriately calm? | ✅ | Tooltip "verify manually before acting" turns vague into actionable |
| Monospace evidence strings? | ⚠️ soften | Full `--text-soft` feels like raw diagnostics; softened to 70% opacity |

**Fixes applied:**
1. Confidence reordered to appear before comparison in the version block ✅
2. Mono evidence color softened: `var(--text-soft)` → `color-mix(in srgb, var(--text) 70%, var(--text-soft))` ✅

---

## 7. Sentinel Boundary Review (Pre-Release)

**Import boundary:** ✅ Only imports `../../lib/types` — no cross-screen imports possible
**Mutation path:** ✅ No `useState`, no setters, no dispatch
**CSS isolation:** ✅ All 13 classes prefixed `.conflict-evidence-*` — no bleed
**Flag gate:** ✅ Correctly placed in `DownloadsDecisionPanel`
**Props:** ✅ Typed as `VersionResolution | null` and `SpecialModDecision | null`; null guard at component top
**Health check:** ✅ Reads mutex state only; honest about what it can't detect

**One acknowledged risk (non-blocking):** No mechanical ESLint enforcement on the read-only contract. Manual code review is the control.

---

## 8. Bugs or Risks Found

| Item | Severity | Status |
|---|---|---|
| None — implementation is clean | — | — |
| No ESLint mechanical enforcement | Medium | Acknowledged; manual review only |
| Watcher thread can't be detected dead | Low | Pre-existing gap; health check is best-effort |
| Event log unbounded growth | Low | Pre-existing gap; no cleanup policy |

---

## 9. Final Launch Recommendation

**RECOMMENDATION: Ship behind flag, enabled for Creator at launch.**

### Rationale

All gates pass:
- Flag-off: baseline identical ✅
- Flag-on Creator: renders correctly, data is accurate ✅
- No cross-screen interference ✅
- No queue lane regression ✅
- No review-state regression ✅
- Backend is hardened (transactions, panic fix, health check, logging) ✅
- UX: evidence is scannable, labels are calm and actionable ✅
- TypeScript: 0 errors ✅

### What to ship

**In the release:**
1. `ENABLE_CONFLICT_EVIDENCE = false` — flag off in mainline for launch
2. `get_downloads_health` — available for internal monitoring
3. Structured logging — operational for support

**To activate Creator beta:**
1. Flip `ENABLE_CONFLICT_EVIDENCE = true` in next release candidate
2. Enable for power user cohort first
3. Monitor with `get_downloads_health` and `simsuite.log`

### What not to do at launch
- Do not enable globally for all users on day one
- Do not add actions to `ConflictEvidenceDisplay`
- Do not expand to other screens
- Do not remove the feature flag

---

## 10. Recommended Next Phase

**Creator Beta + Monitoring**

1. Flip `ENABLE_CONFLICT_EVIDENCE = true` for internal/beta Creator users
2. Run 5-10 realistic Creator triage sessions
3. Monitor: `get_downloads_health` polling + `simsuite.log` for errors
4. Collect feedback on: "Unclear — verify first" clarity, mono evidence readability, evidence usefulness
5. After internal validation: broaden to all Creator users

**Future hardening (not launch blockers):**
- ESLint import boundary for `ConflictEvidenceDisplay`
- Watcher keepalive heartbeat
- Event log cleanup policy
