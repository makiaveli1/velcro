const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { db, uuid } = require('./db/database');
const llm = require('./adapters/llm');
const graph = require('./adapters/graph');
const messaging = require('./adapters/messaging');
const discovery = require('./services/discovery');
const scoring = require('./services/scoring');
const daily = require('./services/daily');
const summaries = require('./services/summaries');
const drafts = require('./services/drafts');

// ── Shared Outbound Readiness ────────────────────────────────────────────────

// System-level gates that block deployment regardless of human approval
async function getSystemReadiness() {
  const blockers = [];
  const warnings = [];

  // 1. Mailbox readiness — check Graph token validity
  let mailboxReady = false;
  try {
    const token = graph.getAccessToken();
    if (token) {
      const tokenPath = path.join(__dirname, 'config', 'graph_token.json');
      if (fs.existsSync(tokenPath)) {
        const tok = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        const expiresAt = tok.expires_at;
        const nowMs = Date.now();
        const expired = expiresAt > 1e12 ? nowMs > expiresAt : nowMs > expiresAt * 1000;
        mailboxReady = !expired;
      }
    }
  } catch (_) {
    mailboxReady = false;
  }
  if (!mailboxReady) blockers.push('mailbox');

  // 2. Policy readiness — always blocked until outreach policy is defined
  blockers.push('policy');

  return { mailboxReady, policyReady: false, blockers, warnings };
}

function getLeadBlockers(leadDir) {
  const blockers = [];
  const warnings = [];

  // Check suppression file
  const suppressPath = path.join(leadDir, 'SUPPRESSED.md');
  if (fs.existsSync(suppressPath)) {
    blockers.push('suppression');
    return { blockers, warnings };
  }

  // Check freshness — if pitch was created > 14 days ago, flag freshness warning
  const pitchPath = path.join(leadDir, 'PITCH.md');
  if (fs.existsSync(pitchPath)) {
    const pitchStat = fs.statSync(pitchPath);
    const pitchAgeDays = (Date.now() - new Date(pitchStat.mtime).getTime()) / (1000 * 60 * 60 * 24);
    if (pitchAgeDays > 14) {
      warnings.push(`Pitch is ${Math.floor(pitchAgeDays)} days old — search/listings data may be stale. Verify current state before sending.`);
    }
  }

  return { blockers, warnings };
}

async function getQueueReadiness() {
  const system = await getSystemReadiness();
  return {
    mailboxReady: system.mailboxReady,
    policyReady: system.policyReady,
    systemBlockers: system.blockers,
    systemWarnings: system.warnings,
  };
}

// ── Timeline writeback helper ─────────────────────────────────────────────────
function appendTimeline(leadDir, entry) {
  const timelinePath = path.join(leadDir, 'TIMELINE.md');
  const header = `## ${entry.timestamp}\n**Action:** ${entry.action}\n**Actor:** ${entry.actor}\n`;
  const fromLine = entry.from ? `\n**From:** ${entry.from}\n` : '\n';
  const notes = entry.notes ? `\n**Notes:** ${entry.notes}\n` : '\n';
  const block = `${header}${fromLine}${notes}\n`;
  if (fs.existsSync(timelinePath)) {
    fs.appendFileSync(timelinePath, block, 'utf8');
  } else {
    fs.writeFileSync(timelinePath, `# ${entry.leadName} — Outbound Timeline\n\n${block}`, 'utf8');
  }
}

const LEADS_DIR = path.resolve(__dirname, '../LEADS');

const app = express();
const PORT = Number(process.env.PORT || 3100);
const DRAFT_APPROVAL_ENABLED = process.env.CRM_ENABLE_DRAFT_APPROVAL === 'true';

app.use(cors());
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function handleRoute(handler) {
  return (req, res) => {
    try {
      handler(req, res);
    } catch (error) {
      const status = error.status || 500;
      console.error(`[crm api] ${req.method} ${req.path} failed:`, error.message);
      res.status(status).json({ error: error.message || 'Internal server error' });
    }
  };
}


function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function toInteger(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeNullable(value) {
  return value === undefined ? undefined : value === null ? null : String(value).trim();
}

function ensureRecord(tableName, id, recordName = 'Record') {
  const record = db.getOne(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
  if (!record) {
    throw createHttpError(404, `${recordName} not found`);
  }

  return record;
}

function buildUpdateStatement(payload, allowedFields, includeUpdatedAt = true) {
  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates.push(`${field} = ?`);
      params.push(payload[field]);
    }
  }

  if (includeUpdatedAt) {
    updates.push('updated_at = ?');
    params.push(nowIso());
  }

  return { updates, params };
}

