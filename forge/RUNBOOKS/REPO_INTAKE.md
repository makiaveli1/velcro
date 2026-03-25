# REPO_INTAKE.md — New Repo Inspection Runbook

_When Forge first touches a repo, do this before changing anything._

---

## Why This Matters

A repo has a history, a shape, and land mines. Going in blind causes chaotic changes, missed test failures, and rework. Read first.

---

## Step-by-Step

### 1. Identify the repo

- What is it?
- Who owns it?
- Is it active or archived?

```
gh repo view <owner/repo> --json name,description,owner,defaultBranchRef,pushedAt,language --jq .
```

### 2. Read the README first

Always. It tells you:
- What the project does
- How to build and run it
- Known setup requirements
- Architecture overview (if good)

### 3. Map the directory structure

```bash
find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git | grep -v __pycache__ | sort
```

Look for:
- `/src`, `/lib`, `/app` — main source
- `/tests`, `/spec`, `/__tests__` — test location
- `/scripts`, `/tools` — automation and scripts
- `/docs`, `/wiki` — documentation
- Config files at root: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`

### 4. Identify the stack

- Language(s) and version(s)
- Framework(s)
- Package manager
- Key dependencies (look at lockfiles)
- Test framework

### 5. Build and test commands

Find these and record verbatim:
- Install dependencies
- Run tests
- Build/compile
- Lint/type-check

```bash
# Common patterns
cat package.json | grep -A 10 '"scripts"'
cat Makefile | grep -E "^[a-z]"
cat pyproject.toml | grep -A 5 "\[tool.pytest"
```

### 6. Architecture notes

Record:
- Entry points (main file, CLI entry)
- Key modules and what they do
- How data flows
- Where shared logic lives

### 7. Map conventions and concerns (brownfield projects)

For existing codebases you will be working in, also map:

**Conventions Mapper** — how is the codebase actually written?
```bash
# Naming patterns
grep -r "^[A-Z]" --include="*.py" . | head -5   # class naming
grep -rn "def " --include="*.py" . | head -10   # function naming

# Import ordering
head -20 <main-file>

# Error handling patterns
grep -rn "except" --include="*.py" . | head -5
```

Record: naming conventions, file organization patterns, error handling style, common abstractions.

**Concerns Mapper** — what are the cross-cutting concerns and fragile areas?
```bash
# Config and environment
grep -rn "os.environ\|getenv\|\.env" --include="*.py" --include="*.js" . | head -10

# Async/concurrency
grep -rn "async\|await\|Promise\|threading" --include="*.py" --include="*.js" . | head -10

# External API calls
grep -rn "requests\|fetch\|axios\|httpx" --include="*.py" --include="*.js" . | head -10

# Auth and permissions
grep -rn "auth\|token\|permission\|jwt\|session" --include="*.py" --include="*.js" . | head -10
```

Record: where config is managed, where async complexity lives, where external dependencies are called, how auth works.

### 8. Identify risky areas

Be suspicious of:
- Code with no tests
- Complex regex or string manipulation
- Concurrency/async code
- Code that touches the filesystem, network, or external APIs
- Code that hasn't been touched in >1 year
- Dependencies with known security advisories

```bash
# Check for old, unmaintained dependencies
npm audit 2>/dev/null || echo "no npm audit"
gh api repos/<owner>/<repo>/dependency-graph/snkb 2>/dev/null | head -50 || echo "no dependency info"
```

### 9. Check CI status

```bash
gh run list --repo <owner/repo> --limit 5 --json status,conclusion,name
```

Are tests passing? What's the CI setup?

### 10. Check open issues and PRs

```bash
gh issue list --repo <owner/repo> --state open --limit 10 --json number,title,labels --jq .
```

Any relevant architectural decisions or known problems in recent issues?

### 11. Record in repo memory

After intake, create:
- `repos/<repo-name>/REPO.md` — filled with steps 1-10
- `repos/<repo-name>/DECISIONS.md` — empty template (fill as decisions emerge)
- `repos/<repo-name>/KNOWN_ISSUES.md` — empty template (fill as issues surface)

---

## Output

After intake, you should be able to answer:
1. What does this repo do?
2. How do I build and test it?
3. What is the directory structure?
4. What are the naming conventions and code organization patterns?
5. Where are the cross-cutting concerns (config, auth, async, external calls)?
6. What are the risky areas?
7. What is the current CI status?

If you cannot answer these after intake, read more before making changes.
