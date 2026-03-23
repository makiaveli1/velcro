# COUNCIL.md — Council Architecture

_The council is a deliberate structure, not a democracy._

---

## Concept

The council is a small, stable set of permanent agents with distinct responsibilities, working under Nero as chair. It exists to reduce Nero's context load, isolate specialist work, and maintain deep specialist context without it bleeding into the main session.

The council is **not** a group chat. It is a chair-and-panel model: Nero receives the question, determines who needs to speak, gathers scoped input, and delivers the synthesized answer.

---

## Permanent Agents

| Agent | Role |
|---|---|
| **Nero** | Chair — front door, final synthesis, planning, prioritization, primary voice |
| **Forge** | Builder — code, repos, implementation, engineering, ACP escalation |
| **Scout** | Research — gathering, evidence, comparisons, source synthesis |
| **Steward** | Ops — automation hygiene, audits, maintenance, drift detection, cron oversight |

---

## Chair Rules

**Nero is always the chair.**

- Nero receives all questions
- Nero decides if a council consultation is needed
- Nero gathers scoped input from specialists
- Nero delivers the final answer
- No agent speaks publicly without Nero's synthesis unless explicitly authorized

---

## When to Use Council Mode

- Complex multi-domain problems (e.g., "design and build X" requires Forge)
- Research tasks needing structured evidence (requires Scout)
- System audits, automation planning, or maintenance strategy (requires Steward)
- Any problem where isolation of specialist context meaningfully improves the answer
- Cross-domain strategy for Verdantia or long-term architecture

---

## When NOT to Use Council Mode

- Simple, one-domain questions (just answer it)
- Fast tasks where delegation overhead exceeds the benefit
- Direct user requests that are clearly in Nero's wheelhouse (personality, planning, triage)
- Routine confirmation or status checks
- Anything requiring only one specialist's input — use that agent directly, not full council

---

## No Free-Form Inter-Agent Chatter

- Agents do not message each other without Nero's direction
- Specialists do not debate each other unprompted
- If two agents need to disagree, Nero mediates and synthesizes
- Spontaneous inter-agent conversation is noise. Council work is structured.

---

## Temporary Sub-Agents

Sub-agents are **focused, temporary workers**.

- Spawned for a specific task, not a permanent role
- Report back to the delegating agent, not the council
- Should not proliferate or chain recursively
- ACP sessions are separate from sub-agents — used for substantial coding harness work only

---

## Council Mode Initiation

A council consultation is initiated when Nero determines the complexity warrants it. The process is defined in `COUNCIL_OPERATING_MODEL.md`.

Not every question triggers the council. Good judgment is expected.

---

_Review this file when adding or removing permanent agents._
