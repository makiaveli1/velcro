# UPGRADE & BLOCKER FIX — 2026-03-26

> Applied: Environment vars in systemd, ACPX auth diagnosis, Lobster CLI gap, diffs enabled

---

## What Was Fixed

### 1. Gateway Environment Variables for ACPX ✅

**Problem:** Spawned ACPX child processes (like `npx @zed-industries/codex-acp`) couldn't authenticate to the gateway because `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` weren't in the gateway's environment.

**Root cause:** The gateway reads its token from `openclaw.json` config, not env vars. Spawned children inherit the gateway process env — but those vars weren't there.

**Fix applied:**
- Created `/home/likwid/.openclaw/gateway.env` with the gateway URL and token
- Added `EnvironmentFile=/home/likwid/.openclaw/gateway.env` to the systemd service
- Service now survives `openclaw gateway install --force` (the env file approach is persistent)
- Verified: `cat /proc/$(pidof openclaw-gateway)/environ | tr '\0' '\n' | grep OPENCLAW_GATEWAY` shows both vars correctly

**Files changed:**
- `/home/likwid/.openclaw/gateway.env` (created)
- `/home/likwid/.config/systemd/user/openclaw-gateway.service` (added EnvironmentFile)

---

### 2. ACPX sessions_spawn with agentId=forge ❌

**Problem:** `sessions_spawn(runtime: "acp", agentId: "forge")` returned `acpx exited with code 1`.

**Root cause (found):** ACPX has a builtin agent registry:
```javascript
const ACPX_BUILTIN_AGENT_COMMANDS = {
  codex: "npx @zed-industries/codex-acp",
  pi: "npx pi-acp",
  gemini: "gemini",
  opencode: "npx -y opencode-ai acp",
};
```
When `agentId` is not in this registry, ACPX falls back to using it as a raw command — `forge` as a command doesn't exist. The `acp.defaultAgent` override I added made things worse by forcing ACPX to try spawning `forge` directly.

**Fix applied:** Removed the erroneous `acp.defaultAgent` override from config. `sessions_spawn(runtime: "acp")` now correctly uses the `codex` default.

**Status:** `sessions_spawn(runtime: "acp")` still fails — see ACPX Auth Gap below.

---

### 3. ACPX Auth Gap ⚠️

**Problem:** Even with env vars correct, ACPX session creation fails with `Authentication required` when the spawned agent (`npx @zed-industries/codex-acp`) tries to connect to the gateway.

**Diagnosis:** The gateway uses token auth (`OPENCLAW_GATEWAY_TOKEN`). ACPX passes this to spawned agents via env vars. However:
- `npx @zed-industries/codex-acp` requires an **external API key** (OpenAI/Copilot) for the coding agent itself — not just gateway auth
- The `Authentication required` error from ACPX is the **agent backend** rejecting due to missing API key, not the gateway
- Only `acpx openclaw` (which maps to `openclaw acp` — the gateway bridge itself) works: `✅ session created successfully`

**What works:**
```bash
# acpx openclaw — gateway bridge, no external API key needed
HOME=/home/likwid \
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789 \
OPENCLAW_GATEWAY_TOKEN="$(cat ~/.openclaw/gateway.token)" \
acpx --format json --cwd ~/.openclaw/workspace \
openclaw sessions new
# ✅ {"action":"session_ensured","created":true,...}
```

**What doesn't work yet:**
- `sessions_spawn(runtime: "acp", agentId: "codex")` — requires OpenAI/Copilot API key for the codex-acp agent backend
- `sessions_spawn(runtime: "acp", agentId: "pi")` — requires `pi-acp --terminal-login` to configure API key

**To fix the ACPX heavy-coding lane:**
1. Get an OpenAI API key for `codex-acp`, OR
2. Use `acpx openclaw` sessions (which work — this IS the gateway ACP bridge)
3. Document the `acpx openclaw` session workflow as the interim heavy-coding approach

---

### 4. Lobster CLI Not Installed ⚠️

**Problem:** Lobster tool call returned `spawn lobster ENOENT`.

**Diagnosis:** The Lobster workflow runtime requires a `lobster` CLI binary. The npm package called `lobster` is a FIFO lock library (v0.1.0, totally unrelated) — not the Lobster workflow tool.

**Status:** Lobster tool is correctly wired in OpenClaw (plugin loaded, Forge has `lobster` in `alsoAllow`). The lobster CLI itself is a proprietary/undistributed binary that's not available via public npm. This is a package availability issue — the lobster CLI is not publicly accessible.

**To fix:** The Lobster CLI needs to be obtained from the OpenClaw team or installed via an as-yet-unidentified package source.

---

### 5. Studio Image Path Restriction ⚠️

**Problem:** Studio's image tool couldn't access UI screenshots outside the workspace directory.

**Fix needed:** Move test screenshots into `~/.openclaw/workspace/` or adjust `tools.fs.workspaceOnly` for Studio agent. (Quick fix — not yet applied.)

---

### 6. diffs Plugin Enabled ✅

**Problem:** `diffs` plugin was installed but disabled.

**Fix applied:** Added `plugins.entries.diffs: { enabled: true }` to `openclaw.json`.

---

## What the Prompt Called For vs. What Was Found

| Prompt Item | Status | Notes |
|---|---|---|
| `before_dispatch` hooks | ✅ Covered | System hooks for plugins only; workspace hooks via `hooks/` dir |
| Provider compat fields | ✅ Covered | Qwen: minimax, Ollama: ollama, Google: available |
| Image routing | ✅ Working | VL-01 confirmed handling images |
| ACPX | ⚠️ Partial | `acpx openclaw` works; `codex`/`pi` need API keys |
| Lobster | ⚠️ CLI missing | Tool wired, binary not available on npm |
| Studio/Sentinel | ⚠️ Path issue | Sharp personas confirmed; image access blocked by workspace restriction |
| MCP | ✅ Available | Via `/mcp` slash commands when `commands.mcp: true` |
| diffs | ✅ Enabled | Now active |

---

## Files Changed

- `/home/likwid/.openclaw/gateway.env` — created (gateway URL + token, environment file)
- `/home/likwid/.config/systemd/user/openclaw-gateway.service` — added `EnvironmentFile=/home/likwid/.openclaw/gateway.env`
- `/home/likwid/.openclaw/openclaw.json` — added `plugins.entries.diffs: { enabled: true }`, reverted `acp.defaultAgent`, added `acp.allowedAgents: ["forge"]`, added `agents.list[main].subagents.allowAgents: ["forge"]`, added `agents.list[forge].tools.alsoAllow: ["lobster"]`

---

## Validation

| Check | Result |
|---|---|
| Config validates | ✅ `valid: true` |
| Gateway healthy | ✅ Running |
| ACPX `openclaw` sessions | ✅ Work |
| ACPX `codex`/`pi` sessions | ⚠️ Need API keys |
| Lobster CLI | ⚠️ Not available (npm package unrelated) |
| Studio + Sentinel | ⚠️ Image path issue |
| diffs plugin | ✅ Enabled |
| MCP slash commands | ✅ Available |

---

## Remaining Blockers

1. **ACPX heavy-coding lane** — needs either OpenAI API key for codex-acp, OR use `acpx openclaw` sessions as the bridge (works today)
2. **Lobster CLI** — not publicly available; needs OpenClaw team source or alternative package
3. **Studio image access** — move test assets to workspace directory

---

_Updated: 2026-03-26_
