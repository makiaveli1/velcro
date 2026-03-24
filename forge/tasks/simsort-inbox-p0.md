# SimSuite Inbox — P0 Performance Fixes

## Task Type
Rust backend optimization (src-tauri/src/core/downloads_watcher/)

## Context
SimSort is a Tauri/Rust/React Sims 4 mod manager. The Inbox (Downloads) is a staging area between the user's Downloads folder and their Sims 4 Mods folder. This task targets three P0 issues that cause measurable slowdowns on every manual refresh, especially for users with large/long-standing Downloads folders.

**Project path:** `/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort`

---

## Issue 1: ZIP Double-Read — Fix to Single-Pass Extract

### Problem
`should_extract_archive_source()` opens and reads the entire ZIP to check if it contains Sims content. Then `extract_zip_archive()` opens and reads the ZIP again to extract. For a 200MB mod pack, that's 400MB of I/O.

### Root Cause
Two separate functions, two separate opens:
- `zip_archive_contains_supported_content()` — opens ZIP, iterates all entries, returns bool
- `extract_zip_archive()` — opens ZIP again, extracts all entries

### Solution
Replace both with a single `extract_zip_archive_single_pass()` function that:
1. Opens the ZIP once
2. Iterates entries, checking `is_supported_content_extension()` as it goes
3. Only extracts entries that pass the check
4. Returns `(extracted_files: Vec<DiscoveredFile>, ignored_count: i64)`
5. If `extracted_files.is_empty()`, the caller treats it as "no supported content found" and marks the item as ignored

Then update `extract_archive()` to use the new single-pass function and remove `zip_archive_contains_supported_content()`.

Also remove the `should_extract_archive_source()` pre-check entirely — it's no longer needed since the single-pass extract already handles the "no supported content" case by returning empty.

### Files to Change
- `src-tauri/src/core/downloads_watcher/mod.rs`

### What to Verify
- ZIP files with no Sims content are still correctly marked as `ignored`
- ZIP files with Sims content are still correctly extracted
- `.zip` entries with unsupported extensions (e.g. `.exe`, `.txt`, `.jpg`) are still counted in `ignored_entries` note
- No regression in existing tests

---

## Issue 2: 7z/RAR Extraction Waste — Skip Entirely

### Problem
In `process_source()`, if the format is 7z or RAR, `extract_archive()` is called which decompresses the entire archive... then `should_hold_archive_for_safety()` immediately returns `true` and marks it blocked. The extracted files are never used. CPU burned for nothing.

### Root Cause
`process_source()` calls `extract_archive()` before checking if the format should be held. The extraction happens first, unconditionally.

### Solution
In `process_source()`, check `should_hold_archive_for_safety(source)` **before** deciding to extract. If true, skip extraction entirely and call `ingest_held_archive_source()` directly with `existing.map(|item| item.id)` passed as the existing item ID.

The logic should be:
```rust
fn process_source(...) -> AppResult<i64> {
    // 1. Skip extraction for held formats — go straight to held ingest
    if should_hold_archive_for_safety(source) {
        return ingest_held_archive_source(connection, source, existing.map(|item| item.id));
    }

    // 2. For ZIP, check while extracting in one pass (Issue 1 fix)
    let mut notes = Vec::new();
    let mut staged_root = None;
    let discovered = if source.source_kind == "file" {
        vec![build_discovered_file(watched_root, &source.path)?]
    } else if !should_extract_archive_source(source, &mut notes)? {  // still needed for non-ZIP non-7z/rar
        Vec::new()
    } else {
        let next_root = build_archive_staging_root(...);
        let extracted = extract_zip_archive_single_pass(...)?;  // use new single-pass fn
        staged_root = Some(next_root);
        extracted
    };

    ingest_processed_source(...)
}
```

Actually wait — `should_extract_archive_source()` is used for ZIP in the current code. With the single-pass fix, we don't need a separate pre-check for ZIP anymore. But `should_extract_archive_source()` also handles non-ZIP archive formats. Let me re-read the current code...

Current `extract_archive()`:
```rust
match source.archive_format.as_deref() {
    Some("zip") => extract_zip_archive(&source.path, destination_root, notes)?,
    Some("7z") => { sevenz_rust::decompress_file(...); }  // extracts then ignored
    Some("rar") => { rar::Archive::extract_all(...); }     // extracts then ignored
    _ => return Err(...),
}
```

