# IMPLEMENTATION_PLAN.md — Feature/Change Planning Runbook

_When given a feature or change to implement, do this before broad edits._

---

## Why Plan First

Jumping into multi-file changes without a plan produces chaotic diffs, missed dependencies, and bugs. A 5-minute plan saves 30 minutes of rework.

---

## Step-by-Step

### 1. Understand the goal

What are we actually trying to accomplish? What is the user/caller expecting?

Repeat it back in your own words. If it's unclear, ask for clarification before proceeding.

### 2. Define scope precisely

What is in scope? What is explicitly out of scope?

Write it down. This prevents creeping scope.

### 3. Map the affected area

What files/modules does this change touch?

```bash
# Find relevant files
find . -type f -name "*.py" -o -name "*.js" -o -name "*.ts" | xargs grep -l "<keyword>" 2>/dev/null

# Check who else touches the modules you're considering
git log --oneline -5 -- <file1> <file2>
```

### 4. Identify risks

Ask:
- Does this change an interface or contract? (API, CLI, data format)
- Does it touch concurrency or async code?
- Does it change behavior that other code depends on?
- Does it add a new dependency?
- Does it change deployment or environment requirements?

For each risk, decide: accept, mitigate, or defer to Nero.

### 5. Identify verification mechanisms BEFORE implementing

**This step is not optional for medium or larger tasks.**

For each planned change, identify the command or method you will use to verify it works — before you write any code. This is the Nyquist discipline: every task needs a feedback signal.

Ask per task:
- What command proves this works?
- What command proves this doesn't break existing behavior?
- If no test infrastructure exists, what is the manual verification?

```
Verification mapping:
- [ ] task: X → verify with: `npm test -- --grep "X"`
- [ ] task: Y → verify with: manual curl to endpoint
- [ ] task: Z → no automated test → flag as gap, manual verify required
```

Plans without identified verification for non-trivial tasks will be returned for refinement.

### 6. Propose implementation approach

Before touching code, write out:
1. Which file(s) to change first
2. What the change does in each file
3. What the expected output/behavior is after each change
4. What could break and how to verify it

Example format:
```
File: src/auth.py
Change: Add token validation before processing
Risk: Low — pure addition, no existing behavior change
Verification: existing auth tests should still pass

File: src/api.py
Change: Expose new validated parameter in endpoint
Risk: Medium — adds to API surface, needs test
Verification: endpoint test with new param
```

### 7. Get Nero's sign-off on large changes

If the change is >3 files or affects multiple modules, show Nero the plan before implementing. Say:
- What you're changing
- Why
- What could go wrong

### 8. Implement

Implement one coherent step at a time. Do not make 5 unrelated changes at once.

### 9. Verify after each step

After each file/module change:
- Run the relevant tests
- Run a manual smoke test if no tests exist
- Confirm the change behaves as expected

### 10. Final verification

After all changes:
- Run the full test suite
- Check that CI still passes
- Confirm the implementation matches the original goal

### 11. Record

In `repos/<repo>/DECISIONS.md`:
- What you changed and why
- Alternatives considered and rejected
- Any follow-up work needed

---

## What Stays Small

A task is small if:
- One file, one logical change
- No new dependencies
- No interface changes
- No behavioral changes beyond the stated feature

For small tasks: plan mentally, implement, verify, report.

## What Needs a Formal Plan

A task needs a written plan if:
- >3 files affected
- Cross-module changes
- New dependencies or configuration
- Changes to build, test, or deployment
- Any change to CI configuration

Show the plan to Nero before executing on large tasks.
