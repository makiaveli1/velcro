// Discovery Service — Contact discovery pipeline orchestrator
// Scans Graph for new contacts, applies skip patterns, writes to discovery_review

const graph = require('../adapters/graph');
const { db, uuid } = require('../db/database');

// ── Config ────────────────────────────────────────────────────────────────────

const MY_EMAIL_DOMAIN = process.env.MY_EMAIL_DOMAIN || null; // e.g. 'verdantia.ie'
const AUTO_ADD_THRESHOLD = 50;
const SKIP_DOMAINS = new Set([
  'noreply.com', 'no-reply.com', 'noreply.ie', 'no-reply.ie',
  'newsletter.', 'mailchimp.com', 'substack.com', 'sendgrid.net',
  'doubleoptin', // common newsletter pattern
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSkipDomain(email) {
  const domain = email.split('@')[1] || '';
  for (const skip of SKIP_DOMAINS) {
    if (domain.includes(skip)) return true;
  }
  return false;
}

function isInternalEmail(email) {
  if (!MY_EMAIL_DOMAIN) return false;
  return email.toLowerCase().endsWith(`@${MY_EMAIL_DOMAIN}`);
}

function isNoreply(email) {
  const local = email.split('@')[0].toLowerCase();
  return /^(no-?reply|noreply|no.?reply)$/.test(local);
}

function isHighVolumeSender(email) {
  // Pattern: automated systems often send from addresses like
  // automation@, bot@, notify@, alert@, auto@, no such common patterns
  const local = email.split('@')[0].toLowerCase();
  return /^(automated|auto|bot|notify|alert|system|admin|hubspot|mailgun|sendgrid|mailchimp|stripe|pipedrive|calendar|noreply)/.test(local);
}

function shouldReject(contact) {
  if (isNoreply(contact.email)) return 'noreply_address';
  if (isInternalEmail(contact.email)) return 'internal_domain';
  if (isSkipDomain(contact.email)) return 'newsletter_or_automated_domain';
  if (isHighVolumeSender(contact.email)) return 'automated_sender';
  return null;
}

// ── Skip pattern checking ─────────────────────────────────────────────────────

/**
 * Check if a contact matches any learned skip pattern.
 */
function matchesSkipPattern(email) {
  const domain = email.split('@')[1] || '';
  const prefix = email.split('@')[0];

  const patterns = db.all(`SELECT * FROM skip_patterns`, []);

  for (const p of patterns) {
    if (p.pattern_type === 'domain' && domain === p.pattern_value) return p;
    if (p.pattern_type === 'domain' && domain.endsWith('.' + p.pattern_value)) return p;
    if (p.pattern_type === 'email_prefix' && prefix === p.pattern_value) return p;
    if (p.pattern_type === 'email' && email.toLowerCase() === p.pattern_value.toLowerCase()) return p;
  }

  return null;
}

// ── Main discovery run ────────────────────────────────────────────────────────

/**
 * Run a full discovery scan.
 * 1. Fetch recent emails and calendar events from Graph
 * 2. Extract contacts
 * 3. Apply skip patterns and filters
 * 4. Upsert into discovery_review table
 * 5. Return summary
 */
async function runDiscovery(options = {}) {
  const { daysBack = 1, dryRun = false } = options;

  const status = await graph.getStatus();
  if (!status.authenticated) {
    return { success: false, error: status.message, needsAuth: !status.authenticated };
  }

  const token = await graph.getAccessToken();
  const startTime = Date.now();

  // Fetch from Graph
  const [messages, events] = await Promise.all([
    graph.getRecentMessages(token, daysBack),
    graph.getRecentEvents(token, daysBack, 0), // past events only
  ]);

  // Extract contacts
  let emailContacts = graph.extractContactsFromMessages(messages, MY_EMAIL_DOMAIN);
  let calendarContacts = graph.extractContactsFromEvents(events);

  // Merge — prefer email signals when both exist
  const mergedMap = new Map();

  for (const c of [...emailContacts, ...calendarContacts]) {
    if (mergedMap.has(c.email)) {
      const existing = mergedMap.get(c.email);
      existing.signal_count = Math.max(existing.signal_count, c.signal_count);
      if (c.signal_quality === 'high') existing.signal_quality = 'high';
      if (c.source === 'email_sender') existing.source = 'email_sender'; // prefer email source
    } else {
      mergedMap.set(c.email, { ...c });
    }
  }

  const contacts = Array.from(mergedMap.values());

  // Apply filters
  const stats = { total: contacts.length, skipped: 0, new: 0, updated: 0, rejected: 0 };

  for (const contact of contacts) {
    // Check skip patterns
    const skipPattern = matchesSkipPattern(contact.email);
    if (skipPattern) {
      stats.skipped++;
      continue;
    }

    // Apply hard filters
    const rejectReason = shouldReject(contact);
    if (rejectReason) {
      // Auto-create skip pattern for obvious noise
      if (!skipPattern) {
        const patternType = isInternalEmail(contact.email) ? 'domain' :
          contact.email.includes('@') ? 'email' : 'domain';
        const patternValue = isInternalEmail(contact.email) ? MY_EMAIL_DOMAIN : contact.email;

        // Only add skip patterns for high-signal noise (avoid over-blocking)
        if (contact.signal_quality === 'high') {
          db.run(
            `INSERT OR IGNORE INTO skip_patterns (id, pattern_type, pattern_value, hit_count, created_at, updated_at)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [uuid(), patternType, patternValue, new Date().toISOString(), new Date().toISOString()]
          );
        }

        stats.rejected++;
        continue;
      }
    }

    if (dryRun) continue;

    // Upsert into discovery_review
    const existing = db.getOne(
      `SELECT id, signal_count FROM discovery_review WHERE email = ? AND status = 'pending'`,
      [contact.email]
    );

    if (existing) {
      // Increment signal count
      db.run(
        `UPDATE discovery_review SET signal_count = ?, signal_quality = ?, last_seen = ? WHERE id = ?`,
        [existing.signal_count + 1, contact.signal_quality, contact.last_seen, existing.id]
      );
      stats.updated++;
    } else {
      db.run(
        `INSERT INTO discovery_review (id, email, name, source, signal_count, signal_quality, email_thread_ref, meeting_ref, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          uuid(),
          contact.email,
          contact.name || contact.email.split('@')[0],
          contact.source,
          contact.signal_count,
          contact.signal_quality,
          contact.thread_ref || null,
          contact.meeting_ref || null,
          new Date().toISOString(),
        ]
      );
      stats.new++;
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    stats,
    messagesFetched: messages.length,
    eventsFetched: events.length,
    contactsDiscovered: contacts.length,
    durationMs,
    message: `${stats.new} new contacts added, ${stats.updated} updated, ${stats.skipped + stats.rejected} skipped/rejected`,
  };
}

// ── Auto-add logic ───────────────────────────────────────────────────────────

/**
 * Check if auto-add mode threshold has been reached.
 * Returns { thresholdReached: bool, decisions: number, threshold: number }
 */
function getAutoAddStatus() {
  const decisions = db.get(`
    SELECT COUNT(*) as c FROM discovery_review
    WHERE status IN ('approved', 'rejected', 'skipped')
      AND decision_at IS NOT NULL
  `)?.c || 0;

  return {
    thresholdReached: decisions >= AUTO_ADD_THRESHOLD,
    decisions,
    threshold: AUTO_ADD_THRESHOLD,
    progressPct: Math.min(100, Math.round((decisions / AUTO_ADD_THRESHOLD) * 100)),
  };
}

/**
 * Enable or disable auto-add mode for all contacts with auto_add_mode = 1.
 * When enabled, approved discovery entries are immediately added as contacts.
 */
async function setAutoAddMode(enabled) {
  if (enabled) {
    // Verify threshold
    const { thresholdReached } = getAutoAddStatus();
    if (!thresholdReached) {
      return { success: false, error: `Threshold not reached. Need ${AUTO_ADD_THRESHOLD} decisions first.` };
    }
    // Update config
    const { db: database } = require('../db/database');
    database.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('auto_add_mode', ?)`, [enabled ? '1' : '0']);
  }
  return { success: true, autoAddMode: enabled };
}

// ── Mock discovery (no Graph needed) ──────────────────────────────────────────

/**
 * Seed the discovery queue with mock data for testing.
 * Useful when Graph isn't set up yet.
 */
async function seedMockDiscovery() {
  const mock = graph.generateMockDiscovery();
  let added = 0;

  for (const contact of mock) {
    const rejectReason = shouldReject(contact);
    if (rejectReason) continue;

    const existing = db.getOne(
      `SELECT id FROM discovery_review WHERE email = ? AND status = 'pending'`,
      [contact.email]
    );
    if (existing) {
      db.run(`UPDATE discovery_review SET signal_count = signal_count + 1 WHERE id = ?`, [existing.id]);
    } else {
      db.run(
        `INSERT INTO discovery_review (id, email, name, source, signal_count, signal_quality, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [uuid(), contact.email, contact.name, contact.source, contact.signal_count, contact.signal_quality, new Date().toISOString()]
      );
      added++;
    }
  }

  return { success: true, added, message: `Seeded ${added} mock contacts into discovery queue` };
}

module.exports = {
  runDiscovery,
  seedMockDiscovery,
  matchesSkipPattern,
  shouldReject,
  getAutoAddStatus,
  setAutoAddMode,
  AUTO_ADD_THRESHOLD,
};
