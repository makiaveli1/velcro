# SimSuite Inbox — Full Backend Production Audit
**Date:** 2026-03-27
**Scope:** Inbox backend + conflict/comparison subsystem
**Status:** AUDIT COMPLETE

---

## 1. Current Backend Architecture

### Stack
| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tauri (webview) |
| Backend | Rust (Tauri) |
| Database | SQLite via `rusqlite` |
| File watching | Custom Rust watcher + polling |
| HTTP | `reqwest` (blocking) for latest version checks |

### Module Map
```
src-tauri/src/
├── core/
│   ├── downloads_watcher/     ← Inbox processing engine (2.8k+ lines)
│   ├── install_profile_engine/ ← Decision generation (7.6k lines) [KEY]
│   ├── special_mod_versions/  ← Version comparison (1.1k lines) [KEY]
│   ├── content_versions/      ← VersionResolution engine (4k lines) [KEY]
│   ├── scanner/               ← File discovery (1.9k lines)
│   ├── move_engine/           ← File apply/move operations
│   ├── library_index/         ← Library file management
│   ├── duplicate_detector/     ← Duplicate detection
│   ├── bundle_detector/       ← Archive detection
│   ├── filename_parser/       ← Filename → metadata
│   ├── rule_engine/           ← Rule-based classification
│   ├── ai_classifier/         ← AI classification
│   ├── watch_polling/         ← Polling fallback
│   └── snapshot_manager/      ← Snapshot creation/restoration
├── database/
│   └── mod.rs                 ← Schema + migrations (SQLite)
├── commands/
│   └── mod.rs                 ← Tauri command handlers (~2k lines)
├── models.rs                  ← Shared data types (~1.2k lines)
└── app_state.rs              ← Global state management
```

### Data Flow (verified in code)
```
Folder scan
    ↓
downloads_watcher: ingest + stage
    ↓
install_profile_engine: assess_download_item → DownloadItemAssessment
    ↓
store_download_item_assessment → writes to download_items table
    ↓
build_special_mod_decision → SpecialModDecision (includes queue_lane)
    ↓ OR (if no special profile match)
content_versions: resolve_download_item_version → VersionResolution
    ↓
derive_queue_lane (fallback path)
    ↓
list_download_queue → frontend
```

---

## 2. End-to-End Inbox Flow Breakdown

### Stage 1: Folder Watching
- `DownloadsWatcherStatus` tracks state: `Idle | Watching | Processing | Error`
- Polling: configurable interval; background thread; guards against re-entrant processing via `downloads_processing_lock`
- On change detection: `process_downloads_once` triggered manually or via watch event
- **Issue:** If the watched folder is deleted or unmounted, no graceful degradation

### Stage 2: Archive Staging
- Archives (.zip, .rar, .7z) staged to `app_data/downloads_inbox/{item_id}/`
- `.7z` and `.rar` held for safety (`should_hold_archive_for_safety`) — marked as `intake_mode: blocked`
- Extraction via `extract_archive` function
- Staging path: `app_data/downloads_inbox/{id}/{timestamp}-{sanitized_name}/`
- **Solid:** Safety holds for .7z/.rar are deliberate and correct

### Stage 3: Item Assessment
- `assess_download_item` → `evaluate_download_item_cached` in `install_profile_engine`
- Profile matching: filename patterns, creator hints, file content analysis
- Result: `DownloadItemAssessment` with `intake_mode`, `risk_level`, `matched_profile_key`, evidence arrays
- Assessment written to `download_items` table via `store_download_item_assessment`
- **Solid:** Assessment results are persisted, not just in-memory

### Stage 4: Special Decision Generation
- `build_special_mod_decision_cached` runs if profile matched
- Computes `SpecialModDecision` including:
  - `queue_lane` (backend-owned)
  - `family_role` (Primary/Superseded)
  - `version_comparison` via `special_mod_versions::build_version_comparison`
  - `available_actions` (sorted by priority)
  - `queue_summary` and `explanation` (user-facing strings)
  - `incoming_version` / `installed_version` with evidence lines
- Writes to `special_mod_family_state` table
- **Solid:** Deep, evidence-backed comparison. 7.6k lines of careful logic.

