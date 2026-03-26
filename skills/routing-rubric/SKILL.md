# Skill: Lane Routing Rubric

Use when unsure which agent should handle a task, or when a task spans multiple lanes.

---

## The One Rule

**Hephaestus executes. Argus reviews. Ariadne critiques. Orion verifies. Hermes drafts. Nero decides.**

---

## Decision Table

Ask: **What is the primary nature of this task?**

| Primary nature | Go to |
|---|---|
| Writing code, implementing, refactoring, debugging, testing | **Hephaestus** (Forge) |
| Reviewing code, checking correctness, finding risks, security audit | **Argus** (Sentinel) (after Hephaestus produces) |
| UI/UX critique, screenshot review, accessibility check | **Ariadne** (Studio) |
| Web research, fact-finding, verification, evidence gathering | **Orion** (Scout) |
| Business writing, outreach drafts, offers, monetization | **Hermes** (Mercury) |
| Deciding which lane, orchestrating multi-agent work, approving | **Nero** |

---

## exec + Synthesis

If a task needs tool output to feed into the final answer → **Hephaestus**, not Argus.

Argus has exec access but is unreliable for exec+synthesis under its identity context. Hephaestus is the default.

---

## Workflow Shapes

**Simple coding task:** Hephaestus → Argus → Nero  
**Multi-step with approvals:** Hephaestus → Lobster → Argus → Nero  
**Design + code:** Ariadne specs → Hephaestus builds → Argus reviews → Nero approves  
**Research + decision:** Orion → Nero decides → Hephaestus implements  

---

## What Not to Do

- Do not route exec-first work to Argus
- Do not route Ariadne into coding/implementation
- Do not route Argus as first-pass reviewer
- Do not route Orion into coding or business decisions
- Do not change MiniMax model routing without strong reason

---

## When in Doubt

Default to: **Hephaestus** for anything technical. **Nero** for anything strategic or ambiguous.

If a task has mixed nature, lead with the lane that matches the **primary** goal and route outputs from there.
