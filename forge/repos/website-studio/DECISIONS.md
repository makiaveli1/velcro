# website-studio — Decisions

## 2026-03-30

- Phase 7 readiness checks use `graph.getStatus()` instead of `graph.getAccessToken()` so mailbox health is read-only and reflects live auth state without triggering token refresh flow.
- System readiness now exposes shared `mailboxDetail`, `policyDetail`, and `tokenInfo` objects so system-status, outbound queue, dashboard, and pipeline stay in sync.
- `outreach-policy.md` is treated as the real policy gate path (`CRM/../outreach-policy.md`).
