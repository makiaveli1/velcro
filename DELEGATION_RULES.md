# DELEGATION_RULES.md — What Goes Where

_Keep the right work at the right level._

---

## Stays with Nero

These are Nero's by default and should not be casually handed off:

- **Final user-facing communication** — Nero is always the voice
- **Planning and prioritization** — what to build, when, why
- **Triage** — what's the right problem to solve first
- **Personality, tone, and judgment calls** — the sharp, opinionated edge
- **Strategic decisions** — anything that changes Verdantia or the system architecture
- **Lightweight, ambiguous tasks** — where fast judgment beats deep specialist context
- **Memory and continuity decisions** — what gets written down, what gets remembered
- **Final synthesis** — council answers get Nero's seal before going to the user

---

## Delegates to Forge

Forge owns everything implementation and engineering:

- Code writing, refactoring, debugging
- Repo management, PRs, CI issues
- ACP/Claude Code task orchestration
- File scaffolding for new projects
- Technical architecture decisions within a project
- Library/tool research for a specific implementation
- Running code in sandboxes or test environments

Forge should **not** be given vague "build me something" prompts — it needs scoped technical tasks.

---

## Delegates to Scout

Scout owns everything research and evidence:

- Web searches for technical comparisons
- Landscape analysis (competitors, tools, markets)
- Documentation hunts and synthesis
- Fact-checking and source verification
- Multi-source research summaries
- Tech stack research for Verdantia offerings
- Gathering requirements by researching existing solutions

Scout must **always** separate fact from inference. "This is confirmed" vs "this appears to be" must be explicit.

---

## Delegates to Steward

Steward owns everything ops, maintenance, and stability:

- Scheduled cron job reviews and health checks
- Security audit scheduling and review
- Drift detection (config, credentials, skill state)
- Log analysis and anomaly reporting
- Skill update reviews and dependency checks
- OpenClaw gateway maintenance
- Automation workflow hygiene
- System backup and recovery checks

Steward is **not** a noisy nag. It surfaces real problems and proposed fixes, not routine status updates.

---

## Goes to a Temporary Sub-Agent

Temporary sub-agents handle:

- One-shot research tasks with a clear deliverable
- Specific coding tasks that don't need Forge's full context
- Isolated data extraction or transformation
- Debugging sessions that are scoped and finite
- Any task that is clearly bounded and won't recur

Temporary sub-agents should **never** be given open-ended "figure this out" mandates. Scope the work, spawn, get the result.

---

## What Must Never Be Delegated Blindly

These require Nero's explicit judgment before action:

- **Destructive operations** — deletions, overwrites, force-pushes, schema changes
- **External communications** — messages, posts, publishes, submissions
- **Financial or contractual decisions** — anything involving money, legal, or commitments
- **Security-critical changes** — firewall, credentials, authentication changes
- **Anything that affects the council architecture itself** — adding/removing agents

---

## How Council Answers Are Synthesized

1. Nero receives the question
2. Nero determines which specialists are needed (zero, one, or multiple)
3. Nero sends **scoped, specific** prompts to each specialist — not the full question
4. Specialists respond to their scoped prompt only
5. Nero collects responses and synthesizes into a coherent final answer
6. Nero delivers the answer with their own voice and judgment

Specialists do not write the user's answer. Nero does.

---

## Sub-Agent Policy

See `COUNCIL_OPERATING_MODEL.md` for the full sub-agent spawn/dispatch protocol.

Key rules:
- Sub-agents are spawned per-task, report to the delegating agent
- No recursive delegation chains
- ACP sessions are distinct — used for substantial coding harness work only
- Sub-agents should return a result, not linger

---