And `should_extract_archive_source()`:
```rust
if !matches!(source.archive_format.as_deref(), Some("zip")) {
    return Ok(true);  // non-ZIP always extracts (but 7z/rar get held anyway!)
}
// ZIP gets pre-checked via zip_archive_contains_supported_content()
```

So the issue is: `should_extract_archive_source()` returns `true` for 7z/rar, which causes `extract_archive()` to be called, which extracts them, then they get held. The fix needs to handle held formats BEFORE extraction, not after.

New `process_source` flow:
1. If `should_hold_archive_for_safety(source)` → `ingest_held_archive_source()` directly (skip all extraction)
2. If `source.source_kind == "file"` → single file, no extraction
3. If archive format is ZIP → `extract_zip_archive_single_pass()` (one pass, checks as it extracts)
4. If archive format is something else (not 7z/rar, not zip) → check with `should_extract_archive_source()` first

### Files to Change
- `src-tauri/src/core/downloads_watcher/mod.rs`

### What to Verify
- 7z files are marked as `needs_review` with held message and NO extraction occurs
- RAR files are marked as `needs_review` with held message and NO extraction occurs
- ZIP files still work correctly
- Non-Sims ZIP files are still marked `ignored`
- No regression in existing tests

---

## Issue 3: Fast-Path Full Scan — Avoid Walking Already-Processed Files

### Problem
On manual refresh, `should_use_full_downloads_scan()` returns `true`, which causes `collect_observed_sources()` to WalkDir over the entire downloads folder — potentially thousands of files — even when only one new file was added. The `can_skip_observed_source()` check prevents re-processing, but it can't prevent the initial file enumeration.

### Solution
Add a fast-path using a "last scan timestamp" stored in the database. On manual refresh:

1. Before doing a full WalkDir, record `now = Utc::now()`
2. Walk the folder but filter to only files where `modified_at > last_scan_timestamp`
3. If the count of changed files is very small (e.g. < 5), use only those changed files instead of the full list
4. Store `now` as `last_downloads_scan_at` in app_settings after each full scan

The key insight: most files in a downloads folder haven't been touched in months. We only need to look at files that are actually new or recently modified.

Implementation:
- Add `last_downloads_scan_at: Option<String>` field to `DownloadsWatcherStatus` (and store in app_settings)
- In `collect_observed_sources()`, add a fast-path variant that filters by modified time
- When `manual=true`, try fast-path first. Only fall back to full WalkDir if fast-path finds nothing or something goes wrong.

### New AppSetting Key
`last_downloads_scan_at` — ISO 8601 timestamp of the last full downloads folder scan.

### Files to Change
- `src-tauri/src/core/downloads_watcher/mod.rs` — fast-path logic in `collect_observed_sources`
- `src-tauri/src/models.rs` — add `last_downloads_scan_at` to `DownloadsWatcherStatus`
- `src-tauri/src/commands/mod.rs` — propagate the new field in status responses

### What to Verify
- Manual refresh on a folder with 1000+ files still works and detects new files
- New files are still detected after a fast-path scan
- Full scan still runs when fast-path finds changed files that need processing
- No regression in existing tests

---

## Implementation Order

**Phase 1:** Issue 2 (7z/RAR skip) — smallest, cleanest win, minimal risk
**Phase 2:** Issue 1 (ZIP single-pass) — bigger refactor, needs care with the empty-ZIP case
**Phase 3:** Issue 3 (fast-path scan) — adds new DB field and scan logic

Each phase should be its own commit within a single PR, with clear commit messages.

---

## Constraints

- Do NOT change the database schema version (no migration needed for these fixes)
- Do NOT change any frontend code
- Do NOT change the Tauri command interface — no new commands, no changed return types at the command boundary
- All existing tests must pass
- The PR should be focused — no scope creep
- Test on real ZIP files if possible, or verify the logic carefully by reading the existing test suite
- The `WATCHER_DEBOUNCE_MS` constant (900ms) should not be changed
- Performance-critical paths should log at debug/trace level, not spam the user

---

## Verification Commands

After implementing all three fixes:
```bash
cd /mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort
# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml --lib
# Run the full test suite
cargo test --manifest-path src-tauri/Cargo.toml
```

If there are existing integration tests or React tests, also run those.

---

## Return to Nero

When complete, report:
1. What was implemented (each phase)
2. Lines changed (rough count)
3. Any new functions added and why
4. Any edge cases that were tricky
5. Verification results (test output)
6. Any follow-up work that would make the next phase (P1) easier
