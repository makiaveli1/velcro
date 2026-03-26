# MEMORY.md — Long-Term Memory

_Durable facts, preferences, and decisions worth carrying forward._

---

## System Setup

### Council Architecture (2026-03-23)
- **Nero** is chair, front door, final synthesizer — always
- **Forge** is permanent builder/engineering agent — instantiated 2026-03-23
- **Scout** — designed, NOT instantiated — waiting for real research context triggers
- **Steward** — designed, NOT instantiated — waiting for cron/automation infrastructure triggers
- Council docs: COUNCIL.md, PROMOTION_RULES.md, DELEGATION_RULES.md, COUNCIL_OPERATING_MODEL.md, FUTURE_AGENTS.md

### Forge (2026-03-23)
- Workspace: `/home/likwid/.openclaw/workspace/forge/`
- Model: `minimax/MiniMax-M2.7` only — no highspeed, no fallbacks
- Skills: github, openclaw-github-assistant, summarize, skill-vetter (via workspace skills)
- Reports to Nero only; Nero is final voice
- ACP NOT wired — escalation path for future

### Website Studio (Verdantia Lead Gen)

A full lead generation + website concept studio system has been built inside OpenClaw. See:
- `memory/2026-03-26-website-studio-build.md` — full system build log
- `ventures/website-studio/` — all system files
- CRM cockpit: `cd ventures/website-studio/CRM/cockpit && node server.js` → localhost:3099

Current status: Brian McGarry is in APPROVAL_QUEUED. Awaiting Likwid/Nero deployment approval. Larkfield and CPK parked (phone-only contacts, email-only policy).

### Skills
- Shared managed dir: `~/.openclaw/skills/` — symlinks rejected by OpenClaw security (workspace root constraint); use copy approach
- Skills copied to `~/.openclaw/skills/`: summarize, skill-vetter
- Skills in workspace `skills/`: github, openclaw-github-assistant, agent-builder, automation-workflows, office, openclaw-security-audit, task-experience-logger, session-logs, find-skills-skill, skill-creator, healthcheck, node-connect, tmux, weather

### GitHub
- `gh` CLI v2.45.0 installed and authenticated
- Account: makiaveli1 (HTTPS, full repo + workflow scopes)
- Token: stored in `~/.config/gh/hosts.yml`

### OpenClaw
- Gateway: running on port 18789
- Default agent: Nero (main)
- Channels: Telegram (bot token configured), Webchat
- Config: `/home/likwid/.openclaw/openclaw.json`

---

## User Preferences

- Direct, no fluff communication
- Sharp, witty, slightly unhinged but competent tone
- Plain English first — jargon only when it helps
- Don't pad answers, don't use corporate sludge
- Proactive but not noisy

---

## Pending / Future Work

- Website Studio Round 1 completion: Brian McGarry deployment, response tracking, Round 2 decision
- ACP/Claude Code wiring — triggers when Forge needs substantial repo-heavy coding work
- Scout instantiation — triggers when research context spans sessions
- Steward instantiation — triggers when cron/automation infrastructure is active
- google workspace (gog) — only when Gmail/Calendar becomes part of daily flow

---

_Update when new durable facts emerge. Keep it curated — no junk._