### Stage 5: Version Resolution (non-special items)
- `content_versions::resolve_download_item_version`
- Builds `VersionResolution` with:
  - `status`: `SameVersion | IncomingNewer | IncomingOlder | NotInstalled | Unknown`
  - `confidence`: `Exact | Strong | Medium | Weak | Unknown`
  - `evidence`: human-readable strings explaining the comparison
  - `match_score`: numeric scoring of subject match quality
- Uses `score_subject_match` for subject identity scoring
- **Solid:** Multi-level confidence system; properly distinguishes ambiguous cases

### Stage 6: Queue Lane Assignment
- If `specialDecision` present: `queue_lane = decision.queue_lane.clone()` (backend-owned)
- If not: `derive_queue_lane(item)` from `status` + `intake_mode` (fallback)
- Lanes: `ReadyNow | SpecialSetup | WaitingOnYou | Blocked | Done`
- **Verified: Frontend cannot set queue lane. Backend owns it.**

### Stage 7: Action Execution
- `apply_download_item` → `move_engine::apply_preview_moves_for_files`
- `apply_special_review_fix` → `move_engine::apply_special_review_fix`
- `ignore_download_item` → sets `status = ignored`
- All actions call `refresh_download_item_status` after completion
- Emits `WorkspaceDomain` events to refresh all affected screens
- **Issue:** No explicit transaction wrapping; partial failure leaves DB inconsistent

### Stage 8: Re-check / Re-ingest
- `refresh_download_item_status` re-derives status from current `files` table state
- Does NOT re-run full assessment or re-generate `specialDecision`
- `refresh_inbox` re-runs full pipeline on all items
- **Issue:** Incomplete refresh — status refreshed but specialDecision not re-evaluated

---

## 3. What Is Working Well

| Component | Verdict | Notes |
|---|---|---|
| Queue lane ownership | ✅ Solid | Backend sets `queue_lane`; frontend receives as read-only |
| `specialDecision` generation | ✅ Solid | 7.6k lines of careful, evidence-backed logic |
| Version comparison engine | ✅ Solid | Multi-level confidence; proper signature comparison |
| `VersionResolution` evidence strings | ✅ Solid | Human-readable; honestly labels uncertainty |
| SQLite schema | ✅ Solid | Well-indexed; proper foreign keys; migrations table |
| Processing lock (no double-process) | ✅ Solid | `Arc<Mutex<()>>` prevents concurrent processing |
| Archive safety holds | ✅ Solid | `.7z`/`.rar` deliberately held — correct safety-first choice |
| Event log (`download_item_events`) | ✅ Solid | Action audit trail with kind/label/detail |
| DB busy retry logic | ✅ Solid | Backoff: 60/120/240ms + final no-wait |
| Filename parser + bundle detector | ✅ Solid | Clean separation of concerns |
| Slow command logging | ✅ Solid | `[perf]` logs in debug builds; 40ms threshold |
| Profile matching evidence | ✅ Solid | Evidence arrays stored for each assessment |

---

## 4. What Is Fragile or Unsafe

### CRITICAL

**1. `.expect()` in production path — panic risk**
```rust
// downloads_watcher/mod.rs line 1603
let existing_item = existing_item.expect("existing item");
```
Context: In `process_downloads_once_for_paths`, if an item is deleted between the initial scan and the processing step, this `.expect()` panics the entire watcher thread. This is a real race condition.

**2. `.unwrap()` scattered throughout `downloads_watcher`**
Multiple `unwrap()` calls on `Option` and `Result` types in hot paths:
- Line 267, 472, 561, 680, 748, 1100, 1265, 1409, 1438, 1440, 1474, 1574, 1827, 2255, 2331, 2335, 2445, 2454

Risk: Malformed input (corrupt archive, unexpected file type, DB schema mismatch) causes silent panic in the watcher thread. Watcher thread dies but app doesn't crash — just stops processing.

### HIGH

**3. No transaction wrapping for multi-step operations**
`apply_special_review_fix`, `apply_review_plan_action`, and `import_staged_batch` all perform multiple DB writes without explicit transaction wrapping. If the process crashes between writes, the DB is left in a partial state.

Example path: `apply_special_review_fix`:
```
write snapshot → write file moves → update item status → record event
```
No transaction. Any step failure after a prior step commits leaves inconsistent state.