function extractDomain(website) {
  if (!website) {
    return null;
  }

  try {
    const parsed = new URL(website.startsWith('http') ? website : `https://${website}`);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function ensureCompany(name, website = null) {
  if (!name) {
    return null;
  }

  const existing = db.getOne('SELECT * FROM companies WHERE lower(name) = lower(?) LIMIT 1', [name]);
  const timestamp = nowIso();
  const domain = extractDomain(website);

  if (existing) {
    const nextWebsite = website || existing.website || null;
    const nextDomain = domain || existing.domain || null;

    db.run(
      'UPDATE companies SET website = ?, domain = ?, updated_at = ? WHERE id = ?',
      [nextWebsite, nextDomain, timestamp, existing.id]
    );

    return db.getOne('SELECT * FROM companies WHERE id = ?', [existing.id]);
  }

  const id = uuid();
  db.run(
    `INSERT INTO companies (
      id, name, domain, website, linked_people, company_news_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, domain, website || null, 0, 0, timestamp, timestamp]
  );

  return db.getOne('SELECT * FROM companies WHERE id = ?', [id]);
}

function refreshCompanyLinkCounts() {
  const timestamp = nowIso();
  db.run(
    `UPDATE companies
     SET linked_people = (
       SELECT COUNT(*)
       FROM contacts
       WHERE contacts.company IS NOT NULL
         AND lower(contacts.company) = lower(companies.name)
     ),
     updated_at = ?`,
    [timestamp]
  );
}

function getContactDetail(id) {
  const contact = ensureRecord('contacts', id, 'Contact');
  const context = db.all(
    'SELECT * FROM contact_context WHERE contact_id = ? ORDER BY created_at DESC',
    [id]
  );
  const interactions = db.all(
    'SELECT * FROM interactions WHERE contact_id = ? ORDER BY happened_at DESC, created_at DESC',
    [id]
  );
  const followUps = db.all(
    'SELECT * FROM follow_ups WHERE contact_id = ? ORDER BY due_date ASC, created_at DESC',
    [id]
  );
  const summary = db.getOne(
    'SELECT * FROM contact_summaries WHERE contact_id = ? ORDER BY generated_at DESC LIMIT 1',
    [id]
  );

  return {
    ...contact,
    context,
    interactions,
    follow_ups: followUps,
    summary,
  };
}

function getDashboardData() {
  const attentionCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const followUpWindow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const contactsNeedingAttention = db.all(
    `SELECT *
     FROM contacts
     WHERE suppressed = 0
       AND relationship_score < 40
       AND (last_touched_at IS NULL OR last_touched_at <= ?)
     ORDER BY relationship_score ASC, last_touched_at ASC
     LIMIT 25`,
    [attentionCutoff]
  );

  const pendingFollowUps = db.all(
    `SELECT follow_ups.*, contacts.name AS contact_name, contacts.email AS contact_email
     FROM follow_ups
     LEFT JOIN contacts ON contacts.id = follow_ups.contact_id
     WHERE follow_ups.status IN ('pending', 'open', 'snoozed')
       AND (follow_ups.snoozed_until IS NULL OR follow_ups.snoozed_until <= ?)
       AND follow_ups.due_date IS NOT NULL
       AND follow_ups.due_date <= ?
     ORDER BY follow_ups.due_date ASC
     LIMIT 25`,
    [nowIso(), followUpWindow]
  );

  const discoveryQueueSize = db.getOne(
    'SELECT COUNT(*) AS total FROM discovery_review WHERE status = ?',
    ['pending']
  )?.total || 0;

  const recentInteractions = db.all(
    `SELECT interactions.*, contacts.name AS contact_name, contacts.email AS contact_email
     FROM interactions
     LEFT JOIN contacts ON contacts.id = interactions.contact_id
     WHERE interactions.happened_at >= ?
     ORDER BY interactions.happened_at DESC
     LIMIT 20`,
    [recentCutoff]
  );

  const weeklyStats = {
    contacts_created:
      db.getOne('SELECT COUNT(*) AS total FROM contacts WHERE created_at >= ?', [recentCutoff])?.total || 0,
    interactions_logged:
      db.getOne('SELECT COUNT(*) AS total FROM interactions WHERE created_at >= ?', [recentCutoff])?.total || 0,
    meetings_logged:
      db.getOne('SELECT COUNT(*) AS total FROM meetings WHERE created_at >= ?', [recentCutoff])?.total || 0,
    followups_created:
      db.getOne('SELECT COUNT(*) AS total FROM follow_ups WHERE created_at >= ?', [recentCutoff])?.total || 0,
    followups_completed:
      db.getOne(
        `SELECT COUNT(*) AS total
         FROM follow_ups
         WHERE updated_at >= ?
           AND status IN ('completed', 'done')`,
        [recentCutoff]
      )?.total || 0,
  };

  return {
    contactsNeedingAttention,
    pendingFollowUps,
    discoveryQueueSize,
    recentInteractions,
    weeklyStats,
    generatedAt: nowIso(),
  };
}

app.get('/api/health', handleRoute((req, res) => {
  db.getOne('SELECT 1 AS ok');
  res.json({ ok: true, db: 'ok', timestamp: nowIso() });
}));

app.get('/api/contacts', handleRoute((req, res) => {
  const search = normalizeNullable(req.query.search);
  const priority = req.query.priority;
  const suppressed = req.query.suppressed;
  const limit = clamp(toInteger(req.query.limit, 50), 1, 200);
  const offset = Math.max(toInteger(req.query.offset, 0), 0);

  let sql = 'SELECT * FROM contacts WHERE 1 = 1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR role LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (priority !== undefined) {
    sql += ' AND priority = ?';
    params.push(toInteger(priority, 2));
  }

  if (suppressed !== undefined) {
    sql += ' AND suppressed = ?';
    params.push(toInteger(suppressed, 0));
  }

  sql += ' ORDER BY updated_at DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const items = db.all(sql, params);
  res.json({ items, limit, offset, count: items.length });
}));

app.get('/api/contacts/:id', handleRoute((req, res) => {
  res.json(getContactDetail(req.params.id));
}));

app.post('/api/contacts', handleRoute((req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    throw createHttpError(400, 'email and name are required');
  }

  const existing = db.getOne('SELECT id FROM contacts WHERE email = ?', [email]);
  if (existing) {
    throw createHttpError(409, 'A contact with that email already exists');
  }

  const companyName = normalizeNullable(req.body.company) || null;
  const company = ensureCompany(companyName, normalizeNullable(req.body.website) || null);
  const timestamp = nowIso();
  const id = uuid();

  db.run(
    `INSERT INTO contacts (
      id, email, name, company, role, priority, relationship_score, source,
      discovery_method, auto_add_mode, skip_patterns, created_at, updated_at,
      last_touched_at, suppressed, suppression_reason, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      email.trim(),
      name.trim(),
      company?.name || companyName,
      normalizeNullable(req.body.role) || null,
      toInteger(req.body.priority, 2),
      toInteger(req.body.relationship_score, 50),
      normalizeNullable(req.body.source) || 'manual',
      normalizeNullable(req.body.discovery_method) || null,
      toInteger(req.body.auto_add_mode, 0),
      normalizeNullable(req.body.skip_patterns) || null,
      timestamp,
      timestamp,
      normalizeNullable(req.body.last_touched_at) || timestamp,
      toInteger(req.body.suppressed, 0),
      normalizeNullable(req.body.suppression_reason) || null,
      normalizeNullable(req.body.notes) || null,
    ]
  );

  refreshCompanyLinkCounts();
  res.status(201).json(getContactDetail(id));
}));

app.put('/api/contacts/:id', handleRoute((req, res) => {
  ensureRecord('contacts', req.params.id, 'Contact');

  if (Object.prototype.hasOwnProperty.call(req.body, 'company')) {
    ensureCompany(normalizeNullable(req.body.company) || null, normalizeNullable(req.body.website) || null);
  }

  const { updates, params } = buildUpdateStatement(req.body, [
    'email',
    'name',
    'company',
    'role',
    'priority',
    'relationship_score',
    'source',
    'discovery_method',
    'auto_add_mode',
    'skip_patterns',
    'last_touched_at',
    'suppressed',
    'suppression_reason',
    'notes',
  ]);

  if (!updates.length) {
    throw createHttpError(400, 'No supported fields provided for update');
  }

  params.push(req.params.id);
  db.run(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, params);
  refreshCompanyLinkCounts();
  res.json(getContactDetail(req.params.id));
}));

app.delete('/api/contacts/:id', handleRoute((req, res) => {
  ensureRecord('contacts', req.params.id, 'Contact');

  db.run(
    'UPDATE contacts SET suppressed = 1, suppression_reason = ?, updated_at = ? WHERE id = ?',
    [normalizeNullable(req.body?.reason) || 'Soft deleted via API', nowIso(), req.params.id]
  );

  res.json(getContactDetail(req.params.id));
}));

