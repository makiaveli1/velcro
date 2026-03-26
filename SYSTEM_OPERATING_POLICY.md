# SYSTEM_OPERATING_POLICY
> Canonical reference for proven operating truths. This is the easiest place to look when there is doubt.
> Created: 2026-03-26

---

## Core Routing Rule

**Hephaestus executes. Argus reviews. Ariadne critiques. Orion verifies. Hermes drafts. Nero decides.**

---

## Agent Role Table

| Agent | First call for | Not the first call for |
|---|---|---|
| **Nero** | Lane selection, orchestration, approvals, business context | — |
| **Hephaestus** (Forge) | Code writing, implementation, refactoring, testing, exec + synthesis, tool-output work | Review, QA, design critique |
| **Argus** (Sentinel) | Code review, QA, regression, security risk, merge-readiness (second-pass after Hephaestus) | Exec-first tasks, exec+synthesis, first-pass coding |
| **Ariadne** (Studio) | UI/UX critique, screenshot review, WCAG accessibility audit | Coding, implementation, first-pass review |
| **Orion** (Scout) | Web research, fact verification, competitive analysis, evidence gathering | Coding, approvals, business decisions |
| **Hermes** (Mercury) | Business drafts, outreach, offers, monetization experiments | Coding, technical review |

---

## Quick Decision Examples

| Situation | Lane |
|---|---|
| Run tests and interpret results | **Hephaestus** |
| Review a PR or patch for correctness | **Argus** (after Hephaestus produces) |
| Critique a UI screenshot | **Ariadne** |
| Verify a claim on the web | **Orion** |
| Draft a cold outreach email | **Hermes** |
| Decide whether to implement or change direction | **Nero** |
| Multi-step task with approval gates | **Hephaestus → Lobster → Argus → Nero** |
| Design + code task | **Ariadne specs → Hephaestus builds → Argus reviews → Nero approves** |
| Research + decision | **Orion → Nero decides → Hephaestus implements** |

---

## Model Routing

- **Global production text:** `minimax/MiniMax-M2.7` — Nero/main/session default
- **Image:** `minimax/MiniMax-VL-01` — production default, do not change without strong reason
- **Hephaestus (Forge) primary:** `openai-codex/gpt-5.4` — Codex OAuth (likwidtv@gmail.com), premium coding lane
- **Hephaestus (Forge) fallback:** `minimax/MiniMax-M2.7` — automatic, verified working (fallback confirmed 2026-03-26)
- Do not change MiniMax global default without strong reason
- OpenAI Codex is an **additive Forge-only lane**, not a global replacement

---

## Exec + Synthesis Rule

**Use Hephaestus, not Argus.**

Argus has exec access but is not reliable for synthesis-after-tool patterns under its identity context. Hephaestus is the default lane for any task where tool output must feed into a final answer.

---

## No-OpenAI Rule

The system is fully capable without OpenAI. MiniMax is the global production baseline.
- **Hephaestus (Forge)-specific addition:** `openai-codex/gpt-5.4` is now available as Hephaestus's primary model (Codex OAuth, likwidtv@gmail.com)
- Hephaestus fallback to `minimax/MiniMax-M2.7` is automatic and verified
- `codex-acp` and `pi-acp` ACP backends need their own credentials — optional, not structural
- Lobster is real, installed, and usable for bounded approval-gated workflows
- `acpx openclaw` bridge is valid and useful

---

## Queue Hygiene Rule

Heartbeat delivers to **webchat**, not Telegram.
- Telegram announce path is broken (tried to reach non-existent `@heartbeat`)
- A clogged delivery queue silently blocks unrelated subagent announcements
- Queue hygiene is an operational concern, not admin fluff

---

## Dangerous Skill Rule

`openclaw-github-assistant` is deleted and must not be reinstalled.
- It had credential harvesting patterns (env var access + network send in same function)
- Inspect third-party skills with `skill-vetter` before enabling

---

## Upgrade / Backup Rule

Before major upgrades or risky config changes:
1. Snapshot config to `~/.openclaw/backups/`
2. Run `openclaw config validate --json`
3. Verify model routing after changes
4. Check gateway health

Known-good state docs and backups are part of the architecture.

---

## Security Baseline

- Gateway: local-only (`127.0.0.1`), token auth enabled, rate limiting active
- Control UI: restricted to localhost origins
- Browser: isolated `openclaw` profile for autonomous operation
- No casual permission broadening
- No external exposure without reviewing auth first

---

## Hooks

| Hook | Behavior | Notes |
|---|---|---|
| `session-memory` | Saves session context to memory on `/new` or `/reset` | **Real runtime behavior** — restarted sessions retain prior context. Treat as an operational truth. |

---

## External Skills — Capability vs Authority

External skills extend **capability**, not **authority**. Installed skills do not grant:
- New routing rights beyond the agent's defined lane
- Review authority that Argus hasn't already been granted
- Final decision authority
- First-pass execution rights for specialist agents

Skills can add methods and workflows. The agent's defined role boundaries remain unchanged.

---

## Related Documents

| Document | What it covers |
|---|---|
| `SYSTEM_OPERATING_POLICY.md` | **This file** — canonical one-page policy reference |
| `SOUL.md` (Nero) | Nero's full persona and operating principles |
| `forge/SOUL.md` | Hephaestus's lane position and execution discipline |
| `sentinel/SOUL.md` | Argus's review discipline and exec constraint |
| `studio/SOUL.md` | Ariadne's design critique lane |
| `KNOWN_GOOD_OPENCLAW_STATE.md` | Runtime snapshot, recovery steps, validation commands |
| `NO_OPENAI_CODING_LANE.md` | Full coding lane documentation |
| `EXEC_OUTPUT_CONTEXT_GAP_BUG_REPORT.md` | Sentinel exec+synthesis bug findings |
| `HEARTBEAT_TELEGRAM_QUEUE_FIX.md` | Delivery queue clog root cause and fix |

---

_Maintain this file when proven operating rules change. It is the easiest place to look._