**4. Incomplete refresh — `specialDecision` not re-evaluated on refresh**
`refresh_download_item_status` only updates `status` from current `files` table state. It does NOT re-run `build_special_mod_decision` or re-compute `VersionResolution`. If a new version is installed outside SimSuite (or files change), the `specialDecision` becomes stale but the refresh doesn't catch it.

**5. No HTTP timeout on version check requests**
```rust
// special_mod_versions/mod.rs — fetch_latest_info
reqwest::blocking::Client  // No timeout configured
```
Network calls to check latest mod versions can hang indefinitely. A slow or unreachable server blocks the watcher thread.

**6. No network retry/backoff for version checks**
`fetch_latest_info` tries once. If it fails, `latest_status = "unknown"` with no retry. For a production app that prides itself on correct version comparison, a transient network failure shouldn't permanently leave confidence at 0.

### MEDIUM

**7. No production logging**
All `log_slow_command` uses `eprintln!` with `[perf]` prefix — only fires in `debug_assertions` builds. Production builds have zero structured logs, no error categorization, no metrics.

**8. Evidence strings are not localized**
All user-facing evidence strings are hardcoded English in the Rust backend (e.g., "SimSuite found a possible installed match, but the local clues were too weak to trust."). If localization is ever needed, this is a significant rewrite.

**9. `special_mod_family_state` is per-profile, not per-installed-instance**
Only one `installed_version`/`installed_signature` per `profile_key`. If multiple mod families are installed (or if the user has multiple instances of the same mod), the family state conflates them. For Creator diagnostics this matters.

**10. In-memory `SpecialDecisionContext` cache has no eviction**
```rust
// install_profile_engine
context: &mut SpecialDecisionContext
family_state_cache: HashMap<String, StoredSpecialModFamilyState>
```
With many items, the in-memory cache grows unbounded. No LRU eviction, no size limit.

**11. No health check endpoint**
No Tauri command exposes health/readiness status. Can't tell from outside whether the watcher is alive, stuck, or errored without reading the mutex state internally.

**12. `content_versions` subject matching uses BTreeMap — collision risk on ambiguous keys**
```rust
let mut grouped = BTreeMap::<SubjectLocator, Vec<SubjectFileRow>>::new();
```
If two different files resolve to the same `SubjectLocator`, their rows get merged silently. Unlikely in practice but not impossible with complex filename patterns.

---

## 5. Queue Lane Integrity Findings

### Verified Clean
- `queue_lane` is set by backend in `build_special_mod_decision_cached`
- Frontend receives `queue_lane` as a field on `DownloadsInboxItem` — no setter exposed
- `derive_queue_lane` is deterministic: status + intake_mode only
- Lane changes are driven by: status changes, `intake_mode` changes, or `specialDecision` recomputation
- No frontend path can directly set `queue_lane`

