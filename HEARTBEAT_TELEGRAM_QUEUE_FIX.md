# HEARTBEAT TELEGRAM QUEUE FIX
> Date: 2026-03-26
> Issue: Heartbeat delivering to Telegram with invalid @heartbeat recipient, clogging delivery queue

---

## What Was Wrong

**Root cause:** Main agent heartbeat was configured to deliver via Telegram channel:
```json
"heartbeat": {
  "every": "30m",
  "deliver": { "mode": "announce", "channel": "telegram" }
}
```

The Telegram channel had no valid `announceTo` recipient configured. When the heartbeat fired every 30 minutes, it tried to announce to a Telegram recipient named `@heartbeat` — which doesn't exist as a user or chat ID on this Telegram bot. The announce failed, got stuck in the delivery queue, and the retry loop clogged the queue with 11+ failed Telegram heartbeat items.

This silently blocked ALL subagent completion announcements from being delivered — because the delivery queue was full of retrying heartbeat messages.

---

## What I Changed

**Changed main agent heartbeat delivery channel from `telegram` to `webchat`:**

```json
"heartbeat": {
  "every": "30m",
  "deliver": {
    "mode": "announce",
    "channel": "webchat"
  }
}
```

**Why webchat:** The webchat channel is the active working channel for this session. Heartbeat status messages deliver locally to the main webchat session, where the user can see them. No external delivery, no recipient resolution needed.

---

## Why This Fixes the Delivery Queue Issue

The Telegram channel's `deliver.mode` was already set to `"failover"` — meaning it only activates when webchat fails. Since webchat is working, Telegram should never be the delivery target for heartbeat.

However, the heartbeat was explicitly configured with `channel: "telegram"` which overrode the failover logic and forced Telegram delivery regardless. Changing it to `channel: "webchat"` routes heartbeat through the working path and prevents the invalid `@heartbeat` recipient from ever being used.

---

## Verification

| Check | Result |
|---|---|
| Gateway restart | ✅ New PID, healthy |
| Delivery queue | ✅ Empty (was 11+ items) |
| Config validates | ✅ `valid: true` |
| Telegram @heartbeat errors in log | ✅ None after restart |
| Heartbeat fires cleanly | ✅ `HEARTBEAT_OK` logged cleanly |

---

## Why This Happened

The heartbeat `deliver.channel` was set to `"telegram"` at some point — likely during testing or initial Telegram setup — but the Telegram channel was never fully configured with a valid `announceTo` recipient. The channel's `failover` mode was supposed to prevent this, but explicit `channel:` override in the heartbeat config bypassed the failover logic.

---

## Files Changed

- `~/.openclaw/openclaw.json` — main agent heartbeat `deliver.channel` changed from `"telegram"` to `"webchat"`

---

_Issue resolved. 2026-03-26_
