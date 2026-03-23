# BUG_HUNT.md — Bug Investigation Runbook

_When a bug is reported, do this. In order._

---

## Golden Rule

**Reproduce first.** If you cannot reproduce the bug, you cannot verify the fix. Do not skip this step.

---

## Step-by-Step

### 1. Get the bug description

- What is the expected behavior?
- What is the actual behavior?
- How to reproduce it?
- Error messages, logs, screenshots
- When did it start? (recent change, or always broken?)

If the report is vague, ask clarifying questions before diving in. Do not guess.

### 2. Reproduce the bug

Set up a clean environment if needed and reproduce exactly:

```bash
# Clone if needed
git clone <repo>
cd <repo>

# Install dependencies exactly as documented
<install command>

# Run the failing scenario
<command that triggers the bug>
```

Capture the exact error output. Save it.

### 3. Narrow the scope

Is the bug in:
- The code you just changed?
- An older part of the codebase?
- A dependency?
- An environmental issue (missing env var, wrong version)?

```bash
# Check recent changes to the relevant code
git log --oneline -10 -- <affected-file>

# Check if the bug was introduced in a recent commit
git bisect start
git bisect bad <last-known-good>
git bisect good <last-known-bad>
```

### 4. Read the error carefully

- What does the error say?
- What line does it point to?
- Is the error in application code or a dependency?
- Is it a crash, a wrong output, or a silent failure?

### 5. Trace the execution

Follow the code path from entry point to failure point. Ask:
- What function does the bug live in?
- What does it receive vs. what does it expect?
- What side effects does it have?

### 6. Form a hypothesis

Before changing anything: what do you think is wrong?

Write it down. This prevents scope creep and keeps the fix focused.

### 7. Compare likely fixes

For each candidate fix:
- What does it change?
- What are the tradeoffs?
- How much code does it touch?
- Could it break anything else?

Choose the smallest fix that resolves the bug. Do not refactor surrounding code unless the bug requires it.

### 8. Implement and verify

```bash
# Apply the fix
<edit files>

# Run the reproduction scenario again
<command that triggers the bug>

# Confirm the bug is gone
```

### 9. Run the test suite

```bash
<test command>
```

If tests were already passing, make sure they still pass. If tests were already failing, note that explicitly.

### 10. Record what you found

In `repos/<repo>/KNOWN_ISSUES.md`:
- The bug and its symptoms
- What caused it
- What fixed it
- Any follow-up work needed

In `repos/<repo>/DECISIONS.md` if the fix revealed a structural issue:
- Why the bug existed
- What decision led to it
- What would prevent it in future

---

## When to Escalate

Escalate to Nero when:
- The bug is in a dependency and cannot be fixed without a version bump or workaround
- The fix requires a significant architectural change beyond the reported scope
- The bug is actually a symptom of a different, larger problem
- You have spent more than 2 focused sessions without a clear path to a fix
- The fix requires a business/product decision (e.g., changing expected behavior)

Do not escalate just because the fix is hard. Escalate when the task has moved beyond a coding problem.

---

## What to Report to Nero

After fixing:
1. What the bug was
2. What caused it
3. What the fix was
4. What you tested to confirm it
5. Any follow-up work or risk areas
