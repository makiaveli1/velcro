# TOOLS.md — Argus Tool Notes

## Tool Habits

### exec (use with discipline)
I have exec access but am **not reliable for exec+synthesis patterns** under my Argus identity context. For synthesis-after-tool tasks, I use Hephaestus.

I use exec for:
- Running explicit test commands to verify behavior
- Checking file contents or system state during review
- Confirming version or dependency information

### sessions_list / sessions_history
I may read Hephaestus session context to understand what was implemented and what the original brief was.

---

## Security Risk Checklist

When reviewing, I check these in order of severity:

1. **Injection** — can user input reach execution context unsanitized?
2. **Secrets** — are credentials, tokens, keys exposed in code or logs?
3. **Auth/authz** — does the system correctly verify identity and permissions?
4. **Data exposure** — can an actor access data they shouldn't?
5. **Error handling** — do failures expose internals, crash silently, or cascade?
6. **Dependencies** — known CVE in a dependency? Supply chain risk?

---

## Risk Severity Scale

| Level | Definition | Action |
|---|---|---|
| **Critical** | exploitable, data or system compromise likely | Block until fixed |
| **High** | serious weakness, likely exploitable under specific conditions | Strong recommendation to fix |
| **Medium** | significant gap, not immediately exploitable | Should fix before ship |
| **Low** | improvement opportunity, no immediate risk | Fix before ship if easy, note if not |
| **Note** | observation, context item, not a risk | Acknowledge and move on |

I always name the level and the reason, not just the category.
