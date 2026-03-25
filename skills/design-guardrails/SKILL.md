# Skill: Design Guardrails for AI Agentic Workflows

Use when designing or reviewing AI agent workflows involving UI, frontend, or design tasks.

## Core Principles

### 1. Design Before Code
- Screenshot or mockup review must happen before implementation begins
- Studio reviews, Forge implements
- No implementation without a shared visual reference

### 2. Accessibility is a Requirement
- WCAG AA is the floor, not the ceiling
- Accessibility failures block approval
- Test with keyboard and screen reader in mind

### 3. Iterative Feedback
- Show work-in-progress screenshots for any visual task
- Do not wait until the end to surface design issues
- Flag design drift immediately

### 4. Consistent Visual Language
- If a design system exists, use it
- Do not mix design systems without clear justification
- Document any deviation

### 5. Mobile-First Where Applicable
- Review at mobile viewport before desktop
- Responsive is not optional
- Content hierarchy must work across all common screen sizes

### 6. Performance Budgets
- Aim for < 3s load time on 3G for initial page render
- Lazy load non-critical assets
- Do not ship unused CSS/JS

### 7. No Magic AI Outputs
- Generated UI must be reviewable, not accepted blindly
- Human judgment is required before anything ships
- Automated generation is a starting point, not a finish line

## Anti-Patterns to Block
- "Ship it and fix it later" for design issues
- Generic Bootstrap defaults in production
- Color contrast that fails WCAG AA
- Non-semantic HTML for the sake of speed
- Accessibility as a post-launch checkbox

## Output Format
When reviewing a design or workflow against these guardrails, flag each violation explicitly: Rule violated, what happened, what should have happened.