app.get('/api/discovery/stats', handleRoute((req, res) => {
  const counts = db.getOne(
    `SELECT
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
     FROM discovery_review`
  ) || { pending: 0, approved: 0, rejected: 0 };

  const lastAutocheck = db.getOne(
    'SELECT created_at FROM daily_digest_log ORDER BY created_at DESC LIMIT 1'
  )?.created_at;

  const decisionsSinceLastAutocheck = lastAutocheck
    ? db.getOne(
        `SELECT COUNT(*) AS total
         FROM discovery_review
         WHERE decision_at IS NOT NULL
           AND decision_at > ?`,
        [lastAutocheck]
      )?.total || 0
    : db.getOne(
        'SELECT COUNT(*) AS total FROM discovery_review WHERE decision_at IS NOT NULL'
      )?.total || 0;

  res.json({
    pending: counts.pending || 0,
    approved: counts.approved || 0,
    rejected: counts.rejected || 0,
    decisions_since_last_autocheck: decisionsSinceLastAutocheck,
    last_autocheck: lastAutocheck || null,
  });
}));

app.get('/api/discovery', handleRoute((req, res) => {
  const items = db.all(
    `SELECT *
     FROM discovery_review
     WHERE status = 'pending'
     ORDER BY created_at DESC`
  );

  res.json({ items, count: items.length });
}));

