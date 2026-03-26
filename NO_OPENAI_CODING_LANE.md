# NO-OPENAI CODING LANE
> Created: 2026-03-26
> Principle: Fully capable without buying any API keys beyond MiniMax.

---

## The Honest Reality

**MiniMax is the only currently configured and working provider.**
- Text: `minimax/MiniMax-M2.7` — working ✅
- Image: `minimax/MiniMax-VL-01` — working ✅
- No OpenAI key — intentionally
- No Qwen OAuth key — not configured (device code flow, friction)
- No Google API key — disabled
- Ollama running locally — but only `embeddinggemma:latest` (embedding model, not useful for coding or chat)

**The native OpenClaw lane is the best available option. It is not a compromise.**

---

## The Canonical No-OpenAI Coding Lane

```
Forge (implement) → Sentinel (review) → Nero (decide)
Lobster — for bounded multi-step workflows with approval gates
ACPX bridge — for persistent CLI sessions when needed
```

### When to use each

| Situation | Path |
|---|---|
| Quick implementation, review needed | Forge → Sentinel → Nero |
| Multi-step task with approval checkpoints | Forge → Lobster → Sentinel → Nero |
| Persistent ACP session | `acpx openclaw` via CLI |
| Design review | Studio → Sentinel → Nero |
| Research / verification | Scout → Nero |

### When Forge only is enough
- Small, bounded, well-defined tasks
- Scaffolding / demo code
- Single-file utilities
- Tasks where the implementation is clear and low-risk

---

## Provider Decision

| Provider | Status | Role |
|---|---|---|
| MiniMax M2.7 + VL-01 | **Production default** | All text and image work |
| Qwen OAuth | Available, not wired | Free tier exists but requires device OAuth flow — friction too high for automation |
| Ollama local | Available, not wired | Only has embedding model — no coding model available. Could run `codellama` or `qwen2.5-coder` locally if GPU VRAM allows, but not configured |
| OpenAI | Available | Requires API key — not wanted |
| Google | Disabled | Not needed |

**Decision:** Keep MiniMax as production default. Do not wire OpenAI, Google, or paid Qwen as defaults.

### If Ollama coding is desired later
If you want a local free coding model:
1. `ollama pull qwen2.5-coder:7b` or `ollama pull codellama:7b`
2. Add `ollama` as a provider in config
3. Use it as a secondary lane for Sentinel or Scout only
4. Do NOT replace MiniMax as primary

---

## Forge — Builder

**Role:** Implements code, scaffolds utilities, handles technical execution.

**Tools:** Full coding profile via OpenClaw tools (exec, write, edit, apply_patch, web search, sessions)

**Strengths:**
- MiniMax M2.7 is a strong reasoning model
- Can write, review, test, and deliver working code
- Has access to the full tool suite for implementation work

**Constraints:**
- No dedicated coding-agent backend (no codex-acp, no copilot)
- For very large refactors: use ACPX `openclaw` sessions as a persistent CLI layer

**When to escalate to ACPX bridge:**
- Multi-file refactors requiring persistent CLI context
- Long-running tasks where session persistence helps
- Tasks that would benefit from the `openclaw acp` CLI session layer

---

## Sentinel — Reviewer

**Role:** QA, correctness, security risk, regression check.

**Tools:** `web_search`, `web_fetch`, `sessions_list`, `sessions_history`, `sessions_send`, `image`, `exec`

**Exec constraint:** Sentinel has exec access but is **not reliable for exec+synthesis patterns** under its identity context — the model can suppress or misrender tool calls on trivial tasks. Use **Forge** for exec+synthesis. Sentinel should review Forge's output, not produce exec output itself.

**Strengths:**
- Catches correctness issues, security risks, edge cases
- Can run tests and validate implementations
- Reviews both Forge output and Studio design work

**What Sentinel reviews:**
- Code correctness and edge cases
- Security patterns (injection, secrets, auth)
- Missing error handling
- Test coverage gaps
- Risk blind spots in design decisions

**Delivery note:** Sentinel review text delivers via session announce. If the task is bounded and the review is short, delivery is reliable. For very long reviews, results may be paraphrased by the calling session.

---

## Lobster — Workflow Automation

**Role:** Bounded multi-step pipelines with deterministic execution and approval gates.

**Status:** Installed and working (v2026.1.21-1)

**When to use Lobster:**
- Multi-step tasks that need human approval between steps
- Tasks where the pipeline should not free-run
- Structured automation that needs to pause and resume

