/**
 * Migration 002: Add conceptPackage to all OUTREACH.json records.
 * Also renames 'pitch_drafted' board_stage to 'concept_review' if CONCEPT_BRIEF.md exists.
 *
 * For each lead with OUTREACH.json:
 * - Adds conceptPackage{} if absent
 * - If CONCEPT_BRIEF.md exists and conceptPackage is absent, seeds from the brief
 * - Does NOT overwrite existing conceptPackage data
 */

const path = require('path');
const fs = require('fs');

const LEADS_DIR = path.join(__dirname, '..', '..', '..', 'LEADS');
const CONCEPT_STATUS_MAP = {
  // Map outreachStage to conceptStatus
  concept_building: 'building',
  concept_review: 'review',
  concept_approved: 'approved',
};

function readBrief(conceptPath) {
  try {
    const content = fs.readFileSync(conceptPath, 'utf8');
    const slugMatch = content.match(/\*\*Slug:\*\*\s*(.+)/);
    const conceptTypeMatch = content.match(/\*\*Concept Type:\*\*\s*(.+)/);
    const notesMatch = content.match(/\*\*Concept Notes:\*\*\s*([\s\S]+?)(?=\n##|\n#|$)/i);
    const qaMatch = content.match(/\*\*QA Findings:\*\*\s*([\s\S]+?)(?=\n##|\n#|$)/i);
    return {
      conceptBriefExists: true,
      conceptType: conceptTypeMatch ? conceptTypeMatch[1].trim() : 'homepage_mock',
      notes: notesMatch ? notesMatch[1].trim().replace(/\*\*/g, '') : null,
      qaFindings: qaMatch ? qaMatch[1].trim().replace(/\*\*/g, '') : null,
    };
  } catch {
    return { conceptBriefExists: false };
  }
}

const dirs = fs.readdirSync(LEADS_DIR).filter(d =>
  !d.startsWith('.') && fs.statSync(path.join(LEADS_DIR, d)).isDirectory()
);

let updated = 0;
let skipped = 0;

for (const dir of dirs) {
  const outreachPath = path.join(LEADS_DIR, dir, 'OUTREACH.json');
  if (!fs.existsSync(outreachPath)) {
    console.log(`  [SKIP] ${dir}: no OUTREACH.json`);
    skipped++;
    continue;
  }

  let outreach;
  try {
    outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));
  } catch {
    console.log(`  [ERROR] ${dir}: could not parse OUTREACH.json`);
    continue;
  }

  // If conceptPackage already exists, skip
  if (outreach.conceptPackage) {
    console.log(`  [SKIP] ${dir}: conceptPackage already exists`);
    skipped++;
    continue;
  }

  // Read CONCEPT_BRIEF.md if it exists
  const conceptBriefPath = path.join(LEADS_DIR, dir, 'CONCEPT_BRIEF.md');
  const brief = fs.existsSync(conceptBriefPath) ? readBrief(conceptBriefPath) : { conceptBriefExists: false };

  // Determine concept status from outreachStage
  let conceptStatus = 'not_started';
  if (brief.conceptBriefExists) {
    conceptStatus = 'brief_ready';
    // If concept is approved (stage advanced), mark it
    if (outreach.outreachStage === 'concept_approved') {
      conceptStatus = 'approved';
    } else if (outreach.outreachStage === 'concept_review') {
      conceptStatus = 'internal_review';
    } else if (outreach.outreachStage === 'concept_building') {
      conceptStatus = 'building';
    }
  }

  outreach.conceptPackage = {
    conceptStatus,
    conceptType: brief.conceptType || 'homepage_mock',
    previewUrl: outreach.previewUrl || null,
    screenshots: outreach.screenshots || [],
    buildPath: outreach.buildPath || null,
    notes: brief.notes || null,
    qaFindings: brief.qaFindings || null,
    approvedBy: outreach.conceptApprovedBy || null,
    approvedAt: outreach.conceptApprovedAt || null,
    conceptBriefExists: brief.conceptBriefExists,
  };

  fs.writeFileSync(outreachPath, JSON.stringify(outreach, null, 2) + '\n');
  console.log(`  [UPDATED] ${dir}: added conceptPackage (status=${conceptStatus})`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
