# TEST_AND_VERIFY.md — Validation Runbook

_Use this after any change to confirm it actually works._

---

## Core Principle

**"Works" is not an opinion. It is a verified state.** If you didn't test it, it is not verified.

---

## Step 1 — Determine What to Test

Ask: what is the minimum set of things that must be true for this change to be considered correct?

1. The code runs without errors
2. The specific behavior the change was meant to produce works
3. Existing tests still pass
4. No new obvious regressions

---

## Step 2 — Run Existing Tests

```bash
# Run the relevant test suite
<test command>
```

If tests exist and are passing → good.  
If tests exist and are failing → investigate. Did your change break something?  
If no tests exist → proceed to manual verification.

---

## Step 3 — Manual Smoke Test

If no automated tests exist for the changed path:

```bash
# Run the command or function
<command that exercises the change>

# Check output
echo "Exit code: $?"   # 0 = success (usually)
```

Document what you tested manually and what the result was. Be specific.

---

## Step 4 — No Tests Is Not a Pass

**The absence of tests is not a pass.** It is a known gap.

If the changed code has no test coverage, you must:
1. Note this explicitly
2. Either add tests or explain why the manual verification is sufficient for this change
3. Flag the lack of tests as a follow-up item

---

## Step 5 — Confidence Level

After verification, assign a confidence level:

| Level | Meaning |
|---|---|
| **High** | Tests exist and pass; manual smoke test confirms; behavior is as expected |
| **Medium** | Tests exist and pass; manual verification done; some edge cases not covered |
| **Low** | No tests; only manual smoke test; significant uncertainty remains |
| **None** | Could not verify; blocked or inconclusive |

Report the confidence level to Nero. Do not overstate it.

---

## Step 6 — When Verification Fails

If something fails:
1. Read the error carefully
2. Identify the specific cause
3. Fix it (this loops back to bug fix if needed)
4. Re-verify

Do not report a change as verified if the verification failed.

---

## Step 7 — Report What You Verified

Tell Nero:
1. What you tested
2. What the result was
3. Confidence level
4. Any gaps (e.g., "no automated tests for this path")

---

## Useful Test Patterns

```bash
# Python
pytest -v 2>&1 | tail -20

# Node/JS
npm test 2>&1 | tail -30
npm run build 2>&1

# Go
go test ./... 2>&1
go build ./... 2>&1

# Bash/shell script
bash -n <script>   # syntax check only
./script.sh 2>&1   # run and check output
```

---

## What to Record in Repo Memory

After a significant change, if you found or fixed something worth remembering:

In `repos/<repo>/KNOWN_ISSUES.md`:
- Any test gaps you noticed
- Any manual verification you had to do

In `repos/<repo>/DECISIONS.md`:
- Any testing approach decisions worth recording
