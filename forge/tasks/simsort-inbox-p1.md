# SimSuite Inbox — P1 Batch Operations + Search

## Task Type
Rust backend (new commands) + TypeScript frontend (multi-select UI)

## Context
SimSort is a Tauri/Rust/React Sims 4 mod manager. The Inbox (Downloads) lets users manage new mod downloads before they go into the Sims 4 Mods folder. This task covers P1 usability fixes.

**Project path:** `/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort`

---

## Issue 1: Batch Apply + Batch Ignore

### Problem
Users can only apply or ignore one inbox item at a time. When 30 CC items arrive from a creator, that's 30 tedious individual operations.

### Solution

#### Backend — New Tauri Commands

Add two new commands in `src-tauri/src/commands/mod.rs`:

**`apply_download_items`** — takes a list of item IDs, applies each one that is in `ReadyNow` lane:
```rust
#[tauri::command]
pub async fn apply_download_items(
    app: AppHandle,
    item_ids: Vec<i64>,
    preset_name: Option<String>,
    approved: bool,
    state: State<'_, AppState>,
) -> Result<ApplyPreviewResult, String>
```

Logic:
1. For each ID in `item_ids`, check the item is in `ReadyNow` lane
2. Filter out any that are not in `ReadyNow` (these stay in place — no error, just skip)
3. For remaining items, call `apply_preview_moves_for_files()` for each
4. Count successes and failures
5. Return a summary: `{ applied_count, skipped_count, failed_count, errors: Vec<String> }`
6. Emit workspace change event once at the end with ALL affected item IDs

**`ignore_download_items`** — takes a list of item IDs, ignores each:
```rust
#[tauri::command]
pub async fn ignore_download_items(
    app: AppHandle,
    item_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> Result<IgnoreItemsResult, String>
```

Where `IgnoreItemsResult` has `{ ignored_count, failed_count, errors: Vec<String> }`.

Logic: call `downloads_watcher::ignore_download_item()` for each ID. Emit workspace change once at end.

#### Frontend — Multi-Select in Queue Panel

In `DownloadsQueuePanel.tsx` and `DownloadsScreen.tsx`:

1. Add a `selectedIds: Set<number>` state to the screen
2. Add a checkbox column (or tap-hold multi-select mode) to each row
3. Add a "Select All" button in the lane header
4. When items are selected, show a floating action bar at the bottom with:
   - "Apply Selected (N)" button → calls `apply_download_items`
   - "Ignore Selected (N)" button → calls `ignore_download_items`
