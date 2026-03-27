const express = require('express');
const cors = require('cors');

const { db, uuid } = require('./db/database');
const llm = require('./adapters/llm');
const graph = require('./adapters/graph');
const messaging = require('./adapters/messaging');
const discovery = require('./services/discovery');
const scoring = require('./services/scoring');
const daily = require('./services/daily');
const summaries = require('./services/summaries');
const drafts = require('./services/drafts');

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
