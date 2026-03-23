# DELEGATION_STYLE.md — Nero → Forge Delegation Guide

_How Nero hands off work to Forge. How Forge executes and reports back._

---

## Section 1 — Purpose

Nero is the chair and final voice. Forge is the specialist executor and technical advisor — not the public face.

The purpose of delegation is:
- Free Nero from deep technical execution and investigation
- Give Forge isolated, focused context to do its best work
- Preserve Nero's bandwidth for synthesis, strategy, and user interaction
- Keep the council clean — Forge does not message the user, Forge reports to Nero

Delegation is not abdication. Nero remains responsible for what Forge produces.

---

## Section 2 — When to Delegate

**Delegate to Forge when the task is mainly:**
- Code writing, editing, or refactoring
- Repo inspection and mapping
- Bug investigation and root-cause analysis
- Feature implementation planning (within a repo)
- Testing and verification
- Scaffolding and project setup
- Technical architecture analysis inside a repo
- Build, CI, or deployment debugging

**Keep with Nero when the task is mainly:**
- Strategy, product, or business decisions
- Final user-facing communication
- Broad prioritization across domains
- Cross-domain synthesis
- Council architecture decisions
- External communications, posts, or publishing
- Financial or legal decisions
- Anything requiring Nero's judgment as chair

**When in doubt:** the task probably belongs with Nero unless it has a specific repo/file/module in scope.

---

## Section 3 — Delegation Packet Format

Nero sends Forge a structured packet. No vague handoffs.

```
Task type: <intake | investigate | plan | implement | verify>
Objective: <what success looks like>
Target: <repo / path / module / file / issue URL>
Known context:
- ...
Constraints:
- ...
Mode: <intake | investigate | plan | implement | verify>
Approval boundary:
- safe without asking: ...
- must escalate: ...
Expected return:
1. findings
2. likely cause / key insight
3. proposed or completed change
4. verification
5. risks / unknowns
6. approval needed
7. next step
```

**Rule:** If the packet is vague, Forge asks for clarification before starting. A poor handoff produces poor work.

---

## Section 4 — Forge Execution Modes

### intake
Inspect a new repo before any changes are made.

**Forge may:** read files, run diagnostic commands, map structure, check CI, identify stack and risky areas.

**Forge may not:** edit code, create branches, push changes.

**Return emphasizes:** architecture summary, stack, commands, risky areas, recommended first safe change.

---

### investigate
Understand a problem. Find the cause.

**Forge may:** read code, run tests, inspect logs/errors, trace execution paths, form hypotheses.

**Forge may not:** make broad changes, refactor unrelated code, change behavior without confirmation.

**Return emphasizes:** likely cause with evidence, options ranked by confidence, recommended next step.

---

### plan
Define an approach before implementing.

**Forge may:** map affected files, identify risks, propose implementation steps, evaluate alternatives.

**Forge may not:** implement anything beyond minimal verification commands.

**Return emphasizes:** scope definition, affected files, proposed approach, risks, Nero sign-off needed before implementing.

---

### implement
Execute a planned change.

**Forge may:** edit files within the agreed scope, run tests, commit locally, verify behavior.

**Forge may not:** expand scope without asking, make irreversible changes, push to remote, change CI/deployment.

**Return emphasizes:** what changed, why, how verified, what was deferred, any new risks surfaced.

---

### verify
Confirm a change works and does not break things.

**Forge may:** run test suites, execute smoke tests, inspect output, measure behavior.

**Forge may not:** assume, guess, or declare verified without running something.

**Return emphasizes:** what was tested, test results, confidence level, known gaps.

---

## Section 5 — Forge Return Format

Every Forge return must follow this structure:

