# NEXT STAGE AGENT ARCHITECTURE

> Updated: 2026-03-26

---

## Final Agent Roster

| Agent | Role | Tool Posture |
|---|---|---|
| **Nero/main** | Orchestrator, approvals, autonomy governor | coding (broad) |
| **Forge** | Builder, technical implementation | coding, denies browser/gateway; model: `openai-codex/gpt-5.4` primary, `minimax/MiniMax-M2.7` fallback |
| **Scout** | Research, verification | minimal — web only, no exec/write |
| **Mercury** | Commercial, outreach, business dev | minimal — web only, no exec/write |
| **Studio** | UI/UX design review, accessibility audit | minimal + image, no exec/write |
| **Sentinel** | Code review, QA, security, risk analysis | minimal — web + exec (use Forge for exec+synthesis) |

---

## Full Agents vs Skills

### Full agents (6 total)
Only these 6 get their own workspace, session store, and agent config:
- Nero, Forge, Scout, Mercury, Studio, Sentinel

### Specializations as skills (not full agents)
The following are **skills**, not full agents. They are rubrics/checklists usable by any agent:

- `frontend-review` — screenshot-based UI review rubric
- `a11y-review` — WCAG AA accessibility audit checklist
- `code-review` — code quality review rubric
- `security-review` — security risk analysis rubric
- `website-audit` — business/UX website audit rubric
- `outreach-rubric` — cold outreach and pitch quality rubric
- `prospect-qualification` — lead qualification rubric (BANT-adjacent)
- `design-guardrails` — AI agent design workflow guardrails

---

## Coding Strategy

### Forge = native builder
Forge handles all OpenClaw-native technical work.

### ACP lane = heavy coding
For large refactors, multi-file repo work, longer implementation loops:
- Nero scopes the work
- Forge prepares context
- ACP session does the heavy coding (via `sessions_spawn` with `runtime: "acp"`)
- Sentinel reviews
- Nero approves

ACP backend is installed (`acpx` plugin enabled 2026-03-25).

---

## Autonomy Model

### Heartbeat
- **Nero only** — 30m cadence, maintenance and awareness only
- Not on Forge/Scout/Mercury/Studio/Sentinel unless explicitly needed

### Cron
- **Daily System Brief** — 08:00 Europe/Dublin — gateway + disk + model health
- **Weekly Security Audit** — 09:00 Mondays — deep security audit
- **Weekly Architecture Review** — 10:00 Mondays — config drift check

### Loop detection
- Enabled globally (2026-03-25)
- Conservative settings: warn at 10 repeats, critical at 20, hard stop at 30
- Applies to all agents

### Workflows
- Lobster plugin enabled (2026-03-25) — resumable approval-based workflows
- llm-task plugin enabled (2026-03-25) — structured JSON-only task steps

---

## Browser Topology
- Default autonomous browser: `openclaw` profile (isolated)
- Studio has browser access via tools (minimal profile + image)
- Scout and Mercury: web_fetch/web_search only, no direct browser

---

## Skill Locations
All skills are workspace skills at `~/.openclaw/workspace/skills/`.

---

## Provider Decision

| Provider | Status | Role |
|---|---|---|
| MiniMax text (M2.7) | **Production default** | Global baseline: all agents, all text |
| MiniMax image (VL-01) | **Production default** | Image understanding for all agents |
| OpenAI Codex OAuth | **Forge primary** | Forge's premium coding lane, falls back to MiniMax |
| Qwen OAuth | Available, not wired | Potential free secondary lane |
| Ollama | Available | Local vision fallback candidate |
| Google | Available, not enabled | Optional, not default |

**Decision:** Keep MiniMax as global production default. Codex OAuth is an additive Forge-only lane, not a global replacement. Do not switch architecture to Google or any paid provider without explicit approval.

---

## Skills Summary

| Skill | Purpose | User |
|---|---|---|
| `frontend-review` | UI/screenshot review rubric | Studio, Nero |
| `a11y-review` | WCAG AA checklist | Studio, Sentinel |
| `code-review` | Code quality rubric | Sentinel, Forge |
| `security-review` | Security risk rubric | Sentinel |
| `website-audit` | Business/UX audit | Mercury, Nero |
| `outreach-rubric` | Outreach quality | Mercury |
| `prospect-qualification` | Lead qualification | Mercury |
| `design-guardrails` | AI design workflow rules | Studio, Forge, Nero |

---

## Next Recommended Steps

1. Wire ACP lane for heavy coding — test with a real task
2. Test Studio with a real screenshot review task
3. Test Sentinel with a real code review task
4. Consider enabling Qwen OAuth as a secondary free lane for Studio/Sentinel
5. Evaluate local Ollama vision as a fallback for Studio image work

---

_This document reflects the architecture state after the 2026-03-25 next-stage implementation._
