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

Bot tokens, API keys, auth credentials — never store in workspace files. They live in:
- `/home/likwid/.openclaw/openclaw.json` (config, already gitignored)
- Environment variables where appropriate

If I ever need to store a secret mid-session, I use a memory file, not a committed file.

---

## Skills Discipline

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
