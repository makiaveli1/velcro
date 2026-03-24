# SimSuite Inbox — P2 UX Polish + Power User Features

## Task Type
Mixed: Rust backend (new commands) + TypeScript frontend (new screens/dialogs)

## Context
SimSort is a Tauri/Rust/React Sims 4 mod manager. The Inbox (Downloads) is a staging area between the user's Downloads folder and their Sims 4 Mods folder. This task covers P2 improvements — all P2 issues are clear enough to implement without design decisions.

**Project path:** `/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort`

---

## Issue 1: Progress Events During Long Operations

### Problem
Large ZIP extractions and full scans run in the watcher thread. The UI shows `state: "processing"` with no intermediate progress — a 500MB mod pack extraction shows no feedback until it completes.

### Solution

Add progress reporting to the watcher thread, emitting events to the frontend via Tauri's event system (the same mechanism already used for `emit_downloads_status`).

**Backend changes in `downloads_watcher/mod.rs`:**

1. Add a `DownloadProgress` struct:
```rust
struct DownloadProcessingProgress {
    phase: String,           // "scanning" | "extracting" | "assessing" | "indexing"
    current_file: String,    // filename being processed
    processed_count: usize,  // files processed so far
    total_count: usize,     // total files to process
    bytes_processed: u64,
    bytes_total: u64,
}
```

2. Add progress emission in the main processing loop in `process_downloads_once_for_paths()`:
   - During `collect_observed_sources()`: emit `scanning` phase with current file
   - During `extract_archive()`: emit `extracting` phase with archive name and progress
   - During `ingest_processed_source()`: emit `assessing` phase with item name
   - Use the existing `emit_downloads_status` event channel or a new `downloads_progress` event

3. Store `progress: Option<DownloadProgress>` in `DownloadsWatcherStatus` so the UI can read it.

**Frontend changes in `DownloadsScreen.tsx`:**

1. Listen for `downloads_progress` events (same pattern as `listenToDownloadsStatus`)
2. Show a progress indicator in the status bar when `watcherStatus.state === "processing"`:
   - Display phase label ("Scanning new downloads..." / "Extracting archive..." / "Assessing items...")
   - Show a determinate or indeterminate progress bar
   - Show the current filename being processed (truncated if long)
   - When phase completes, transition smoothly back to idle

**Files to Change:**
- `src-tauri/src/core/downloads_watcher/mod.rs` — progress tracking + emission
- `src-tauri/src/models.rs` — add `DownloadProgress` and field to `DownloadsWatcherStatus`
- `src-tauri/src/commands/mod.rs` — propagate progress through status
- `src/screens/DownloadsScreen.tsx` — progress UI in the status bar
- `src/components/StatePanel.tsx` (if needed for loading state)

### What to Verify
- Progress bar shows during a large ZIP extraction
- Phase label updates as processing moves through scan → extract → assess stages
- Status bar still shows correct final state after processing completes
- No progress events = no UI change (existing behavior intact)

---

## Issue 2: MCCC / Special Mod Silent Auto-Update Toggle

### Problem
MCCC updates every few weeks. The current flow requires: notice update in Updates screen → open Inbox → apply. For trusted, well-understood mods like MCCC, this should be automatic with a snapshot taken first.

### Solution

**Backend — Add auto-update toggle and tracking:**

1. Add `auto_update_special_mods: bool` to `AppBehaviorSettings` (default `false`)
2. Add a new table `tracked_update_sources`:
```sql
CREATE TABLE tracked_update_sources (
    id INTEGER PRIMARY KEY,
    profile_key TEXT NOT NULL UNIQUE,  -- e.g. "mccc", "xml-injector"
    source_url TEXT NOT NULL,
    last_checked_at TEXT,
    last_known_version TEXT,
    last_update_applied_at TEXT,
    auto_update_enabled INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
```

3. In `install_profile_engine`, the special mod catalog entries already have `source_url`. Seed these into `tracked_update_sources` on first run.

4. In the watch polling loop (`watch_polling/`), if `auto_update_special_mods = true`:
   - Check `tracked_update_sources` for entries where `auto_update_enabled = 1`
   - For each, check if the tracked URL has a newer version than `last_known_version`
   - If newer: download the update, stage it, apply it via the guided install path with `approved = true`, take a snapshot first
   - Update `last_update_applied_at` and `last_known_version`

5. The check should run on a configurable interval (e.g., every 6 hours, default off)

**Frontend — Settings UI:**

1. In `SettingsScreen.tsx`, in the Downloads section, add a toggle:
   - "Automatically update known special mods" (beginner label)
   - When enabled, show a list of tracked special mods with per-mod toggles
   - Each row shows: mod name, tracked URL, last updated date, auto-update toggle

**Files to Change:**
- `src-tauri/src/models.rs` — add `auto_update_special_mods` to settings, add `TrackedUpdateSource` model
- `src-tauri/src/database/schema/mod.rs` — add `tracked_update_sources` table
- `src-tauri/src/core/watch_polling/` — add auto-update check in polling loop
- `src-tauri/src/commands/mod.rs` — add commands: `get_tracked_update_sources`, `toggle_auto_update_source`, `check_for_special_mod_updates`
- `src/screens/SettingsScreen.tsx` — add UI section
- `src/lib/api.ts` — add API calls

### What to Verify
- Toggle in settings persists correctly
- Per-mod auto-update toggle works
- When `auto_update_special_mods = false` (default), no auto-update runs even if individual mods have auto-update on
- Manual "Check Now" button triggers a fresh version check
- New version detected → guided install + snapshot runs → item moves to applied
- Works alongside existing MCCC guided install flow (no regression)

---