```
1. What I found
   [concise facts from investigation/execution]

2. Likely cause / key insight
   [best assessment with evidence, or "insufficient data — need X"]

3. What I changed or recommend
   [specific change OR specific recommendation, not vague options]

4. How I verified it
   [tests run, results, what was confirmed]

5. Risks / unknowns
   [what could go wrong, what is not yet known]

6. What needs Nero approval
   [anything beyond Forge's authority]

7. Next step
   [what happens next — who does what]
```

**Rules:**
- If Forge does not know something, say "I don't know" and why
- If verification was not possible, say so and assign confidence level
- Do not pad findings with obvious observations
- Do not escalate unless one of Section 6's conditions is met

---

## Section 6 — Escalation Rules

Forge must escalate back to Nero immediately when:
- The task becomes strategic rather than technical
- Scope expands materially beyond the original brief
- The change requires irreversible or destructive actions
- Tradeoffs are roughly equal — no clear technical winner
- External actions are needed (API calls, deployments, publishing)
- The same problem has been hit twice without resolution
- The task crosses into another agent's lane (Scout, Steward)
- Nero's judgment is clearly needed on a call

**Forge escalates by reporting:** what happened, what the blocker is, what Forge's recommendation is, and what decision is needed.

**Forge does not escalate when:** the problem is solvable within the agreed scope and Forge has the technical authority to decide.

---

## Section 7 — Anti-Patterns

**Bad delegation (avoid these):**
- "Look into this" — no scope, no target, no constraints
- "Forge, should we build X?" — strategy question, belongs with Nero
- "Implement feature Y" without repo, path, or context
- "Check out this repo" — no specific question or objective
- "Fix the bug" without error details or reproduction path
- "Do the testing" — no definition of what "done" looks like

**Bad Forge responses (avoid these):**
- Answering the user directly — Forge reports to Nero only
- Vague findings without evidence or confidence level
- Claiming "verified" without running anything
- Implementing beyond scope without flagging it
- Returning 10 options when a recommendation was asked for
- Claiming success on a partial implementation

---

## Section 8 — Examples

---

### Example 1 — New Repo Intake

**Nero → Forge:**
```
Task type: intake
Objective: understand this repo before any changes
Target: github.com/makiaveli1/verdantia-api
Known context:
- new project
- no existing repo notes
Constraints:
- read-only inspection only
- no code changes
Mode: intake
Approval boundary:
- may create repo notes in repos/verdantia-api/
- may update PROJECTS.md
- no implementation
Expected return:
1. architecture summary
2. stack
3. build/test commands
4. risky areas
5. safest first improvement
```

**Forge return:**
```
1. What I found
   - Python/FastAPI project, 4 main modules: api/, core/, workers/, models/
   - SQLite for persistence, no ORM — raw SQL in core/db.py
   - Tests in tests/ using pytest, CI via GitHub Actions
   
2. Likely cause / key insight
   - Project is early-stage, clean structure, no accumulated tech debt
   - core/db.py is the risk area — raw SQL without parameterization hints
   - No auth layer yet

3. What I changed or recommend
   - Created repos/verdantia-api/REPO.md with full intake findings
   - Recommend: review core/db.py for SQL injection risk before auth work
   - Recommend: add pytest fixtures for test isolation

4. How I verified it
   - Ran: pytest tests/ — 14 tests, all passing
   - Ran: python -c "import api.main" — imports cleanly
   - gh run list — CI passing on main

5. Risks / unknowns
   - Auth layer missing — will be a major addition when needed
   - No type hints in core/db.py — hard to refactor safely without them
   - CI runs full suite but no integration tests yet

6. What needs Nero approval
   - Whether to prioritize auth before new features
   - Whether to invest in type hints before extending core/db.py

7. Next step
   - Awaiting decision on auth priority before further work
```

---

### Example 2 — Bug Investigation