### Real Risk: Stale Lane State
If `specialDecision` is not re-evaluated on refresh (Issue #4 above), a lane can become stale:
- Item is `WaitingOnYou` because of a conflict
- User manually resolves the conflict by installing the newer version externally
- `refresh_inbox` runs but doesn't re-evaluate `specialDecision`
- Lane stays `WaitingOnYou` even though the conflict is resolved
- User sees item in wrong lane until a full re-assessment is triggered

### Verdict: Queue Lane Integrity is MOSTLY solid, but the incomplete refresh is a real gap.

---

## 6. Conflict/Comparison Engine Findings

### Architecture: Correct — Backend-Owned
`specialDecision` (install_profile_engine) and `versionResolution` (content_versions) are both generated exclusively in Rust backend. Frontend receives them as read-only data. No frontend conflict detection exists.

### VersionResolution Engine — Quality Assessment

**Comparison pipeline (`content_versions::resolve_against_installed_subjects`):**
1. Load incoming subject files → build subject with version evidence
2. Load installed candidate subjects → score against incoming
3. Select best match by `score_subject_match`
4. Build `VersionResolution` from best match

**Confidence scoring (`confidence_from_match_score`):**
- `score >= 0.85` → `Exact`
- `score >= 0.70` → `Strong`
- `score >= 0.50` → `Medium`
- `score >= 0.30` → `Weak`
- `else` → `Unknown`

**Evidence strings — Quality: HIGH**
The engine produces specific, honest evidence strings:
- Same signature: "The installed copy and the download have the same local file fingerprint."
- Weak match: "SimSuite found a possible installed match, but the local clues were too weak to trust."
- Ambiguous: "The version clues on one side disagreed, so SimSuite stayed cautious."
- No match + high confidence: "SimSuite could not find an installed copy that matched this download."

**Weakness: Evidence strings are not tagged with confidence level**
The evidence strings don't carry their own confidence annotation. A user sees the same evidence format whether the confidence is `Exact` or `Weak`. The confidence is in a separate field, not co-located with each piece of evidence.

### SpecialDecision Engine — Quality Assessment

**What it does (7.6k lines of careful logic):**
- Profile matching: filename + creator + content heuristics
- Family detection: finds siblings and determines Primary/Superseded role
- Layout detection: checks existing installed files for the matched profile
- Version comparison: uses `special_mod_versions::build_version_comparison`
- Action planning: generates prioritized `available_actions`
- Official latest: optional network check for latest version

**Evidence sources tracked:**
- `incoming_version_evidence.source`: "inside mod", "local file names", "saved family state"
- `installed_version_evidence.source`: same
- `comparison_source`: "file signature", "inside mod", "local file names"
- Each evidence line stored in arrays

**Verdict: The conflict/comparison engine is production-grade for high-confidence cases. The main weaknesses are observability (can't see WHY confidence is low in production) and the lack of retry on network failures.**

---

## 7. Review-State Integrity Findings

### Verified Clean
- Review state (`status` field on `download_items`): `pending | ready | needs_review | partial | applied | ignored | error`)
- `intake_mode`: `standard | guided | needs_review | blocked`
- These are written by backend commands only
- Frontend receives item status as read-only display data

### `needs_review` routing
`derive_queue_lane`: if `intake_mode == NeedsReview || status == "needs_review"` → `WaitingOnYou` lane.

### Real Risk: Status desync after partial failure
`apply_download_item` calls `move_engine::apply_preview_moves_for_files` then `refresh_download_item_status`. If the move engine succeeds but `refresh_download_item_status` fails (DB locked), the item's `status` in the DB may not reflect the applied state.

### Verdict: Review state is structurally sound. The partial-failure gap is the main concern.

---

## 8. Data Model/Storage Findings

### Schema Quality: GOOD
| Table | Assessment |
|---|---|
| `download_items` | Well-structured; proper indexes on `status`, `intake_mode`, `special_family`, `updated_at` |
| `files` | Proper foreign key to `download_items`; indexed on `download_item_id`, `source_location` |
| `special_mod_family_state` | Profile-keyed; stores installed + latest info; `source_item_id` links to inbox item |
| `download_item_events` | Event log with kind/label/detail/created_at; index on `(item_id, created_at DESC)` |
| `content_watch_sources/results` | Subject-keyed watch tracking |
| `snapshots/snapshot_items` | Snapshot for rollback safety |

### Issues
1. **No explicit NOT NULL on many columns** — `display_name`, `source_path` are NOT NULL but `archive_format`, `staging_path` are nullable without clear null semantics
2. **`special_mod_family_state` conflates installed state + latest-check state** — these are separate concerns mixed in one table
3. **No `UNIQUE` constraint on `(download_item_id, file_id)` in `snapshot_items`** — potential duplicate snapshot entries
4. **No TTL or cleanup on `download_item_events`** — event log grows forever
5. **No index on `files.source_location`** — used in `refresh_download_item_status` but not indexed

---

## 9. Runtime/Failure Mode Findings

| Failure Mode | Likelihood | Impact | Current Handling |
|---|---|---|---|
| Corrupt archive | Medium | High | Extraction fails gracefully; item marked `error` with message |
| Partial parse | Low | Medium | `unwrap()` may panic watcher thread; no graceful degradation |
| Duplicate ingestion | Low | Low | `source_path UNIQUE` constraint prevents duplicates |
| Watched folder deleted | Low | High | No detection; watcher silently stops processing |
| DB locked (write) | Medium | Medium | Retries on reads only; writes fail immediately |
| Network timeout on latest-check | Medium | Low | `latest_status = unknown`; no retry; cached value used |
| Watcher thread panic | Low | High | Thread dies; status stays `Processing`; requires manual restart |
| Race: item deleted mid-processing | Low | Low | `.expect()` panic (CRITICAL) — would crash watcher thread |
| Inconsistent status after action partial failure | Low | High | No transaction = possible desync |
| Stale `specialDecision` after external changes | Medium | Medium | Refresh doesn't re-evaluate; wrong lane displayed |

---

## 10. Observability and Hardening

| Check | Status | Notes |
|---|---|---|
| Structured logs | ❌ None in prod | `eprintln!` debug-only |
| Error categorization | ⚠️ Partial | `AppError` enum exists but not all error paths use it |
| Metrics | ❌ None | No counters, histograms, or gauges |
| Traces | ❌ None | No distributed tracing |
| Audit log | ✅ Partial | `download_item_events` table; only actions recorded |
| Health check endpoint | ❌ None | Can't externally verify watcher health |
| Feature flags | ✅ Partial | `ENABLE_CONFLICT_EVIDENCE` flag exists; not generalized |
| Graceful degradation | ⚠️ Partial | Archive holds for 7z/RAR; network failures degrade to unknown |
| Idempotency | ✅ Good | `source_path UNIQUE`; `ON CONFLICT DO NOTHING` patterns |
| Rollback safety | ⚠️ Weak | Snapshots exist; no atomic multi-step transactions |
| Watchdog/keepalive | ⚠️ Weak | Background thread with no external supervision |

---

## 11. Missing or Valuable Backend Features

### High Priority

**1. Transaction wrapping for action commands**
Wrap `apply_special_review_fix`, `apply_review_plan_action`, `apply_download_item` in explicit SQLite transactions:
```sql
BEGIN IMMEDIATE;
// all writes
COMMIT;  -- or ROLLBACK on error
```
Value: Eliminates partial-failure inconsistency. Critical for production reliability.

**2. Structured logging in production**
Replace `eprintln!` with a real logger (e.g., `tracing`). Log: item ingestion start/end, assessment results, lane assignments, action outcomes, errors with error codes.

Value: Makes production debugging possible without source access.

**3. Health check Tauri command**
```rust
#[tauri::command]
fn get_downloads_health() -> DownloadsHealth {
    DownloadsHealth {
        watcher_state: current_status.state,
        last_run_at: current_status.last_run_at,
        watcher_path_valid: watched_path.exists(),
        db_connection_healthy: connection.ping().is_ok(),
        processing_lock_held: downloads_processing_lock.try_lock().is_ok(),
    }
}
```
Value: Enables external monitoring, deployment health checks, automatic restart logic.

**4. HTTP timeout + retry for version checks**
```rust
Client::builder()
    .timeout(Duration::from_secs(10))
    .build()
// + exponential backoff: 1s, 2s, 4s (max 3 retries)
```
Value: Prevents indefinite hangs; improves confidence accuracy after transient failures.

**5. `specialDecision` re-evaluation on refresh**
`refresh_download_item_status` should optionally re-run `build_special_mod_decision` when called explicitly (not on every auto-refresh, but on manual `refresh_inbox`).
Value: Prevents stale lane state after external resolution.

### Medium Priority

**6. Evidence confidence co-location**
Co-locate confidence with each evidence string rather than having a single `confidence` for the whole resolution. E.g., "file signature match" could be `Exact` while "version string from filename" is `Weak`.
Value: More honest Creator diagnostics; better conflict evidence for power users.

**7. `download_item_events` cleanup policy**
Add a background task that purges `download_item_events` older than 90 days.
Value: Prevents unbounded log growth; GDPR compliance benefit.

**8. Watched folder existence check**
Before each watch cycle, verify the watched path still exists. If not, emit a warning status and switch to manual-refresh-only mode.
Value: Prevents silent watcher death if folder is unmounted.

---

## 12. Where Conflict Detection Should Live

### Decision: Shared Backend Comparison/Conflict Service

The audit strongly supports the user's preferred direction. Here's why:

**The comparison engine (`content_versions`) is already a service, not a feature:**
- `resolve_download_item_version` — takes `connection + item_id` → returns `VersionResolution`
- `resolve_library_file_version` — takes `connection + file_id` → returns `VersionResolution`
- Same confidence scoring, same evidence generation, same subject matching

**The `specialDecision` system is Inbox-specific and correctly scoped there:**
- `queue_lane`, `intake_mode`, `apply_ready`, `available_actions` — all Inbox concepts
- These should stay in `install_profile_engine` and never be accessed by Library
- The `VersionResolution` part of `specialDecision` is what can be shared

**The Library needs conflict detection, not Inbox's decision system:**
- Library conflict = "these two installed mods may conflict"
- Inbox conflict = "this download may conflict with what's installed"
- Same underlying comparison engine; different presentation

**Recommended long-term architecture:**

```
Backend (Rust)
├── content_versions/          ← SHARED comparison engine
│   ├── resolve_download_item_version()   → VersionResolution (Inbox)
│   └── resolve_library_file_version()    → VersionResolution (Library)
│
├── special_mod_versions/      ← SHARED version comparison utilities
│   ├── build_version_comparison()
│   └── signature computation
│
├── install_profile_engine/    ← INBOX-ONLY (not shared)
│   ├── build_special_mod_decision()
│   ├── queue_lane derivation
│   └── available_actions
│
Frontend (React)
├── Inbox: ConflictEvidenceDisplay   ← reads versionResolution + specialDecision
└── Library: [future: library conflict display]  ← reads versionResolution only
```

**What NOT to share:**
- `specialDecision.queue_lane` → Inbox-only concept
- `specialDecision.available_actions` → Inbox-only concept
- `specialDecision.apply_ready` → Inbox-only concept
- `ConflictEvidenceDisplay` → Inbox-only presentation

**What TO share:**
- `VersionResolution` (version comparison result)
- Version parsing and signature computation
- Confidence scoring logic
- Evidence string generation

**This is NOT a refactor to do now.** The current architecture is correct and contained. This separation should be considered in any future Library conflict work, not as a prerequisite to shipping the Inbox.

---

## 13. Final Verdict

### Is the Inbox backend production-ready?

**VERDICT: Close — not yet.**

The core conflict/comparison engine is solid. The queue lane model is correct. The data model is well-structured. The architecture is sound.

**What must be fixed before production:**
1. ❌ **CRITICAL:** Replace `.expect()` and `.unwrap()` in production paths — panic risk
2. ❌ **HIGH:** Add transaction wrapping to action commands — partial-failure inconsistency
3. ❌ **HIGH:** Add HTTP timeout to version check requests — indefinite hang risk
4. ❌ **HIGH:** Add `specialDecision` re-evaluation to explicit refresh — stale lane state
5. ❌ **MEDIUM:** Add structured logging for production — no production debugging currently possible
6. ❌ **MEDIUM:** Add health check command — cannot verify watcher health externally

**What is ready to ship:**
- ✅ Conflict/comparison engine (well-tested, well-designed)
- ✅ Queue lane model (backend-owned, deterministic)
- ✅ `ConflictEvidenceDisplay` (read-only, feature-flagged, contained)
- ✅ SQLite schema and indexing
- ✅ Processing lock (no concurrent processing)
- ✅ Archive safety holds
- ✅ Event audit log

---

## 14. Recommended Next Implementation Phase

### Phase: Backend Hardening (Infrastructure)

**Do this BEFORE any further UI or conflict feature work.**

| Priority | Task | Effort | Impact |
|---|---|---|---|
| P0 | Replace `.expect()` with `ok_or_else`/`?` in downloads_watcher production paths | Medium | Eliminates panic risk |
| P0 | Add transaction wrapping to action commands | Medium | Eliminates partial-failure desync |
| P0 | Add HTTP timeout (10s) to version check client | Low | Prevents indefinite hangs |
| P1 | Add `tracing` or `log` structured logger; replace `eprintln!` | Medium | Production observability |
| P1 | Health check command (`get_downloads_health`) | Low | External monitoring capability |
| P1 | `specialDecision` re-evaluation on explicit refresh | Medium | Correct lane state after external changes |
| P2 | Evidence confidence co-location in VersionResolution | Medium | Better Creator diagnostics |
| P2 | `download_item_events` cleanup policy | Low | GDPR + performance |
| P2 | Watched folder existence check | Low | Graceful degradation |

**Estimated total effort:** 3–5 days of Rust backend work.

**After backend hardening is complete:** Re-evaluate ConflictEvidenceDisplay for broader Creator rollout, then consider shared `VersionResolution` service if Library conflict detection is planned.
