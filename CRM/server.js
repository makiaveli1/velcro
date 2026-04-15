const express = require('express');
const cors = require('cors');
const fs = require('fs');

// ── Shared constants ────────────────────────────────────────────────────────────
const PRIORITY_INT = { critical: 1, high: 2, normal: 3, low: 4 };
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

const OUTREACH_POLICY_PATH = path.join(__dirname, '..', 'outreach-policy.md');

function normalizeExpiryMs(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() && Number.isNaN(Number(value))) {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 1e12 ? numeric : numeric * 1000;
}

function getTokenInfo(graphStatus = {}) {
  const expiresAtMs = normalizeExpiryMs(graphStatus?.expiresAtMs ?? graphStatus?.expiresAt);
  return {
    tokenLoaded: !!graphStatus?.tokenLoaded,
    expiresAtMs,
    expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    tokenAgeMinutes: expiresAtMs ? Math.round((Date.now() - expiresAtMs) / 60000) : null,
  };
}

function getPolicyDetail() {
  const filePath = OUTREACH_POLICY_PATH;
  const fileExists = fs.existsSync(filePath);
  return {
    filePath,
    fileExists,
    fileMissing: !fileExists,
    ready: fileExists,
    reason: fileExists ? 'Policy defined' : 'Outreach policy not defined',
  };
}

function getMailboxDetail(graphStatus = {}, tokenInfo = getTokenInfo(graphStatus)) {
  const configured = !!graphStatus?.hasConfig;
  const authenticated = !!graphStatus?.authenticated;
  const tokenHealthy = tokenInfo.expiresAtMs != null ? tokenInfo.expiresAtMs >= Date.now() : false;

  let blockerCode = 'ready';
  let reason = 'Mailbox ready — Graph is authenticated and token is healthy';
  let nextFix = 'No action required.';

  if (!configured) {
    blockerCode = 'not_configured';
    reason = 'Mailbox not configured — Graph setup required';
    nextFix = 'Add CRM/config/graph.json so Microsoft Graph can be configured.';
  } else if (authenticated && tokenHealthy) {
    reason = 'Mailbox ready — Graph is authenticated and token is healthy';
  } else if (tokenInfo.tokenLoaded && !tokenHealthy) {
    blockerCode = 'token_expired';
    reason = 'Graph token expired — refresh the stored token';
    nextFix = 'Refresh the expired Graph token from Settings.';
  } else {
    blockerCode = 'not_authenticated';
    reason = graphStatus?.message && graphStatus.message !== 'Not authenticated — run setup()'
      ? `Graph not authenticated — ${graphStatus.message}`
      : 'Graph not authenticated — authentication required';
    nextFix = 'Start Microsoft Graph authentication from Settings.';
  }

  return {
    configured,
    authenticated,
    tokenHealthy,
    sharedMailboxConfigured: false,
    sendAsVerified: false,
    reason,
    blockerCode,
    nextFix,
  };
}

// System-level gates that block deployment regardless of human approval
async function getSystemReadiness() {
  const graphStatus = await graph.getStatus();
  const tokenInfo = getTokenInfo(graphStatus);
  const mailboxDetail = getMailboxDetail(graphStatus, tokenInfo);
  const policyDetail = getPolicyDetail();
  const blockers = [];
  const warnings = [];

  const mailboxReady = mailboxDetail.authenticated && mailboxDetail.tokenHealthy;
  const policyReady = policyDetail.fileExists;

  if (!mailboxReady) blockers.push('mailbox');
  if (!policyReady) blockers.push('policy');

  return {
    mailboxReady,
    policyReady,
    mailboxDetail,
    policyDetail,
    tokenInfo,
    graphStatus,
    blockers,
    warnings,
    systemBlockers: blockers,
    systemWarnings: warnings,
  };
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
  const systemBlockers = system.systemBlockers || system.blockers || [];
  const systemWarnings = system.systemWarnings || system.warnings || [];
  return {
    mailboxReady: system.mailboxReady,
    policyReady: system.policyReady,
    mailboxDetail: system.mailboxDetail,
    policyDetail: system.policyDetail,
    systemBlockers,
    systemWarnings,
    blockers: systemBlockers,
    warnings: systemWarnings,
  };
}

function getDefaultOutreachPolicyContent() {
  return `# Outreach Policy — Verdantia Website Studio

_Generated: ${new Date().toISOString().split('T')[0]}_

## Who We Contact

We reach out exclusively to businesses and decision-makers who have shown clear, specific signals of need — not cold mass outreach.

### Signal Requirements for Outreach
- Must have a discoverable business presence (GBP listing, website, or professional directory entry)
- Must have a Dublin/Eastern Ireland location or clear service area
- Must be in a service category relevant to Website Studio's positioning
- Must NOT be on any suppression list

## How We Outreach

### Modality
- Email only, sent from studio@verdantia.it via Microsoft Graph API
- One personalized email per contact, based on their specific business context
- Plain-text preferred for first contact; HTML allowed for well-formatted pitches

### Cadence
- Maximum 1 outreach email per contact per 30 days
- Maximum 1 follow-up if no response after 7 days (optional, based on signal strength)
- No automated follow-up sequences in v1

### Content Standards
- Subject line must be specific to the recipient, not generic
- Email must reference something specific about their business (not a template with a name slot)
- No false claims, exaggerations, or misleading statements
- No "just checking in" non-content follow-ups

## Who Can Approve Outreach

Two-gate model:
1. Content Approval — pitch quality and accuracy verified by a human reviewer
2. Deployment Approval — timing and list hygiene verified before send

## Suppression
- Anyone who has requested removal or expressed disinterest is suppressed immediately
- Competitors are not contacted
- Suppressed contacts are tracked in SUPPRESSION.md per lead

## Compliance
- All outreach complies with Irish and EU email marketing regulations
- Consent is implied by existing business relationship and opt-out mechanism
- Full suppression list maintained per lead

## Notes for Operators
- This policy was auto-generated as a starting point
- Review and customize before first outreach send
- Update as Verdantia's positioning evolves
`;
}

function getWebsiteStudioStats() {
  let wsStats = { total: 0, sendBlocked: 0, readyToSend: 0, sent: 0, monitor: 0, approvedNotSent: 0 };

  if (!fs.existsSync(LEADS_DIR)) {
    return wsStats;
  }

  const dirs = fs.readdirSync(LEADS_DIR).filter(d => fs.statSync(path.join(LEADS_DIR, d)).isDirectory());
  let sendBlocked = 0;
  let readyToSend = 0;
  let sent = 0;
  let monitor = 0;
  let approvedNotSent = 0;

  for (const dir of dirs) {
    const leadDir = path.join(LEADS_DIR, dir);
    const statusPath = path.join(leadDir, 'STATUS.md');
    if (fs.existsSync(statusPath)) {
      const sc = fs.readFileSync(statusPath, 'utf8');
      if (/\*\*Current Stage:\*\*\s*MONITOR/i.test(sc)) {
        monitor++;
        continue;
      }
    }

    const outreachPath = path.join(leadDir, 'OUTREACH.json');
    if (!fs.existsSync(outreachPath)) {
      continue;
    }

    try {
      const outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));
      const stage = outreach.outreachStage || '';
      if (stage === 'send_blocked') {
        sendBlocked++;
        approvedNotSent++;
      } else if (stage === 'awaiting_send' || stage === 'ready_to_send') {
        readyToSend++;
      } else if (stage === 'sent') {
        sent++;
      }
    } catch (_) {}
  }

  wsStats = { total: dirs.length, sendBlocked, readyToSend, sent, monitor, approvedNotSent };
  return wsStats;
}

async function buildSystemStatusPayload() {
  const readiness = await getSystemReadiness();
  const {
    mailboxReady,
    policyReady,
    mailboxDetail,
    policyDetail,
    tokenInfo,
    graphStatus,
    systemBlockers = [],
    systemWarnings = [],
  } = readiness;
  const tokenExpired = tokenInfo.expiresAtMs != null ? Date.now() > tokenInfo.expiresAtMs : false;
  const wsStats = getWebsiteStudioStats();

  // sendReady: system is ready when mailbox and policy are both ready.
  // Empty queue is NOT a blocker — it just means nothing to send yet.
  const sendReady = mailboxReady && policyReady;
  const nextFixes = [];
  if (mailboxDetail.blockerCode !== 'ready') {
    nextFixes.push({ priority: 'critical', action: mailboxDetail.nextFix, reason: mailboxDetail.reason });
  }
  if (!policyReady) {
    nextFixes.push({ priority: 'critical', action: 'Create outreach-policy.md to define outreach rules', reason: 'Outbound policy not defined — all sends are blocked' });
  }

  return {
    overall: {
      sendReady,
      mailboxReady,
      policyReady,
      sendReadyBecause: sendReady
        ? (wsStats.approvedNotSent > 0
            ? `Mailbox connected, policy defined — ${wsStats.approvedNotSent} approved lead(s) awaiting send`
            : 'Mailbox connected, policy defined, ready to send')
        : (!mailboxReady ? mailboxDetail.reason : !policyReady ? policyDetail.reason : 'System not ready'),
    },
    graph: {
      configured: graphStatus.hasConfig,
      authenticated: graphStatus.authenticated,
      message: graphStatus.message,
      tokenExpiresAt: tokenInfo.expiresAt,
      tokenExpired,
      tokenLoaded: tokenInfo.tokenLoaded,
      expiresAtMs: tokenInfo.expiresAtMs,
      expiresAt: tokenInfo.expiresAt,
    },
    mailbox: {
      ready: mailboxReady,
      blocked: !mailboxReady,
      reason: mailboxDetail.reason,
    },
    mailboxDetail,
    policy: {
      ready: policyReady,
      blocked: !policyReady,
      reason: policyDetail.reason,
      fileExists: policyDetail.fileExists,
      fileMissing: policyDetail.fileMissing,
      detail: policyDetail,
    },
    tokenInfo,
    systemBlockers,
    systemWarnings,
    wsStats,
    nextFixes,
    sendingIdentity: 'studio@verdantia.it',
  };
}