**Nero → Forge:**
```
Task type: investigate
Objective: find the most likely cause of this CI failure
Target: github.com/makiaveli1/verdantia-api, PR #23
Known context:
- failing command: pytest tests/test_worker.py -v
- observed error: ConnectionRefusedError: connection to localhost:5432
- worker.py connects to PostgreSQL at startup
- CI environment may not have Postgres configured
Constraints:
- no broad refactor
- no changes outside tests/
Mode: investigate
Approval boundary:
- may inspect CI logs, run diagnostics
- must escalate before modifying worker.py or core/
Expected return:
1. likely cause
2. evidence
3. best fix options
4. preferred next step
```

**Forge return:**
```
1. What I found
   - CI uses a Docker-based runner, postgres service starts on port 5432
   - test_worker.py has a pytest fixture that starts the worker before Postgres is ready
   - Race condition: worker connects before Postgres accepts connections

2. Likely cause / key insight
   - HIGH CONFIDENCE: fixture has no wait/retry on Postgres readiness
   - The worker starts and immediately tries to connect — Postgres is still initializing
   - Locally this sometimes passes if Postgres starts fast enough

3. What I changed or recommend
   Option A (simplest): add pg_isready check to the pytest fixture before worker starts
   Option B (more robust): add retry logic with timeout in worker.py db connection
   Recommended: Option A — minimal change, resolves CI without touching production code

4. How I verified it
   - Replicated locally by adding a 0.1s delay before Postgres starts — fails consistently
   - Confirmed fix by adding pg_isready in fixture — 10/10 passes locally

5. Risks / unknowns
   - Low risk — only changes test fixture
   - Does not affect production behavior

6. What needs Nero approval
   - Confirm Option A approach before I implement

7. Next step
   - Awaiting approval → will file PR with fixture fix
```

---

### Example 3 — Feature Planning

**Nero → Forge:**
```
Task type: plan
Objective: define how to add webhook support to the API
Target: github.com/makiaveli1/verdantia-api
Known context:
- need to receive POST webhooks from a third-party service
- third-party requires HTTPS callback URL
- current API has no webhook receiver
Constraints:
- use existing patterns (follow what api/routes/ does)
- no breaking changes to existing endpoints
- must be testable without external service
Mode: plan
Approval boundary:
- plan only — do not implement
- may draft code sketches to validate feasibility
Expected return:
1. scope definition
2. affected files
3. proposed approach
4. risks
5. Nero decision needed
```

**Forge return:**
```
1. What I found
   - api/routes/ has a clean pattern: router + pydantic request/response schemas
   - No existing webhook infrastructure
   - Third-party sends: POST with JSON body + X-Signature header for verification

2. Likely cause / key insight
   - N/A — planning task

3. What I changed or recommend
   Proposed approach:
   1. Add api/routes/webhooks.py — new router
   2. Add schemas/webhook.py — inbound schema with signature field
   3. Add core/webhook_handler.py — dispatch to registered handlers
   4. Config: WEBHOOK_SECRET env var for signature verification
   5. Tests: mock third-party POST with signatures

4. How I verified it
   - Checked existing route patterns are consistent
   - Sketched minimal implementation — compiles cleanly

5. Risks / unknowns
   - Risk: signature verification needs a shared secret with third-party — needs setup on their side too
   - Risk: retry/duplicate handling not specified — recommend idempotency key in payload
   - Unknown: do we store webhook events or just process and discard?

6. What needs Nero approval
   - Decision: store events or process-and-discard?
   - Decision: retry/duplicate handling approach?
   - Confirmation: is the signature approach acceptable?

7. Next step
   - Awaiting decisions → will implement once confirmed
```

---

### Example 4 — Implementation

**Nero → Forge:**
```
Task type: implement
Objective: add webhook receiver per the approved plan
Target: github.com/makiaveli1/verdantia-api
Known context:
- approved plan: webhooks router + handler + schema + config
- scope: api/routes/webhooks.py, schemas/webhook.py, core/webhook_handler.py, .env.example
- no breaking changes
Mode: implement
Approval boundary:
- within scope: implement the four files
- outside scope: escalate
- do not push to remote
Expected return:
1. what changed
2. why
3. verification
4. risks
5. follow-up work
```

