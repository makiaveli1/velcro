# TOOLS.md — WSL Workspace Notes

_Stuff that's true about this machine and environment. Keep it accurate._

---

## WSL Environment

- Running in WSL on Likwid's machine — full Linux environment under Windows
- Working directory maps to: `/home/likwid/.openclaw/workspace`
- OpenClaw lives at: `/home/likwid/openclaw/`
- Config lives at: `/home/likwid/.openclaw/openclaw.json`

## Shell

- Default shell: `bash`
- Node.js: `v24.14.0`
- OpenClaw CLI: `openclaw` (installed globally)

## Useful Commands

```bash
# OpenClaw
openclaw gateway status      # Is the gateway running?
openclaw gateway restart     # Restart after config changes
openclaw pairing list        # See pending pairings
openclaw pairing approve      # Approve a pairing code
openclaw logs --follow        # Tail gateway logs
openclaw channels status      # Channel health

# Git workspace
git -C /home/likwid/.openclaw/workspace add -A
git -C /home/likwid/.openclaw/workspace commit -m "message"
git -C /home/likwid/.openclaw/workspace status

# Disk usage
df -h /home/likwid
```

## WSL-Specific Notes

- Filesystem access to Windows: `/mnt/c/` (use carefully — path quirks)
- Network: localhost routes to Windows host, useful for gateway port 18789
- If `openclaw` commands feel slow, check WSL version (`wsl --version`)

## Docs

OpenClaw docs are local at `/home/likwid/openclaw/docs/`. If I need to look something up and can't guess the path, check `index.md` for the docs structure.

Online docs: `https://docs.openclaw.ai`

## Cron & Scheduling

For exact-time tasks, use cron (`cron` tool). For loose periodic checks, use heartbeat batching in `HEARTBEAT.md`.

## Skills

Skills are stored in `/home/likwid/openclaw/skills/`. Each skill has a `SKILL.md` with instructions. Read the skill file before using an unfamiliar tool.

## Secrets

Bot tokens, API keys, auth credentials — never store in workspace files, never store in memory files, never commit to git. They live in:
- `/home/likwid/.openclaw/openclaw.json` (config, already gitignored)
- Environment variables where appropriate

If I ever need a secret mid-session, I note it in a memory file but the secret itself goes to config or env — not into any committed or workspace file.

## Browser Discipline

Browser is a live Nero capability. Use the managed **openclaw** browser profile for verification, screenshots, live-page inspection, and real UI checks.

**When to use browser:**
- Final confirmation of something web search alone can't fully prove
- Live-page inspection for screenshots or UI state
- Automated UI interaction verification
- Verifying that what was deployed or built actually looks/acts right

**When NOT to use browser:**
- When web search or `web_fetch` gives the answer
- When screenshot theater is more useful to the user than actually needed
- For simple lookups that don't require live page state

**Browser profile:** managed `openclaw` profile (isolated, not the signed-in user browser).

**Canvas:** not currently enabled. Node health and device surface not proven on this setup. Do not enable without verifying node health first.

Skills are loaded in this order of precedence:
1. Workspace `skills/` — role-specific, agent-local
2. Shared `~/.openclaw/skills/` — cross-agent capabilities
3. Bundled skills — OpenClaw built-ins
4. extraDirs — additional configured paths

I do not bulk-install skills. I install only what I can vouch for after inspection.

When a skill materially changes behavior, I document:
- What it does
- Where it was installed
- Why it was chosen
- What behavioral change it introduced

---

_Update this as the setup evolves._
