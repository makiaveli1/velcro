# Skill: Lane Routing Rubric

Use when unsure which agent should handle a task, or when a task spans multiple lanes.

---

## The One Rule

**Forge executes. Sentinel reviews. Studio critiques. Scout verifies. Mercury drafts. Nero decides.**

---

## Decision Table

Ask: **What is the primary nature of this task?**

| Primary nature | Go to |
|---|---|
| Writing code, implementing, refactoring, debugging, testing | **Forge** |
| Reviewing code, checking correctness, finding risks, security audit | **Sentinel** (after Forge produces) |
| UI/UX critique, screenshot review, accessibility check | **Studio** |
| Web research, fact-finding, verification, evidence gathering | **Scout** |
| Business writing, outreach drafts, offers, monetization | **Mercury** |
| Deciding which lane, orchestrating multi-agent work, approving | **Nero** |

---

## exec + Synthesis

If a task needs tool output to feed into the final answer → **Forge**, not Sentinel.

Sentinel has exec access but is unreliable for exec+synthesis under its identity context. Forge is the default.

---

## Workflow Shapes

**Simple coding task:** Forge → Sentinel → Nero  
**Multi-step with approvals:** Forge → Lobster → Sentinel → Nero  
**Design + code:** Studio specs → Forge builds → Sentinel reviews → Nero approves  
**Research + decision:** Scout → Nero decides → Forge implements  

---

## What Not to Do

- Do not route exec-first work to Sentinel
- Do not route Studio into coding/implementation
- Do not route Sentinel as first-pass reviewer
- Do not route Scout into coding or business decisions
- Do not change MiniMax model routing without strong reason

---

## When in Doubt

Default to: **Forge** for anything technical. **Nero** for anything strategic or ambiguous.

If a task has mixed nature, lead with the lane that matches the **primary** goal and route outputs from there.
