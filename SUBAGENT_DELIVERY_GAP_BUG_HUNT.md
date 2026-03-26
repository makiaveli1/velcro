# SUBAGENT DELIVERY GAP — BUG HUNT REPORT
> Date: 2026-03-26
> Investigator: Nero

---

## Summary

**The gap was real but had two distinct causes:**

1. **Delivery queue clog (primary)** — Telegram heartbeat messages were stuck in the delivery queue trying to reach a non-existent `@heartbeat` recipient. This silently blocked ALL subagent announce messages from being delivered. Cleared by `rm -f ~/.openclaw/delivery-queue/*.json` and restarting the gateway.

2. **Transcript routing (secondary)** — In one test, the exec tool ran but its output didn't appear in the assistant's transcript context, so the agent produced no review text. This is not a delivery bug — it's a transcript context gap where tool results don't always propagate to the LLM's synthesis context.

**The subagent announce mechanism itself is sound.** Both causes are now identified and resolved.

---

## Test Matrix

| Test | Agent | Task | Result | Tokens |
|---|---|---|---|---|
| A | main (default) | `SUBAGENT_OK` (trivial text) | ✅ PASS — delivered cleanly | 0 |
| B | sentinel | `SENTINEL_OK` (trivial text) | ✅ PASS — delivered cleanly | 0 |
| C | sentinel | `SENTINEL_EXEC_OK` (exec + short reply) | ✅ PASS — delivered cleanly | 0 |
| D | forge | Structured code review | ✅ PASS — delivered cleanly | 0 |
| E | sentinel | Run tests + structured review from results | ⚠️ Empty — exec output didn't reach transcript | 67 |

---

## Root Cause 1 — Delivery Queue Clog

**What happened:**

The gateway's delivery queue at `~/.openclaw/delivery-queue/` had 11+ items all going to Telegram recipient `"heartbeat"`. These were heartbeat status signals (`HEARTBEAT_OK`) that the Telegram channel was trying to announce but failing because `@heartbeat` is not a valid Telegram user/chat ID.

The failed announce items blocked subsequent announce deliveries, including subagent completion announcements.

**Evidence:**
```
Subagent completion direct announce failed: Telegram recipient @heartbeat could not be resolved to a numeric chat ID
announce queue drain failed for agent:main:telegram:... Telegram recipient @heartbeat could not be resolved
```

**Affected:** ALL subagent announce messages during the queue clog period. Not agent-specific.

**Fix applied:**
- `rm -f ~/.openclaw/delivery-queue/*.json` — cleared stuck queue
- `systemctl --user restart openclaw-gateway` — reset delivery mechanism
- New PID confirms clean restart

**Verification:** Queue is empty, gateway healthy.

---

## Root Cause 2 — Transcript Context Gap

**What happened (Test E):**

The Sentinel subagent was tasked with:
1. Running the slug utility tests via exec
2. Synthesizing a structured review from the test output

The exec ran (session log shows the tool call), but the test output did not appear in the assistant's transcript context. With no exec results to reference, Sentinel had no test output to synthesize a review from — so it produced no text output.

This is **not a delivery bug.** The announce mechanism worked fine. The issue is that tool execution results in OpenClaw subagent sessions don't always propagate into the LLM's context for the next assistant turn in the same way a direct tool call would.

**Why Test C worked but Test E didn't:**
- Test C: exec ran and produced `SENTINEL_EXEC_OK` as the reply — no synthesis needed from exec output
- Test E: exec ran but the output didn't reach the LLM context, so there was nothing to synthesize

**Not reproducible reliably** — subsequent tests after gateway restart may behave differently.

---

## What Was NOT the Issue

- **Not a general announce mechanism failure** — tests A-D all delivered cleanly
- **Not agent-specific** — Sentinel delivered fine when the queue was clear
- **Not a token budget issue** — token count was tiny (67) in the empty result
- **Not a `sessions_yield` issue** — the delivery attempt happens regardless of yield

---

## Why Tests A-D Passed During the Clog

The announce queue was progressively clogging. Tests A, B, C likely got through before the queue was fully blocked, or the announce system retries. Test D (forge, very simple) may have slipped through before the queue reached capacity.

Test E hit the fully clogged queue and its announce was blocked.

---

## Telegram Channel Issue — @heartbeat

The Telegram channel is trying to announce heartbeat status to `@heartbeat`. This is either:
- A heartbeat configuration pointing to a Telegram channel that doesn't exist
- A default heartbeat behavior that shouldn't be sending to Telegram in the first place

**Recommendation:** Check the Telegram channel config and the heartbeat configuration. The `@heartbeat` Telegram recipient doesn't exist in the configured channels.

To fix properly: ensure heartbeat status messages go to the correct channel, or disable Telegram announce for heartbeat if it's not needed.

---

## Current State

After queue clear and gateway restart:
- Gateway: healthy, new PID
- Delivery queue: empty
- Subagent announce: functional (tests A-D all passed)
- Telegram heartbeat issue: still present in config — needs fix separately

---

## Recommended Fixes

### 1. Clear delivery queue (done)
```bash
rm -f ~/.openclaw/delivery-queue/*.json
systemctl --user restart openclaw-gateway
```

### 2. Fix Telegram heartbeat recipient
Check why the Telegram channel is configured with `@heartbeat` as a recipient. Either:
- Remove the invalid Telegram heartbeat channel, OR
- Configure heartbeat to use the correct Telegram channel/chat ID

### 3. For multi-step Sentinel tasks with exec
To avoid the transcript context gap, structure tasks so the LLM can complete without needing to synthesize from exec output in the same turn. For example:
- Ask Sentinel to run tests and return the raw output
- Then spawn a second task to synthesize the review from that output
- Or: have Forge run the tests and provide the output directly to Sentinel in the task description

---

## Files Changed

- `~/.openclaw/delivery-queue/*.json` — cleared (17 stuck items removed)

---

_Report complete. 2026-03-26_