## Issue 3: Easy-Reject Folder

### Problem
Users who download non-Sims content (PDFs, executables, unrelated zip files) to their Downloads folder have to manually ignore each one in the app.

### Solution

**Backend:**

1. Add `download_reject_folder: Option<String>` to `LibrarySettings` (not AppBehaviorSettings — it's path-related)
2. In `process_downloads_once_for_paths()`, early in the source loop, check if the source's parent folder matches `download_reject_folder`. If so:
   - Call `ingest_ignored_non_sims_source()` directly (no extraction, no assessment)
   - Add a note: "Auto-ignored because it landed in the quick-reject folder."
3. The reject folder path should be a directory, not a pattern — anything that lands in that directory gets rejected

**Frontend:**

1. In Settings → Downloads section, add:
   - "Quick Reject Folder" — a path picker that opens a folder dialog
   - Button: "Browse..." → opens native folder picker via Tauri
   - Display the selected path, with "Remove" button to clear
   - Helper text: "Anything in this folder is automatically ignored when it appears in your Inbox."

**Files to Change:**
- `src-tauri/src/models.rs` — add `download_reject_folder` to `LibrarySettings`
- `src-tauri/src/database/mod.rs` — handle the new field in settings get/save
- `src-tauri/src/core/downloads_watcher/mod.rs` — add early-reject check in source loop
- `src-tauri/src/commands/mod.rs` — save_library_settings handles the new field (should auto-work if model is correct)
- `src/screens/SettingsScreen.tsx` — add reject folder UI
- `src/lib/api.ts` — `saveLibrarySettings()` already handles arbitrary fields, should work

### What to Verify
- Files in the reject folder are immediately ignored when Refresh is run
- Rejected items appear in Done lane with correct note
- Removing the reject folder path restores normal behavior
- No extraction occurs for rejected files
- No regression in normal mod intake

---

## Issue 4: Staging Area Browser + Cleanup

### Problem
Staged files live in `~/.simsuite/downloads_inbox/`. If a session crashes mid-extraction, stale staging folders accumulate. Users have no visibility into this space.

### Solution

**Backend:**

1. Add a command `get_downloads_staging_info`:
```rust
// Returns:
// - total_size_bytes: u64
// - item_count: usize
// - oldest_item_age_days: Option<i64>
// - items: Vec<StagingItem>
//   where StagingItem = { item_id: i64, display_name: String, staging_path: String, size_bytes: u64, created_at: String, file_count: usize }
```

2. Add a command `cleanup_downloads_staging`:
```rust
// cleanup_stale_staging(max_age_days: i64) -> CleanupResult { deleted_count, freed_bytes }
```

Logic: delete all staging folders in `downloads_inbox/` where the folder's modified time is older than `max_age_days`. Default `max_age_days = 7`.

3. Add a command `delete_downloads_staging_item(item_id: i64)`:
   - Deletes that specific staging folder
   - Marks the download_item in DB with `staging_path = NULL` (already-handled state)

**Frontend — New Dialog:**

Add a "Staging Area" dialog accessible from the Downloads screen (gear icon or "View Staging" link in the status bar when staging exists):

- Shows total staging space used
- Lists each staging item with: name, size, age, file count
- "Delete Stale" button → cleanup items older than 7 days (with confirmation: "This will delete X items and free Y MB. Are you sure?")
- "Delete" button per item → immediate delete (with confirmation)
- "Open in File Explorer" button → opens `downloads_inbox/` in the OS file manager

**Files to Change:**
- `src-tauri/src/commands/mod.rs` — add three new commands
- `src-tauri/src/models.rs` — add `StagingItem`, `StagingInfo`, `CleanupResult` models
- `src/screens/DownloadsScreen.tsx` — add staging area dialog/tray
- `src/screens/downloads/` — create `DownloadsStagingDialog.tsx`
- `src/lib/api.ts` — add API calls

### What to Verify
- Staging dialog shows correct total size and item list
- Delete stale cleanup removes only old items
- Delete individual item removes that folder and clears the DB reference
- "Open in File Explorer" opens the correct folder
- Works when staging folder is empty
- Handles missing folders gracefully (DB out of sync)

---

## Implementation Order

**Phase 1:** Issue 3 — Easy-Reject Folder (simplest, no new commands)
**Phase 2:** Issue 1 — Progress Events (crosscuts existing code paths, careful)
**Phase 3:** Issue 2 — MCCC Auto-Update (new table + polling + settings)
**Phase 4:** Issue 4 — Staging Browser (new commands + new dialog)

---

## Constraints

- Follow existing patterns for Tauri commands (error mapping, run_blocking wrapper)
- New DB tables must use the existing migration approach in schema/
- All new commands should have proper error handling — don't crash on missing staging folders, corrupt DB states, etc.
- The staging cleanup should NOT delete folders for items that are currently in `pending` or `processing` status
- Progress events should be throttled — emit at most every 200ms to avoid flooding the frontend
- For the MCCC auto-update: the actual download step — use `reqwest` to fetch the file to a temp location, then feed it through the existing intake pipeline. Do NOT manually move files into place — use the existing guided install flow.
- MCCC auto-update: always take a snapshot before applying, even for auto-updates
- The per-mod auto-update toggle should default to OFF even when the global toggle is ON

---

## Verification Commands

```bash
cd /mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo test --manifest-path src-tauri/Cargo.toml
npm test -- --testPathPattern="downloads|Downloads"
```

---

## Return to Nero

When complete, report:
1. Each phase: what was implemented, files changed
2. Lines changed per phase
3. Any tricky edge cases or design decisions
4. Any P3 items you found you could also implement while doing this work
5. Verification results