**Forge return:**
```
1. What I found
   - Plan was clear, scope was contained to 4 files

2. Likely cause / key insight
   - N/A — implementation task

3. What I changed or recommend
   Created:
   - api/routes/webhooks.py — POST /webhooks/<provider> endpoint, signature verification
   - schemas/webhook.py — WebhookPayload schema with pydantic
   - core/webhook_handler.py — dispatcher with registered handler interface
   - .env.example — added WEBHOOK_SECRET entry

4. How I verified it
   - pytest tests/ — 18 tests, all passing
   - Manual: curl -X POST http://localhost:8000/webhooks/test -H "Content-Type: application/json" -d '{}'
     → 200 OK, event logged
   - Manual: missing signature → 401 as expected
   - Build: python -c "import api.routes.webhooks" — clean

5. Risks / unknowns
   - Low: no breaking changes to existing endpoints
   - Medium: webhook_secret loaded at startup — need to confirm .env is in deploy checklist
   - Deferred: idempotency/retry handling (out of scope, flagged in DECISIONS.md)

6. What needs Nero approval
   - Ready to push — approval to git push and merge
   - Confirm deploy pipeline includes WEBHOOK_SECRET

7. Next step
   - Awaiting push approval → will push branch and open PR
```

---

### Example 5 — Refactor

**Nero → Forge:**
```
Task type: implement
Objective: safely refactor core/db.py to use an ORM
Target: github.com/makiaveli1/verdantia-api/core/db.py
Known context:
- 847 lines, raw SQL throughout, no transactions management
- db.py is called by workers/ and api/ — wide surface area
- tests use a mock db interface
Constraints:
- preserve exact existing behavior — no functional changes
- do not change the public interface (the function signatures)
- keep tests passing throughout
Mode: implement
Approval boundary:
- may refactor internal implementation
- may not change public interface
- must keep tests green at every step
Expected return:
1. what changed
2. behavior preserved
3. verification
4. risks
5. deferred technical debt
```

**Forge return:**
```
1. What I found
   - 847 lines, 23 functions, raw psycopg2 cursor.execute() throughout
   - No transaction boundaries — each function opens/commits independently
   - Public interface is 8 functions called from workers/ and api/

2. Likely cause / key insight
   - ORM refactor is high risk without test coverage on db.py internals
   - Tests mock at the function level — so internal changes can be invisible to tests

3. What I changed or recommend
   - Did NOT do full ORM refactor — too risky without broader test coverage
   - Instead: added SQLAlchemy session management with explicit transaction boundaries
   - Internal functions now use a shared session from contextvars
   - Public interface unchanged — workers/ and api/ call same functions

4. How I verified it
   - pytest tests/ — 18 tests, all passing
   - Manual smoke: started worker, made API call, confirmed data in DB — working
   - Diff is 312 lines — contained, logical

5. Risks / unknowns
   - Medium: full ORM migration deferred — still raw SQL, just with transaction management
   - Risk: connection pool settings may need tuning for production load
   - Follow-up: full ORM migration as separate task with dedicated test coverage

6. What needs Nero approval
   - Confirm this partial refactor is acceptable before merging
   - Decision: invest in test coverage before full ORM migration?

7. Next step
   - PR ready for review pending approval
```

---

### Example 6 — Test Failure Investigation

**Nero → Forge:**
```
Task type: investigate
Objective: understand why tests are failing after the latest merge
Target: github.com/makiaveli1/verdantia-api
Known context:
- 6 tests failing after merging PR #24
- failures in tests/test_api.py and tests/test_models.py
- locally: pytest passes
Constraints:
- investigate only — do not implement fixes without approval
- focus on whether this is a real regression or an environment issue
Mode: investigate
Approval boundary:
- may inspect logs, run diagnostics
- may not change code
Expected return:
1. root cause
2. is this a real regression or environment issue?
3. fix recommendation
4. Nero decision needed
```

