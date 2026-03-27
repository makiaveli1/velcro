# Conflict Map — Scope Audit & Safety Review
**Date:** 2026-03-27
**Purpose:** Define and lock Conflict Map boundaries before implementation begins
**Verdict:** Proceed with constraints — architecture is already safe

---

## 1. Current Conflict Map Scope

**What exists:** Nothing yet. `buildFileManifest()` + `inferFilePriority()` are file-priority helpers, not conflict logic. They organize file display only.

**What exists in the broader app:** A mature conflict/comparison detection system already built into the backend:
- `specialDecision` — backend-computed comparison of incoming vs. installed content: version, evidence, family role, installed state
- `versionResolution` — backend comparison result: `incoming_older`, `incoming_newer`, `same_version`, `no_match`; includes confidence score and evidence lists
- `conflict` badge label — existing `case "conflict"` in status labeling
- `downloadsCompareSummary()` — existing display function for comparison results
- `downloadsDecisionPanel` — already surfaces comparison evidence

This is the existing infrastructure. Conflict Map should build on it, not replace it.

**What is NOT being built:** No conflict detection logic. No lane reassignment. No state ownership.

---

## 2. Risk Assessment

### Architecture Risk: LOW
The backend already owns conflict detection. The UI receives `specialDecision` and `versionResolution` as read-only props. `queueLane` is assigned server-side. The UI cannot override it. This is the correct architecture for a read-only diagnostic layer.

### Scope Creep Risk: MEDIUM
Conflict Map surfaced in the Decision panel naturally leads to: "should this change the lane?" → which leads to: "should this auto-block?" → which leads to: "should this replace the lane model?" That path must be explicitly blocked before implementation starts.

### Coupling Risk: LOW
`specialDecision` and `versionResolution` are already scoped to the selected item in Inbox. They don't leak into Library, Updates, or Needs Review screens. Conflict Map reads the same data. No new coupling is created.

### Confidence Language Risk: MEDIUM
`versionResolution.confidence` exists. If the UI surfaces confidence without labeling it as a heuristic, users will treat low-confidence signals as certain. The existing code has `downloadsCompareSummary()` — need to check if it labels confidence clearly.

---

## 3. Unsafe Coupling Points (must be explicitly blocked)

These are the paths that must NOT be taken, regardless of how useful they seem:

### UNSAFE 1: Conflict Map changes queue lane assignment
**Must never happen.** Conflict Map is read-only. `queueLane` is owned by the backend and driven by `specialDecision.queueLane`. Conflict Map displaying "conflict" cannot cause the item to move to "Blocked" or any other lane. The display and the lane logic must remain separate.

**Block:** Conflict Map component must receive `queueLane` as a display-only prop, never as a write target.

### UNSAFE 2: Conflict Map becomes the new source of truth for review status
**Must never happen.** The Review system (`selectedReviewPlan`) has its own status. Conflict Map aggregates comparison data but cannot override or reset review decisions.

**Block:** Conflict Map reads `specialDecision` + `versionResolution`. It does not write to them. No `setState` calls that affect review status.

### UNSAFE 3: Conflict Map pushes items into Needs Review
**Must never happen.** Needs Review is a separate triage lane. Conflict signals are informational in Inbox — they do not change where an item lives or what workflow it is in.

**Block:** Conflict Map does not call `setActiveLane()`, `setQueueLane()`, or any equivalent.

### UNSAFE 4: Conflict Map logic shared with Library or Updates presentation
**Must not happen prematurely.** If conflict detection helpers are shared at the data level, that's acceptable. But Library and Updates must have their own presentation decisions. Conflict Map UI must not be the shared UI for other screens.

**Block:** Conflict Map component lives in `screens/downloads/` (Inbox module). It does not export a shared conflict UI component.

### UNSAFE 5: Conflict detection duplicated in the frontend
**Must never happen.** The backend already does conflict detection. Frontend re-implementation creates divergence: backend says conflict, frontend says clear, user sees contradictory signals.

**Block:** Conflict Map is a display layer only. All conflict detection stays in the backend.

---

## 4. Safe Inbox-Only Boundary

### What IS safe to build

