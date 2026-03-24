# SimSuite Inbox — P3 Items Needing Likwid's Input

## Context
These are the P3 recommendations that require a decision from you before implementation can proceed. I'm flagging them now so you can decide in the morning. Everything else in P3 (and all of P2) is already spec'd and queued for implementation.

---

## P3-A: Snooze / Remind-Later

**What it does:** Lets you snooze an inbox item — "ask me again in X days" — instead of leaving it stuck in WaitingOnYou or having to deal with it now.

### Current State
Items in `WaitingOnYou` lane have no escape hatch except Apply, Ignore, or wait indefinitely.

### The Decision: How Should Snooze Work?

**Option 1 — Fixed Defer**
- One button: "Remind me later"
- Snoozes for a fixed duration (configurable in settings, default 3 days)
- After the snooze period, item returns to its original lane automatically
- Snoozed items hidden from all lanes but shown in a "Snoozed" section accessible from the Downloads screen header
- Manual unsnooze: clicking a snoozed item shows "Snoozed until [date]. Click to unsnooze now."

**Option 2 — Custom Defer Duration**
- Same as Option 1, but when you click "Remind me later," a small popover asks: "1 day / 3 days / 1 week / Next month"
- More flexible, slightly more clicks

**Option 3 — Lazy Unsnooze**
- Snoozed items stay in their original lane but get a "snoozed" badge
- They don't appear in counts on the home screen
- They auto-unsnooze after the duration

**My recommendation:** Option 1 is cleaner and covers 95% of use cases. The "3 days" default can be changed in settings. Don't over-engineer this.

### What I Need From You
- Which option do you prefer? (1, 2, or 3)
- Default snooze duration: 1 day, 3 days, 1 week?
- Should snoozed items be hidden from lane counts on the Home screen? (Yes makes sense to me)

---

## P3-B: Undo Applied Item from Inbox

**What it does:** When you apply a download item from the Inbox, it disappears from Inbox and appears in Library. If you realize 10 minutes later it was the wrong version, there's currently no path back — you have to go to Snapshots and find the right restore point.

### Current State
Applied items: `status = 'applied'` → removed from Inbox → appear in Library. Snapshots exist for restore, but there's no "I just applied this and want to undo" path.

### The Decision: How Strict Should Undo Be?

**Option 1 — 30-Minute Window (Recommended)**
- When an item is applied, record `applied_at` timestamp
- Within 30 minutes: show the item in Inbox as "Just applied — undo available" with an "Undo" button
- After 30 minutes: the "Undo" button disappears; user must use Snapshots
- No confirmation needed within the window (it's reversible via snapshot anyway)
- The item goes back to `ReadyNow` lane if undone

**Option 2 — Confirmation Flow**
- Always show "Undo" button for applied items, but always require confirmation
- "This will restore your Mods folder to the snapshot taken before this apply. Continue?"
- No time limit

**Option 3 — Snapshots-Only (Current)**
- Don't add a dedicated undo path; improve the Snapshots UI instead
- Add a "Recent applies" section in Snapshots that highlights the most recent apply events

**My recommendation:** Option 1 — the 30-minute window is a safety net that doesn't require user education. Most mistakes are caught within minutes. Snapshots are the deep recovery path; this is the quick fix.

### What I Need From You
- Which option? (1, 2, or 3)
- If Option 1: 30 minutes, 1 hour, or something else?
- Should undo be available per-item, or should there be a "Recent applies" tray on the Downloads screen showing only the last 5 applied items?

---

## P3-C: Patreon / Early Access Source Surfacing

**What it does:** When a download comes from a Patreon-exclusive or early-access source, SimSuite should make that visible — and ideally offer to compare it against the public version if available.

### Current State
`catalog_source_url` is stored in `download_items` but not surfaced meaningfully in the UI. Patreon releases from creators like LittleMsSam, Mizutani, etc. are not flagged.

### The Decision: What to Show and How?

**Option 1 — Source Badge Only**
- Add a "Patreon" or "Early Access" badge to items in the Inbox that have a non-public `catalog_source_url`
- Badge is amber-colored with a subtle icon
- No additional UI complexity — just a badge that users can look up

**Option 2 — Source + Comparison**
- Same badge as Option 1
- Additionally, if the item is Patreon/early-access AND a public version of the same mod exists in the Library, show a comparison line:
  - "This is a Patreon early-access version. Your Library has the public version [vX.Y]. Would you like to compare them?"
- Adds a "Compare" button that opens the guided install panel pre-loaded with comparison mode

**Option 3 — Patreon as a Tracking Tier**
- Expand the `AccessTier` enum (already exists per `bc24ac4 feat: add AccessTier enum and Patreon detection`)
- Track Patreon status per creator in the source database
- Show Patreon tier badges on all items from that creator, not just early-access ones

### What I Need From You
- Which option feels right? (1, 2, or 3)
- Or: is this lower priority than other items and we should deprioritize it?

---

## P3-D: Inbox ↔ Library Version Loop Closure

**What it does:** Currently, the version comparison for installed mods lives in the Library context. If a new download comes in for something already installed, you see the update in the Updates screen, but the download is sitting in Inbox independently. The loop doesn't close.

### Current State
- Library shows: "Lumpinou's Toolbox v3.2.1 is installed, v3.3.0 is available from source"
- Inbox shows: "Lumpinou's Toolbox download" — but the fact that a newer version is available in the Library is not surfaced in the Inbox view

### The Decision: What to Show?

**Option 1 — Inbox Comparison Summary (Recommended)**
- When an Inbox item has `existing_install_detected = true`, also pull the library version comparison result
- Show in the Inbox item's lane summary:
  - "You have v3.2.1 installed. This download is v3.3.0." (or "same version," or "older")
- This is a UI-only change — the comparison logic already exists

**Option 2 — Linked Flow**
- Same as Option 1, plus an "Open in Library" button on the Inbox item
- Opens the Library detail panel for the installed mod, showing the full update comparison

**Option 3 — Skip for Now**
- This is a nice-to-have and lower priority. Defer.

### What I Need From You
- Which option? (1, 2, or 3)
- Or deprioritize it below other items?

---

## Summary — Decisions Needed in the Morning

| Item | Question | Options |
|---|---|---|
| **P3-A Snooze** | How should snooze work? | 1: Fixed 3-day / 2: Custom duration / 3: Lazy unsnooze |
| **P3-A Snooze** | Default duration? | 1 day / 3 days / 1 week |
| **P3-B Undo** | How strict should undo be? | 1: 30-min window / 2: Always with confirm / 3: Snapshots only |
| **P3-B Undo** | 30-min window — how long? | 15 min / 30 min / 1 hour |
| **P3-C Patreon** | What to show? | 1: Badge / 2: Badge + compare / 3: Creator tier |
| **P3-D Version Loop** | What to show? | 1: Summary in Inbox / 2: Summary + Open in Library / 3: Skip |

Everything else (all P2 items and the remaining P3 items) is spec'd and queued. I'll start implementing as soon as P0 finishes and work through everything that doesn't need these decisions.

You can also just say "do your best judgment on all of them" and I'll proceed with my recommended options.
