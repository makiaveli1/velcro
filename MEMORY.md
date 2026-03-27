# MEMORY.md — Long-Term Memory

_Durable facts, preferences, and decisions worth carrying forward._

---

## System Setup

### Council Architecture (2026-03-23)
- **Nero** is chair, front door, final synthesizer — always
- **Hephaestus (Forge)** — permanent builder/engineering agent — instantiated 2026-03-23; model: `openai-codex/gpt-5.4` primary, `minimax/MiniMax-M2.7` fallback
- **Orion (Scout)** — designed, instantiated 2026-03-26 — browser-enabled for live-page verification
- **Steward** — designed, NOT instantiated — waiting for cron/automation infrastructure triggers
- Council docs: COUNCIL.md, PROMOTION_RULES.md, DELEGATION_RULES.md, COUNCIL_OPERATING_MODEL.md, FUTURE_AGENTS.md

### Hephaestus (Forge) (2026-03-23)
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

### skills.sh Integration (2026-03-27)
skills.sh is a Vercel Labs registry for AI agent skills. Installed via `npx skills add <owner/repo@skill>`.
Skills CLI installs to `.agents/skills/<name>/` with symlinks in `skills/` — both usable by OpenClaw.

**Installed from skills.sh:**
- `mvanhorn/last30days-skill@last30days` — deep research across Reddit/X/YouTube/TikTok/HN/Polymarket; 🟡 MEDIUM risk (Snyk npm deps); requires SCRAPECREATORS_API_KEY for full functionality; free sources (HN, Polymarket, YouTube/yt-dlp) work without key
- `jk-0001/skills@business-plan` — business plan writing for solopreneurs; 🟢 LOW risk
- `jk-0001/skills@financial-planning` — P&L, cashflow, financial planning for solopreneurs; 🟢 LOW risk
- `shubhamsaboo/awesome-llm-apps@meeting-notes` — structured meeting notes template; 🟢 LOW risk
- `shajith003/awesome-claude-skills@ui-design` — single-file HTML/Tailwind UI mockups (Linear/Stripe aesthetic); 🟢 LOW risk
- `luongnv89/skills@frontend-design` — production-grade frontend with design thinking + style guide; 🟢 LOW risk
- `wshobson/agents@wcag-audit-patterns` — WCAG 2.2 audits with remediation guidance; 🟡 MEDIUM risk

**Per-agent skill routing:**
- Specialist agents access skills via `skills.load.extraDirs` pointing to `~/.openclaw/workspace/.agents/skills` — no per-agent symlinks needed
- All skills.sh skills load globally and are available to all agents (including specialists)
- Per-agent symlinks removed; global load supersedes per-agent routing

**skills.sh resolved issues (2026-03-27):**
- `extraDirs` in `skills.load` correctly routes all 7 installed skills to all agents
- 3 stale skill-installer agents removed from config
- JSON trailing-comma bug fixed (was blocking `extraDirs` from loading)

### Skills
- Shared managed dir: `~/.openclaw/skills/` — symlinks rejected by OpenClaw security (workspace root constraint); use copy approach
- Skills copied to `~/.openclaw/skills/`: summarize, skill-vetter
- Skills in workspace `skills/`: github, ~~openclaw-github-assistant~~ (DELETED — credential harvesting patterns), agent-builder, automation-workflows, office, openclaw-security-audit, task-experience-logger, session-logs, find-skills-skill, skill-creator, healthcheck, node-connect, tmux, weather, plus skills.sh installs above

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
- ACP/Claude Code wiring — triggers when Hephaestus needs substantial repo-heavy coding work
- Orion instantiation — triggers when research context spans sessions
- Steward instantiation — triggers when cron/automation infrastructure is active
- google workspace (gog) — only when Gmail/Calendar becomes part of daily flow

---

_Update when new durable facts emerge. Keep it curated — no junk._