**`ConflictMap` component — read-only diagnostic panel**
```
Location: screens/downloads/ConflictMap.tsx
Renders: specialDecision + versionResolution from selected item
Scope: Inbox Creator only (depth === "full" or userView === "power")
Behavior: display only — no state changes
```

**What it displays:**
- `versionResolution`: incoming vs. installed version comparison with confidence label
- `specialDecision`: family role, installed state, evidence chains
- Conflict signal: `case "conflict"` badge with explanation
- Evidence lines: raw comparison evidence (for Creator, not Casual/Seasoned)

**What it does NOT do:**
- Does not call any state setters
- Does not receive `queueLane` as mutable
- Does not import or depend on Library, Updates, or Needs Review modules
- Does not implement its own conflict detection
- Does not export shared components

### Data ownership

| Data | Owner | Conflict Map access |
|---|---|---|
| `queueLane` | Backend | Read-only label |
| `specialDecision` | Backend | Read-only display |
| `versionResolution` | Backend | Read-only display |
| `conflict` badge | Backend | Read-only label |
| Review status | Review system | None |
| Library state | Library screen | None |
| Updates state | Updates screen | None |

---

## 5. Required Architecture Guardrails

### Guardrail 1: Feature flag — `ENABLE_CONFLICT_MAP`
```ts
// Feature-flag the entire Conflict Map before it ships
const ENABLE_CONFLICT_MAP = false; // flip to true after validation
```
- Conflict Map behind a flag from day one
- Rollback = flip the flag
- Ship without it enabled by default until validated

### Guardrail 2: Read-only contract
```ts
// ConflictMap is intentionally a pure display component.
// It must NEVER call setters or dispatch state changes.
// If you need to add a setter here, stop and re-examine the scope.
interface ConflictMapProps {
  specialDecision: SpecialModDecision | null;
  versionResolution: VersionResolution | null;
  // NO: onLaneChange, onReclassify, onBlock — none of these belong here
}
```

### Guardrail 3: Inbox module boundary
```
screens/downloads/ConflictMap.tsx   ← correct location
screens/downloads/ConflictMap.css
NO: components/ConflictMap.tsx    ← wrong — implies shared use
NO: shared/conflict.ts             ← wrong — UI must stay in Inbox module
```

### Guardrail 4: Creator-only visibility gate
```tsx
// In DownloadsDecisionPanel or a new Creator diagnostics section:
{userView === "power" && ENABLE_CONFLICT_MAP ? (
  <ConflictMap
    specialDecision={selectedSpecialDecision}
    versionResolution={selectedVersionResolution}
  />
) : null}
```

### Guardrail 5: Confidence language — must label heuristic signals
```tsx
// Always label confidence level in the display
{versionResolution.confidence === "low" && (
  <span className="conflict-confidence-warning">
    ⚠ This detection is uncertain — verify manually
  </span>
)}
```

### Guardrail 6: Separate evidence vs. decision
```
Evidence: "File X and File Y share the same tuning ID"  ← display this
Decision: "Therefore block this item"                    ← do NOT display this
```
Conflict Map shows evidence chains. It does not show or imply the resulting decision.

---

## 6. Verdict on Current Architecture

**The existing architecture is already safe.** Here's why:

1. `specialDecision` and `versionResolution` come from the backend as props — the frontend cannot mutate them
2. `queueLane` assignment is backend-owned — UI only reads and displays the resulting lane label
3. The comparison engine lives in the backend — frontend conflict Map is a display layer only
4. `specialDecision` and `versionResolution` are scoped to Inbox selected item — no cross-screen state

**The only real risk is scope creep** — the temptation to make Conflict Map do more than display. The guardrails above prevent that.

---

## 7. Recommended Safe Implementation Path

**Phase A (safe foundation — implement now):**
1. Add `ENABLE_CONFLICT_MAP = false` feature flag
2. Create `ConflictMap` component in `screens/downloads/ConflictMap.tsx`
3. Read-only: `specialDecision` + `versionResolution` as props
4. Display: version comparison summary, confidence label, evidence list
5. Render conditionally: `userView === "power" && ENABLE_CONFLICT_MAP`
6. Confidence warning displayed when `confidence === "low"`
7. All text labels the backend provides — no new strings

