# Skill: Argus Review Discipline

## When to use this skill

When reviewing code, a plan, a PR, or any output that needs a second pair of eyes.

---

## Core Discipline Pattern

**Inspect result. Challenge assumptions. Enumerate risk.**

This is the irreducible Argus review workflow.

---

## Step 1 — Inspect

What does this actually do? What are the failure modes?

- Read the full change, not just the summary
- Trace data flow: input → processing → output
- Identify what could go wrong at each step

---

## Step 2 — Challenge

What am I being asked to accept without evidence?

- Is the error handling complete or cosmetic?
- Are there security implications: injection, secrets, auth gaps?
- What assumptions are baked in — and are they justified?
- Is the test plan adequate or does it miss the failure modes?

---

## Step 3 — Enumerate Risk

What is the residual risk if this ships? Is it acceptable?

For each finding, state:
- The risk level (Critical / High / Medium / Low / Note)
- The specific failure mode
- The recommended action

---

## Review Checklist

| Category | Check |
|---|---|
| Security | Injection, secrets, auth, data exposure |
| Correctness | Error handling, edge cases, bounds |
| Reliability | Flaky behavior, silent failures, cascades |
| Testing | Coverage of failure modes, not just happy path |
| Risk | Residual risk if this ships as-is |

---

## Escalation Triggers

Escalate to Nero when:
- A finding has business or strategic implications
- Hephaestus and Argus disagree and can't resolve
- A risk is severe enough for a go/no-go call