async function buildSystemDiagnosticPayload() {
  const readiness = await getQueueReadiness();
  const {
    mailboxReady,
    policyReady,
    mailboxDetail,
    policyDetail,
    systemBlockers = [],
    systemWarnings = [],
  } = readiness;

  return {
    mailboxReady,
    policyReady,
    sendReady: mailboxReady && policyReady,
    mailboxDetail,
    policyDetail,
    systemBlockers,
    systemWarnings,
    checkedAt: nowIso(),
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

async function getDashboardData() {
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

  // ── Website Studio aggregation ─────────────────────────────────────────────
  let wsHealth = {
    totalLeads: 0, activeLeads: 0, sendBlocked: 0, readyToSend: 0,
    sent: 0, monitor: 0, parked: 0, suppressed: 0,
    awaitingContent: 0, contentApproved: 0,
    pipeline: [],
  };
  const wsUrgent = [];
  const wsBlocked = [];
  const wsApprovedNotSent = [];
  let mailboxReady = false;
  let policyReady = false;
  let _systemBlockers = [];
  let _systemWarnings = [];
  let _mailboxDetail = null;
  let _policyDetail = null;

  if (fs.existsSync(LEADS_DIR)) {
    const readiness = await getQueueReadiness();
    mailboxReady = readiness.mailboxReady;
    policyReady = readiness.policyReady;
    _systemBlockers = readiness.systemBlockers || [];
    _systemWarnings = readiness.systemWarnings || [];
    _mailboxDetail = readiness.mailboxDetail || null;
    _policyDetail = readiness.policyDetail || null;

    const dirs = fs.readdirSync(LEADS_DIR).filter(d =>
      fs.statSync(path.join(LEADS_DIR, d)).isDirectory()
    );

    const stageCounts = {};
    const STAGE_LABELS = {
      lead_found: 'Lead Found', brief_created: 'Brief Created',
      pitch_drafted: 'Pitch Drafted', awaiting_content: 'Awaiting Content',
      content_approved: 'Content Approved', send_blocked: 'Send Blocked',
      ready_to_send: 'Ready to Send', sent: 'Sent',
      monitor: 'Monitor', parked: 'Parked', suppressed: 'Suppressed',
    };

    for (const dir of dirs) {
      const leadDir = path.join(LEADS_DIR, dir);

      // Read STATUS.md for CRM stage / monitor_reason
      let crmStage = null;
      let monitorReason = null;
      const statusPath = path.join(leadDir, 'STATUS.md');
      if (fs.existsSync(statusPath)) {
        const statusContent = fs.readFileSync(statusPath, 'utf8');
        const stageMatch = statusContent.match(/\*\*Current Stage:\*\*\s*(.+)/i);
        if (stageMatch) crmStage = stageMatch[1].trim();
        const notesParts = statusContent.split('## Notes\n\n');
        if (notesParts.length > 1) monitorReason = notesParts[1].split('\n\n')[0].trim();
      }

      // Read OUTREACH.json
      let outreach = null;
      let outreachStage = null;
      let contentApproval = null;
      let deploymentApproval = null;
      let deploymentBlockedBy = [];
      let warnings = [];
      let lastAction = null;
      let lastActionAt = null;
      let sentAt = null;
      const outreachPath = path.join(leadDir, 'OUTREACH.json');
      if (fs.existsSync(outreachPath)) {
        try {
          outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));
          // Migrate old schema
          if (outreach.outreachStage === 'approved') {
            outreach.outreachStage = 'content_approved';
            if (outreach.contentApproval == null) outreach.contentApproval = 'approved';
            if (outreach.deploymentApproval == null) outreach.deploymentApproval = 'pending';
          } else if (outreach.outreachStage === 'approval_queued') {
            outreach.outreachStage = 'awaiting_content_approval';
            if (outreach.contentApproval == null) outreach.contentApproval = 'pending';
          }
          outreachStage = outreach.outreachStage || null;
          contentApproval = outreach.contentApproval || null;
          deploymentApproval = outreach.deploymentApproval || null;
          deploymentBlockedBy = Array.isArray(outreach.deploymentBlockedBy) ? outreach.deploymentBlockedBy : [];
          warnings = Array.isArray(outreach.warnings) ? outreach.warnings : [];
          lastAction = outreach.lastAction || null;
          lastActionAt = outreach.lastActionAt || null;
          sentAt = outreach.sentAt || null;
        } catch (_) {}
      }

      // Determine board_stage
      let board_stage;
      if (outreachStage) {
        const stageMap = {
          draft_ready: 'draft', awaiting_content_approval: 'awaiting_content',
          content_approved: 'content_approved', send_blocked: 'send_blocked',
          awaiting_send: 'ready_to_send', sent: 'sent',
          suppressed: 'suppressed', rejected: 'rejected',
        };
        board_stage = stageMap[outreachStage] || outreachStage;
      } else if (crmStage === 'MONITOR') {
        board_stage = 'monitor';
      } else {
        board_stage = fs.existsSync(path.join(leadDir, 'CONCEPT_BRIEF.md'))
          ? 'brief_created'
          : (fs.existsSync(path.join(leadDir, 'PITCH.md')) ? 'pitch_drafted' : 'lead_found');
      }

      // Count by stage
      stageCounts[board_stage] = (stageCounts[board_stage] || 0) + 1;

      // CRM contact match
      let crmContactId = null;
      const recordPath = path.join(leadDir, 'LEAD_RECORD.md');
      if (fs.existsSync(recordPath)) {
        const recordContent = fs.readFileSync(recordPath, 'utf8');
        const emailMatch = recordContent.match(/\*\*Contact Email:\*\*\s*(.+)/i);
        if (emailMatch) {
          const email = emailMatch[1].trim().replace(/[<>]/g, '').trim();
          const contact = db.getOne('SELECT id FROM contacts WHERE email = ?', [email.toLowerCase()]);
          if (contact) crmContactId = contact.id;
        }
      }

      const name = dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const allBlockers = [...new Set([..._systemBlockers, ...deploymentBlockedBy])];

      // wsUrgent: send_blocked leads
      if (board_stage === 'send_blocked') {
        wsUrgent.push({
          id: dir, name,
          reason: `Send blocked${allBlockers.length > 0 ? ' — ' + allBlockers.join(', ') : ''}`,
          type: 'blocked', blockers: allBlockers, warnings,
          crmContactId, canResolve: false,
          nextAction: allBlockers.includes('mailbox')
            ? 'Refresh Graph token to unblock mailbox'
            : allBlockers.includes('policy')
            ? 'Configure outreach policy to unblock'
            : 'Resolve blockers to enable send',
        });
        wsBlocked.push({ id: dir, name, stage: board_stage, blockers: allBlockers, warnings, crmContactId });
      }

      // wsUrgent: awaiting_content with stale last_activity (> 3 days old)
      if (board_stage === 'awaiting_content' && lastActionAt) {
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(lastActionAt).getTime() > threeDaysMs) {
          wsUrgent.push({ id: dir, name, reason: 'Pitch awaiting approval — review is stale', type: 'stale', blockers: [], warnings, crmContactId, canResolve: true, nextAction: 'Review and approve or revoke pitch' });
        }
      }

      // wsApprovedNotSent: approved but blocked
      if (contentApproval === 'approved' && deploymentApproval === 'approved' && allBlockers.length > 0) {
        wsApprovedNotSent.push({ id: dir, name, contentApprovalAt: outreach?.contentApprovedAt, deploymentApprovedAt: outreach?.deploymentApprovedAt, blockedBy: allBlockers, crmContactId });
      }
    }

    wsHealth.totalLeads = dirs.length;
    wsHealth.sendBlocked = stageCounts['send_blocked'] || 0;
    wsHealth.readyToSend = stageCounts['ready_to_send'] || 0;
    wsHealth.sent = stageCounts['sent'] || 0;
    wsHealth.monitor = stageCounts['monitor'] || 0;
    wsHealth.parked = stageCounts['parked'] || 0;
    wsHealth.suppressed = stageCounts['suppressed'] || 0;
    wsHealth.awaitingContent = stageCounts['awaiting_content'] || 0;
    wsHealth.contentApproved = stageCounts['content_approved'] || 0;
    wsHealth.activeLeads = dirs.length - (wsHealth.sent + wsHealth.monitor + wsHealth.parked + wsHealth.suppressed);

    wsHealth.pipeline = Object.entries(stageCounts).map(([stage, count]) => ({
      stage, count, label: STAGE_LABELS[stage] || stage,
    })).sort((a, b) => {
      const order = ['lead_found','brief_created','concept_brief_ready','concept_building','concept_review','concept_approved','outreach_drafted','awaiting_content','content_approved','send_blocked','ready_to_send','sent','monitor','parked','suppressed'];
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    });
  }

  return {
    contactsNeedingAttention,
    pendingFollowUps,
    discoveryQueueSize,
    recentInteractions,
    weeklyStats,
    generatedAt: nowIso(),
    // Website Studio
    wsHealth,
    wsUrgent,
    wsBlocked,
    wsApprovedNotSent,
    wsReadiness: {
      mailboxReady,
      policyReady,
      systemBlockers: _systemBlockers,
      systemWarnings: _systemWarnings,
      mailboxDetail: _mailboxDetail,
      policyDetail: _policyDetail,
    },
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

// GET /api/contacts/:id/website-studio
// Returns normalized Website Studio state for a CRM contact, keyed by email match.
app.get('/api/contacts/:id/website-studio', asyncHandler(async (req, res) => {
  const contact = ensureRecord('contacts', req.params.id, 'Contact');
  const contactEmail = (contact.email || '').toLowerCase().trim();
  if (!contactEmail) {
    return res.json({ hasWebsiteStudioLead: false, leadSlug: null, outbound: null, concept: null, timeline: [], nextAction: null });
  }

  // Scan LEADS/ for a lead whose LEAD_RECORD.md or PITCH.md contains this email
  let matchedSlug = null;
  if (fs.existsSync(LEADS_DIR)) {
    const dirs = fs.readdirSync(LEADS_DIR).filter(d =>
      fs.statSync(path.join(LEADS_DIR, d)).isDirectory()
    );
    outer: for (const dir of dirs) {
      const leadDir = path.join(LEADS_DIR, dir);

      // Try LEAD_RECORD.md first — look for "**Contact Email:** <email>" in first 20 lines
      const leadRecordPath = path.join(leadDir, 'LEAD_RECORD.md');
      if (fs.existsSync(leadRecordPath)) {
        const lines = fs.readFileSync(leadRecordPath, 'utf8').split('\n').slice(0, 20);
        for (const line of lines) {
          const m = line.match(/\*\*Contact Email:\*\*\s*(.+)/i);
          if (m && m[1].toLowerCase().trim() === contactEmail) {
            matchedSlug = dir;
            break outer;
          }
        }
      }

      // Fall back to PITCH.md — look for "**To:** <email>" in first 20 lines
      const pitchPath = path.join(leadDir, 'PITCH.md');
      if (fs.existsSync(pitchPath)) {
        const lines = fs.readFileSync(pitchPath, 'utf8').split('\n').slice(0, 20);
        for (const line of lines) {
          const m = line.match(/\*\*To:\*\*\s*(.+)/i);
          if (m && m[1].toLowerCase().trim() === contactEmail) {
            matchedSlug = dir;
            break outer;
          }
        }
      }
    }
  }

  if (!matchedSlug) {
    return res.json({ hasWebsiteStudioLead: false, leadSlug: null, outbound: null, concept: null, timeline: [], nextAction: null });
  }

  const leadDir = path.join(LEADS_DIR, matchedSlug);

  // Read OUTREACH.json
  let outbound = null;
  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  if (fs.existsSync(outreachPath)) {
    const outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));
    const readiness = await getQueueReadiness();

    outbound = {
      outreachStage: outreach.outreachStage || 'unknown',
      contentApproval: outreach.contentApproval || null,
      contentApprovedBy: outreach.contentApprovedBy || null,
      contentApprovedAt: outreach.contentApprovedAt || null,
      deploymentApproval: outreach.deploymentApproval || null,
      deploymentApprovedBy: outreach.deploymentApprovedBy || null,
      deploymentApprovedAt: outreach.deploymentApprovedAt || null,
      deploymentBlockedBy: Array.isArray(outreach.deploymentBlockedBy) ? outreach.deploymentBlockedBy : [],
      warnings: Array.isArray(outreach.warnings) ? outreach.warnings : [],
      mailboxReady: readiness.mailboxReady,
      policyReady: readiness.policyReady,
      sendReady: outreach.contentApproval === 'approved' && outreach.deploymentApproval === 'approved' && readiness.mailboxReady && readiness.policyReady,
      sendBlockedReason: (() => {
        if (outreach.contentApproval !== 'approved' || outreach.deploymentApproval !== 'approved') return null;
        if (!readiness.mailboxReady) return 'mailbox';
        if (!readiness.policyReady) return 'policy';
        return null;
      })(),
    };
  }

  // Read CONCEPT_BRIEF.md
  let concept = { segment: null, pitchAngle: null, constraints: [], hasConcept: false };
  const conceptPath = path.join(leadDir, 'CONCEPT_BRIEF.md');
  if (fs.existsSync(conceptPath)) {
    const content = fs.readFileSync(conceptPath, 'utf8');
    // Extract segment — look for **Who:** or business essence paragraph
    let segment = null;
    const whoMatch = content.match(/\*\*Who:\*\*\s*(.+)/);
    if (whoMatch) segment = whoMatch[1].trim();
    // Extract pitch angle — look for "**The ONE thing:**" or similar
    let pitchAngle = null;
    const oneThingMatch = content.match(/\*\*The ONE thing:\*\*\s*(.+)/);
    if (oneThingMatch) pitchAngle = oneThingMatch[1].trim();
    // Constraints: look for "Do NOT" lines and "Constraints" section
    const constraints = [];
    const constraintMatches = content.match(/Do NOT\s[^.]+\./g) || [];
    for (const c of constraintMatches) constraints.push(c.trim());
    const constraintsSectionMatch = content.match(/\*\*Constraints:\*\*\s*([\s\S]+?)(?=\n##|\n#|$)/i);
    if (constraintsSectionMatch) {
      const constraintLines = constraintsSectionMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
      for (const cl of constraintLines) {
        const txt = cl.replace(/^-\s*/, '').trim().replace(/\*\*/g, '');
        if (txt && !constraints.includes(txt)) constraints.push(txt);
      }
    }
    concept = { segment, pitchAngle, constraints, hasConcept: true };
  }

  // Read TIMELINE.md
  const timeline = [];
  const timelinePath = path.join(leadDir, 'TIMELINE.md');
  if (fs.existsSync(timelinePath)) {
    const content = fs.readFileSync(timelinePath, 'utf8');
    // Split on ##  headers (only top-level, not inside code blocks)
    const sections = content.split(/(?:^|\n)(##\s[^#\n][^\n]*\n)/);
    // sections[0] = before first ##, sections[1] = first ## header, sections[2] = body, etc.
    // Reassemble: iterate in pairs (header, body)
    for (let i = 1; i < sections.length; i += 2) {
      const headerLine = sections[i] || '';
      const body = sections[i + 1] || '';
      const dateMatch = headerLine.match(/^##\s+(.+)/);
      if (!dateMatch) continue;
      const date = dateMatch[1].trim();

      const actionMatch = body.match(/\*\*Action:\*\*\s*(.+)/);
      const actorMatch = body.match(/\*\*Actor:\*\*\s*(.+)/);
      const fromMatch = body.match(/\*\*From:\*\*\s*(.+)/);
      const notesMatch = body.match(/\*\*Notes:\*\*\s*([\s\S]*?)$/);

      const from = fromMatch ? fromMatch[1].trim() : null;
      // Parse "from → to" format
      let fromState = null, toState = null;
      if (from && from.includes('→')) {
        const parts = from.split('→').map(s => s.trim());
        fromState = parts[0] || null;
        toState = parts[1] || null;
      } else if (from) {
        fromState = from;
      }

      timeline.push({
        date,
        action: actionMatch ? actionMatch[1].trim() : 'unknown',
        actor: actorMatch ? actorMatch[1].trim() : 'unknown',
        from: fromState,
        to: toState,
        notes: notesMatch ? notesMatch[1].trim() : null,
      });
    }
  }

  // Derive nextAction
  let nextAction = null;
  if (outbound) {
    if (outbound.sendReady) {
      nextAction = { text: 'Ready to send — open the Outbound Queue to dispatch', reason: 'Both gates approved, mailbox and policy ready', owner: 'Nero' };
    } else if (outbound.outreachStage === 'send_blocked' && outbound.sendBlockedReason === 'mailbox') {
      nextAction = { text: 'Refresh Graph token to unblock mailbox readiness', reason: 'Outbound is deployment-approved but blocked by mailbox.token', owner: 'Nero' };
    } else if (outbound.outreachStage === 'send_blocked' && outbound.sendBlockedReason === 'policy') {
      nextAction = { text: 'Define outreach policy to unblock send readiness', reason: 'Outbound is deployment-approved but no outreach policy has been set', owner: 'Nero' };
    } else if (outbound.outreachStage === 'awaiting_content_approval') {
      nextAction = { text: 'Review and approve pitch content', reason: 'Pitch is pending content approval before deployment', owner: 'Nero' };
    } else if (outbound.outreachStage === 'content_approved' || outbound.contentApproval === 'approved') {
      nextAction = { text: 'Approve deployment to proceed to send', reason: 'Content is approved, awaiting deployment gate', owner: 'Nero' };
    }
  }

  res.json({
    leadSlug: matchedSlug,
    hasWebsiteStudioLead: true,
    outbound,
    concept,
    timeline,
    nextAction,
  });
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
      typeof req.body.priority === 'string'
        ? (PRIORITY_INT[req.body.priority] ?? 2)
        : toInteger(req.body.priority, 2),
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


app.get('/api/dashboard', asyncHandler(async (req, res) => {
  const data = await getDashboardData();
  res.json(data);
}));



// ── Graph / Discovery ─────────────────────────────────────────────────────────

// GET /api/graph/status
app.get('/api/graph/status', asyncHandler(async (req, res) => {
  const status = await graph.getStatus();
  res.json(status);
}));

// POST /api/graph/refresh — refresh the stored Graph token with refresh_token
app.post('/api/graph/refresh', asyncHandler(async (req, res) => {
  try {
    const config = graph.loadConfig();
    if (!config) {
      return res.status(400).json({ success: false, message: 'Refresh failed: Graph is not configured' });
    }

    const storedToken = graph.readStoredToken();
    if (!storedToken?.refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh failed: No refresh token is stored' });
    }

    const refreshedToken = await graph.refreshAccessToken(storedToken.refresh_token, config);
    const expiresAtMs = normalizeExpiryMs(refreshedToken?.expires_at);

    return res.json({
      success: true,
      message: 'Token refreshed',
      expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Refresh failed: ${error.message}` });
  }
}));

// POST /api/graph/setup/start — start device-code auth without blocking the request
app.post('/api/graph/setup/start', asyncHandler(async (req, res) => {
  try {
    const deviceCode = await graph.startDeviceCodeSetup();
    return res.json({
      verificationUrl: deviceCode.verification_uri,
      userCode: deviceCode.user_code,
      message: 'Open the URL, enter the code, complete login. This page will update automatically. After completing auth in your browser, click "Verify Graph" to confirm.',
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Setup start failed: ${error.message}` });
  }
}));

// GET /api/graph/setup/status — poll for device-code completion
app.get('/api/graph/setup/status', asyncHandler(async (req, res) => {
  const status = graph.getDeviceCodeSetupStatus();
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

// POST /api/policy/create — create a starter outreach-policy.md if missing
app.post('/api/policy/create', asyncHandler(async (req, res) => {
  try {
    if (fs.existsSync(OUTREACH_POLICY_PATH)) {
      return res.json({
        success: true,
        filePath: OUTREACH_POLICY_PATH,
        message: `Policy already exists at ${OUTREACH_POLICY_PATH}`,
      });
    }

    fs.writeFileSync(OUTREACH_POLICY_PATH, getDefaultOutreachPolicyContent(), 'utf8');
    return res.json({
      success: true,
      filePath: OUTREACH_POLICY_PATH,
      message: `Policy created at ${OUTREACH_POLICY_PATH}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed: ${error.message}` });
  }
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

// POST /api/drafts/:id/approve — approve draft (creates in email client AND bridges to outbound queue)
app.post('/api/drafts/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const draft = db.getOne(`SELECT * FROM email_drafts WHERE id = ?`, [id]);
  if (!draft) return res.status(404).json({ error: 'Draft not found' });
  if (draft.status !== 'proposed') return res.status(409).json({ error: `Draft already ${draft.status}` });

  // Safety: require explicit approval (enforced here — no silent auto-approve)
  drafts.approveDraft(id, 'user');

  // ── Bridge: also create/update lead in outbound queue ─────────────────────
  // Slug is derived from the contact associated with this draft
  const contact = db.getOne(`SELECT * FROM contacts WHERE id = ?`, [draft.contact_id]);
  if (contact && contact.name) {
    const slug = contact.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const leadDir = path.join(LEADS_DIR, slug);
    fs.mkdirSync(leadDir, { recursive: true });

    // Write PITCH.md from draft content (if not already present)
    const pitchPath = path.join(leadDir, 'PITCH.md');
    const pitchContent = `**To:** ${contact.email || 'unknown@example.com'}\n**Subject:** ${draft.subject || 'Outbound Inquiry'}\n\n${draft.body || ''}`;
    if (!fs.existsSync(pitchPath)) {
      fs.writeFileSync(pitchPath, pitchContent, 'utf8');
    }

    // Write/Update OUTREACH.json with human-approval lifecycle
    const outreachPath = path.join(leadDir, 'OUTREACH.json');
    const timestamp = nowIso();
    const ACTOR = 'Nero';
    const existingOutreach = fs.existsSync(outreachPath)
      ? JSON.parse(fs.readFileSync(outreachPath, 'utf8'))
      : { outreachStage: 'draft_ready', contentApproval: null, deploymentApproval: null };

    // Compute pitch hash for revision detection
    const pitchStat = fs.statSync(pitchPath);
    const pitchHash = `${pitchStat.mtimeMs}-${pitchStat.size}`;

    const outreach = {
      ...existingOutreach,
      outreachStage: 'awaiting_human_review',
      humanApproval: existingOutreach.humanApproval || 'needs_review',
      contentApproval: existingOutreach.contentApproval || 'approved', // draft approval counts as content approved
      contentApprovedBy: ACTOR,
      contentApprovedAt: timestamp,
      pitchHashAtApproval: pitchHash,
      lastAction: 'draft_approved_bridged',
      lastActionAt: timestamp,
    };
    fs.writeFileSync(outreachPath, JSON.stringify(outreach, null, 2));

    // Write TIMELINE.md entry
    const leadName = contact.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    appendTimeline(leadDir, {
      timestamp,
      action: 'Draft approved — awaiting human review',
      actor: ACTOR,
      from: existingOutreach.outreachStage || 'draft',
      notes: `Draft approved for ${contact.email}. Pitch bridged to outbound queue for human send approval.`,
    });
  }

  res.json({ ...draft, status: 'approved', _notice: 'Draft approved. Open your email client to create and send. Lead bridged to outbound queue for human send approval.' });
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

// GET /api/pipeline — primary board data endpoint covering ALL leads
app.get('/api/pipeline', asyncHandler(async (req, res) => {
  const items = [];
  if (!fs.existsSync(LEADS_DIR)) return res.json({ items: [], stages: PIPELINE_STAGES, readiness: {} });

  const readiness = await getQueueReadiness();
  const dirs = fs.readdirSync(LEADS_DIR).filter(d =>
    fs.statSync(path.join(LEADS_DIR, d)).isDirectory()
  );

  for (const dir of dirs) {
    const leadDir = path.join(LEADS_DIR, dir);

    // ── Read STATUS.md ──────────────────────────────────────────────────────
    let crmStage = null;
    let monitorReason = null;
    const statusPath = path.join(leadDir, 'STATUS.md');
    if (fs.existsSync(statusPath)) {
      const statusContent = fs.readFileSync(statusPath, 'utf8');
      const stageMatch = statusContent.match(/\*\*Current Stage:\*\*\s*(.+)/i);
      if (stageMatch) crmStage = stageMatch[1].trim();
      // Extract the Notes section for monitor_reason — split on '## Notes\n\n' header
      const notesParts = statusContent.split('## Notes\n\n');
      if (notesParts.length > 1) {
        monitorReason = notesParts[1].split('\n\n')[0].trim();
      }
    }

    // ── Read OUTREACH.json ──────────────────────────────────────────────────
    const outreachPath = path.join(leadDir, 'OUTREACH.json');
    let outreach = null;
    let outreachStage = null;
    let contentApproval = null;
    let deploymentApproval = null;
    let deploymentBlockedBy = [];
    let warnings = [];
    let lastAction = null;
    let lastActionAt = null;
    let sentAt = null;
    // monitorReason may already be set from STATUS.md above — preserve it
    // when OUTREACH.json doesn't exist (lead is managed via STATUS.md only)

    if (fs.existsSync(outreachPath)) {
      try {
        outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));

        // Migrate old schema
        if (outreach.outreachStage === 'approved') {
          outreach.outreachStage = 'content_approved';
          if (outreach.contentApproval == null) outreach.contentApproval = 'approved';
          if (outreach.deploymentApproval == null) outreach.deploymentApproval = 'pending';
        } else if (outreach.outreachStage === 'approval_queued') {
          outreach.outreachStage = 'awaiting_content_approval';
          if (outreach.contentApproval == null) outreach.contentApproval = 'pending';
        }

        outreachStage = outreach.outreachStage || null;
        contentApproval = outreach.contentApproval || null;
        deploymentApproval = outreach.deploymentApproval || null;
        deploymentBlockedBy = Array.isArray(outreach.deploymentBlockedBy) ? outreach.deploymentBlockedBy : [];
        warnings = Array.isArray(outreach.warnings) ? outreach.warnings : [];
        lastAction = outreach.lastAction || null;
        lastActionAt = outreach.lastActionAt || null;
        sentAt = outreach.sentAt || null;
      } catch (_) {}
    }

    // ── Determine board_stage ────────────────────────────────────────────────
    let board_stage;
    if (outreachStage) {
      // Map OUTREACH.outreachStage → board_stage
      const stageMap = {
        draft_ready: 'draft',
        awaiting_content_approval: 'awaiting_content',
        awaiting_human_review: 'awaiting_content',
        // Concept stages
        concept_brief_ready: 'concept_brief_ready',
        concept_building: 'concept_building',
        concept_review: 'concept_review',
        concept_approved: 'concept_approved',
        outreach_drafted: 'outreach_drafted',
        // Content/outreach stages
        content_approved: 'content_approved',
        send_blocked: 'send_blocked',
        awaiting_send: 'ready_to_send',
        sending: 'ready_to_send',
        sent: 'sent',
        send_failed: 'send_blocked',
        suppressed: 'suppressed',
        rejected: 'rejected',
      };
      board_stage = stageMap[outreachStage] || outreachStage;
    } else if (crmStage === 'MONITOR') {
      board_stage = 'monitor';
    } else {
      // File-based inference — concept-first: check CONCEPT_BRIEF.md first
      const pitchPath = path.join(leadDir, 'PITCH.md');
      const briefPath = path.join(leadDir, 'CONCEPT_BRIEF.md');
      if (fs.existsSync(briefPath)) {
        // CONCEPT_BRIEF.md exists — lead is in concept pipeline
        board_stage = 'concept_brief_ready';
      } else if (fs.existsSync(pitchPath)) {
        board_stage = 'outreach_drafted';
      } else {
        board_stage = 'lead_found';
      }
    }

    // ── Read LEAD_RECORD.md ─────────────────────────────────────────────────
    let contactMethod = 'none';
    let contactValue = '';
    const recordPath = path.join(leadDir, 'LEAD_RECORD.md');
    if (fs.existsSync(recordPath)) {
      const recordContent = fs.readFileSync(recordPath, 'utf8');
      const emailMatch = recordContent.match(/\*\*Contact Email:\*\*\s*(.+)/i);
      if (emailMatch && emailMatch[1].trim()) {
        contactMethod = 'email';
        contactValue = emailMatch[1].trim().replace(/[<>]/g, '').trim();
      } else {
        // Check for phone
        const phoneMatch = recordContent.match(/\*\*Telephone:\*\*\s*(.+)/i);
        if (phoneMatch && phoneMatch[1].trim()) {
          contactMethod = 'phone';
          contactValue = phoneMatch[1].trim();
        }
      }
    }

    // Fall back: check PITCH.md for email
    if (contactMethod === 'none') {
      const pitchPath = path.join(leadDir, 'PITCH.md');
      if (fs.existsSync(pitchPath)) {
        const pitchContent = fs.readFileSync(pitchPath, 'utf8');
        const toMatch = pitchContent.match(/\*\*To:\*\*\s*(.+)/i);
        if (toMatch && toMatch[1].trim()) {
          contactMethod = 'email';
          contactValue = toMatch[1].trim().replace(/[<>]/g, '').trim();
        }
      }
    }

    // ── Read CONCEPT_BRIEF.md for segment/constraints ───────────────────────
    let segment = '';
    let constraints = [];
    const briefPath = path.join(leadDir, 'CONCEPT_BRIEF.md');
    if (fs.existsSync(briefPath)) {
      const briefContent = fs.readFileSync(briefPath, 'utf8');
      const segMatch = briefContent.match(/\*\*Segment:\*\*\s*(.+)/i);
      if (segMatch) segment = segMatch[1].trim();
      // Extract constraints
      const constraintsSection = briefContent.match(/\*\*Constraints[\s:]*\*(.+?)(?=\n\n|\*\*|$)/is);
      if (constraintsSection) {
        const constraintLines = constraintsSection[1].split('\n').filter(l => l.trim().startsWith('-'));
        constraints = constraintLines.map(l => l.replace(/^\s*-\s*/, '').trim());
      }
    }

    // ── Read TIMELINE.md last entry ────────────────────────────────────────
    let lastActivity = null;
    const timelinePath = path.join(leadDir, 'TIMELINE.md');
    if (fs.existsSync(timelinePath)) {
      const timelineContent = fs.readFileSync(timelinePath, 'utf8');
      const entries = timelineContent.split('## ').filter(Boolean);
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1].trim();
        const tsMatch = lastEntry.match(/^([\dT:\-\.]+Z)/);
        if (tsMatch) lastActivity = tsMatch[1];
      }
    }
    if (!lastActivity && lastActionAt) lastActivity = lastActionAt;

    // ── CRM contact match by email ───────────────────────────────────────────
    let crmContactId = null;
    if (contactValue && contactMethod === 'email') {
      const contact = db.getOne('SELECT id FROM contacts WHERE email = ?', [contactValue.toLowerCase()]);
      if (contact) crmContactId = contact.id;
    }

    // ── Determine can_* flags ───────────────────────────────────────────────
    const isTerminal = ['sent', 'failed', 'suppressed', 'rejected'].includes(outreachStage);
    const isMonitor = crmStage === 'MONITOR';
    const isSuppressed = outreachStage === 'suppressed';
    const isParked = board_stage === 'parked';

    // can_enter_approval: PITCH.md exists AND not terminal
    const pitchPath = path.join(leadDir, 'PITCH.md');
    const hasPitch = fs.existsSync(pitchPath);
    const canEnterApproval = hasPitch && !isTerminal && !outreach;

    // can_send: all approvals + no blockers
    // Deduplicate: systemBlockers and deploymentBlockedBy may overlap (both include mailbox/policy)
    const allBlockers = [...new Set([...readiness.systemBlockers, ...deploymentBlockedBy])];
    const canSend = (
      contentApproval === 'approved' &&
      deploymentApproval === 'approved' &&
      allBlockers.length === 0
    );

    // can_transition: anything that allows outbound moves
    const canTransition = !isTerminal && !isMonitor && !isSuppressed && !isParked;

    const name = dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Concept readiness
    const conceptPackage = outreach?.conceptPackage || null;
    const conceptStatus = conceptPackage?.conceptStatus || null;
    const conceptReady = !conceptPackage || conceptStatus === 'approved';
    if (!conceptReady) allBlockers.push('concept_not_approved');

    items.push({
      id: dir,
      name,
      segment: segment || null,
      board_stage,
      outbound_stage: outreachStage || null,
      content_approval: contentApproval,
      deploy_approval: deploymentApproval,
      contact_method: contactMethod,
      contact_value: contactValue || null,
      crm_contact_id: crmContactId,
      blockers: allBlockers,
      warnings,
      last_activity: lastActivity,
      last_action: lastAction,
      constraints,
      sent_at: sentAt,
      monitor_reason: isMonitor ? (monitorReason || 'No outreach route.') : null,
      can_send: canSend && conceptReady,
      can_enter_approval: canEnterApproval && conceptReady,
      can_transition: canTransition,
      is_terminal: isTerminal,
      is_monitor: isMonitor,
      is_suppressed: isSuppressed,
      is_parked: isParked,
      score: null,
      conceptPackage,
      conceptStatus,
    });
  }

  res.json({ items, stages: PIPELINE_STAGES, readiness });
}));

const PIPELINE_STAGES = [
  'lead_found', 'brief_created',
  'concept_brief_ready', 'concept_building', 'concept_review', 'concept_approved',
  'outreach_drafted',
  'awaiting_content', 'content_approved', 'send_blocked',
  'ready_to_send', 'sent', 'send_failed', 'monitor', 'parked', 'suppressed',
];

// GET /api/outbound/readiness — system-level send gates
// GET /api/system-status/diagnostic — lightweight readiness snapshot
app.get('/api/system-status/diagnostic', asyncHandler(async (req, res) => {
  const payload = await buildSystemDiagnosticPayload();
  res.json(payload);
}));

// POST /api/system-status/verify — force a fresh readiness check
app.post('/api/system-status/verify', asyncHandler(async (req, res) => {
  const payload = await buildSystemStatusPayload();
  res.json({
    ...payload,
    verifiedAt: nowIso(),
  });
}));

// GET /api/system-status — unified system + outbound diagnostics
app.get('/api/system-status', asyncHandler(async (req, res) => {
  const payload = await buildSystemStatusPayload();
  res.json(payload);
}));

// GET /api/outbound/queue — scan LEADS/ for leads with PITCH.md
app.get('/api/outbound/queue', asyncHandler(async (req, res) => {
  const items = [];
  if (!fs.existsSync(LEADS_DIR)) {
    const readiness = await getQueueReadiness();
    return res.json({
      items: [],
      count: 0,
      mailboxReady: readiness.mailboxReady,
      policyReady: readiness.policyReady,
      mailboxDetail: readiness.mailboxDetail,
      policyDetail: readiness.policyDetail,
      systemBlockers: readiness.systemBlockers || [],
      systemWarnings: readiness.systemWarnings || [],
    });
  }

  // Get system-level readiness once for all items
  const readiness = await getQueueReadiness();
  const { mailboxReady, policyReady, mailboxDetail, policyDetail, systemBlockers = [], systemWarnings = [] } = readiness;

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
    let humanApproval = null;
    let pitchHashAtApproval = null;
    let lastError = null;
    let contentApproval = null;
    let contentApprovedBy = null;
    let contentApprovedAt = null;
    let deploymentApproval = null;
    let deploymentApprovedBy = null;
    let deploymentApprovedAt = null;
    let deploymentBlockedBy = [];
    let warnings = [];
    let lastAction = null;
    let outreach = {};
    let lastActionAt = null;

    if (fs.existsSync(outreachPath)) {
      try {
        outreach = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));

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
        humanApproval = outreach.humanApproval || null;
        pitchHashAtApproval = outreach.pitchHashAtApproval || null;
        lastError = outreach.lastError || null;
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

    // Concept readiness — if lead has a conceptPackage, concept must be approved
    const conceptPackage = outreach.conceptPackage || null;
    const conceptStatus = conceptPackage?.conceptStatus || null;
    const conceptReady = !conceptPackage || conceptStatus === 'approved';
    if (!conceptReady) {
      itemBlockers.push('concept_not_approved');
    }

    // Determine sendReadiness — merge system blockers with per-lead blockers + concept gate
    const allBlockers = [...readiness.systemBlockers, ...itemBlockers];
    const sendReady = (
      contentApproval === 'approved' &&
      deploymentApproval === 'approved' &&
      allBlockers.length === 0 &&
      conceptReady
    );
    const sendBlockedReason = sendReady ? null : (allBlockers[0] || null);

    items.push({
      id: dir,
      name,
      company: name,
      score: score,
      email,
      outreachStage,
      humanApproval,
      pitchHashAtApproval,
      lastError,
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
      conceptPackage,
      conceptStatus,
    });
  }

  res.json({
    items,
    count: items.length,
    mailboxReady,
    policyReady,
    mailboxDetail,
    policyDetail,
    systemBlockers,
    systemWarnings,
  });
}));

// POST /api/outbound/leads/:id/transition — two-gate approve/send/suppress
app.post('/api/outbound/leads/:id/transition', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  const VALID_ACTIONS = [
    'content_approve', 'content_revoke',
    'deploy_approve', 'deploy_revoke',
    'human_approve', 'human_deny',
    'send', 'suppress', 'unsuppress', 'reactivate',
    'monitor', 'park', 'refresh',
    'concept_approve', 'concept_reject', 'concept_start_build',
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
  const TERMINAL_STATES = ['sent', 'send_failed', 'suppressed', 'rejected'];

  // Terminal state guard (except reactivate/unsuppress/human_approve which can re-enter)
  if (TERMINAL_STATES.includes(currentStage) && !['reactivate', 'unsuppress', 'human_approve'].includes(action)) {
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
    // Determine next stage based on system gates AND human approval status
    const readiness = await getQueueReadiness();
    const { blockers: leadBlockers } = getLeadBlockers(leadDir);
    const allBlockers = [...readiness.systemBlockers, ...leadBlockers];

    // Only move to awaiting_send if human approval is already granted
    let nextStage;
    if (allBlockers.length === 0 && outreach.humanApproval === 'human_approved') {
      nextStage = 'awaiting_send';
    } else if (allBlockers.length === 0) {
      nextStage = 'send_blocked';
    } else {
      nextStage = 'send_blocked';
    }

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

  // ── human_approve ────────────────────────────────────────────────────────────
  if (action === 'human_approve') {
    const from = outreach.outreachStage || 'unknown';
    // Store pitch hash at human approval time for revision detection
    const pitchPath = path.join(leadDir, 'PITCH.md');
    let pitchHashAtApproval = outreach.pitchHashAtApproval || null;
    if (fs.existsSync(pitchPath)) {
      const pitchStat = fs.statSync(pitchPath);
      pitchHashAtApproval = `${pitchStat.mtimeMs}-${pitchStat.size}`;
    }
    // Determine next stage based on deployment approval status
    const readiness = await getQueueReadiness();
    const { blockers: leadBlockers } = getLeadBlockers(leadDir);
    const allBlockers = [...readiness.systemBlockers, ...leadBlockers];
    let nextStage;
    if (allBlockers.length === 0 && outreach.deploymentApproval === 'approved') {
      nextStage = 'awaiting_send';
    } else {
      nextStage = 'send_blocked';
    }
    const result = writeOutreach({
      humanApproval: 'human_approved',
      pitchHashAtApproval,
      outreachStage: nextStage,
      lastAction: 'human_approved',
      lastActionAt: timestamp,
    }, { timestamp, action: 'human_approved', actor: ACTOR, from, notes: `Human approved send. Next stage: ${nextStage}.` });
    return res.json(result);
  }

  // ── human_deny ──────────────────────────────────────────────────────────────
  if (action === 'human_deny') {
    const from = outreach.outreachStage || 'unknown';
    const result = writeOutreach({
      humanApproval: 'human_denied',
      outreachStage: 'send_blocked',
      lastAction: 'human_denied',
      lastActionAt: timestamp,
    }, { timestamp, action: 'human_denied', actor: ACTOR, from, notes: 'Human denied send.' });
    return res.json(result);
  }

  // ── refresh ─────────────────────────────────────────────────────────────────
  // Re-check blockers and auto-advance stage if previously blocked infrastructure
  // is now clear. Handles the case where a lead was blocked at send_blocked stage
  // due to mailbox/policy, then the infrastructure was restored.
  if (action === 'refresh') {
    const readiness = await getQueueReadiness();
    const { blockers: leadBlockers } = getLeadBlockers(leadDir);
    const allBlockers = [...readiness.systemBlockers, ...leadBlockers];
    const from = outreach.outreachStage || 'unknown';

    let nextStage = outreach.outreachStage;
    let notes = 'Re-checked — no state change.';

    // Only auto-advance from send_blocked when infrastructure is now clear
    if (outreach.outreachStage === 'send_blocked' && allBlockers.length === 0) {
      if (outreach.deploymentApproval === 'approved' && outreach.humanApproval === 'human_approved') {
        nextStage = 'awaiting_send';
        notes = `Infrastructure restored — auto-advanced from send_blocked to awaiting_send. cleared=${JSON.stringify(allBlockers)}`;
      } else if (outreach.deploymentApproval === 'approved' || outreach.humanApproval === 'human_approved') {
        // One approval missing — stay blocked but clear sendBlockedReason
        nextStage = outreach.deploymentApproval === 'approved'
          ? 'send_blocked'  // human approval still needed
          : 'send_blocked'; // deployment approval still needed
        notes = 'Infrastructure restored but approval not yet granted — remaining in send_blocked.';
      }
    }

    // Update OUTREACH.json
    const updates = { lastAction: 'recheck', lastActionAt: timestamp };
    if (nextStage !== from) {
      updates.outreachStage = nextStage;
    }
    // Clear sendBlockedReason if blockers are now clear
    if (allBlockers.length === 0) {
      updates.sendBlockedReason = null;
    }

    const result = writeOutreach(updates, { timestamp, action: 'recheck', actor: ACTOR, from, notes });
    return res.json(result);
  }

  // ── concept_approve ─────────────────────────────────────────────────────────
  // Mark concept as approved and advance to outreach_drafted if pitch exists
  if (action === 'concept_approve') {
    const from = outreach.outreachStage || 'unknown';
    const timestamp2 = nowIso();
    const conceptPackage = outreach.conceptPackage || {};
    const updates = {
      conceptPackage: {
        ...conceptPackage,
        conceptStatus: 'approved',
        approvedBy: ACTOR,
        approvedAt: timestamp2,
      },
      lastAction: 'concept_approved',
      lastActionAt: timestamp2,
    };

    // Auto-advance to outreach_drafted if pitch exists
    const pitchPath = path.join(leadDir, 'PITCH.md');
    if (fs.existsSync(pitchPath)) {
      updates.outreachStage = 'outreach_drafted';
    } else {
      updates.outreachStage = 'concept_approved';
    }

    const result = writeOutreach(updates, { timestamp: timestamp2, action: 'concept_approved', actor: ACTOR, from, notes: `Concept approved by ${ACTOR}. Stage: ${updates.outreachStage}.` });
    return res.json(result);
  }

  // ── concept_reject ──────────────────────────────────────────────────────────
  // Mark concept as rework_needed
  if (action === 'concept_reject') {
    const from = outreach.outreachStage || 'unknown';
    const timestamp2 = nowIso();
    const conceptPackage = outreach.conceptPackage || {};
    const updates = {
      conceptPackage: {
        ...conceptPackage,
        conceptStatus: 'rework_needed',
        approvedBy: null,
        approvedAt: null,
      },
      outreachStage: 'concept_review',  // Back to review
      lastAction: 'concept_rejected',
      lastActionAt: timestamp2,
    };
    const result = writeOutreach(updates, { timestamp: timestamp2, action: 'concept_rejected', actor: ACTOR, from, notes: `Concept rejected — rework needed.` });
    return res.json(result);
  }

  // ── concept_start_build ─────────────────────────────────────────────────────
  // Advance concept from brief_ready to building
  if (action === 'concept_start_build') {
    const from = outreach.outreachStage || 'unknown';
    const timestamp2 = nowIso();
    const conceptPackage = outreach.conceptPackage || {};
    const updates = {
      conceptPackage: {
        ...conceptPackage,
        conceptStatus: 'building',
      },
      outreachStage: 'concept_building',
      lastAction: 'concept_build_started',
      lastActionAt: timestamp2,
    };
    const result = writeOutreach(updates, { timestamp: timestamp2, action: 'concept_build_started', actor: ACTOR, from, notes: `Concept build started.` });
    return res.json(result);
  }

  // ── send ────────────────────────────────────────────────────────────────────
  if (action === 'send') {
    // ── Human approval gate ────────────────────────────────────────────────────
    if (outreach.humanApproval !== 'human_approved') {
      return res.status(409).json({
        error: 'Human approval required before send',
        reason: 'outreach.humanApproval must be \'human_approved\' to send',
        currentHumanApproval: outreach.humanApproval || null,
      });
    }

    // ── Pitch revision detection ───────────────────────────────────────────────
    const pitchPath = path.join(leadDir, 'PITCH.md');
    if (fs.existsSync(pitchPath) && outreach.pitchHashAtApproval) {
      const pitchStat = fs.statSync(pitchPath);
      const currentHash = `${pitchStat.mtimeMs}-${pitchStat.size}`;
      if (currentHash !== outreach.pitchHashAtApproval) {
        // Pitch was modified after human approval — invalidate approval
        const from = outreach.outreachStage;
        writeOutreach({
          humanApproval: 'needs_review',
          pitchHashAtApproval: null,
          outreachStage: 'send_blocked',
          lastAction: 'approval_invalidated',
          lastActionAt: timestamp,
        }, { timestamp, action: 'approval_invalidated', actor: ACTOR, from, notes: 'Approval invalidated — pitch revised. Human re-review required.' });
        return res.status(409).json({
          error: 'Pitch was revised after human approval — approval is now invalid',
          reason: 'pitch_revised_after_approval',
          currentHumanApproval: 'needs_review',
        });
      }
    }

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

    // Set sending stage immediately
    const from = outreach.outreachStage;
    writeOutreach({
      outreachStage: 'sending',
      lastAction: 'sending',
      lastActionAt: timestamp,
    }, { timestamp, action: 'sending', actor: ACTOR, from, notes: 'Send initiated.' });

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
        const errMsg = errBody.error?.message || graphRes.statusText;
        const result = writeOutreach({
          outreachStage: 'send_failed',
          lastAction: 'send_failed',
          lastActionAt: timestamp,
          lastError: `Graph API error: ${errMsg}`,
        }, { timestamp, action: 'send_failed', actor: ACTOR, from: 'sending', notes: `Send failed: ${errMsg}` });
        return res.status(500).json({ error: `Send failed: ${errMsg}`, outreach: result });
      }
    } catch (graphErr) {
      const errMsg = graphErr.message;
      const result = writeOutreach({
        outreachStage: 'send_failed',
        lastAction: 'send_failed',
        lastActionAt: timestamp,
        lastError: `Graph API error: ${errMsg}`,
      }, { timestamp, action: 'send_failed', actor: ACTOR, from: 'sending', notes: `Send failed: ${errMsg}` });
      return res.status(500).json({ error: `Send failed: ${errMsg}`, outreach: result });
    }

    const result = writeOutreach({
      outreachStage: 'sent',
      lastAction: 'sent',
      lastActionAt: timestamp,
      sentAt: timestamp,
      lastError: null,
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

  // ── monitor ─────────────────────────────────────────────────────────────────
  if (action === 'monitor') {
    const from = outreach.outreachStage || 'unknown';
    const monitorPath = path.join(leadDir, 'MONITOR.md');
    fs.writeFileSync(monitorPath, `# Monitored\n\n**Monitored by:** ${ACTOR}\n**At:** ${timestamp}\n\n`, 'utf8');
    const result = writeOutreach({
      outreachStage: 'monitor',
      lastAction: 'monitored',
      lastActionAt: timestamp,
    }, { timestamp, action: 'monitored', actor: ACTOR, from, notes: 'Lead moved to monitor.' });
    return res.json(result);
  }

  // ── park ───────────────────────────────────────────────────────────────────
  if (action === 'park') {
    const from = outreach.outreachStage || 'unknown';
    const parkPath = path.join(leadDir, 'PARK.md');
    fs.writeFileSync(parkPath, `# Parked\n\n**Parked by:** ${ACTOR}\n**At:** ${timestamp}\n\n`, 'utf8');
    const result = writeOutreach({
      outreachStage: 'parked',
      lastAction: 'parked',
      lastActionAt: timestamp,
    }, { timestamp, action: 'parked', actor: ACTOR, from, notes: 'Lead parked.' });
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

function slugifyLeadName(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeReadText(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  } catch {
    return null;
  }
}

function safeReadJson(filePath, fallback = {}) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function resolveLeadVersions(leadDir) {
  const files = fs.readdirSync(leadDir)
    .filter(name => /\.html?$/i.test(name))
    .sort();

  return files.map((name, index) => ({
    id: name,
    label: name === 'index.html' ? 'Current' : name.replace(/\.html?$/i, ''),
    fileName: name,
    order: index,
  }));
}

function parseMarkdownBullets(content) {
  if (!content) return [];
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^[-*+]\s+/.test(line))
    .map(line => line.replace(/^[-*+]\s+/, '').trim())
    .filter(Boolean);
}

function parsePreviewDoc(content, leadDir, contactId) {
  const screenshots = [];
  let publicPreviewUrl = null;
  let localPreviewCandidate = null;
  let previewVerifiedAt = null;

  if (content) {
    const urlMatch = content.match(/(?:public\s+preview\s+url|preview\s+url|public\s+url|url):\s*(https?:\/\/\S+)/i)
      || content.match(/https?:\/\/\S+/i);
    if (urlMatch) {
      publicPreviewUrl = urlMatch[1] || urlMatch[0];
    }

    const localMatch = content.match(/(?:local\s+preview\s+path|local\s+path|build\s+path|path):\s*([^\n]+)/i);
    if (localMatch) {
      localPreviewCandidate = localMatch[1].trim();
    }

    const verifiedMatch = content.match(/(?:verified\s+at|last\s+verified):\s*([^\n]+)/i);
    if (verifiedMatch) {
      const parsed = new Date(verifiedMatch[1].trim());
      if (Number.isFinite(parsed.getTime())) {
        previewVerifiedAt = parsed.toISOString();
      }
    }

    const screenshotMatches = content.match(/(?:screenshots?|images?):[\s\S]*?(?=\n\n|$)/i);
    if (screenshotMatches) {
      const localShots = screenshotMatches[0]
        .split('\n')
        .map(line => line.replace(/^[-*+]\s+/, '').trim())
        .filter(line => /\.(png|jpe?g|webp|gif)$/i.test(line));
      screenshots.push(...localShots);
    }

    const inlineShots = content.match(/[^\s)]+\.(?:png|jpe?g|webp|gif)/ig) || [];
    screenshots.push(...inlineShots);
  }

  const versions = resolveLeadVersions(leadDir);
  const preferredFile = localPreviewCandidate
    ? path.basename(localPreviewCandidate)
    : (versions.find(entry => entry.fileName === 'index.html')?.fileName || versions[0]?.fileName || null);
  const actualPreviewFile = preferredFile ? path.join(leadDir, preferredFile) : null;
  const previewFileExists = actualPreviewFile ? fs.existsSync(actualPreviewFile) : false;

  const screenshotUrls = [...new Set(screenshots)]
    .map(file => path.basename(file))
    .filter(Boolean)
    .filter(file => fs.existsSync(path.join(leadDir, file)))
    .map(file => `/api/contacts/${contactId}/canvas/file?path=${encodeURIComponent(file)}`);

  return {
    publicPreviewUrl,
    localPreviewPath: `/api/contacts/${contactId}/canvas/preview${preferredFile ? `?file=${encodeURIComponent(preferredFile)}` : ''}`,
    previewVerifiedAt,
    previewFileExists,
    screenshots: screenshotUrls,
    versions: versions.map(version => ({
      ...version,
      url: `/api/contacts/${contactId}/canvas/preview?file=${encodeURIComponent(version.fileName)}`,
    })),
  };
}

function parseApprovalDoc(content, leadDir) {
  const bullets = parseMarkdownBullets(content);
  let approvedAt = null;
  let approvedBy = null;

  if (content) {
    const byMatch = content.match(/approved\s+by:\s*([^\n]+)/i);
    const atMatch = content.match(/approved\s+at:\s*([^\n]+)/i);
    if (byMatch) approvedBy = byMatch[1].trim();
    if (atMatch) {
      const parsed = new Date(atMatch[1].trim());
      if (Number.isFinite(parsed.getTime())) approvedAt = parsed.toISOString();
    }
  }

  const artifactsDir = path.join(leadDir, 'artifacts');
  const artifactNotes = [];
  if (fs.existsSync(artifactsDir)) {
    const files = fs.readdirSync(artifactsDir).filter(name => /qa|review|audit/i.test(name));
    for (const file of files) {
      const artifactContent = safeReadText(path.join(artifactsDir, file));
      const parsedBullets = parseMarkdownBullets(artifactContent);
      if (parsedBullets.length) {
        artifactNotes.push(...parsedBullets.map(item => `${file}: ${item}`));
      } else if (artifactContent && artifactContent.trim()) {
        artifactNotes.push(`${file}: ${artifactContent.trim().split('\n')[0]}`);
      }
    }
  }

  return {
    qaFindings: [...new Set([...bullets, ...artifactNotes])],
    approvedAt,
    approvedBy,
  };
}

function parseDecisionNotes(content) {
  if (!content) return [];
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('#'))
    .map(line => line.replace(/^[-*+]\s+/, '').trim())
    .filter(Boolean);
}

function extractBusinessEssence(briefContent, leadSlug) {
  if (!briefContent) {
    return {
      title: leadSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      subtitle: 'Concept preview pending',
      highlights: [],
    };
  }

  const title = (briefContent.match(/^#\s+(.+)/m)?.[1] || leadSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).trim();
  const subtitle = (briefContent.match(/\*\*The ONE thing:\*\*\s*(.+)/i)?.[1]
    || briefContent.match(/\*\*What:\*\*\s*(.+)/i)?.[1]
    || 'Local-first website concept').trim();

  const highlights = [];
  for (const label of ['Who', 'Since', 'What', 'The business goal for this website']) {
    const match = briefContent.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'));
    if (match) {
      highlights.push({ label, value: match[1].trim() });
    }
  }

  return { title, subtitle, highlights };
}

function buildGeneratedPreviewHtml({ leadSlug, conceptBrief, outreachPitch, conceptStatus }) {
  const essence = extractBusinessEssence(conceptBrief, leadSlug);
  const pitchSnippet = outreachPitch
    ? outreachPitch.split('\n').filter(Boolean).slice(0, 5).join(' ')
    : 'Outreach pitch not drafted yet.';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${essence.title}</title>
  <style>
    :root {
      --bg: #f5efe7;
      --surface: #fffdf9;
      --ink: #171717;
      --muted: #5f5c57;
      --accent: #b96d31;
      --border: rgba(23,23,23,0.08);
      --shadow: 0 18px 60px rgba(0,0,0,0.08);
      font-family: Georgia, 'Times New Roman', serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at top left, rgba(185,109,49,0.14), transparent 38%), var(--bg);
      color: var(--ink);
    }
    .hero {
      min-height: 100vh;
      padding: 56px 24px;
      display: grid;
      place-items: center;
    }
    .shell {
      width: min(1120px, 100%);
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,250,244,0.94));
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      border-radius: 28px;
      overflow: hidden;
    }
    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
      font: 600 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .status {
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(185,109,49,0.12);
      color: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 0;
    }
    .copy {
      padding: 56px 48px;
    }
    h1 {
      font-size: clamp(42px, 6vw, 74px);
      line-height: 0.94;
      margin: 0 0 18px;
      letter-spacing: -0.04em;
    }
    .sub {
      font: 500 18px/1.65 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--muted);
      max-width: 54ch;
      margin-bottom: 28px;
    }
    .cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 28px 0 32px;
    }
    .btn {
      border-radius: 999px;
      padding: 14px 18px;
      font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      text-decoration: none;
      border: 1px solid var(--ink);
      color: var(--ink);
    }
    .btn.primary {
      background: var(--ink);
      color: white;
      border-color: var(--ink);
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 28px;
    }
    .fact {
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.82);
      padding: 14px 16px;
      border-radius: 18px;
    }
    .fact-label {
      font: 600 11px/1.2 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .fact-value {
      font: 500 15px/1.55 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--ink);
    }
    .panel {
      min-height: 100%;
      padding: 48px 36px;
      background:
        linear-gradient(180deg, rgba(23,23,23,0.95), rgba(28,22,18,0.98)),
        radial-gradient(circle at top right, rgba(185,109,49,0.24), transparent 40%);
      color: rgba(255,255,255,0.92);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 28px;
    }
    .eyebrow {
      font: 600 11px/1.2 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.58);
      margin-bottom: 14px;
    }
    .quote {
      font-size: 28px;
      line-height: 1.15;
      margin: 0;
    }
    .pitch {
      border-top: 1px solid rgba(255,255,255,0.12);
      padding-top: 22px;
      font: 500 14px/1.7 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: rgba(255,255,255,0.72);
    }
    @media (max-width: 860px) {
      .grid { grid-template-columns: 1fr; }
      .copy, .panel { padding: 32px 24px; }
      .facts { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <div class="shell">
      <div class="masthead">
        <span>Generated Concept Preview</span>
        <span class="status">${String(conceptStatus || 'internal_review').replace(/_/g, ' ')}</span>
      </div>
      <div class="grid">
        <div class="copy">
          <h1>${essence.title}</h1>
          <p class="sub">${essence.subtitle}</p>
          <div class="cta-row">
            <a class="btn primary" href="#">Call Now</a>
            <a class="btn" href="#">Request a Quote</a>
          </div>
          <div class="facts">
            ${essence.highlights.slice(0, 4).map(item => `
              <div class="fact">
                <div class="fact-label">${item.label}</div>
                <div class="fact-value">${item.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <aside class="panel">
          <div>
            <div class="eyebrow">Concept Direction</div>
            <p class="quote">A trust-first, mobile-leaning homepage focused on clarity, locality, and direct contact.</p>
          </div>
          <div class="pitch">
            <div class="eyebrow">Pitch Context</div>
            ${pitchSnippet}
          </div>
        </aside>
      </div>
    </div>
  </section>
</body>
</html>`;
}

function resolveCanvasContext(id) {
  let contact = db.getOne('SELECT * FROM contacts WHERE id = ?', [id]) || null;
  let leadSlug = null;

  if (fs.existsSync(path.join(LEADS_DIR, id))) {
    leadSlug = id;
  }

  if (!leadSlug && contact?.email) {
    const placeholderMatch = contact.email.match(/^mig_(.+)@placeholder\.local$/i);
    if (placeholderMatch && fs.existsSync(path.join(LEADS_DIR, placeholderMatch[1]))) {
      leadSlug = placeholderMatch[1];
    }
  }

  if (!leadSlug && contact?.name) {
    const nameSlug = slugifyLeadName(contact.name);
    if (fs.existsSync(path.join(LEADS_DIR, nameSlug))) {
      leadSlug = nameSlug;
    }
  }

  if (!leadSlug && fs.existsSync(LEADS_DIR)) {
    const dirs = fs.readdirSync(LEADS_DIR).filter(dir => fs.statSync(path.join(LEADS_DIR, dir)).isDirectory());
    const targetEmail = (contact?.email || '').toLowerCase().trim();

    outer: for (const dir of dirs) {
      const leadDir = path.join(LEADS_DIR, dir);
      const leadRecordContent = safeReadText(path.join(leadDir, 'LEAD_RECORD.md')) || '';
      const pitchContent = safeReadText(path.join(leadDir, 'PITCH.md')) || '';
      const emailMatches = [
        ...(leadRecordContent.match(/\*\*Contact Email:\*\*\s*(.+)/ig) || []),
        ...(pitchContent.match(/\*\*To:\*\*\s*(.+)/ig) || []),
      ];

      if (targetEmail && emailMatches.some(line => line.toLowerCase().includes(targetEmail))) {
        leadSlug = dir;
        break outer;
      }

      if (!contact && dir === id) {
        leadSlug = dir;
        break outer;
      }
    }
  }

  if (!leadSlug) {
    throw createHttpError(404, 'Lead not found for contact');
  }

  const leadDir = path.join(LEADS_DIR, leadSlug);
  if (!contact) {
    contact = db.getOne('SELECT * FROM contacts WHERE email = ?', [`mig_${leadSlug}@placeholder.local`])
      || db.getOne('SELECT * FROM contacts WHERE lower(name) = lower(?)', [leadSlug.replace(/-/g, ' ')])
      || null;
  }

  return { contact, leadSlug, leadDir };
}

async function buildCanvasPayload(id) {
  const { contact, leadSlug, leadDir } = resolveCanvasContext(id);
  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  const previewPath = path.join(leadDir, 'CONCEPT_PREVIEW.md');
  const briefPath = path.join(leadDir, 'CONCEPT_BRIEF.md');
  const approvalPath = path.join(leadDir, 'CONCEPT_APPROVAL.md');
  const decisionPath = path.join(leadDir, 'CONCEPT_APPROVAL_DECISION.md');
  const draftPath = path.join(leadDir, 'OUTREACH_DRAFT.md');
  const pitchPath = path.join(leadDir, 'PITCH.md');
  const outreach = safeReadJson(outreachPath, {});
  const conceptPackage = outreach.conceptPackage || {};
  const conceptBrief = safeReadText(briefPath) || '';
  const previewDoc = safeReadText(previewPath) || '';
  const approvalDoc = safeReadText(approvalPath) || '';
  const decisionDoc = safeReadText(decisionPath) || '';
  const outreachDraft = safeReadText(draftPath) || '';
  const outreachPitch = safeReadText(pitchPath) || '';
  const previewMeta = parsePreviewDoc(previewDoc, leadDir, id);
  const approvalMeta = parseApprovalDoc(approvalDoc, leadDir);
  const readiness = await getQueueReadiness();
  const leadStats = fs.existsSync(leadDir) ? fs.statSync(leadDir) : null;

  const checklistDefaults = {
    previewLoads: previewMeta.previewFileExists || !!previewMeta.publicPreviewUrl || !!previewMeta.localPreviewPath,
    mobileViewAcceptable: false,
    screenshotsAttached: previewMeta.screenshots.length > 0,
    trustClaimsVerified: false,
    noUnverifiedCertifications: true,
    draftReferencesConcept: !!(outreachDraft || outreachPitch),
    publicUrlValid: !!(previewMeta.publicPreviewUrl || previewMeta.localPreviewPath),
    qaPassed: approvalMeta.qaFindings.length === 0 || conceptPackage.conceptStatus === 'approved' || outreach.contentApproval === 'approved',
    finalApprovalComplete: outreach.deploymentApproval === 'approved' || outreach.humanApproval === 'human_approved',
  };

  const checklist = {
    ...checklistDefaults,
    ...(outreach.conceptChecklist || {}),
  };

  const conceptStatus = conceptPackage.conceptStatus
    || (outreach.outreachStage === 'concept_review' ? 'internal_review' : null)
    || 'not_started';

  const conceptApproved = conceptStatus === 'approved';
  const previewValid = checklist.previewLoads && checklist.publicUrlValid;
  const qaPassed = !!checklist.qaPassed;
  const draftReady = !!checklist.draftReferencesConcept && !!outreachPitch;
  const mailboxReady = !!readiness.mailboxReady;
  const sendReady = conceptApproved && previewValid && qaPassed && draftReady && mailboxReady && !!checklist.finalApprovalComplete;
  const blockers = [];
  if (!conceptApproved) blockers.push('concept approval required');
  if (!previewValid) blockers.push('preview validation incomplete');
  if (!qaPassed) blockers.push('qa must pass');
  if (!draftReady) blockers.push('outreach draft incomplete');
  if (!mailboxReady) blockers.push('mailbox not ready');
  if (!checklist.finalApprovalComplete) blockers.push('final approval required');

  return {
    contact: contact ? { id: contact.id, name: contact.name, email: contact.email } : null,
    leadSlug,
    leadDir,
    concept: {
      status: conceptStatus,
      tier: conceptPackage.tier || 1,
      type: conceptPackage.conceptType || 'homepage_mock',
      publicPreviewUrl: previewMeta.publicPreviewUrl,
      localPreviewPath: previewMeta.localPreviewPath,
      previewVerifiedAt: previewMeta.previewVerifiedAt || conceptPackage.approvedAt || null,
      screenshots: previewMeta.screenshots,
      conceptBrief,
      qaFindings: approvalMeta.qaFindings,
      approvedAt: approvalMeta.approvedAt || conceptPackage.approvedAt || null,
      approvedBy: approvalMeta.approvedBy || conceptPackage.approvedBy || null,
      versions: previewMeta.versions,
      createdAt: leadStats?.birthtime?.toISOString?.() || leadStats?.mtime?.toISOString?.() || null,
    },
    outreach: {
      draft: outreachDraft,
      pitch: outreachPitch,
      stage: outreach.outreachStage || 'outreach_drafted',
      contentApproval: outreach.contentApproval || null,
      deploymentApproval: outreach.deploymentApproval || null,
    },
    checklist,
    readiness: {
      conceptApproved,
      previewValid,
      qaPassed,
      draftReady,
      mailboxReady,
      sendReady,
      blockers,
    },
    reviewNotes: parseDecisionNotes(decisionDoc),
    status: outreach.lastActionAt || nowIso(),
  };
}

app.get('/api/contacts/:id/canvas', asyncHandler(async (req, res) => {
  const payload = await buildCanvasPayload(req.params.id);
  res.json(payload);
}));

app.get('/api/contacts/:id/canvas/preview', handleRoute((req, res) => {
  const { leadSlug, leadDir } = resolveCanvasContext(req.params.id);
  const requestedFile = req.query.file ? path.basename(String(req.query.file)) : 'index.html';
  const previewFile = path.join(leadDir, requestedFile);

  if (fs.existsSync(previewFile) && fs.statSync(previewFile).isFile()) {
    return res.sendFile(previewFile);
  }

  const conceptBrief = safeReadText(path.join(leadDir, 'CONCEPT_BRIEF.md')) || '';
  const outreachPitch = safeReadText(path.join(leadDir, 'PITCH.md')) || '';
  const outreach = safeReadJson(path.join(leadDir, 'OUTREACH.json'), {});
  res.type('html').send(buildGeneratedPreviewHtml({
    leadSlug,
    conceptBrief,
    outreachPitch,
    conceptStatus: outreach?.conceptPackage?.conceptStatus || 'internal_review',
  }));
}));

app.get('/api/contacts/:id/canvas/file', handleRoute((req, res) => {
  const { leadDir } = resolveCanvasContext(req.params.id);
  const requested = String(req.query.path || '').trim();
  if (!requested) {
    throw createHttpError(400, 'path is required');
  }

  const filePath = path.resolve(leadDir, requested);
  if (!filePath.startsWith(path.resolve(leadDir))) {
    throw createHttpError(400, 'Invalid path');
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw createHttpError(404, 'File not found');
  }

  res.sendFile(filePath);
}));

app.post('/api/contacts/:id/canvas/checklist', handleRoute((req, res) => {
  const { leadDir } = resolveCanvasContext(req.params.id);
  const { item, checked } = req.body || {};
  const validItems = new Set([
    'previewLoads',
    'mobileViewAcceptable',
    'screenshotsAttached',
    'trustClaimsVerified',
    'noUnverifiedCertifications',
    'draftReferencesConcept',
    'publicUrlValid',
    'qaPassed',
    'finalApprovalComplete',
  ]);

  if (!validItems.has(item)) {
    throw createHttpError(400, 'Unknown checklist item');
  }
  if (typeof checked !== 'boolean') {
    throw createHttpError(400, 'checked must be a boolean');
  }

  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  const outreach = safeReadJson(outreachPath, {});
  outreach.conceptChecklist = {
    ...(outreach.conceptChecklist || {}),
    [item]: checked,
  };
  outreach.lastAction = `canvas_checklist_${item}`;
  outreach.lastActionAt = nowIso();
  writeJson(outreachPath, outreach);

  res.json({ ok: true, checklist: outreach.conceptChecklist });
}));

app.post('/api/contacts/:id/canvas/approve-concept', handleRoute((req, res) => {
  const { leadDir, leadSlug } = resolveCanvasContext(req.params.id);
  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  const outreach = safeReadJson(outreachPath, {});
  const timestamp = nowIso();
  outreach.conceptPackage = {
    ...(outreach.conceptPackage || {}),
    conceptStatus: 'approved',
    approvedBy: 'nero',
    approvedAt: timestamp,
  };
  outreach.outreachStage = 'concept_approved';
  outreach.lastAction = 'concept_approved';
  outreach.lastActionAt = timestamp;
  writeJson(outreachPath, outreach);
  appendTimeline(leadDir, {
    leadName: leadSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    timestamp,
    action: 'concept_approved',
    actor: 'nero',
    from: 'canvas review',
    notes: 'Concept approved from review canvas.',
  });
  res.json({ ok: true, conceptStatus: 'approved' });
}));

app.post('/api/contacts/:id/canvas/request-rework', handleRoute((req, res) => {
  const { leadDir, leadSlug } = resolveCanvasContext(req.params.id);
  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  const outreach = safeReadJson(outreachPath, {});
  const timestamp = nowIso();
  outreach.conceptPackage = {
    ...(outreach.conceptPackage || {}),
    conceptStatus: 'rework_needed',
    approvedBy: null,
    approvedAt: null,
  };
  outreach.outreachStage = 'concept_review';
  outreach.lastAction = 'concept_rework_requested';
  outreach.lastActionAt = timestamp;
  writeJson(outreachPath, outreach);
  appendTimeline(leadDir, {
    leadName: leadSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    timestamp,
    action: 'concept_rework_requested',
    actor: 'nero',
    from: 'canvas review',
    notes: 'Concept sent back for rework from review canvas.',
  });
  res.json({ ok: true, conceptStatus: 'rework_needed' });
}));

app.post('/api/contacts/:id/canvas/approve-draft', handleRoute((req, res) => {
  const { leadDir, leadSlug } = resolveCanvasContext(req.params.id);
  const outreachPath = path.join(leadDir, 'OUTREACH.json');
  const outreach = safeReadJson(outreachPath, {});
  const timestamp = nowIso();
  outreach.contentApproval = 'approved';
  outreach.contentApprovedBy = 'nero';
  outreach.contentApprovedAt = timestamp;
  outreach.outreachStage = outreach.deploymentApproval === 'approved' ? 'ready_to_send' : 'content_approved';
  outreach.lastAction = 'canvas_draft_approved';
  outreach.lastActionAt = timestamp;
  writeJson(outreachPath, outreach);
  appendTimeline(leadDir, {
    leadName: leadSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    timestamp,
    action: 'draft_approved',
    actor: 'nero',
    from: 'canvas review',
    notes: 'Outreach draft approved from review canvas.',
  });
  res.json({ ok: true, contentApproval: 'approved' });
}));

app.post('/api/contacts/:id/canvas/review-note', handleRoute((req, res) => {
  const { leadDir } = resolveCanvasContext(req.params.id);
  const { note } = req.body || {};
  if (!note || !String(note).trim()) {
    throw createHttpError(400, 'note is required');
  }

  const decisionPath = path.join(leadDir, 'CONCEPT_APPROVAL_DECISION.md');
  const timestamp = nowIso();
  const prefix = fs.existsSync(decisionPath) ? '\n' : '# Concept Approval Decision Notes\n\n';
  fs.appendFileSync(decisionPath, `${prefix}- [${timestamp}] ${String(note).trim()}` , 'utf8');
  res.json({ ok: true });
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