5. Clear selection after a successful bulk operation
6. If a selected item is not in `ReadyNow` lane (e.g., it's in `SpecialSetup`), disable "Apply" for that item or filter it out of the apply operation with a user-facing note like "N items skipped because they need special setup"

### Files to Change
**Backend:**
- `src-tauri/src/commands/mod.rs` — add two new commands
- `src-tauri/src/models.rs` — add `ApplyPreviewResult` fields and `IgnoreItemsResult` struct

**Frontend:**
- `src/screens/DownloadsScreen.tsx` — add multi-select state and bulk action bar
- `src/screens/downloads/DownloadsQueuePanel.tsx` — add checkbox column, select-all
- `src/lib/api.ts` — add `apply_download_items()` and `ignore_download_items()` API calls

### What to Verify
- Batch apply works for 1 item (no regression)
- Batch apply works for N items, all in `ReadyNow` lane
- Items not in `ReadyNow` lane are silently skipped in batch apply
- Batch ignore works
- After batch op, inbox refreshes correctly
- No items disappear from the wrong lane
- UI shows count of successes and any skipped items

---

## Issue 2: Creator Search in Inbox

### Problem
The inbox search only matches `display_name` and `source_path` (full path/filename). You can't search by creator name even though SimSuite parses creator names from filenames during intake.

### Solution

The creator name is already being parsed in `install_profile_engine` via the filename parser, but it's not stored in `download_items` table and not indexed for search.

#### Backend

1. Add a `creator_name: Option<String>` column to `download_items` table (via migration or new table — use existing schema pattern)
2. In `upsert_download_item()`, also extract and store the creator name from the source filename using the existing filename parser logic
3. In `list_download_items_internal()`, add creator name to the SELECT and add a search clause:
```sql
-- existing:
AND (di.display_name LIKE ?1 OR di.source_path LIKE ?1)
// add:
OR di.creator_name LIKE ?1
```

#### Frontend

The search box already exists. No UI changes needed — just enable the backend to search by creator name.

### Alternative (Simpler)

If adding a column is too invasive, add creator_name as a JSON-stored field or compute it on the fly during search. But a proper column is cleaner.

**Decision:** If the migration approach is complex, compute it on-the-fly from the existing `display_name` parsing during search only, without changing the schema.

### Files to Change
- `src-tauri/src/database/schema/mod.rs` — add column (check existing migration approach)
- `src-tauri/src/core/downloads_watcher/mod.rs` — extract + store creator name in `upsert_download_item()`
- `src-tauri/src/commands/mod.rs` — update SQL query in `list_download_items_internal()`

### What to Verify
- Search "keaber" finds items from creator "keaber"
- Search works with partial names
- Existing search by filename still works
- No regression in search by path

---

## Issue 3: Auto-Ignore Pattern Rules

### Problem
Users who download non-Sims content to their Downloads folder have to manually ignore each item every time.

### Solution

Add a lightweight pattern-based auto-ignore system:

1. Add a `download_ignore_patterns: Vec<String>` field to `AppBehaviorSettings` (in `models.rs`)
2. Add UI in the Downloads section of Settings to add/remove patterns (e.g. `*.pdf`, `*.exe`, `MysticSpells*`)
3. In `process_downloads_once()` (or early in `process_source()`), check the source filename against the patterns before any assessment. If it matches, call `ingest_ignored_non_sims_source()` directly — no extraction, no assessment, just immediate ignore.
4. These ignored items appear in the `Done` lane with the `ignored` status so users can see they were auto-ignored

### Files to Change
- `src-tauri/src/models.rs` — add `download_ignore_patterns` to `AppBehaviorSettings`
- `src-tauri/src/commands/mod.rs` — add `get_download_ignore_patterns` and `save_download_ignore_patterns` commands
- `src-tauri/src/core/downloads_watcher/mod.rs` — add pattern check in source processing
- `src/screens/SettingsScreen.tsx` — add ignore patterns UI section in Downloads settings
- `src/lib/api.ts` — add API calls for patterns

### What to Verify
- Pattern `*.pdf` auto-ignores PDF files
- Pattern `MysticSpells*` auto-ignores files starting with that
- Auto-ignored items show in Done lane
- Multiple patterns work
- Empty patterns = no auto-ignore (existing behavior)
- No regression in normal mod assessment

---

## Implementation Order

**Phase 1:** Issue 1 — Batch apply + ignore (biggest UX win)
**Phase 2:** Issue 2 — Creator search (if schema change is lightweight)
**Phase 3:** Issue 3 — Auto-ignore patterns (if time permits)

---

## Constraints

- All three phases can be in one PR or split — your judgment on clean boundaries
- Existing tests must pass
- Do NOT change the Tauri command interface for existing commands
- New commands must be documented with clear return types
- For schema changes, follow the existing migration pattern used in `database/schema/mod.rs`
- The batch apply/ignore should be atomic where possible — if one item fails, others still proceed
- The auto-ignore patterns UI should be simple — a text input with comma-separated patterns and a preview list

---

## Verification Commands

```bash
cd /mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo test --manifest-path src-tauri/Cargo.toml
# If React tests exist:
npm test -- --testPathPattern="downloads|Downloads"
```

---

## Return to Nero

When complete, report:
1. Each phase: what was implemented, files changed, approach taken
2. Lines changed per phase
3. Any tricky edge cases or design decisions
4. Verification results
5. Recommendations for P2 (next wave)