app.post('/api/discovery/:id/approve', handleRoute((req, res) => {
  const entry = ensureRecord('discovery_review', req.params.id, 'Discovery entry');
  const timestamp = nowIso();
  const decidedBy = normalizeNullable(req.body?.decided_by) || 'system';

  const runApproval = db.transaction(() => {
    const company = ensureCompany(entry.company || null, null);
    let contact = db.getOne('SELECT * FROM contacts WHERE email = ?', [entry.email]);

    if (!contact) {
      const contactId = uuid();
      db.run(
        `INSERT INTO contacts (
          id, email, name, company, role, priority, relationship_score, source,
          discovery_method, auto_add_mode, skip_patterns, created_at, updated_at,
          last_touched_at, suppressed, suppression_reason, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contactId,
          entry.email,
          entry.name || entry.email,
          company?.name || entry.company || null,
          entry.role || null,
          2,
          50,
          'discovery_approval',
          entry.source,
          0,
          null,
          timestamp,
          timestamp,
          timestamp,
          0,
          null,
          'Approved from discovery review queue.',
        ]
      );
      contact = db.getOne('SELECT * FROM contacts WHERE id = ?', [contactId]);
    }

    db.run(
      'UPDATE discovery_review SET status = ?, decision_at = ?, decided_by = ? WHERE id = ?',
      ['approved', timestamp, decidedBy, entry.id]
    );

    refreshCompanyLinkCounts();

    return {
      discovery: db.getOne('SELECT * FROM discovery_review WHERE id = ?', [entry.id]),
      contact: getContactDetail(contact.id),
    };
  });

  res.json(runApproval());
}));

app.post('/api/discovery/:id/reject', handleRoute((req, res) => {
  const entry = ensureRecord('discovery_review', req.params.id, 'Discovery entry');
  const timestamp = nowIso();
  const decidedBy = normalizeNullable(req.body?.decided_by) || 'system';

  db.run(
    'UPDATE discovery_review SET status = ?, decision_at = ?, decided_by = ? WHERE id = ?',
    ['rejected', timestamp, decidedBy, entry.id]
  );

  res.json({
    item: db.getOne('SELECT * FROM discovery_review WHERE id = ?', [entry.id]),
  });
}));

app.post('/api/discovery/:id/skip', handleRoute((req, res) => {
  const entry = ensureRecord('discovery_review', req.params.id, 'Discovery entry');
  const timestamp = nowIso();
  const decidedBy = normalizeNullable(req.body?.decided_by) || 'system';
  const patternType = normalizeNullable(req.body?.pattern_type) || 'email';
  const patternValue = normalizeNullable(req.body?.pattern_value) || entry.email;

  const runSkip = db.transaction(() => {
    let skipPattern = db.getOne(
      'SELECT * FROM skip_patterns WHERE pattern_type = ? AND pattern_value = ? LIMIT 1',
      [patternType, patternValue]
    );

    if (skipPattern) {
      db.run(
        'UPDATE skip_patterns SET hit_count = hit_count + 1, updated_at = ? WHERE id = ?',
        [timestamp, skipPattern.id]
      );
      skipPattern = db.getOne('SELECT * FROM skip_patterns WHERE id = ?', [skipPattern.id]);
    } else {
      const skipPatternId = uuid();
      db.run(
        `INSERT INTO skip_patterns (
          id, pattern_type, pattern_value, hit_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [skipPatternId, patternType, patternValue, 1, timestamp, timestamp]
      );
      skipPattern = db.getOne('SELECT * FROM skip_patterns WHERE id = ?', [skipPatternId]);
    }

    db.run(
      `UPDATE discovery_review
       SET status = ?, skip_pattern_id = ?, decision_at = ?, decided_by = ?
       WHERE id = ?`,
      ['rejected', skipPattern.id, timestamp, decidedBy, entry.id]
    );

    return {
      item: db.getOne('SELECT * FROM discovery_review WHERE id = ?', [entry.id]),
      skip_pattern: skipPattern,
    };
  });

  res.json(runSkip());
}));

app.get('/api/followups', handleRoute((req, res) => {
  let sql = `SELECT follow_ups.*, contacts.name AS contact_name, contacts.email AS contact_email
             FROM follow_ups
             LEFT JOIN contacts ON contacts.id = follow_ups.contact_id
             WHERE 1 = 1`;
  const params = [];

  if (req.query.status) {
    sql += ' AND follow_ups.status = ?';
    params.push(req.query.status);
  }

  if (req.query.due_before) {
    sql += ' AND follow_ups.due_date <= ?';
    params.push(req.query.due_before);
  }

  if (req.query.due_after) {
    sql += ' AND follow_ups.due_date >= ?';
    params.push(req.query.due_after);
  }

  if (req.query.contact_id) {
    sql += ' AND follow_ups.contact_id = ?';
    params.push(req.query.contact_id);
  }

  sql += ' ORDER BY follow_ups.due_date ASC, follow_ups.created_at DESC';
  const items = db.all(sql, params);

  res.json({ items, count: items.length });
}));

app.post('/api/followups', handleRoute((req, res) => {
  if (!req.body.contact_id) {
    throw createHttpError(400, 'contact_id is required');
  }

  ensureRecord('contacts', req.body.contact_id, 'Contact');

  const timestamp = nowIso();
  const id = uuid();

  db.run(
    `INSERT INTO follow_ups (
      id, contact_id, due_date, snoozed_until, status, priority, reason,
      recurrence, last_touched, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.body.contact_id,
      normalizeNullable(req.body.due_date) || null,
      normalizeNullable(req.body.snoozed_until) || null,
      normalizeNullable(req.body.status) || 'pending',
      toInteger(req.body.priority, 2),
      normalizeNullable(req.body.reason) || null,
      normalizeNullable(req.body.recurrence) || null,
      normalizeNullable(req.body.last_touched) || null,
      timestamp,
      timestamp,
    ]
  );

  res.status(201).json(db.getOne('SELECT * FROM follow_ups WHERE id = ?', [id]));
}));

app.put('/api/followups/:id', handleRoute((req, res) => {
  ensureRecord('follow_ups', req.params.id, 'Follow-up');

  const payload = { ...req.body };
  if (payload.action === 'complete') {
    payload.status = 'completed';
  }
  if (payload.action === 'dismiss') {
    payload.status = 'dismissed';
  }
  if (payload.action === 'snooze') {
    payload.status = 'snoozed';
  }

  delete payload.action;

  const { updates, params } = buildUpdateStatement(payload, [
    'due_date',
    'snoozed_until',
    'status',
    'priority',
    'reason',
    'recurrence',
    'last_touched',
  ]);

  if (!updates.length) {
    throw createHttpError(400, 'No supported fields provided for update');
  }

  params.push(req.params.id);
  db.run(`UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json(db.getOne('SELECT * FROM follow_ups WHERE id = ?', [req.params.id]));
}));

app.delete('/api/followups/:id', handleRoute((req, res) => {
  ensureRecord('follow_ups', req.params.id, 'Follow-up');
  db.run('DELETE FROM follow_ups WHERE id = ?', [req.params.id]);
  res.json({ ok: true, id: req.params.id });
}));

app.get('/api/interactions', handleRoute((req, res) => {
  const limit = clamp(toInteger(req.query.limit, 50), 1, 200);
  let sql = `SELECT interactions.*, contacts.name AS contact_name, contacts.email AS contact_email
             FROM interactions
             LEFT JOIN contacts ON contacts.id = interactions.contact_id
             WHERE 1 = 1`;
  const params = [];

  if (req.query.contact_id) {
    sql += ' AND interactions.contact_id = ?';
    params.push(req.query.contact_id);
  }

  if (req.query.type) {
    sql += ' AND interactions.type = ?';
    params.push(req.query.type);
  }

  sql += ' ORDER BY interactions.happened_at DESC, interactions.created_at DESC LIMIT ?';
  params.push(limit);

  const items = db.all(sql, params);
  res.json({ items, count: items.length });
}));

app.post('/api/interactions', handleRoute((req, res) => {
  if (!req.body.contact_id || !req.body.type) {
    throw createHttpError(400, 'contact_id and type are required');
  }

  ensureRecord('contacts', req.body.contact_id, 'Contact');

  if (req.body.company_id) {
    ensureRecord('companies', req.body.company_id, 'Company');
  }

  const timestamp = nowIso();
  const id = uuid();

  db.run(
    `INSERT INTO interactions (
      id, contact_id, company_id, type, direction, subject, body_preview,
      thread_id, source_id, happened_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.body.contact_id,
      normalizeNullable(req.body.company_id) || null,
      req.body.type,
      normalizeNullable(req.body.direction) || null,
      normalizeNullable(req.body.subject) || null,
      normalizeNullable(req.body.body_preview) || null,
      normalizeNullable(req.body.thread_id) || null,
      normalizeNullable(req.body.source_id) || null,
      normalizeNullable(req.body.happened_at) || timestamp,
      timestamp,
    ]
  );

  res.status(201).json(db.getOne('SELECT * FROM interactions WHERE id = ?', [id]));
}));

app.get('/api/meetings', handleRoute((req, res) => {
  const limit = clamp(toInteger(req.query.limit, 50), 1, 200);
  let sql = 'SELECT * FROM meetings WHERE 1 = 1';
  const params = [];

  if (req.query.since) {
    sql += ' AND start_time >= ?';
    params.push(req.query.since);
  }

  sql += ' ORDER BY start_time DESC, created_at DESC LIMIT ?';
  params.push(limit);

  const items = db.all(sql, params);
  res.json({ items, count: items.length });
}));

app.get('/api/meetings/:id', handleRoute((req, res) => {
  const meeting = ensureRecord('meetings', req.params.id, 'Meeting');
  const attendees = db.all(
    `SELECT meeting_attendees.*, contacts.name, contacts.email, contacts.company, contacts.role
     FROM meeting_attendees
     LEFT JOIN contacts ON contacts.id = meeting_attendees.contact_id
     WHERE meeting_attendees.meeting_id = ?`,
    [req.params.id]
  );
  const actionItems = db.all(
    `SELECT meeting_action_items.*, contacts.name AS contact_name, contacts.email AS contact_email
     FROM meeting_action_items
     LEFT JOIN contacts ON contacts.id = meeting_action_items.contact_id
     WHERE meeting_action_items.meeting_id = ?
     ORDER BY meeting_action_items.created_at DESC`,
    [req.params.id]
  );

  res.json({
    ...meeting,
    attendees,
    action_items: actionItems,
  });
}));


app.get('/api/dashboard', handleRoute((req, res) => {
  res.json(getDashboardData());
}));



// ── Graph / Discovery ─────────────────────────────────────────────────────────

// GET /api/graph/status
app.get('/api/graph/status', asyncHandler(async (req, res) => {
  const status = await graph.getStatus();
  res.json(status);
}));

// POST /api/graph/run-discovery — trigger a discovery scan
app.post('/api/graph/run-discovery', asyncHandler(async (req, res) => {
  const { daysBack = 1 } = req.body;
  const result = await discovery.runDiscovery({ daysBack });
  res.json(result);
}));

// POST /api/discovery/seed — seed mock discovery data (dev only)
app.post('/api/discovery/seed', asyncHandler(async (req, res) => {
  const result = await discovery.seedMockDiscovery();
  res.json(result);
}));

// GET /api/scoring/breakdown/:contactId — detailed score breakdown
app.get('/api/scoring/breakdown/:contactId', asyncHandler(async (req, res) => {
  const breakdown = scoring.getScoreBreakdown(req.params.contactId);
  if (!breakdown) return res.status(404).json({ error: 'Contact not found' });
  res.json(breakdown);
}));

// POST /api/scoring/recalculate — recalculate all contact scores
app.post('/api/scoring/recalculate', asyncHandler(async (req, res) => {
  const result = scoring.scoreAllContacts();
  res.json({ success: true, ...result });
}));

// GET /api/attention — contacts needing attention with nudges
app.get('/api/attention', asyncHandler(async (req, res) => {
  const contacts = scoring.getContactsNeedingAttention();
  const withNudges = contacts.map(c => ({
    ...c,
    nudge: scoring.generateNudge(c),
  }));
  res.json({ contacts: withNudges, total: withNudges.length });
}));

// ── Daily Digest ──────────────────────────────────────────────────────────────

// POST /api/daily/run — run the full daily digest
app.post('/api/daily/run', asyncHandler(async (req, res) => {
  const { dryRun = false } = req.body;
  const digest = await daily.runDailyDigest({ dryRun });
  res.json(digest);
}));

// GET /api/daily/quick — quick digest without Graph API calls
app.get('/api/daily/quick', asyncHandler(async (req, res) => {
  const digest = daily.quickDigest();
  res.json(digest);
}));

// ── Config ───────────────────────────────────────────────────────────────────

// GET /api/config — get CRM config summary
app.get('/api/config', asyncHandler(async (req, res) => {
  const autoAdd = discovery.getAutoAddStatus();
  const graphStatus = await graph.getStatus();
  const msgStatus = await messaging.getStatus();
  const draftEnabled = process.env.CRM_ENABLE_DRAFT_APPROVAL === 'true';

  res.json({
    discovery: {
      autoAddMode: autoAdd,
      threshold: discovery.AUTO_ADD_THRESHOLD,
    },
    graph: {
      configured: graphStatus.hasConfig,
      authenticated: graphStatus.authenticated,
      message: graphStatus.message,
    },
    messaging: {
      reachable: msgStatus.reachable,
    },
    emailDrafts: {
      approvalRequired: true,
      enabled: draftEnabled,
    },
  });
}));

// PUT /api/config/autoadd — enable/disable auto-add mode
app.put('/api/config/autoadd', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  const result = await discovery.setAutoAddMode(enabled);
  res.json(result);
}));

// ── Messaging ─────────────────────────────────────────────────────────────────

// POST /api/test-message — send a test message to webchat
app.post('/api/test-message', asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const result = await messaging.sendToWebchat(text);
  res.json(result);
}));

// ── Summaries ─────────────────────────────────────────────────────────────────

// POST /api/summaries/:contactId — generate/regenerate contact summary
app.post('/api/summaries/:contactId', asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const summary = await summaries.generateSummary(contactId);
  res.json(summary);
}));

// GET /api/summaries/:contactId — get latest summary
app.get('/api/summaries/:contactId', asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const summary = summaries.getSummary(contactId);
  if (!summary) return res.status(404).json({ error: 'No summary found' });
  res.json(summary);
}));

// POST /api/summaries/regenerate-stale — batch regenerate old summaries
app.post('/api/summaries/regenerate-stale', asyncHandler(async (req, res) => {
  const result = await summaries.regenerateStaleSummaries();
  res.json(result);
}));

// ── Email Drafts ───────────────────────────────────────────────────────────────

// POST /api/drafts — generate a new draft
app.post('/api/drafts', asyncHandler(async (req, res) => {
  const { contact_id, follow_up_reason, tone, thread_ref, include_thread } = req.body;
  if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });

  const validTone = drafts.validateTone(tone || 'professional');
  const draft = await drafts.generateDraft(contact_id, {
    followUpReason: follow_up_reason,
    tone: validTone,
    threadRef: thread_ref,
    includeThread: include_thread,
  });

  res.status(201).json(draft);
}));

// GET /api/drafts — list drafts
app.get('/api/drafts', asyncHandler(async (req, res) => {
  const { status, contact_id } = req.query;
  let sql = `SELECT d.*, c.name as contact_name, c.email as contact_email
             FROM email_drafts d
             LEFT JOIN contacts c ON d.contact_id = c.id
             WHERE 1=1`;
  const params = [];
  if (status) { sql += ` AND d.status = ?`; params.push(status); }
  if (contact_id) { sql += ` AND d.contact_id = ?`; params.push(contact_id); }
  sql += ` ORDER BY d.proposed_at DESC LIMIT 50`;
  const draftRows = db.all(sql, params);
  const pending = drafts.pendingCount();
  res.json({ drafts: draftRows, pendingApproval: pending });
}));

// POST /api/drafts/:id/approve — approve draft (creates in email client)
app.post('/api/drafts/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const draft = db.getOne(`SELECT * FROM email_drafts WHERE id = ?`, [id]);
  if (!draft) return res.status(404).json({ error: 'Draft not found' });
  if (draft.status !== 'proposed') return res.status(409).json({ error: `Draft already ${draft.status}` });

  // Safety: require explicit approval (enforced here — no silent auto-approve)
  const approved = drafts.approveDraft(id, 'user');
  res.json({ ...approved, _notice: 'Draft approved. Open your email client to create and send.' });
}));

// POST /api/drafts/:id/reject — discard draft
app.post('/api/drafts/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const result = drafts.rejectDraft(id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}));

// GET /api/drafts/tones — valid tone options
app.get('/api/drafts/tones', (req, res) => {
  res.json({ tones: drafts.VALID_TONES });
});

// ── Outbound Queue ───────────────────────────────────────────────────────────

// GET /api/outbound/readiness — system-level send gates
app.get('/api/outbound/readiness', asyncHandler(async (req, res) => {
  const result = await getQueueReadiness();
  res.json(result);
}));

// GET /api/outbound/queue — scan LEADS/ for leads with PITCH.md
app.get('/api/outbound/queue', asyncHandler(async (req, res) => {
  const items = [];
  if (!fs.existsSync(LEADS_DIR)) return res.json({ items: [], count: 0 });

  // Get system-level readiness once for all items
  const readiness = await getQueueReadiness();
  const { mailboxReady, policyReady } = readiness;

  const dirs = fs.readdirSync(LEADS_DIR).filter(d =>
    fs.statSync(path.join(LEADS_DIR, d)).isDirectory()
  );

  for (const dir of dirs) {
    const leadDir = path.join(LEADS_DIR, dir);
    const pitchPath = path.join(leadDir, 'PITCH.md');
    if (!fs.existsSync(pitchPath)) continue;

    // Read STATUS.md for stage, score, lastUpdated
    let stage = 'unknown', score = null, lastUpdated = null;
    const statusPath = path.join(leadDir, 'STATUS.md');
    if (fs.existsSync(statusPath)) {
      const statusContent = fs.readFileSync(statusPath, 'utf8');
      const stageMatch = statusContent.match(/\*\*Current Stage:\*\*\s*(\S+)/);
      const scoreMatch = statusContent.match(/\*\*Score:\*\*\s*(\d+)/);
      const updatedMatch = statusContent.match(/lastUpdated:\s*(\S+)/);
      if (stageMatch) stage = stageMatch[1].replace(/,/g, '').toLowerCase().replace(/[_\s-]+/g, '_');
      if (scoreMatch) score = Number(scoreMatch[1]);
      if (updatedMatch) lastUpdated = updatedMatch[1];
    }

    // Read OUTREACH.json — migrate old schema on read, initialize new-schema default if no file
    const outreachPath = path.join(leadDir, 'OUTREACH.json');
    let outreachStage = stage;
    let sentAt = null;
    let contentApproval = null;
    let contentApprovedBy = null;
    let contentApprovedAt = null;
    let deploymentApproval = null;
    let deploymentApprovedBy = null;
    let deploymentApprovedAt = null;
    let deploymentBlockedBy = [];
    let warnings = [];
    let lastAction = null;
    let lastActionAt = null;

    if (fs.existsSync(outreachPath)) {
      try {
        const outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));

        // Backward-compat migration for old schema (only set if not already present)
        if (outreach.outreachStage === 'approved') {
          if (outreach.contentApproval == null) outreach.contentApproval = 'approved';
          if (outreach.deploymentApproval == null) outreach.deploymentApproval = 'pending';
          outreach.outreachStage = 'content_approved';
        } else if (outreach.outreachStage === 'approval_queued') {
          if (outreach.contentApproval == null) outreach.contentApproval = 'pending';
          outreach.outreachStage = 'awaiting_content_approval';
        }
        // 'sent', 'rejected' etc. — keep as terminal, no migration needed

        outreachStage = outreach.outreachStage || stage;
        sentAt = outreach.sentAt || null;
        contentApproval = outreach.contentApproval || null;
        contentApprovedBy = outreach.contentApprovedBy || null;
        contentApprovedAt = outreach.contentApprovedAt || null;
        deploymentApproval = outreach.deploymentApproval || null;
        deploymentApprovedBy = outreach.deploymentApprovedBy || null;
        deploymentApprovedAt = outreach.deploymentApprovedAt || null;
        deploymentBlockedBy = Array.isArray(outreach.deploymentBlockedBy) ? outreach.deploymentBlockedBy : [];
        warnings = Array.isArray(outreach.warnings) ? outreach.warnings : [];
        lastAction = outreach.lastAction || null;
        lastActionAt = outreach.lastActionAt || null;
      } catch (_) {}
    } else {
      // No OUTREACH.json — initialize new-schema defaults from STATUS.md stage
      const s = stage || 'unknown';
      if (s === 'approved') {
        outreachStage = 'content_approved';
        contentApproval = 'approved';
      } else if (s === 'approval_queued' || s === 'awaiting_content_approval') {
        outreachStage = 'awaiting_content_approval';
        contentApproval = 'pending';
      } else if (['sent', 'failed', 'suppressed', 'rejected'].includes(s)) {
        outreachStage = s;
      } else {
        outreachStage = 'draft_ready';
        contentApproval = null;
      }
      deploymentApproval = null;
    }

    // Read LEAD_RECORD.md for email
    let email = '';
    const recordPath = path.join(leadDir, 'LEAD_RECORD.md');
    if (fs.existsSync(recordPath)) {
      const recordContent = fs.readFileSync(recordPath, 'utf8');
      const emailMatch = recordContent.match(/\*\*Contact Email:\*\*\s*(\S+@\S+)/);
      if (emailMatch) email = emailMatch[1];
    }

    // Read PITCH.md for subject, hook type, word count, preview
    const pitchContent = fs.readFileSync(pitchPath, 'utf8');
    const subjectMatch = pitchContent.match(/\*\*Subject:\*\*\s*(.+)/);
    const hookMatch = pitchContent.match(/\*\*Hook type:\*\*\s*(.+)/);

    let subject = dir, hookType = '', preview = '', wordCount = 0, emailBody = '';
    if (subjectMatch) subject = subjectMatch[1].trim();
    if (hookMatch) hookType = hookMatch[1].trim();

    // Extract ## Email Draft section
    const emailDraftIdx = pitchContent.indexOf('## Email Draft');
    if (emailDraftIdx >= 0) {
      const afterDraft = pitchContent.substring(emailDraftIdx);
      const dashIdx = afterDraft.indexOf('---');
      if (dashIdx > 0) {
        const afterFirstDash = afterDraft.substring(dashIdx + 3);
        const nextDashIdx = afterFirstDash.indexOf('---');
        emailBody = (nextDashIdx >= 0 ? afterFirstDash.substring(0, nextDashIdx) : afterFirstDash).trim();
        wordCount = emailBody.split(/\s+/).filter(Boolean).length;
        preview = emailBody.substring(0, 150).replace(/\n/g, ' ').trim();
        if (emailBody.length > 150) preview += '…';
      }
    }

    // Brian-specific warning: check for St. Brendan's or Walkinstown in pitch body
    if (dir === 'brian-mcgarry-plumber') {
      if (pitchContent.includes("St. Brendan's") || pitchContent.includes('Walkinstown')) {
        if (!warnings.find(w => w.includes("St. Brendan's") || w.includes('Walkinstown'))) {
          warnings.push("Pitch contains address reference (St. Brendan's Crescent, Walkinstown) — verify this is intentional and accurate before sending.");
        }
      }
    }

    const name = dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Per-lead blockers + merge with system blockers
    const { blockers: leadBlockers, warnings: leadWarnings } = getLeadBlockers(leadDir);
    const itemBlockers = [...leadBlockers];
    const itemWarnings = [...warnings, ...leadWarnings];

    // Determine sendReadiness — merge system blockers with per-lead blockers
    const allBlockers = [...readiness.systemBlockers, ...itemBlockers];
    const sendReady = (
      contentApproval === 'approved' &&
      deploymentApproval === 'approved' &&
      allBlockers.length === 0
    );
    const sendBlockedReason = sendReady ? null : (allBlockers[0] || null);

    items.push({
      id: dir,
      name,
      company: name,
      score: score,
      email,
      outreachStage,
      contentApproval,
      contentApprovedBy,
      contentApprovedAt,
      deploymentApproval,
      deploymentApprovedBy,
      deploymentApprovedAt,
      deploymentBlockedBy: allBlockers,
      warnings: itemWarnings,
      pitch: { subject, preview, hookType, wordCount, body: emailBody },
      lastUpdated,
      sentAt,
      lastAction,
      lastActionAt,
      mailboxReady,
      policyReady,
      sendReady,
      sendBlockedReason,
    });
  }

  res.json({ items, count: items.length, mailboxReady, policyReady });
}));

// POST /api/outbound/leads/:id/transition — two-gate approve/send/suppress
app.post('/api/outbound/leads/:id/transition', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  const VALID_ACTIONS = [
    'content_approve', 'content_revoke',
    'deploy_approve', 'deploy_revoke',
    'send', 'suppress', 'unsuppress', 'reactivate'
  ];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}. Valid: ${VALID_ACTIONS.join(', ')}` });
  }

  const leadDir = path.join(LEADS_DIR, id);
  if (!fs.existsSync(leadDir)) {
    return res.status(404).json({ error: `Lead directory not found: ${id}` });
  }

  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  let outreach = {};
  if (fs.existsSync(outreachPath)) {
    try { outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8')); } catch (_) {}
  }

  // Migrate old schema on read
  if (outreach.outreachStage === 'approved') {
    outreach.contentApproval = 'approved';
    outreach.deploymentApproval = 'pending';
    outreach.outreachStage = 'content_approved';
  } else if (outreach.outreachStage === 'approval_queued') {
    outreach.contentApproval = 'pending';
    outreach.outreachStage = 'awaiting_content_approval';
  }

  const currentStage = outreach.outreachStage || 'draft_ready';
  const TERMINAL_STATES = ['sent', 'failed', 'suppressed', 'rejected'];

  // Terminal state guard (except reactivate/unsuppress which can re-enter)
  if (TERMINAL_STATES.includes(currentStage) && !['reactivate', 'unsuppress'].includes(action)) {
    return res.status(409).json({ error: `Lead is in terminal state: ${currentStage}. Action '${action}' is not permitted.` });
  }

  const timestamp = nowIso();
  const ACTOR = 'Nero';

  // Helper: write OUTREACH.json + timeline entry
  function writeOutreach(updates, timelineEntry) {
    Object.assign(outreach, updates);
    fs.writeFileSync(outreachPath, JSON.stringify(outreach, null, 2));
    appendTimeline(leadDir, { leadName: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), ...timelineEntry });
    return { ...outreach };
  }

  // ── content_approve ─────────────────────────────────────────────────────────
  if (action === 'content_approve') {
    const from = outreach.outreachStage || 'awaiting_content_approval';
    const result = writeOutreach({
      contentApproval: 'approved',
      contentApprovedBy: ACTOR,
      contentApprovedAt: timestamp,
      outreachStage: 'content_approved',
      lastAction: 'content_approved',
      lastActionAt: timestamp,
    }, { timestamp, action: 'content_approved', actor: ACTOR, from, notes: 'Pitch reviewed and approved.' });
    return res.json(result);
  }

  // ── content_revoke ───────────────────────────────────────────────────────────
  if (action === 'content_revoke') {
    const from = outreach.outreachStage || 'content_approved';
    const result = writeOutreach({
      contentApproval: 'revoked',
      outreachStage: 'rejected',
      lastAction: 'content_rejected',
      lastActionAt: timestamp,
    }, { timestamp, action: 'content_rejected', actor: ACTOR, from, notes: 'Pitch revoked.' });
    return res.json(result);
  }

  // ── deploy_approve ──────────────────────────────────────────────────────────
  if (action === 'deploy_approve') {
    const from = outreach.outreachStage || 'content_approved';
    // Determine next stage based on system gates
    const readiness = await getQueueReadiness();
    const { blockers: leadBlockers } = getLeadBlockers(leadDir);
    const allBlockers = [...readiness.systemBlockers, ...leadBlockers];
    const nextStage = allBlockers.length === 0 ? 'awaiting_send' : 'send_blocked';
    const result = writeOutreach({
      deploymentApproval: 'approved',
      deploymentApprovedBy: ACTOR,
      deploymentApprovedAt: timestamp,
      outreachStage: nextStage,
      lastAction: 'deploy_approved',
      lastActionAt: timestamp,
    }, { timestamp, action: 'deploy_approved', actor: ACTOR, from, notes: `Deployment approved. Next stage: ${nextStage}.` });
    return res.json(result);
  }

  // ── deploy_revoke ───────────────────────────────────────────────────────────
  if (action === 'deploy_revoke') {
    const from = outreach.outreachStage || 'awaiting_send';
    const result = writeOutreach({
      deploymentApproval: 'revoked',
      outreachStage: 'content_approved',
      lastAction: 'deploy_revoked',
      lastActionAt: timestamp,
    }, { timestamp, action: 'deploy_revoked', actor: ACTOR, from, notes: 'Deployment approval revoked.' });
    return res.json(result);
  }

  // ── send ────────────────────────────────────────────────────────────────────
  if (action === 'send') {
    // Send gate: check all system + lead blockers
    const readiness = await getQueueReadiness();
    const { blockers: leadBlockers, warnings: leadWarnings } = getLeadBlockers(leadDir);
    const allBlockers = [...readiness.systemBlockers, ...leadBlockers];

    if (allBlockers.length > 0) {
      return res.status(409).json({
        error: 'Cannot send — deployment blocked',
        blockedBy: allBlockers,
        warnings: leadWarnings,
      });
    }
    if (outreach.deploymentApproval !== 'approved') {
      return res.status(409).json({ error: 'Deployment not approved' });
    }

    const pitchPath = path.join(leadDir, 'PITCH.md');
    if (!fs.existsSync(pitchPath)) {
      return res.status(404).json({ error: 'PITCH.md not found' });
    }
    const pitchContent = fs.readFileSync(pitchPath, 'utf8');

    // Extract subject
    const subjectMatch = pitchContent.match(/\*\*Subject:\*\*\s*(.+)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : id;

    // Extract recipient
    const toMatch = pitchContent.match(/\*\*To:\*\*\s*(\S+@\S+)/);
    const recipient = toMatch ? toMatch[1].trim() : '';

    // Extract email body
    const rawBody = (() => {
      const emailDraftIdx = pitchContent.indexOf('## Email Draft');
      if (emailDraftIdx < 0) return '';
      const afterDraft = pitchContent.substring(emailDraftIdx);
      const dashIdx = afterDraft.indexOf('---');
      if (dashIdx < 0) return '';
      const afterFirstDash = afterDraft.substring(dashIdx + 3);
      const nextDashIdx = afterFirstDash.indexOf('---');
      return (nextDashIdx >= 0 ? afterFirstDash.substring(0, nextDashIdx) : afterFirstDash).trim();
    })();

    const htmlContent = simpleMarkdownToHtml(rawBody);

    try {
      const token = graph.getAccessToken();
      const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            from: { address: 'studio@verdantia.it' },
            toRecipients: [{ emailAddress: { address: recipient } }],
            subject,
            body: { contentType: 'HTML', content: htmlContent },
          },
          saveToSentItems: false,
        }),
      });

      if (!graphRes.ok) {
        const errBody = await graphRes.json().catch(() => ({}));
        return res.status(500).json({ error: `Graph API error: ${errBody.error?.message || graphRes.statusText}` });
      }
    } catch (graphErr) {
      return res.status(500).json({ error: `Graph API error: ${graphErr.message}` });
    }

    const from = outreach.outreachStage;
    const result = writeOutreach({
      outreachStage: 'sent',
      lastAction: 'send',
      lastActionAt: timestamp,
      sentAt: timestamp,
    }, { timestamp, action: 'sent', actor: ACTOR, from, notes: `Email sent to ${recipient}.` });
    return res.json(result);
  }

  // ── suppress ─────────────────────────────────────────────────────────────────
  if (action === 'suppress') {
    const from = outreach.outreachStage || 'unknown';
    // Touch the SUPPRESSED.md file
    const suppressPath = path.join(leadDir, 'SUPPRESSED.md');
    fs.writeFileSync(suppressPath, `# Suppressed\n\n**Suppressed by:** ${ACTOR}\n**At:** ${timestamp}\n\n`, 'utf8');
    const result = writeOutreach({
      outreachStage: 'suppressed',
      lastAction: 'suppress',
      lastActionAt: timestamp,
    }, { timestamp, action: 'suppressed', actor: ACTOR, from, notes: 'Manually suppressed.' });
    return res.json(result);
  }

  // ── unsuppress ───────────────────────────────────────────────────────────────
  if (action === 'unsuppress') {
    const suppressPath = path.join(leadDir, 'SUPPRESSED.md');
    if (fs.existsSync(suppressPath)) fs.unlinkSync(suppressPath);
    const from = outreach.outreachStage;
    const result = writeOutreach({
      outreachStage: outreach.contentApproval === 'approved' ? 'content_approved' : 'awaiting_content_approval',
      lastAction: 'unsuppressed',
      lastActionAt: timestamp,
    }, { timestamp, action: 'unsuppressed', actor: ACTOR, from, notes: 'Suppression removed.' });
    return res.json(result);
  }

  // ── reactivate ───────────────────────────────────────────────────────────────
  if (action === 'reactivate') {
    const from = outreach.outreachStage || 'unknown';
    const result = writeOutreach({
      contentApproval: 'pending',
      deploymentApproval: 'pending',
      outreachStage: 'awaiting_content_approval',
      lastAction: 'reactivated',
      lastActionAt: timestamp,
    }, { timestamp, action: 'reactivated', actor: ACTOR, from, notes: 'Reactivated for content review.' });
    return res.json(result);
  }
}));

