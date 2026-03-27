// Relationship Scoring Service
// Dynamic relationship score 0-100 based on recency × frequency × priority × signal_quality

const { db, uuid } = require('../db/database');

// ── Scoring model ─────────────────────────────────────────────────────────────
//
// Score = recency_component + frequency_component + priority_component + signal_component
//
// Recency (max 30 pts): last meaningful interaction
//   > 30 days: 0   |  14-30 days: 10  |  7-14 days: 20  |  1-7 days: 25  |  < 24h: 30
//
// Frequency (max 25 pts): interactions per month (rolling 90 days)
//   0: 0  |  1-2: 8  |  3-5: 15  |  6-10: 20  |  10+: 25
//
// Priority (max 20 pts):
//   Critical (1): 20  |  Normal (2): 12  |  Low (3): 5
//
// Signal Quality (max 25 pts):
//   Meeting + email mixed: 25  |  meeting only: 20  |  email only: 12  |  manual only: 8

const SCORE_MAX = 100;
const LOOKBACK_DAYS = 90;

function recencyScore(lastTouchedAt) {
  if (!lastTouchedAt) return 0;
  const days = (Date.now() - new Date(lastTouchedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days > 60) return 0;
  if (days > 30) return 5;
  if (days > 14) return 10;
  if (days > 7) return 20;
  if (days > 1) return 25;
  return 30;
}

function frequencyScore(contactId) {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const count = db.get(
    `SELECT COUNT(*) as c FROM interactions WHERE contact_id = ? AND happened_at >= ?`,
    [contactId, since]
  )?.c || 0;

  const monthlyRate = (count / LOOKBACK_DAYS) * 30;
  if (monthlyRate >= 10) return 25;
  if (monthlyRate >= 6) return 20;
  if (monthlyRate >= 3) return 15;
  if (monthlyRate >= 1) return 8;
  return 0;
}

function priorityScore(priority) {
  return { 1: 20, 2: 12, 3: 5 }[priority || 2] || 12;
}

function signalScore(contactId) {
  // Check what interaction types exist
  const types = db.all(
    `SELECT DISTINCT type FROM interactions WHERE contact_id = ? ORDER BY type`,
    [contactId]
  ).map(r => r.type);

  if (types.includes('meeting') && types.includes('email')) return 25;
  if (types.includes('meeting')) return 20;
  if (types.includes('email')) return 12;
  if (types.length > 0) return 8;
  return 0;
}

// ── Score a single contact ─────────────────────────────────────────────────────

/**
 * Calculate and update the relationship score for a single contact.
 * Returns { score, breakdown }
 */
function scoreContact(contactId) {
  const contact = db.getOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
  if (!contact) return null;

  const rec  = recencyScore(contact.last_touched_at);
  const freq = frequencyScore(contactId);
  const prio = priorityScore(contact.priority);
  const sig  = signalScore(contactId);

  const total = Math.min(SCORE_MAX, rec + freq + prio + sig);

  // Update
  db.run(
    `UPDATE contacts SET relationship_score = ?, updated_at = ? WHERE id = ?`,
    [total, new Date().toISOString(), contactId]
  );

  return {
    score: total,
    breakdown: {
      recency:    { value: rec, max: 30 },
      frequency:  { value: freq, max: 25 },
      priority:  { value: prio, max: 20 },
      signal:    { value: sig,  max: 25 },
    },
  };
}

// ── Score all contacts ─────────────────────────────────────────────────────────

/**
 * Recalculate scores for all active contacts.
 * Returns { scored, errors }
 */
function scoreAllContacts() {
  const contacts = db.all(`SELECT id FROM contacts WHERE suppressed = 0`);
  let scored = 0;
  let errors = 0;

  for (const { id } of contacts) {
    try {
      scoreContact(id);
      scored++;
    } catch (err) {
      errors++;
    }
  }

  return { scored, errors };
}

// ── Contacts needing attention ─────────────────────────────────────────────────

/**
 * Return contacts that need attention:
 * - Score dropped significantly since last touch, OR
 * - Score is low (< 40), OR
 * - Has an overdue follow-up
 */
function getContactsNeedingAttention() {
  const contacts = db.all(`
    SELECT
      c.id, c.name, c.email, c.company, c.relationship_score,
      c.last_touched_at,
      fu.due_date as overdue_followup_due,
      fu.reason as overdue_followup_reason
    FROM contacts c
    LEFT JOIN follow_ups fu ON fu.contact_id = c.id
      AND fu.status = 'pending'
      AND fu.due_date < date('now')
      AND (fu.snoozed_until IS NULL OR fu.snoozed_until < datetime('now'))
    WHERE c.suppressed = 0
      AND (
        c.relationship_score < 40
        OR fu.id IS NOT NULL
        OR (c.last_touched_at < datetime('now', '-14 days'))
      )
    ORDER BY c.relationship_score ASC, c.last_touched_at ASC
    LIMIT 20
  `);

  return contacts;
}

// ── Nudge generator ───────────────────────────────────────────────────────────

/**
 * Generate a short human-readable nudge for a contact needing attention.
 */
function generateNudge(contact) {
  const score = contact.relationship_score || 50;
  const daysSinceTouch = contact.last_touched_at
    ? Math.round((Date.now() - new Date(contact.last_touched_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (contact.overdue_followup_due) {
    return `Overdue follow-up: "${contact.overdue_followup_reason || 'follow up'}" (was due ${contact.overdue_followup_due})`;
  }

  if (score < 30) {
    return `Cold contact (score ${score}) — no meaningful interaction in ${daysSinceTouch} days`;
  }

  if (daysSinceTouch && daysSinceTouch > 30) {
    return `Last touch ${daysSinceTouch} days ago — score ${score}, might be going stale`;
  }

  if (score < 40) {
    return `Score dropping (${score}/100) — relationship needs investment`;
  }

  return `Worth a check-in — ${daysSinceTouch} days since last interaction`;
}

// ── Score breakdown for UI ─────────────────────────────────────────────────────

/**
 * Return a detailed score breakdown for a contact (for the dossier UI).
 */
function getScoreBreakdown(contactId) {
  const contact = db.getOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
  if (!contact) return null;

  const breakdown = {
    overall: contact.relationship_score,
    components: {
      recency: {
        label: 'Recency',
        value: recencyScore(contact.last_touched_at),
        max: 30,
        detail: contact.last_touched_at
          ? `${Math.round((Date.now() - new Date(contact.last_touched_at).getTime()) / (1000 * 60 * 60 * 24))} days ago`
          : 'No interactions recorded',
      },
      frequency: {
        label: 'Frequency',
        value: frequencyScore(contactId),
        max: 25,
        detail: (() => {
          const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
          const count = db.get(
            `SELECT COUNT(*) as c FROM interactions WHERE contact_id = ? AND happened_at >= ?`,
            [contactId, since]
          )?.c || 0;
          return `${count} interactions over ${LOOKBACK_DAYS} days`;
        })(),
      },
      priority: {
        label: 'Priority',
        value: priorityScore(contact.priority),
        max: 20,
        detail: { 1: 'Critical', 2: 'Normal', 3: 'Low' }[contact.priority] || 'Normal',
      },
      signal: {
        label: 'Signal Quality',
        value: signalScore(contactId),
        max: 25,
        detail: (() => {
          const types = db.all(
            `SELECT DISTINCT type FROM interactions WHERE contact_id = ?`,
            [contactId]
          ).map(r => r.type);
          if (types.includes('meeting') && types.includes('email')) return 'Meeting + email mix (strongest signal)';
          if (types.includes('meeting')) return 'Meeting-based relationship';
          if (types.includes('email')) return 'Email-based relationship';
          if (types.length > 0) return `${types.length} interaction type(s)`;
          return 'No interactions yet';
        })(),
      },
    },
  };

  // Human-readable explanation
  breakdown.explanation = generateNudge(contact);

  return breakdown;
}

module.exports = {
  scoreContact,
  scoreAllContacts,
  getContactsNeedingAttention,
  generateNudge,
  getScoreBreakdown,
  recencyScore,
  frequencyScore,
  priorityScore,
  signalScore,
};
