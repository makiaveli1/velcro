# KNOWN GOOD OPENCLAW STATE

> Created: 2026-03-25 (post architecture hardening + image routing fix)
> Backup folder: `~/.openclaw/backups/known-good-20260325-231331/`

---

## 1. Summary

OpenClaw is running cleanly after two sessions of hardening:
- Image routing is explicit and verified working (VL-01 for images, M2.7 for text)
- Gateway is locked to local-only with token auth and rate limiting
- Browser is using an isolated `openclaw` profile (not a real signed-in session)
- Three cron jobs are active for automated monitoring
- Dangerous `openclaw-github-assistant` skill was removed (had credential harvesting patterns)
- Control UI origins restricted to localhost

---

## 2. Core Runtime State

| Setting | Value |
|---|---|
| Primary text model | `minimax/MiniMax-M2.7` |
| Image model | `minimax/MiniMax-VL-01` |
| Image understanding | ✅ confirmed working |
| Gateway bind | `auto` → local loopback only |
| Gateway auth | token (plaintext in config — low risk while local-only) |
| Control UI origins | `["http://localhost", "http://127.0.0.1"]` |
| Auth rate limiting | 10 attempts / 60s window / 5m lockout |
| Browser default profile | `openclaw` (isolated) |
| Heartbeat (Nero) | 30 minutes |
| Heartbeat (Forge/Scout/Mercury) | disabled |
| Tool profile (Nero) | `coding` |
| Tool profile (Forge) | `coding`, denies `browser`, `gateway` |
| Tool profile (Scout) | `minimal` — web only, no exec/write/patch |
| Tool profile (Mercury) | `minimal` — web only, no exec/write/patch |
| Dangerous skill | `openclaw-github-assistant` removed (credential harvesting patterns in api.js + test.js) |

---

## 3. Agent Roles

### Nero/main
Top-level orchestrator and decision-maker. Handles all orchestration, delegation, approvals, and business-facing work. Broad visibility, heartbeat enabled at 30m cadence.

### Forge
Technical builder. Handles coding, repo changes, patching, technical debugging, and implementation work. Has explicit image model routing. Denies browser and gateway tools. Isolated workspace at `~/forge/`.

### Scout
Research and verification specialist. Read-only posture — web search, web fetch, session reading only. No exec, write, patch, or gateway mutation.

### Mercury
Commercial and outreach specialist. Business messaging, outreach drafts, offer framing, lead analysis. Web and communication tools only. No host exec or file patching.

---

## 4. Security Posture

- **Gateway bind:** local loopback (`127.0.0.1`) — not exposed externally
- **Auth:** token-based, rate-limited (10 attempts/60s, 5m lockout)
- **Control UI:** origins restricted to localhost — no arbitrary web origin can connect
- **Plaintext token:** gateway token stored in `openclaw.json` — low risk while bind stays local. Rotate or move to env-backed storage if bind ever opens beyond localhost
- **Dangerous skill removed:** `openclaw-github-assistant` had env-harvesting patterns (env var access + network send in same function) — removed entirely
- **Sandbox:** not fully enabled — this is a single-operator personal setup, not multi-tenant. Standard personal-assistant trust model

---

## 5. Browser and Interaction Topology

- **Default autonomous browser:** `openclaw` profile — isolated, headless, no signed-in personal session
- **Real signed-in browser:** should only be attached deliberately when needed, not used as the default autonomous profile
- **Claw3D role:** connect to gateway as a visual control-room layer. OpenClaw remains the source of truth for all runtime state, sessions, and execution
- **Node topology:** not configured — optional future layer for browser-heavy or device-heavy workflows

---

## 6. Automation State

### Daily System Brief
- **Schedule:** `0 8 * * *` (Europe/Dublin)
- **Job ID:** `3a096d64`
- **What it does:** gateway status, health check, disk space, model probe — concise 5-item status summary

