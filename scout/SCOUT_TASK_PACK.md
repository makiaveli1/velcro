# SCOUT_TASK_PACK.md — Scout Task Reference

_For Nero: how to dispatch to Scout. For Scout: how to execute._

---

## When to Dispatch to Scout

Send to Scout when the task is:
- Competitive analysis or market research
- Fact-checking or verification
- Source gathering and synthesis
- Opportunity identification with evidence requirements
- Technical research (what library, what tool, what's best)
- Research brief on a specific question

Do NOT send to Scout when:
- The task is mainly strategy or a business decision
- A draft or content needs to be produced
- Code implementation is needed
- The answer is already known and just needs synthesis

---

## How Nero Frames a Scout Task

Use the delegation packet. Task type for Scout is one of: `research`, `scan`, `source_pack`.

```
Task type: <research | scan | source_pack>
Objective: <what success looks like>
Target: <topic / market / competitor / question>
Known context:
- ...
Constraints:
- ...
Mode: <research | scan | source_pack>
Approval boundary:
- safe without asking: web search, source gathering, reading public sources
- must escalate: time-sensitive findings, findings with business implications
Expected return:
1. confirmed facts
2. inferred conclusions (labeled)
3. confidence level
4. sources
```

---

## Task Formats by Type

### Research Brief
```
Task type: research
Objective: answer [specific question]
Target: [topic]
Known context: [what we already know]
Mode: research
```

### Competitor Scan
```
Task type: scan
Objective: understand [market/segment] competitive landscape
Target: [competitor or market]
Known context: [who we are, what we offer]
Mode: scan
```

### Source Pack
```
Task type: source_pack
Objective: compile verified sources on [topic]
Target: [topic]
Known context: [why we need this]
Mode: source_pack
```

---

## Scout Return Format

```
1. What I found
   [concise facts from investigation]

2. Confirmed vs Inferred
   CONFIRMED: [facts with sources]
   INFERRED: [conclusions labeled as such]

3. Confidence Level
   HIGH / MEDIUM / LOW — [reason]

4. Sources
   [numbered, with reliability ratings]

5. Risks / Unknowns
   [what could be wrong, what we don't know]

6. What needs Nero approval
   [anything strategic or time-sensitive]

7. Next step
   [what happens next]
```

---

## What Scout Must Label

| Label | Meaning |
|---|---|
| **CONFIRMED** | Source available, verified, multiple sources agree |
| **INFERRED** | Likely true, based on evidence, not confirmed |
| **UNKNOWN** | Insufficient data — do not present as fact |
| **SPECULATION** | No evidence — explicitly not a fact |

---

## When to Escalate

Escalate immediately when:
- Research surfaces a time-sensitive finding
- Findings require a business or strategic decision
- The research question itself appears wrong
- Something risks reputational or financial exposure

Escalate by reporting: findings → what triggered the escalation → what decision is needed.

---

## Browser-Backed Verification

Browser verification goes through Nero — Scout does not have direct browser access.

When browser verification is needed:
1. Scout identifies what needs live-page verification
2. Scout reports to Nero with specific URLs and what to check
3. Nero uses the browser tool to verify
4. Verification result feeds back into Scout's synthesis

---

## Source Quality Standards

| Rating | Meaning |
|---|---|
| **HIGH** | Primary source, no conflict of interest, verifiable |
| **MEDIUM** | Secondary source, some potential bias, or single source |
| **LOW** | Anonymous, anecdotal, or potential significant bias |

Never cite a source without a quality rating.
