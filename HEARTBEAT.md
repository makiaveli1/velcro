# HEARTBEAT.md — Periodic Checks

_Run these on heartbeat polls. Don't spam. Don't be useless._

---

## What to Check

### Email (if connected)
- Any urgent unread messages?
- Don't check every heartbeat — track last check time in `memory/heartbeat-state.json`

### Calendar (if connected)
- Anything coming up in the next 24–48 hours?
- If yes and it's soon, proactive heads-up is good

### OpenClaw Health
- Is the gateway still running? (`openclaw gateway status`)
- Any failed jobs or obvious issues in recent logs?

### Workspace Git
- Any uncommitted changes worth committing?
- Don't commit noise — only meaningful work

### Memory Maintenance (every few days)
- Review recent `memory/YYYY-MM-DD.md` files
- Distill notable stuff into `MEMORY.md`
- Prune outdated MEMORY.md entries

---

## When to Stay Quiet

- Late night / early morning (respect quiet hours)
- Likwid is clearly in the middle of something
- Nothing new since last check
- Checked less than 30 minutes ago

---

## When to Speak Up

- Something broke and needs attention
- Calendar event in <2 hours
- Interesting finding that saves time or adds value
- It's been >8 hours since I last said anything useful

---

## State Tracking

Track what I've checked and when in `memory/heartbeat-state.json`:

```json
{
  "lastChecks": {
    "email": null,
    "calendar": null,
    "openclaw": null,
    "git": null
  }
}
```

If nothing needs attention: `HEARTBEAT_OK`
If something needs attention: actual message.

---

_Keep this light. Token burn is real._