**Phase B (validation):**
1. Enable flag for internal/beta testing
2. Verify Conflict Map doesn't influence lane decisions (observe only)
3. User testing with Creator personas
4. Collect feedback before shipping enabled by default

**Phase C (potential expansion — requires separate audit):**
1. Conflict Map in Library — separate implementation, separate audit
2. Conflict Map in Updates — separate implementation, separate audit
3. These are NOT in scope for the Inbox Conflict Map

---

## 8. What to Flag Before Any Implementation Code

Before writing the first line of Conflict Map code, confirm:

| Question | Answer |
|---|---|
| Is conflict detection in the backend or frontend? | Backend — UI only reads |
| Can Conflict Map change `queueLane`? | No — read-only |
| Can Conflict Map affect Review status? | No — no coupling |
| Is there a feature flag? | Must add `ENABLE_CONFLICT_MAP` |
| Is Conflict Map isolated to Inbox module? | Must live in `screens/downloads/` |
| Is confidence labeled? | Must show uncertainty for low-confidence detections |
| Does Conflict Map show evidence or decisions? | Evidence only — no implied actions |

---

_This audit defines the safe boundary. Implementation must not exceed it._

---

## 9. Post-Review Updates (2026-03-27)

### From Ariadne (Studio)

**Badge copy adjustment:** "Conflict found" → "Review suggested"
- "Conflict found" implies error/blocking — this is a signal, not a verdict
- Use: "Review suggested" for low-severity, "Needs review" for higher severity
- Never use: "Conflict detected", "Error", "Blocked"

**Two-tier visibility model:**
- **Creator (`power`):** Full ConflictEvidenceDisplay — summary, confidence, evidence chain
- **Seasoned:** Inert badge only — `conflict` badge visible in card, but NO expand, NO evidence chain, NO interaction affordance. If any Seasoned signal exists, it must be visually and interactionally inert.

**Confidence signal must be visually distinct:**
- Not just text — use a small icon or color-coded indicator at the summary level
- "Unclear — manual review suggested" (not "this is a guess")

**Feature flag hardening:**
- Make `ENABLE_CONFLICT_MAP` a runtime constant (not compile-time `const`)
- Document rollout threshold in flag comment: e.g., "enable for 10% power users first, then full rollout"

### From Sentinel (Argus)

**Tooling enforcement for read-only:**
- Add `// read-only-diagnostic` file header comment to ConflictEvidenceDisplay
- ESLint rule blocking `useState`/`setState` in ConflictEvidenceDisplay files
- Enforced at CI

**Scope read-only to entire Creator context, not just the component:**
- Read-only rule extends to detail views, side panels, and any expand/collapse triggered from ConflictEvidenceDisplay
- A developer adding "mark as reviewed" or "dismiss" from a detail view is a scope violation

**Rename: `ConflictMap` → `ConflictEvidenceDisplay`:**
- "Map" implies action/navigation
- "EvidenceDisplay" makes the read-only intent unambiguous

**Read-only promise at data level:**
- "Conflict state is owned by the backend. It is never cached, suppressed, or dismissed client-side."
- Document this in the component header comment

**ADR recommendation:**
- Add an ADR (Architecture Decision Record) documenting why ConflictEvidenceDisplay lives in Inbox only
- Prevents future pressure to "just share it with Library"

---

## 10. Final Scope Verdict

**Proceed with the following guardrails in place before writing code:**

| Guardrail | Status |
|---|---|
| Feature flag `ENABLE_CONFLICT_MAP` as runtime constant | Required |
| `ConflictEvidenceDisplay` — renamed from `ConflictMap` | Required |
| Read-only contract with no `useState`/`setState` (ESLint enforced) | Required |
| File header comment: `// read-only-diagnostic — conflict state owned by backend` | Required |
| Two-tier: Creator full evidence, Seasoned inert badge only | Required |
| Badge copy: "Review suggested" not "Conflict found" | Required |
| Confidence labeled visually (icon/color, not just text) | Required |
| Read-only extends to detail views and side panels | Required |
| ADR documenting Inbox-only boundary | Required before Phase 2 |
| No Seasoned expand/interaction affordance | Required |

**With these guardrails in place: proceed.**