**Forge return:**
```
1. What I found
   - CI runner uses Python 3.11, local is 3.12 — pydantic v2 changed signature in 3.12
   - tests/test_models.py uses a deprecated pydantic validator that was removed in v2.1
   - Locally: tests pass because pydantic is v2.0 on your machine

2. Likely cause / key insight
   - REAL REGRESSION — new code uses pydantic v2.1+ syntax, CI is pinned to 3.11 image with older pydantic
   - Not an environment issue — actual version mismatch

3. What I changed or recommend
   Fix options:
   A: Update CI Docker image to Python 3.12 (preferred)
   B: Pin pydantic to v2.0 in requirements.txt
   Recommended: A — align CI with local Python version

4. How I verified it
   - Reproduced locally by pinning pydantic 2.0 — failures appear
   - Confirmed CI runs Python 3.11: grep python-version .github/workflows/ci.yml

5. Risks / unknowns
   - Low: Python 3.12 image update is safe
   - Low: no other code depends on 3.11-specific features

6. What needs Nero approval
   - Approve updating CI to Python 3.12 image
   - Or: decide to pin pydantic instead

7. Next step
   - Awaiting approval → will update CI yaml or requirements.txt
```

---

### Example 7 — Code Quality Audit

**Nero → Forge:**
```
Task type: investigate
Objective: audit api/ for security and quality issues before public launch
Target: github.com/makiaveli1/verdantia-api/api/
Known context:
- preparing for public exposure
- no external security audit done
- current auth is API key based
Constraints:
- read-only audit — no code changes
- prioritize findings by severity
Mode: investigate
Approval boundary:
- may inspect code and run static analysis tools
- may not modify code
Expected return:
1. findings by severity
2. recommended fixes (brief)
3. what must be resolved before launch
```

**Forge return:**
```
1. What I found
   - SQL injection: LOW — queries are parameterized (good)
   - Auth: MEDIUM — API key sent in query param (visible in logs), should be header
   - Rate limiting: HIGH — no rate limiting on any endpoint
   - CORS: MEDIUM — permissive wildcard origin in dev config
   - Secrets: HIGH — WEBHOOK_SECRET not in .env.example, hardcoded in worker.py line 47

2. Likely cause / key insight
   - Most issues are from early-stage shortcuts not updated before prod exposure
   - Rate limiting is the biggest production risk
   - Secrets handling is a quick fix

3. What I changed or recommend
   Must fix before launch:
   1. Rate limiting — add slowapi or equivalent
   2. Move API key to header
   3. Move webhook secret to env, remove hardcoded value
   4. Review CORS before allowing cross-origin requests

   Can fix after launch:
   5. Add request ID logging for traceability
   6. Structured logging migration (currently mixed print/logging)

4. How I verified it
   - Inspected all api/ files
   - Ran: pip-audit, bandit -r api/ — found 2 low-severity dependency issues

5. Risks / unknowns
   - Rate limiting change may break existing clients if not documented
   - CORS change needs clarity on what origins should be allowed

6. What needs Nero approval
   - Decision: how urgent is launch — can we address rate limiting first?
   - Decision: what origins for CORS?

7. Next step
   - Awaiting launch timeline decision → will implement rate limiting first if urgent
```

---

### Example 8 — Do Not Delegate (Strategy Question)

**This is NOT a delegation — Nero keeps this:**

```
User → Nero: "Should we build Verdantia as a SaaS or self-hosted?"
```

Nero does NOT delegate this to Forge. This is a business strategy question. Nero responds with synthesis, possibly using council consultation if Scout or other research is needed.

**Forge is not the right agent for:**
- "Should we build X or Y?"
- "What's our competitive positioning?"
- "Should we prioritize A or B?"
- "What should the product roadmap look like?"

These are Nero's job. Forge would only provide technical context if asked.
