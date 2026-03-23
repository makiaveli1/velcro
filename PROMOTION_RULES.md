# PROMOTION_RULES.md — When to Make a Role Permanent

_The default is to stay a temporary worker. Permanence must be earned._

---

## The Five Justification Tests

A role should only be promoted from temporary sub-agent to permanent agent if it passes **all five**:

1. **Separate memory/workspace needed** — specialist context must survive sessions without bleeding into or from other agents
2. **Separate tool/sandbox policy needed** — the role requires different tool access or security boundaries than Nero
3. **Separate channel/binding needed** — the role must communicate on a different channel or have its own routing
4. **Long-running specialist context needed** — the role accumulates knowledge that matters across sessions (e.g., a codebase, a project state)
5. **Clearly different operational style needed** — the role's tone, speed, and decision-making differ fundamentally from Nero's

If a role fails any of the five, it stays a temporary sub-agent.

---

## Triggers for Forge

**Create Forge when two or more of these are true:**

- You are regularly delegating code implementation, refactors, or repo work
- You want specialist deep context on a codebase that Nero shouldn't hold in the main session
- You plan to use ACP/Claude Code for substantial engineering tasks
- The current pattern is "Nero drafts, sub-agent executes" as a recurring loop
- Code quality, testing, and architectural decisions need a dedicated home

**Do NOT create Forge when:**
- You just want a second opinion on code occasionally
- A temporary sub-agent handles the volume fine
- You haven't identified a specific codebase or project context Forge would own

---

## Triggers for Scout

**Create Scout when two or more of these are true:**

- You are regularly doing research that requires session-long context (comparisons, landscape analysis, documentation hunts)
- You find yourself re-researching the same topics because research context doesn't persist
- Evidence quality matters — you need Scout to separate fact from inference rigorously
- You want a dedicated agent for Verdantia competitive research, tech landscape, or market analysis
- The current pattern is "Nero spends half the session just gathering sources"

**Do NOT create Scout when:**
- Research tasks are mostly one-shot lookups
- You primarily use web search directly and just need the answer
- No ongoing research project demands persistent context

---

## Triggers for Steward

**Create Steward when two or more of these are true:**

- You are relying on cron jobs, scheduled automations, or health checks that need active monitoring
- Drift detection (config drift, credential drift, setup drift) is a real ongoing concern
- You want automated audits running on a schedule without Nero having to trigger them
- Maintenance tasks (log review, skill updates, dependency checks) are eating into Nero's productive time
- Security audit and health check are running so often they deserve their own context

**Do NOT create Steward when:**
- Your automation setup is simple and doesn't need active monitoring
- You prefer to trigger audits manually
- No cron-driven or schedule-driven maintenance is in place yet

---

## Reasons NOT to Create Agents Too Early

- Every permanent agent is a **context maintenance burden**
- Early agents accumulate stale or unused context
- premature specialization fragments understanding of the system
- it is far easier to promote a useful pattern than to demote an unused agent
- the workspace should feel powerful, not cluttered with agents doing nothing

---

## Demotion Policy

If a permanent agent has not been meaningfully used in 30 days, it should be:
1. Reviewed for utility
2. Either reactivated with a clear purpose or archived

Agents are tools. Dormant tools take up space.

---

_Review triggers annually or after any major system change._
