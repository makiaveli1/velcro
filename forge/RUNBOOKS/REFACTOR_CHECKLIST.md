# REFACTOR_CHECKLIST.md — Refactoring Runbook

_For any non-trivial refactor. Preserve behavior first._

---

## Core Principle

**If it works, the refactor is only successful if behavior is preserved.** A refactor that changes behavior is a rewrite, not a refactor, and needs a different process.

---

## Before Starting

1. Do you understand what the code does? (If not, read it until you do)
2. Is there a test? (If not, adding tests before the refactor is part of the refactor)
3. What behavior must not change? (function signature, return value, side effects, performance characteristics)

---

## Checklist

### 1. Capture the current state

```bash
# Note the current behavior
gh run list --repo <owner/repo> --limit 3 --json status,conclusion

# Run the test suite and record baseline
<test command> 2>&1 | tee /tmp/refactor-baseline.log
```

### 2. Identify what you're refactoring and why

Write it down:
- What is the problem with the current code?
- What will the refactored code look like?
- Why is the new form better?

If the answer is "it will look cleaner" without a concrete benefit, reconsider whether the refactor is necessary.

### 3. Identify coupling and risks

- What depends on this code?
- What will break if you change the interface?
- Is there hidden state that could be affected?
- Are there side effects that must be preserved?

### 4. Plan the steps

Break the refactor into small, verifiable steps:
1. Step A — rename/move/extract
2. Step B — change internal structure
3. Step C — verify behavior

Do not do all changes at once. One step at a time, verify between each.

### 5. Prefer small, coherent steps

- Extract before modifying
- Rename before restructuring
- Move before changing logic
- If a refactor cannot be done in small steps, escalate to Nero

### 6. Run verification after each change

After each meaningful change:
```bash
<test command>
```

If tests fail after a small change, you know exactly what broke. If you make many changes before testing, you have to undo several things to find the culprit.

### 7. Do not mix behavior change with refactor

If the current code has a bug, note it, fix it in a separate step, and record the fix in `repos/<repo>/DECISIONS.md`. The refactor itself should not fix bugs — it should preserve existing behavior.

### 8. Record tradeoffs

In `repos/<repo>/DECISIONS.md`:
- What you changed
- Why (concrete benefit)
- What alternatives you considered
- Any technical debt you deferred

---

## Red Flags — Stop and Escalate

- Refactor touches code you don't fully understand → read more first
- Refactor requires changing >10 files with complex interdependencies → escalate
- Refactor changes behavior without a clear decision that it should → stop, re-evaluate
- You cannot verify behavior after the refactor → do not proceed without a way to verify

---

## What to Report to Nero

After refactor:
1. What changed
2. What behavior was preserved
3. What tests ran
4. Any technical debt deferred
5. Any new risks introduced
