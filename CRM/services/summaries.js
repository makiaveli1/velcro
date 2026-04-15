// Summaries Service — LLM-powered contact relationship summaries
// Generates, stores, and regenerates contact summaries

const { db, uuid } = require('../db/database');
const llm = require('../adapters/llm');

// ── Generate or refresh a contact's summary ───────────────────────────────────

/**
 * Generate a summary for a contact (if LLM is configured).
 * Upserts into contact_summaries table.
 * Returns the summary record.
 */
async function generateSummary(contactId) {
  const contact = db.getOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
  if (!contact) throw new Error(`Contact ${contactId} not found`);

  const interactions = db.all(
    `SELECT * FROM interactions WHERE contact_id = ? ORDER BY happened_at DESC LIMIT 20`,
    [contactId]
  );
  const contextEntries = db.all(
    `SELECT * FROM contact_context WHERE contact_id = ? ORDER BY created_at DESC LIMIT 10`,
    [contactId]
  );

  const summary = await llm.generateContactSummary(contact, interactions, contextEntries);

  const summaryId = uuid();
  const now = new Date().toISOString();

  // Upsert
  db.run(
    `INSERT OR REPLACE INTO contact_summaries
       (id, contact_id, summary, relationship_type, communication_style, key_topics, generated_at)
     VALUES (
       COALESCE((SELECT id FROM contact_summaries WHERE contact_id = ?), ?),
       ?, ?, ?, ?, ?, ?
    )`,
    [
      contactId,
      summaryId,
      contactId,
      summary.summary_text || 'Summary unavailable',
      summary.relationship_type || 'unknown',
      summary.comms_style || 'unknown',
      JSON.stringify(summary.key_topics || []),
      now,
    ]
  );

  return {
    ...summary,
    generated_at: now,
  };
}

// ── Get summary ────────────────────────────────────────────────────────────────

/**
 * Get the latest summary for a contact.
 */
function getSummary(contactId) {
  return db.getOne(
    `SELECT * FROM contact_summaries WHERE contact_id = ? ORDER BY generated_at DESC LIMIT 1`,
    [contactId]
  );
}

// ── Batch regenerate ──────────────────────────────────────────────────────────

/**
 * Regenerate summaries for contacts that:
 * - Have interactions but no summary, OR
 * - Had a summary generated more than 7 days ago
 *
 * Returns { requested, generated, errors }
 */
async function regenerateStaleSummaries() {
  return llm.regenerateStaleSummaries();
}

// ── Profile enrichment ────────────────────────────────────────────────────────

/**
 * Update a contact's relationship_type, communication_style, and key_topics
 * from the latest summary (if available).
 */
async function enrichFromSummary(contactId) {
  const summary = getSummary(contactId);
  if (!summary) return null;

  const keyTopics = (() => {
    try { return JSON.parse(summary.key_topics || '[]'); } catch { return []; }
  })();

  return {
    relationship_type: summary.relationship_type,
    communication_style: summary.communication_style,
    key_topics: keyTopics,
    summary: summary.summary,
    generated_at: summary.generated_at,
  };
}

module.exports = {
  generateSummary,
  getSummary,
  regenerateStaleSummaries,
  enrichFromSummary,
};
