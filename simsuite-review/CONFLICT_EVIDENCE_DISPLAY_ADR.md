# ADR-001: ConflictEvidenceDisplay — Inbox-Only Diagnostic

**Date:** 2026-03-27
**Status:** Accepted
**Deciders:** Nero (orchestration), Design review

---

## Context

The SimSuite Inbox includes mod conflict detection driven by the backend (`specialDecision`, `versionResolution`). A UI component — `ConflictEvidenceDisplay` — was proposed to surface this data to Creator users during inbox triage.

The proposal raised a scope question: should conflict diagnostics be a global, cross-screen feature, or an Inbox-specific read-only layer?

---

## Decision

`ConflictEvidenceDisplay` is implemented as a **read-only Inbox Creator diagnostic only**.

**What it is:**
- A display component showing backend-provided conflict evidence
- Creator-only visibility (`userView === "power"`)
- Backend-owned conflict state — frontend is a display layer only
- Feature-flagged (`ENABLE_CONFLICT_EVIDENCE = false` initially)
- Lives in `screens/downloads/` — Inbox module only

**What it is NOT:**
- A global conflict engine
- A shared cross-screen UI component
- A source of truth for review state
- A lane-management or reclassification system
- An automated blocker or resolver
- A component shared with Library, Updates, Needs Review, or other screens

---

## Rationale

**Why Inbox-only:**
Inbox is for deciding what to do with incoming staged content. The conflict diagnostic answers: "Could this incoming item clash with something, and why do we think that?" Library and Updates serve different workflows — sharing the UI would introduce coupling risk without clear benefit.

**Why read-only:**
Conflict detection lives in the backend for a reason: it has access to the full library state, version history, and dependency graph. Frontend re-implementation creates divergence. The UI must not become a second source of truth.

**Why Creator-only for now:**
Seasoned users triage quickly and don't need evidence chain depth. They receive an inert conflict badge (already in the row badges system). Full evidence display is reserved for Creator users who are doing quality review and have the context to act on it.

**Why feature-flagged:**
Allows validation in production without shipping to all users. Rollback = flip the flag.

---

## Scope Boundaries

| Allowed | NOT Allowed |
|---|---|
| Display `specialDecision` + `versionResolution` | Re-implement conflict detection in frontend |
| Show evidence strings, confidence, relationship | Add `useState`, setters, or dispatch calls |
| Creator-only rendering (`userView === "power"`) | Render in Library, Updates, Needs Review screens |
| Seasoned inert conflict badge (via existing row badges) | Expand Seasoned to show evidence chains |
| Export data helpers (typed, pure) | Export UI components outside `screens/downloads/` |
| `ENABLE_CONFLICT_EVIDENCE = false` default | Ship without feature flag |

---

## Confidence Language

When displaying conflict evidence, confidence level must be communicated honestly:

| Confidence | Display | Meaning |
|---|---|---|
| High | "High confidence" (green) | Backend is certain |
| Medium | "Medium confidence" (amber) | Some uncertainty |
| Low | "Unclear — verify first" (muted) | Heuristic; verify manually |

Do not use: "Conflict found", "Conflict detected", "Blocked", "Error". These imply certainty or action.

---

## Future Expansion

If conflict diagnostics are needed in Library or Updates in future:
1. This ADR must be reviewed and updated
2. A separate component must be created for those screens
3. The shared data layer (`specialDecision`, `versionResolution`) may be reused — but the UI must be purpose-built for each context
4. Library conflict display answers a different question: "Is my installed library internally consistent?" — different workflow, different UX

---

## Consequences

**Positive:**
- Clean architectural separation between Inbox triage and library management
- No risk of conflict diagnostics interfering with Library or Updates behavior
- Easy rollback via feature flag
- Creator users get meaningful triage context without cluttering Casual/Seasoned

**Negative:**
- Conflict diagnostics are not globally accessible — users who need them must be in Inbox Creator view
- Future cross-screen conflict features require new ADR and implementation

---

## Enforcement

1. `ENABLE_CONFLICT_EVIDENCE` flag gates all rendering
2. File header comments on `ConflictEvidenceDisplay` document the read-only contract
3. Component lives in `screens/downloads/` — importing it outside Inbox is a review rejection
4. Confidence labels are mandatory — hiding uncertainty is a review rejection
5. No action affordances (block, move, dismiss, resolve) may be added behind this feature

---

_This ADR defines the scope boundary. Violations should be caught in code review._
