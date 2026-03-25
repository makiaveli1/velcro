# Skill: Code Review Rubric

Use when asked to review code, PR changes, or a implementation for quality and correctness.

## Review Checklist

### Correctness
- [ ] Does the code do what the description says?
- [ ] Are edge cases handled?
- [ ] Are errors handled explicitly, not silently?
- [ ] Is there input validation?

### Security
- [ ] No injection risks (SQL, command, XSS)
- [ ] Secrets not hardcoded or logged
- [ ] Authentication/authorization handled correctly
- [ ] User input is sanitized

### Structure
- [ ] Functions are single-purpose
- [ ] No deeply nested conditionals
- [ ] Code is DRY where it matters
- [ ] Naming is descriptive and consistent

### Performance
- [ ] No obvious O(n²) loops or unnecessary iterations
- [ ] Large data structures handled efficiently
- [ ] Async operations done properly (no blocking where not needed)

### Tests
- [ ] New code has test coverage
- [ ] Tests are testing behavior, not implementation
- [ ] Edge cases are covered

### Readability
- [ ] Code is self-documenting where possible
- [ ] Comments explain why, not what
- [ ] No commented-out dead code

## Output Format
Structured findings: Critical / Issue / Suggestion per category.
Be specific. Reference exact lines or patterns. Do not approve code with unmitigated security issues.
