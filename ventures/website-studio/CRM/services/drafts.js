// Drafts Service — Safe email draft generation with two-phase approval
// All drafts start as 'proposed' — never created in email client without explicit approval

const { db, uuid } = require('../db/database');
const llm = require('../adapters/llm');
const graph = require('../adapters/graph');

// ── Generate a draft ──────────────────────────────────────────────────────────

/**
 * Generate an email draft for a contact.
 * Always creates draft in 'proposed' status — approval is explicit.
 *
 * Steps:
 * 1. Fetch CRM context (interactions, summary, follow-ups)
 * 2. Optionally fetch email thread from Graph
 * 3. Generate draft with LLM
 * 4. Store as 'proposed' — never auto-sent
 */
async function generateDraft(contactId, options = {}) {
  const {
    followUpReason = null,
    tone = 'professional',
    threadRef = null,
    includeThread = false,
  } = options;

  const contact = db.getOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
  if (!contact) throw new Error(`Contact ${contactId} not found`);

  // Gather CRM context
  const context = [];

  // Recent interactions
  const interactions = db.all(
    `SELECT * FROM interactions WHERE contact_id = ? ORDER BY happened_at DESC LIMIT 5`,
    [contactId]
  );
  for (const i of interactions) {
    const date = new Date(i.happened_at).toLocaleDateString('en-IE', { month: 'short', day: 'numeric' });
    context.push(`[${date}] ${i.type}: ${i.subject || i.body_preview || '(interaction)'}`);
  }

  // Active follow-up
  const followUp = db.getOne(
    `SELECT * FROM follow_ups WHERE contact_id = ? AND status = 'pending' ORDER BY due_date ASC LIMIT 1`,
    [contactId]
  );
  const effectiveFollowUpReason = followUpReason || followUp?.reason || null;

  // Relationship summary
  const summary = db.getOne(
    `SELECT * FROM contact_summaries WHERE contact_id = ? ORDER BY generated_at DESC LIMIT 1`,
    [contactId]
  );
  if (summary?.summary) {
    context.push(`Relationship: ${summary.summary.substring(0, 200)}`);
  }
  if (summary?.communication_style && summary.communication_style !== 'unknown') {
    context.push(`Comms style: ${summary.communication_style}`);
  }

  // Company context
  if (contact.company) {
    const company = db.getOne(`SELECT * FROM companies WHERE name = ?`, [contact.company]);
    if (company) {
      context.push(`Company: ${company.name} — ${company.industry || 'industry unknown'}`);
    }
  }

  // Email thread from Graph (if threadRef provided and Graph is available)
  let threadContext = null;
  if (includeThread && threadRef) {
    try {
      const status = await graph.getStatus();
      if (status.authenticated) {
        const token = await graph.getAccessToken();
        const messages = await graph.getRecentMessages(token, 30);
        const threadMessages = messages.filter(m => m.conversationId === threadRef);
        if (threadMessages.length > 0) {
          threadContext = threadMessages.slice(0, 5).map(m => {
            const from = m.from?.emailAddress?.address || 'unknown';
            const body = (m.bodyPreview || '').substring(0, 300);
            return `[${from}]: ${body}`;
          }).join('\n');
          context.push(`Recent thread:\n${threadContext}`);
        }
      }
    } catch (err) {
      // Graph not available — skip thread
    }
  }

  // Generate draft with LLM
  const draft = await llm.generateEmailDraft(contact, {
    followUpReason: effectiveFollowUpReason,
    tone,
    contextUsed: context,
  });

  // Store in database as 'proposed'
  const draftId = uuid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO email_drafts (id, contact_id, subject, body, status, thread_ref, context_used, proposed_at)
     VALUES (?, ?, ?, ?, 'proposed', ?, ?, ?)`,
    [
      draftId,
      contactId,
      draft.subject,
      draft.body,
      threadRef || null,
      JSON.stringify(context.slice(0, 5)),
      now,
    ]
  );

  const record = db.getOne(`SELECT * FROM email_drafts WHERE id = ?`, [draftId]);

  return {
    ...record,
    context_used: context,
    stub: draft.stub || false,
  };
}

// ── Approve a draft ───────────────────────────────────────────────────────────

/**
 * Approve a draft — moves to 'approved' status.
 * Actual email creation in email client is a separate manual step
 * (the CRM does not have direct email send access — intentional).
 */
function approveDraft(draftId, approvedBy = 'user') {
  const draft = db.getOne(`SELECT * FROM email_drafts WHERE id = ?`, [draftId]);
  if (!draft) throw new Error(`Draft ${draftId} not found`);
  if (draft.status !== 'proposed') throw new Error(`Draft already processed (status: ${draft.status})`);

  const now = new Date().toISOString();
  db.run(
    `UPDATE email_drafts SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?`,
    [now, approvedBy, draftId]
  );

  return db.getOne(`SELECT * FROM email_drafts WHERE id = ?`, [draftId]);
}

// ── Reject a draft ───────────────────────────────────────────────────────────

function rejectDraft(draftId) {
  const draft = db.getOne(`SELECT * FROM email_drafts WHERE id = ?`, [draftId]);
  if (!draft) throw new Error(`Draft ${draftId} not found`);

  db.run(`UPDATE email_drafts SET status = 'discarded' WHERE id = ?`, [draftId]);
  return { success: true, discarded: true };
}

// ── Get drafts for contact ────────────────────────────────────────────────────

function getDraftsForContact(contactId, status = null) {
  let sql = `SELECT * FROM email_drafts WHERE contact_id = ?`;
  const params = [contactId];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY proposed_at DESC`;
  return db.all(sql, params);
}

// ── Pending approval count ───────────────────────────────────────────────────

function pendingCount() {
  return db.get(`SELECT COUNT(*) as c FROM email_drafts WHERE status = 'proposed'`)?.c || 0;
}

// ── Validate tone ─────────────────────────────────────────────────────────────

const VALID_TONES = ['professional', 'warm', 'casual'];

function validateTone(tone) {
  return VALID_TONES.includes(tone) ? tone : 'professional';
}

module.exports = {
  generateDraft,
  approveDraft,
  rejectDraft,
  getDraftsForContact,
  pendingCount,
  validateTone,
  VALID_TONES,
};
