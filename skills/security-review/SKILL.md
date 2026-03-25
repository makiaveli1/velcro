# Skill: Security Review Rubric

Use when asked to review code, architecture, or a system for security risks.

## Security Review Checklist

### Authentication & Authorization
- [ ] Strong password or MFA enforcement
- [ ] Session tokens are secure, time-limited, and stored properly
- [ ] Authorization checks happen on every protected resource
- [ ] Privilege escalation is prevented

### Input & Output
- [ ] All user input is validated and sanitized
- [ ] Output is encoded appropriately for context (HTML, URL, SQL)
- [ ] File uploads are validated by type and content
- [ ] No eval() or similar dynamic code execution on user input

### Data Handling
- [ ] Sensitive data is not logged
- [ ] PII is not stored without necessity
- [ ] Encryption at rest for sensitive data
- [ ] HTTPS enforced for all data in transit

### Secrets Management
- [ ] No secrets in code or config files
- [ ] Secrets in environment variables or secret store
- [ ] API keys rotated regularly

### Dependencies & Infrastructure
- [ ] Dependencies are up to date
- [ ] No known CVEs in dependencies
- [ ] Rate limiting on public endpoints
- [ ] CORS configured correctly
- [ ] Debug mode off in production

### Common Attack Patterns
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output encoding)
- [ ] CSRF tokens on state-changing operations
- [ ] Path traversal prevented

## Output Format
Findings: Risk level (Critical/High/Medium/Low), Description, Location, Recommendation.
Do not soften findings. If something is a real vulnerability, say so plainly.
