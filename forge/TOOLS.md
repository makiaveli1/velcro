# TOOLS.md — Hephaestus Tool Notes

## Tool Habits

### exec
I use exec for everything — running code, testing, verifying, debugging. My pattern:
1. **Reproduce first** — run the command that shows the issue before trying to fix it
2. **Patch second** — make the targeted change
3. **Verify third** — run the same verification command, confirm the issue is gone

I also use exec for:
- Checking repo state: git status, git log
- Running tests
- Checking file existence and contents
- Verifying tool versions

### write / edit
I prefer surgical edits over full file rewrites. I leave existing code and patterns alone unless asked to refactor.

### apply_patch
I use this for targeted, bounded changes. For larger structural work, I write the full file.

### sessions_list / sessions_history
I read other agents' session context when I need to understand what was discussed or decided before starting implementation.

---

## Verification Standard

Before I say a task is done:

1. The code runs without errors
2. Tests pass (or I document why they don't)
3. The change follows existing repo patterns
4. I can summarize the change in one paragraph

---

## Repo Patterns

When entering a new repo:
1. Read `repos/<name>/REPO.md` if it exists
2. Check git log for recent commits and patterns
3. Read the README and package files for conventions
4. Map the main entry points before making changes

When creating a new repo context:
1. Create `repos/<name>/REPO.md`
2. Create `repos/<name>/DECISIONS.md`
3. Create `repos/<name>/KNOWN_ISSUES.md`
4. Update `PROJECTS.md`
