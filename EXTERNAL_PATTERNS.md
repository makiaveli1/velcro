# EXTERNAL_PATTERNS.md — External Repo Patterns Worth Knowing

_Reference: useful ideas from inspected external repos, not system changes._

---

## Sources

- **GSD** (`gsd-build/get-shit-done`) — Claude Code meta-prompting + spec-driven system. Inspected 2026-03-25.
- **ECC** (`affaan-m/everything-claude-code`) — Claude Code harness optimization. Inspected 2026-03-25.
- **Autoresearch** (`karpathy/autoresearch`) — autonomous ML training experiment. Inspected 2026-03-25.

All cloned to `/home/likwid/experiments/` as read-only reference. None installed into OpenClaw.

---

## Ideas Worth Knowing

### 1. Validation Before Coding (from GSD — Nyquist Layer)

**What it is:** Map automated test coverage to each requirement *before* writing any code. Plans without identified verification mechanisms are rejected by the plan checker.

**Our version:** Forge's IMPLEMENTATION_PLAN.md now requires this. Per-task verification must be identified before implementation starts.

**Why it matters:** Prevents the common trap of "code works, now figure out how to test it." Forces explicit thinking about feedback signals.

---

### 2. Brownfield Conventions + Concerns Mapping (from GSD)

**What it is:** Before starting work on an existing codebase, map:
- **Conventions:** naming patterns, import ordering, error handling style, file organization
- **Concerns:** where config lives, async complexity, external API calls, auth patterns

**Our version:** Forge's REPO_INTAKE.md now includes Conventions Mapper and Concerns Mapper as explicit steps for existing codebases.

**Why it matters:** Gives Forge the "vibe" of a codebase before making changes. Reduces convention violations and missed cross-cutting concerns.

---

### 3. Plan-Phase Parallel Researcher Pattern (from GSD)

**What it is:** During planning, run 4 researchers in parallel:
- Stack researcher — technology choices, versions, ecosystem
- Features researcher — what the thing actually does
- Architecture researcher — how it's structured
- Pitfalls researcher — what can go wrong

Output feeds into a Planner → Plan Checker loop (up to 3 retries).

**Our version:** Not implemented as a workflow, but Scout's task packs already do multi-perspective research. The discipline of running structured parallel research before planning is worth strengthening in Scout's SOURCE_PACK and RESEARCH_BRIEF.

**Why it matters:** Reduces planning blind spots. Single-threaded research misses things.

---

### 4. Execution Wave Coordination (from GSD)

**What it is:** Partition execution into waves:
- **Wave 1:** Independent tasks, run in parallel with fresh contexts
- **Wave 2:** Tasks depending on Wave 1 output
- **Verifier:** Check final state against phase goals

**Our version:** Mentioned in Forge's IMPLEMENTATION_PLAN.md conceptually. For large builds, Forge should explicitly call out wave structure when there are independent vs. dependent tasks.

---

### 5. Continuous Learning from Sessions (from ECC)

**What it is:** ECC's continuous-learning-v2 observes tool use during sessions, extracts atomic "instincts" (small learned behaviors with confidence scoring), and evolves them into skills/commands/agents over time. Project-scoped instincts prevent cross-project contamination.

**Our version:** We handle this organically through:
- `task-experience-logger` skill
- `memory/YYYY-MM-DD.md` daily files
- Periodic distillation into `MEMORY.md`

**Why it matters:** The discipline exists. The ECC implementation is Claude Code-specific. If we ever want to formalize session learning, the instinct model (trigger + confidence + domain + scope) is a good reference.

---

### 6. Lifecycle Hook Concept (from ECC)

**What it is:** ECC hooks fire on: PreToolUse, PostToolUse, Stop, PreCompact. They automate validation, reminders, formatting, and pattern extraction at specific lifecycle moments.

**Our version:** OpenClaw's event system and cron serve similar triggering purposes, but are not as granular. Not recommending we replicate ECC hooks — the complexity is high and the benefit for our setup is unclear.

**Reference value:** Good mental model for thinking about where to attach automated behavior in an agent workflow.

---

### 7. Autoresearch Loop (from Karpathy)

**What it is:** Fixed time budget (5 min), single file to modify (`train.py`), single metric (`val_bpb`), git branch per run. Loop: edit → run → measure → keep/discard → repeat. No human intervention during loop.

**Our reference value:** The `program.md` concept (programming the program's instructions in markdown) is interesting. The experiment loop discipline (strict scope, single metric, keep/discard decision framework) is a good model for any autonomous experimentation scenario.

**Not relevant to our system:** This is ML training specific. The experiment loop pattern is useful to know for any "run many trials" scenario but has no current application in our agent network.

---

## What We Explicitly Rejected

| Idea | Reason |
|------|--------|
| GSD commands (`/gsd:*`) | Claude Code runtime specific, no OpenClaw equivalent |
| GSD install via npx | Targets wrong runtime directories |
| ECC hooks system | Claude Code internal APIs, would do nothing in OpenClaw |
| ECC npm packages | Harness-specific, would not integrate |
| ECC AgentShield | Built for Claude Code's security model |
| Autoresearch as component | GPU/ML-specific, outside our entire domain |
| GSD `--dangerously-skip-permissions` | Conflicts with our approval boundary model |

---

## Pattern Selection Criteria Used

For all three repos:
- Does it assume a Claude Code, Codex, or similar harness runtime? → rejected
- Does it require GPU or ML-specific infrastructure? → rejected
- Does it modify our approval boundaries or chair-led model? → rejected
- Is the idea independently useful without the surrounding system? → adapted
- Does it strengthen an existing runbook or agent? → adapted

---

_Last updated: 2026-03-25. Additions to come only when a clear, demonstrated value exists._