// Simple markdown-to-HTML converter for email bodies
function simpleMarkdownToHtml(md) {
  if (!md) return '';
  // Strip the To:/Subject: metadata lines at the top
  const lines = md.split('\n');
  const filtered = lines.filter(l => !l.match(/^\*\*To:\*\*/) && !l.match(/^\*\*Subject:\*\*/) && !l.startsWith('---'));
  let text = filtered.join('\n').trim();

  // Wrap paragraphs (split on double newline or bullet markers)
  const paragraphs = text.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>').replace(/<br><br>/g, '<br>'));
  const html = paragraphs.map(p => {
    // Strip bullet markers but keep text
    const cleaned = p.replace(/^[-*]\s+/g, '').replace(/<br>[-*]\s+/g, '<br>');
    return `<p>${cleaned}</p>`;
  }).join('\n');

  return html || `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

// ── NL Query (upgraded) ───────────────────────────────────────────────────────

// POST /api/query — natural language query (now with LLM if configured)
app.post('/api/query', asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const parsed = await llm.parseQuery(query);
  let results = [];
  let response = null;

  switch (parsed.intent) {
    case 'search_contacts':
      results = db.all(
        `SELECT id, name, email, company, relationship_score, last_touched_at
         FROM contacts WHERE suppressed = 0 AND (name LIKE ? OR email LIKE ? OR company LIKE ?)
         LIMIT 10`,
        [`%${parsed.entities?.name || ''}%`, `%${parsed.entities?.name || ''}%`, `%${parsed.entities?.company || ''}%`]
      );
      response = parsed.response_hint || `${results.length} contact(s) found`;
      break;

    case 'about_contact': {
      const name = parsed.entities?.name;
      if (name) {
        const contact = db.getOne(
          `SELECT * FROM contacts WHERE suppressed = 0 AND (name LIKE ? OR email LIKE ?) LIMIT 1`,
          [`%${name}%`, `%${name}%`]
        );
        if (contact) {
          const summary = summaries.getSummary(contact.id);
          const followUps = db.all(`SELECT * FROM follow_ups WHERE contact_id = ? AND status = 'pending' ORDER BY due_date ASC`, [contact.id]);
          response = parsed.response_hint || `Showing ${contact.name}'s dossier`;
          results = [{ ...contact, summary, follow_ups: followUps }];
        } else {
          response = `No contact found matching "${name}"`;
        }
      }
      break;
    }

    case 'followup_list':
      results = db.all(
        `SELECT fu.*, c.name as contact_name, c.email as contact_email
         FROM follow_ups fu LEFT JOIN contacts c ON fu.contact_id = c.id
         WHERE fu.status = 'pending' ORDER BY fu.due_date ASC LIMIT 20`
      );
      response = parsed.response_hint || `${results.length} pending follow-up(s)`;
      break;

    case 'who_needs_attention':
      results = scoring.getContactsNeedingAttention().map(c => ({
        ...c,
        nudge: scoring.generateNudge(c),
      }));
      response = parsed.response_hint || `${results.length} contact(s) need attention`;
      break;

    case 'stats': {
      const total = db.get(`SELECT COUNT(*) as c FROM contacts WHERE suppressed = 0`)?.c || 0;
      const newWeek = db.get(`SELECT COUNT(*) as c FROM contacts WHERE created_at >= datetime('now', '-7 days')`)?.c || 0;
      const pendingDrafts = drafts.pendingCount();
      const discoveryQueue = db.get(`SELECT COUNT(*) as c FROM discovery_review WHERE status = 'pending'`)?.c || 0;
      results = { total, newThisWeek: newWeek, pendingDrafts, discoveryQueue };
      response = parsed.response_hint || `CRM stats retrieved`;
      break;
    }

    case 'discovery_queue':
      results = db.all(`SELECT * FROM discovery_review WHERE status = 'pending' ORDER BY signal_count DESC LIMIT 20`);
      response = parsed.response_hint || `${results.length} pending in discovery queue`;
      break;

    case 'weekly_summary':
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const newContacts = db.get(`SELECT COUNT(*) as c FROM contacts WHERE created_at >= ?`, [weekAgo])?.c || 0;
      const newInteractions = db.get(`SELECT COUNT(*) as c FROM interactions WHERE created_at >= ?`, [weekAgo])?.c || 0;
      results = { newContacts, newInteractions };
      response = `This week: ${newContacts} new contacts, ${newInteractions} interactions`;
      break;

    default:
      // Keyword fallback
      results = db.all(
        `SELECT id, name, email, company, relationship_score FROM contacts
         WHERE suppressed = 0 AND (name LIKE ? OR company LIKE ?)
         LIMIT 5`,
        [`%${query}%`, `%${query}%`]
      );
      response = `${results.length} result(s) for "${query}"`;
    }

    res.json({ query, parsed, results, response, count: Array.isArray(results) ? results.length : 1 });
}));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Verdantia CRM API running at http://localhost:${PORT}`);
  });
}

module.exports = app;