**When native Forge is better:**
- Simple, single-step implementations
- Tasks where Forge's judgment is sufficient
- Low-stakes scaffolding

---

## ACPX Bridge — Persistent Sessions

**Role:** Provides a persistent CLI session layer via `acpx openclaw`.

**Status:** Working ✅ — `acpx openclaw sessions new` creates authenticated sessions.

**When to use the ACPX bridge:**
- Persistent context across many commands
- When you want a persistent agent session without a dedicated backend
- CLI-based workflows that benefit from session continuity

**When NOT needed:**
- Single tasks handled well by Forge
- Straightforward implementations that don't need session persistence

---

## Studio — Design Review

**Role:** Visual QA, WCAG accessibility, UI/UX critique.

**Tools:** `web_search`, `web_fetch`, `image`, sessions

**When to involve Studio:**
- Any UI, frontend, or visual design work
- Screenshot or mockup review
- Accessibility audit (Studio applies WCAG AA checklist)

**Studio + Sentinel:** Studio reviews the design, Sentinel reviews Studio's output for gaps and overreach. The split is non-redundant.

---

## Scout — Research

**Role:** Web research, verification, fact finding.

**Tools:** `web_search`, `web_fetch`, sessions — read-only posture

**When to involve Scout:**
- Technical research before implementation
- Competitive analysis
- Documentation hunting
- Verifying facts before making architectural decisions

---

## What Is NOT Part of This Lane

| Excluded | Reason |
|---|---|
| OpenAI Codex backend | Requires API key — not wanted |
| Copilot Proxy | Requires additional setup, not needed |
| Google provider | No specific need that MiniMax doesn't meet |
| Qwen paid tier | OAuth friction too high for automation |
| Local Ollama coding models | Not installed, VRAM not confirmed for large models |
| Deepgram / media providers | No voice/media workflow currently |

---

## Cost Guardrails

- MiniMax is the only paid provider — known, controlled cost
- No API key = no surprise billing
- Ollama local models are free but require VRAM and model downloads
- Before adding any new provider: must answer what free option was considered first

---

## Canonical Workflow

### Simple task
```
1. Nero scopes the task
2. Forge implements
3. Forge self-reviews or asks Sentinel for a quick check
4. Nero approves
```

### Multi-step or approval-gated task
```
1. Nero scopes the task
2. Forge implements
3. Lobster pipeline runs approval gate
4. Sentinel reviews
5. Nero approves
```

### Design + code task
```
1. Nero scopes
2. Studio reviews the visual/design spec
3. Sentinel reviews Studio's output for gaps
4. Forge implements
5. Sentinel reviews implementation
6. Nero approves
```

### Research-heavy task
```
1. Scout researches and verifies
2. Scout reports findings
3. Nero decides
4. Forge implements if coding needed
```

---

## Files Referenced

| File | Purpose |
|---|---|
| `~/.openclaw/workspace/forge/SOUL.md` | Forge persona |
| `~/.openclaw/workspace/sentinel/SOUL.md` | Sentinel persona |
| `~/.openclaw/workspace/studio/SOUL.md` | Studio persona |
| `~/.openclaw/workspace/skills/code-review/SKILL.md` | Sentinel's code review rubric |
| `~/.openclaw/workspace/skills/a11y-review/SKILL.md` | Studio/Sentinel WCAG checklist |
| `~/.openclaw/workspace/END_TO_END_CODING_LANE_PROOF.md` | Last coding lane proof |

---

## Validation Commands

```bash
openclaw config validate --json
openclaw health --json
openclaw agents list --bindings --json
openclaw models status --json
openclaw models status --probe
openclaw plugins list
openclaw security audit
```

---

## Recommendation

The no-OpenAI lane is already strong. MiniMax M2.7 is the workhorse. Forge, Sentinel, Studio, Scout, and Lobster form a complete capability set.

**The single best improvement available without spending money:**
Install a local Ollama coding model (e.g., `qwen2.5-coder:7b`) if VRAM allows on this MSI machine. That would give a free, local, zero-API-key coding assistant lane for Sentinel to use during reviews, or as a secondary Forge helper.

Until then: the native MiniMax + Forge + Sentinel + Lobster lane is fully functional and does not need an OpenAI key to be effective.

---

_This is the canonical no-OpenAI coding lane. Update when provider or tooling changes._
