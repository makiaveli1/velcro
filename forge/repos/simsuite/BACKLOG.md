# SimSuite — Complete Task Backlog

**Last updated:** 2026-03-24  
**Compiled by:** Nero (chair)  
**Sources:** `IMPLEMENTATION_PLAN.md`, `UI_AUDIT.md` (original + mode-aware)

---

## How to Read This Table

- **Priority:** P0 (blocking/urgent) → P1 (high value) → P2 (worth doing) → P3 (nice-to-have)
- **Side:** `BE` = Backend (Rust/Tauri) | `FE` = Frontend (React/TypeScript) | `BOTH`
- **Mode:** Which experience mode this most affects (` Casual` / `S` = Seasoned / `C` = Creator / `ALL`)
- **Status:** `done` | `in-progress` | `blocked` (pending decision) | `todo`
- **Blocks:** What can't start until this is done

---

## SECTION A: Verification Needed Before Any More Work

| # | Task | Side | Priority | Status | Notes |
|---|---|---|---|---|---|
| A1 | Run `cargo test --lib` to verify P0 ZIP single-pass + fast-path build | BE | **P0** | `blocked` | Must run on Windows/macOS — WSL lacks GTK. **This must happen before any new BE feature work.** |

---

## SECTION B: P1 — High Value, Should Do Next

| # | Task | Side | Mode | Status | Blocks | Notes |
|---|---|---|---|---|---|---|
| **B1** | **Complete + test batch operations end-to-end** | BOTH | ALL | `todo` | — | BE commands exist (`apply_download_items`, `ignore_download_items`). FE: multi-select state + floating action bar need verification and polish. Critical for all modes. |
| B2 | **Wire progress feedback during watcher operations** | FE | ALL | `todo` | — | `progress` field exists in `DownloadsWatcherStatus` model. FE needs to listen for `downloads_progress` events and display phase + current file in top strip. P0 for Casual contract. |
| B3 | **Keyboard shortcuts** | FE | S, C | `todo` | — | J/K navigate, Enter open, A apply, I ignore, R refresh, ? help, Esc close/deselect. Casual users: don't promote. |
| B4 | **Fix `--text-dim` contrast accessibility** | FE | ALL | `todo` | — | WCAG AA compliance. Any readable body text must use `--text-soft` or `--text`. |
| B5 | **Settings: bullet-point mode descriptions** | FE | ALL | `todo` | — | Replace verbose prose in Casual/Seasoned/Creator cards with bullet summaries. Full descriptions via `?` tooltip. |

---

## SECTION C: P2 — Worth Doing, Good ROI

| # | Task | Side | Mode | Status | Blocks | Notes |
|---|---|---|---|---|---|---|
| **C1** | **Creator search in downloads inbox** | BE | ALL | `todo` | A1 | Add `creator_name` column to `download_items` via migration. Update `upsert_download_item()` to extract. Update search query in `list_download_items_internal()`. Non-trivial — needs care. |
| C2 | Global search / command palette | FE | S, C | `todo` | B3 first | Cmd+K pattern. Search across Library, Downloads, Updates simultaneously. Categorized results, keyboard navigable. |
| C3 | URL-based screen state | FE | S, C | `todo` | — | React Router or URL state manager. Map `screen` to URL param. Deep link to specific items. Not needed for Casual. |
| C4 | Bump typography: 13px → 14px | FE | ALL | `todo` | — | `--body-size: 13px` in globals.css. 14px is industry standard for desktop productivity apps. |
| C5 | Audit + normalize destructive action confirmations | FE | C, S | `todo` | — | Two-stage confirmation pattern consistently across all destructive actions. |
| C6 | Mode transition guidance | FE | ALL | `todo` | — | Brief explanation when switching modes — "Seasoned shows more detail. Your Casual layout is saved if you go back." |
| C7 | Density control surfacing in Settings | FE | ALL | `todo` | — | Surface `UiDensity: compact/balanced/roomy` as a clear secondary slider near the mode selector. |

---

## SECTION D: P2 — Mode-Specific UX

| # | Task | Side | Mode | Status | Blocks | Notes |
|---|---|---|---|---|---|---|
| **D1** | **Casual guided flows — actual implementation** | FE | C | `todo` | — | Casual promises "simple, guided" but no guided flows exist. Needs dedicated design pass: first-run tour, lane explanations on first visit, context-aware nudges. Highest-impact Casual fix. |
| D2 | Lane visual differentiation — sticky headers + color accents | FE | C | `todo` | — | Add sticky lane header rows. Left border accent in lane-specific colors. Icons per lane. Beginner users need this most. |
| D3 | Settings: collapse to two columns for Casual | FE | C | `todo` | — | Remove "Current Fit" right panel. Float it as a small persistent chip (top-right). Causal contract requires simplicity. |
| D4 | Home screen density — declutter for Casual | FE | C | `todo` | B1 first | Collapse module bands by default, reduce health chip repetition to one surface, move customization to a separate screen. |
| D5 | WorkspaceToolbar cleanup | FE | C | `todo` | — | Remove screen name + mode chips. Reserve toolbar for global actions (scan, search, settings). Casual users benefit most. |
| D6 | Sidebar elevation for Creator mode | FE | C | `todo` | — | Casual: minimal (Home, Downloads, Library, Settings). Seasoned: all 10. Creator: elevate Creator Audit + Category Audit. |

---

## SECTION E: P3 — Nice-to-Have

