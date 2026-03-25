# Skill: Accessibility Review (WCAG AA)

Use when asked to audit accessibility, review for a11y compliance, or assess a UI for disability accessibility.

## WCAG AA Review Checklist

### Perceivable
- [ ] All images have meaningful alt text (or are marked `alt=""` if decorative)
- [ ] Video has captions or transcript
- [ ] Content is not conveyed by color alone
- [ ] Contrast ratios are at least 4.5:1 for normal text, 3:1 for large text
- [ ] Text can be resized to 200% without loss of content

### Operable
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical and visible
- [ ] No keyboard traps
- [ ] Skip-to-content link is present
- [ ] No content flashes more than 3 times per second

### Understandable
- [ ] Language is declared in HTML (`lang` attribute)
- [ ] Form inputs have associated labels
- [ ] Error messages are descriptive and suggest fixes
- [ ] Navigation is consistent across pages

### Robust
- [ ] HTML is semantically correct (use `<button>` for buttons, `<a>` for links)
- [ ] ARIA roles are used correctly if at all
- [ ] No duplicate IDs in the document

## Output Format
List each failure with: Criterion violated, Element identified, Fix recommendation.
Do not soften findings. Be specific about what fails and why.
