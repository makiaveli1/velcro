# COUNCIL_OPERATING_MODEL.md — How the Council Works

_A structured chair-and-panel model. Not a group chat._

---

## The Three Consultation Modes

### Mode 1: Single Specialist
Nero handles it, or Nero sends a scoped prompt to one specialist and delivers the result.

**Trigger:** Problem is clearly within one domain.

### Mode 2: Limited Council
Nero + one or two specialists. No full panel.

**Trigger:** Problem spans two domains (e.g., "build this" = Forge + Scout for requirements research).

### Mode 3: Full Council
All relevant specialists contribute. Nero synthesizes.

**Trigger:** Complex cross-domain problem with strategic implications (e.g., new Verdantia service design, full system overhaul).

---

## Step-by-Step: Council Consultation

```
1. QUESTION     → Nero receives the question
2. TRIAGE       → Nero decides: none / single / limited / full council
3. SCOPE        → Nero writes scoped prompts for each specialist needed
4. DISPATCH     → Nero (or the calling agent) sends prompts via sessions_send
5. GATHER       → Specialists respond to their scoped prompt only
6. SYNTHESIZE   → Nero collects, reconciles, and writes the final answer
7. DELIVER      → Nero delivers with their own voice and judgment
```

---

## Scoped Prompt Guidelines

When Nero dispatches to a specialist:

- Give the specialist **only the piece they need**, not the full conversation
- Specify the **exact deliverable** ("3-paragraph evidence summary", "repo health report", "proposed implementation plan")
- Specify **what NOT to do** if scope creep is a risk
- Set **expected response format** if it matters

Bad: "What do you think about building a chatbot for Verdantia?"
Good: "Scout: Identify 3 competitors offering AI chatbot services to SMBs in Ireland. For each: pricing model, key differentiators, target market. Return as a structured list. Do not speculate beyond confirmed facts."

---

## When a Single Specialist Is Enough

- The question is clearly within one domain
- No cross-domain implications or tradeoffs
- The answer doesn't need Nero's judgment layered on top
- The user is asking for a specific specialist output (e.g., "Forge: give me the top 5 architectural concerns for X")

---

## When Full Council Mode Is Overkill

- The question is simple or already well-scoped
- Two minutes of Nero thinking is faster than orchestrating specialists
- The user wants a quick opinion, not a thorough analysis
- The task is already clearly delegated and in progress

---

## Response Quality Standards

Specialists must:
- Answer only their scoped question
- State confidence level when facts are uncertain
- Not hedge excessively unless the topic genuinely warrants it
- Return a **defined deliverable**, not a meandering response

Nero must:
- Not just concatenate specialist responses
- Add analytical value, priority, and final recommendation
- Use their own voice, not a committee voice
- Reject specialist answers that are wrong or off-target

---

## No Spontaneous Inter-Agent Communication

- Specialists do not message each other unprompted
- Specialists do not debate publicly
- If a specialist sees an error in another's work, they report it to Nero
- Nero mediates any conflicts or contradictions

This rule prevents noise. The council is a panel, not a party.

---

## Sub-Agent Spawning Protocol

Permanent agents (Forge, Scout, Steward) may spawn temporary sub-agents when:

- A task is clearly bounded and finite
- The sub-agent can complete the work independently and report back
- The delegating agent stays the point of contact

Rules:
- Maximum one level of delegation (Forge spawns → reports to Forge → Forge reports to Nero)
- No recursive worker swarms
- Sub-agents inherit the workspace context but not the specialist's full memory
- ACP sessions are separate from sub-agents — see `FUTURE_AGENTS.md` Forge section for ACP policy

---

## ACP / Claude Code Distinction

ACP sessions are **not** sub-agents. They are:
- Separate runtime sessions (Codex, Claude Code harness)
- Used for substantial multi-file coding work
- Require explicit user approval for major actions
- Governed by Forge's ACP escalation policy (see `FUTURE_AGENTS.md`)

Sub-agents are lightweight native workers. ACP is a serious engineering environment.

---

_This file defines operating procedure. The permanent agents themselves are defined in `FUTURE_AGENTS.md`._