| # | Task | Side | Mode | Status | Blocks | Notes |
|---|---|---|---|---|---|---|
| E1 | Auto-ignore patterns — UI + wiring | BOTH | ALL | `todo` | A1 | `download_ignore_patterns` field exists in `LibrarySettings`. Need Settings UI to add/remove patterns. Need `downloads_watcher` to apply patterns during source processing. |
| E2 | Staging area browser + cleanup | BOTH | ALL | `todo` | A1 | New commands: `get_downloads_staging_info`, `cleanup_downloads_staging`, `delete_downloads_staging_item`. New dialog: `DownloadsStagingDialog.tsx`. |
| E3 | MCCC / special mod silent auto-update | BOTH | C | `todo` | A1 | New table `tracked_update_sources`. Settings UI for per-mod auto-update toggles. Polling loop integration. |
| E4 | Terminology philosophy decision | FE | S, C | `todo` | — | Option C (mode-gated): Casual gets Sims vocabulary. Seasoned/Creator get plain functional labels. Needs Likwid decision. |
| E5 | Easy-reject folder | BOTH | ALL | `todo` | A1 | `download_reject_folder` in `LibrarySettings`. Path picker UI. Early-reject check in `process_downloads_once_for_paths()`. |
| E6 | Load transitions — skeleton previews | FE | ALL | `todo` | — | Replace generic "Loading workspace view..." with skeleton previews of the incoming screen. Pre-warm next likely screen on sidebar hover. |

---

## SECTION F: P3 — Pending Likwid's Decisions

| # | Task | Decision Needed | Options | Blocks |
|---|---|---|---|---|
| **F1** | **Snooze / Remind-Later** | How should snooze work? | 1: Fixed 3-day / 2: Custom duration / 3: Lazy unsnooze + default: 1 day / 3 days / 1 week | Entire Snooze feature |
| **F2** | **Undo Applied Item** | How strict should undo be? | 1: 30-min window / 2: Always with confirm / 3: Snapshots only + window: 15 min / 30 min / 1 hour | Entire Undo feature |
| **F3** | **Patreon / Early Access Surfacing** | What to show? | 1: Badge only / 2: Badge + compare / 3: Creator tier | Patreon surfacing feature |
| **F4** | **Inbox ↔ Library Version Loop** | What to show? | 1: Inbox summary / 2: Summary + Open in Library / 3: Skip | Version comparison in Inbox |
| **F5** | **Creator search migration scope** | Add `creator_name` column vs. on-the-fly compute? | Schema migration vs. search-only compute | B1 (creator search) |

---

## SECTION G: Already Done ✅

| # | Task | Side | Done | Notes |
|---|---|---|---|---|
| G1 | ZIP double-read → single-pass extract | BE | ✅ `38fab35` | `extract_zip_archive_single_pass()` created. Awaiting test verification. |
| G2 | Fast-path downloads scan (`last_downloads_scan_at`) | BE | ✅ `38fab35` | Timestamp stored in DB, fast-path filter in `collect_observed_sources()`. |
| G3 | 7z/RAR skip before extraction | BE | ✅ pre-existing | `should_hold_archive_for_safety()` checked before extraction. |
| G4 | P2 progress events (BE side) | BE | ✅ | `DownloadProgress` in model, events in downloads_watcher. BE done; FE wiring still needed (C2). |
| G5 | Batch apply + ignore (BE commands) | BE | ✅ | `apply_download_items` and `ignore_download_items` exist. |
| G6 | Auto-ignore patterns (model field) | BE | ✅ | `download_ignore_patterns` in `LibrarySettings`. |
| G7 | CSS design system (3 themes, custom properties) | FE | ✅ | Sophisticated, well-structured — leave alone. |
| G8 | Motion/animation library | FE | ✅ | `motion/react` — sophisticated, appropriate. |
| G9 | Workbench layout pattern | FE | ✅ | Three-panel abstraction is correct. |
| G10 | StatePanel loading component | FE | ✅ | Well-designed. |
| G11 | TypeScript coverage | FE | ✅ | Comprehensive. |
| G12 | Experience mode system (architecture) | FE | ✅ | Well-engineered. Mode-scoped layout storage is correct. |
| G13 | `UiPreferencesContext` mode-scoped sizing | FE | ✅ | Per-mode layout preferences stored separately. |

---

## SECTION H: Outreach / Verdantia (Separate Track)

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| H1 | Review + approve outreach email content | P0 | `todo` | Day 4 follow-up (Email 2) sending soon — content needs sign-off |
| H2 | Day 4 follow-up sequence | P0 | `todo` | Send Email 2 to non-responders (follows `pitch-emails.md` sequence) |
| H3 | Commit outreach assets | P1 | `todo` | `outreach/` files staged but uncommitted pending review |

---

## Summary: What to Do Next (Recommended Order)

```
IMMEDIATE
├── A1: Run cargo test on Windows/macOS ← BLOCKS all new BE work
└── B1: Complete + test batch operations end-to-end

NEXT SPRINT
├── B2: Wire progress feedback (Casual contract — biggest UX win)
├── B4: Fix text-dim contrast (accessibility, easy win)
├── B5: Bullet-point settings descriptions (Casual contract, easy win)
└── C4: Bump typography to 14px (easy, global win)

GROWTH WORK
├── C1: Creator search (real feature gap)
├── B3: Keyboard shortcuts (Creator value)
├── C2: Global search (Creator value)
└── D1: Casual guided flows (most impactful Casual fix)

P3 DECISIONS NEEDED
└── F1–F5: Get Likwid's decisions → unblocks F1/F2/F3/F4 features + C1
```

---

## Legend

- **C** = Casual mode | **S** = Seasoned | **C** = Creator | **ALL** = all modes
- **BE** = Backend (Rust/Tauri) | **FE** = Frontend (React/TS) | **BOTH**
- `done` = complete | `in-progress` = being worked | `blocked` = waiting on something | `todo` = not started