### Weekly Security Audit
- **Schedule:** `0 9 * * 1` (Europe/Dublin, Mondays)
- **Job ID:** `7da8b381`
- **What it does:** `openclaw security audit --deep` + config validate, reports CRITICAL/WARN/INFO

### Weekly Architecture Review
- **Schedule:** `0 10 * * 1` (Europe/Dublin, Mondays)
- **Job ID:** `5e9f399b`
- **What it does:** agent bindings, model status, cron list, git status — flags any config drift

---

## 7. File Locations

| Purpose | Path |
|---|---|
| Main config | `/home/likwid/.openclaw/openclaw.json` |
| Agents config | `/home/likwid/.openclaw/config/agents.json` |
| Models config | `/home/likwid/.openclaw/config/models.json` |
| Gateway config | `/home/likwid/.openclaw/config/gateway.json` |
| Browser config | `/home/likwid/.openclaw/config/browser.json` |
| Hooks config | `/home/likwid/.openclaw/config/hooks.json` |
| Channels config | `/home/likwid/.openclaw/config/channels.json` |
| Auth profiles | `/home/likwid/.openclaw/agents/main/agent/auth-profiles.json` |
| Workspace | `/home/likwid/.openclaw/workspace/` |
| Forge workspace | `/home/likwid/.openclaw/workspace/forge/` |
| Scout workspace | `/home/likwid/.openclaw/workspace/scout/` |
| Mercury workspace | `/home/likwid/.openclaw/workspace/mercury/` |
| **Backup folder** | `/home/likwid/.openclaw/backups/known-good-20260325-231331/` |

---

## 8. Recovery Steps

If something breaks after a future change:

1. **Check OpenClaw version:**
   ```bash
   openclaw status --deep --verbose
   ```

2. **Restore backed-up config files** from:
   ```
   ~/.openclaw/backups/known-good-20260325-231331/
   ```
   Copy `openclaw.json`, `config/agents.json`, `config/models.json`, `config/gateway.json` back to their original locations.

3. **Validate restored config:**
   ```bash
   openclaw config validate --json
   ```

4. **Verify model routing:**
   ```bash
   openclaw models status --json
   # confirm: defaultModel = minimax/MiniMax-M2.7, imageModel = minimax/MiniMax-VL-01
   ```

5. **Verify gateway is healthy:**
   ```bash
   openclaw gateway status
   openclaw health --json
   ```

6. **Verify image understanding** (quick test):
   - Send a screenshot or image to Nero — confirm VL-01 handles it, not M2.7

7. **Only then reconnect UI layers** like Claw3D — confirm sessions resume cleanly

---

## 9. Validation Commands

```bash
openclaw config validate --json
openclaw models status --probe
openclaw models status --json
openclaw health --json
openclaw status --deep --verbose
openclaw cron list
openclaw agents list --bindings --json
openclaw gateway status
openclaw security audit
```

---

## 10. Notes for Future Changes

- **Image routing:** do not casually change `imageModel` away from `minimax/MiniMax-VL-01`. If image understanding breaks, check `agents.defaults.imageModel` and Forge's resolved model first
- **Gateway bind:** do not open the gateway beyond `127.0.0.1` without reviewing auth, rate limiting, and token handling first. Local-only is the right default
- **Skills:** do not reinstall `openclaw-github-assistant` or any skill that accesses env vars and makes network calls in the same function. Use `skill-vetter` before installing new skills
- **Before major upgrades:** snapshot the config (`~/.openclaw/backups/`) first. Run `openclaw config validate --json` after any batch update
- **Claw3D:** test locally first. Gateway must be healthy and validated before any UI layer connects as the control surface
- **Plaintext secrets:** the gateway token is in `openclaw.json`. Move to env-backed storage if exposure changes. API keys live in `auth-profiles.json` which is the correct location

---

_This document is a snapshot of the known-good state after the 2026-03-25 architecture hardening session. Update this file if significant changes are made to the runtime._
