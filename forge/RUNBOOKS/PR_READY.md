# PR_READY.md — PR Quality Checklist

_Use this before reporting a coding task complete to Nero._

---

## Before You Report Done

Apply this checklist. If something is not ready, say so explicitly — do not gloss over it.

---

## Review What Changed

```bash
# What files changed?
git diff --stat

# What is the diff?
git diff

# Does the diff make sense for the goal?
```

If the diff is larger than expected, pause. Did scope creep? Did the change grow beyond the original brief? Note this.

---

## Risk Assessment

Mark each risk area as: **LOW / MEDIUM / HIGH / UNKNOWN**

- **Behavioral change?** If behavior changed from before, is that intentional and justified?
- **Dependency added?** New package means new maintenance surface.
- **API surface changed?** More surface = more things that can break.
- **Test coverage?** Are the new/changed paths covered?
- **Documentation updated?** If behavior changed, docs must match.

---

## Implementation Summary

For Nero to relay or for PR description:

1. **What changed** — one sentence
2. **Why it changed** — the problem it solves or the improvement it makes
3. **How** — the approach taken (especially if non-obvious)

---

## Test Status

Mark each clearly:

- **Tests added/updated:** Yes / No / Not applicable
- **Tests run:** Yes / No
- **Tests passing:** Yes / No / Some failing (list which)
- **Manual smoke test:** Yes / No / Not applicable

If tests are missing or failing, say so explicitly. Do not say "tests pass" if you didn't run them.

---

## Follow-up Work

List anything that:
- Was deferred or out of scope
- Needs a separate task
- Is a known limitation of this change
- Should be addressed in future

---

## PR Description Template

```
## What
[one sentence]

## Why
[the problem or improvement]

## How
[approach + any non-obvious decisions]

## Risks
[risk area: level — mitigation or acceptance]

## Tests
[what was run, what passed/failed]

## Follow-up
[deferred work, if any]
```

---

## When Not to Mark PR Ready

- Tests are failing
- You are not confident behavior is preserved
- The change is significantly larger than the original brief
- There are known bugs introduced by the change that are not yet fixed
- CI is not green and you haven't investigated why

In these cases: report the status honestly and what needs to happen before it's ready.
