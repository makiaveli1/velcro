/**
 * ConflictEvidenceDisplay — read-only Inbox diagnostic for Creator triage.
 *
 * SCOPE: Inbox Creator only. This is a read-only diagnostic layer.
 * Conflict state is owned by the backend. This component only reads and displays it.
 *
 * RULES (enforced here and in usage):
 * - NEVER add state setters, useState, or dispatch calls
 * - NEVER add workflow actions: block, move, dismiss, reclassify, resolve
 * - NEVER import or depend on Library, Updates, Needs Review, or other screens
 * - NEVER cache, suppress, or persist conflict state client-side
 * - NEVER show implied decisions — only evidence
 *
 * Confidence language:
 * - High confidence: present as clear signal
 * - Low confidence: label as uncertain, e.g. "Unclear — verify first"
 * - Backend owns all conflict detection — frontend is a display layer only
 */

import type { SpecialModDecision, VersionResolution } from "../../lib/types";

/** Maps VersionResolution.kind to a human-readable comparison label */
function versionLabel(kind: VersionResolution["kind"]): string {
  switch (kind) {
    case "incoming_newer":  return "Incoming version is newer";
    case "incoming_older":  return "Incoming version is older";
    case "same_version":    return "Same version detected";
    case "no_match":        return "No version match found";
    case "not_compareable": return "Not comparable";
    default:                return "Version unclear";
  }
}

/** Maps VersionResolution.confidence to a display string and severity */
function confidenceLabel(confidence: VersionResolution["confidence"]): {
  text: string;
  severity: "high" | "medium" | "low";
} {
  switch (confidence) {
    case "high":   return { text: "High confidence",    severity: "high" };
    case "medium": return { text: "Medium confidence",   severity: "medium" };
    case "low":    return { text: "Unclear — verify first", severity: "low" };
    default:       return { text: "Confidence unknown",  severity: "low" };
  }
}

/** Maps SpecialModDecision.kind to display text */
function decisionLabel(kind: SpecialModDecision["kind"]): string {
  switch (kind) {
    case "safe":          return "No issues found";
    case "needs_review":  return "Needs review";
    case "conflict":      return "Needs review";
    case "uncertain":     return "Unclear — verify first";
    default:              return "Status unclear";
  }
}

/** Maps SpecialModDecision.familyRole to display text */
function familyRoleLabel(role: SpecialModDecision["familyRole"]): string {
  switch (role) {
    case "replaces":  return "Replaces installed version";
    case "adds":      return "Adds alongside installed version";
    case "conflicts": return "Conflicts with installed version";
    case "unclear":   return "Relationship to installed version unclear";
    default:          return "Relationship unclear";
  }
}

interface ConflictEvidenceDisplayProps {
  /** Backend-computed comparison of incoming vs installed version */
  versionResolution: VersionResolution | null;
  /** Backend-computed decision about the incoming item */
  specialDecision: SpecialModDecision | null;
  /** User view — controls display density */
  userView: "beginner" | "standard" | "power";
}

/**
 * Read-only evidence display for Creator Inbox triage.
 *
 * Shows:
 * 1. Version comparison: what versions exist and which is newer/older
 * 2. Confidence: how certain the backend is about the comparison
 * 3. Evidence: the actual strings that formed the basis of the comparison
 *
 * Does NOT show:
 * - Implied workflow actions
 * - Automatic lane changes
 * - Certainty beyond what the backend provides
 * - Any form of decision or resolution
 */
export function ConflictEvidenceDisplay({
  versionResolution,
  specialDecision,
  userView,
}: ConflictEvidenceDisplayProps) {
  // Nothing to show if both are absent
  const hasVersionData = versionResolution != null;
  const hasDecisionData = specialDecision != null;

  if (!hasVersionData && !hasDecisionData) {
    return null;
  }

  return (
    <div className="conflict-evidence-display">
      {/* Evidence header — always shown when component renders */}
      <div className="conflict-evidence-header">
        <span className="conflict-evidence-label">Evidence</span>
        {hasDecisionData && (
          <span
            className={`conflict-evidence-badge ${specialDecision.kind === "conflict" ? "is-warn" : specialDecision.kind === "uncertain" ? "is-dim" : "is-muted"}`}
          >
            {decisionLabel(specialDecision.kind)}
          </span>
        )}
      </div>

      {/* Version comparison block */}
      {hasVersionData && (
        <div className="conflict-evidence-block">
          <div className="conflict-evidence-row">
            <span className="conflict-evidence-item-label">Comparison</span>
            <span className="conflict-evidence-item-value">
              {versionLabel(versionResolution.kind)}
            </span>
          </div>

          {/* Confidence — visually distinct */}
          <div className="conflict-evidence-row conflict-confidence-row">
            <span className="conflict-evidence-item-label">Confidence</span>
            <span
              className={`conflict-confidence-badge conflict-confidence-${confidenceLabel(versionResolution.confidence).severity}`}
              title={
                confidenceLabel(versionResolution.confidence).severity === "low"
                  ? "Backend detection is uncertain. Verify manually before acting."
                  : undefined
              }
            >
              <span className="conflict-confidence-dot" />
              {confidenceLabel(versionResolution.confidence).text}
            </span>
          </div>

          {/* Evidence strings — the actual data backing the comparison */}
          {versionResolution.incomingVersionEvidence.length > 0 && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Incoming</span>
              <span className="conflict-evidence-item-value conflict-evidence-mono">
                {versionResolution.incomingVersionEvidence.join(", ")}
              </span>
            </div>
          )}
          {versionResolution.installedVersionEvidence.length > 0 && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Installed</span>
              <span className="conflict-evidence-item-value conflict-evidence-mono">
                {versionResolution.installedVersionEvidence.join(", ")}
              </span>
            </div>
          )}
          {versionResolution.comparisonEvidence.length > 0 && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Details</span>
              <span className="conflict-evidence-item-value conflict-evidence-mono">
                {versionResolution.comparisonEvidence.join(" · ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Special decision block */}
      {hasDecisionData && (
        <div className="conflict-evidence-block">
          {specialDecision.familyRole != null && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Relationship</span>
              <span className="conflict-evidence-item-value">
                {familyRoleLabel(specialDecision.familyRole)}
              </span>
            </div>
          )}
          {specialDecision.installedItemSummary && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Installed item</span>
              <span className="conflict-evidence-item-value conflict-evidence-mono">
                {specialDecision.installedItemSummary}
              </span>
            </div>
          )}
          {specialDecision.incomingItemSummary && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Incoming item</span>
              <span className="conflict-evidence-item-value conflict-evidence-mono">
                {specialDecision.incomingItemSummary}
              </span>
            </div>
          )}
          {specialDecision.conflictEvidence.length > 0 && (
            <div className="conflict-evidence-row">
              <span className="conflict-evidence-item-label">Conflict basis</span>
              <span className="conflict-evidence-item-value conflict-evidence-mono">
                {specialDecision.conflictEvidence.join(" · ")}
              </span>
            </div>
          )}
          {specialDecision.kind === "uncertain" && specialDecision.unclearReason && (
            <div className="conflict-evidence-row conflict-evidence-note">
              <span className="conflict-evidence-item-value">
                {specialDecision.unclearReason}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
