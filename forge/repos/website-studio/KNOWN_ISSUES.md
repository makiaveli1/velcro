# website-studio — Known Issues

## Verification / test gaps

- No automated tests were present for the readiness gate changes; verification was manual via `curl` against live endpoints plus `npm run build` for the React UI.
- `CRM/ui/dist/` is tracked, but build output may include unrelated working-tree changes if the repo is already dirty. Review staged files carefully before committing.

## Operational notes

- Expired Graph tokens surface as `authenticated: false`; inspect `tokenInfo` / `mailboxDetail` for the specific blocker code.
