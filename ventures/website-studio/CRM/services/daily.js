// Daily Digest Service — Morning intelligence briefing
// Scans last 24h, generates a digest of what changed and what needs attention

const { db, uuid } = require('../db/database');
const discovery = require('./discovery');
const scoring = require('./scoring');
const messaging = require('../adapters/messaging');

// ── Daily scan ─────────────────────────────────────────────────────────────────

/**
 * Run the daily automation pipeline.
 * Called by cron or manually.
 *
 * Steps:
 * 1. Run discovery scan (fetch new contacts from Graph)
 * 2. Update relationship scores
 * 3. Identify contacts needing attention
 * 4. Check overdue follow-ups
 * 5. Generate digest summary
 * 6. Send to messaging channel
 */
async function runDailyDigest(options = {}) {
  const { dryRun = false, quietHours = false, sendNotification = true } = options;
  const startTime = Date.now();

  console.log('[daily] Starting daily digest run...');

  // ── Step 1: Discovery scan ──────────────────────────────────────────────────
  let discoveryResult;
  try {
    discoveryResult = await discovery.runDiscovery({ daysBack: 1, dryRun });
  } catch (err) {
    discoveryResult = { success: false, error: err.message };
  }

  // ── Step 2: Update scores ──────────────────────────────────────────────────
  let scoringResult;
  try {
    const { scoreAllContacts } = require('./scoring');
    scoringResult = scoreAllContacts();
  } catch (err) {
    scoringResult = { scored: 0, errors: 1, error: err.message };
  }

  // ── Step 3: Contacts needing attention ─────────────────────────────────────
  const needsAttention = scoring.getContactsNeedingAttention().slice(0, 5);

  // ── Step 4: Overdue follow-ups ────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const overdueFollowUps = db.all(`
    SELECT fu.*, c.name as contact_name, c.company
    FROM follow_ups fu
    LEFT JOIN contacts c ON fu.contact_id = c.id
    WHERE fu.status = 'pending'
      AND fu.due_date < ?
      AND (fu.snoozed_until IS NULL OR fu.snoozed_until < ?)
    ORDER BY fu.due_date ASC
    LIMIT 10
  `, [today, today]);

  // ── Step 5: Discovery queue size ───────────────────────────────────────────
  const discoveryStats = discovery.getAutoAddStatus();
  const discoveryQueue = db.get(`SELECT COUNT(*) as c FROM discovery_review WHERE status = 'pending'`)?.c || 0;

  // ── Step 6: Build digest ───────────────────────────────────────────────────
  const durationMs = Date.now() - startTime;

  const digest = buildDigest({
    discoveryResult,
    discoveryStats,
    discoveryQueue,
    scoringResult,
    needsAttention,
    overdueFollowUps,
    dryRun,
    durationMs,
  });

  // ── Step 7: Log to database ─────────────────────────────────────────────────
  if (!dryRun) {
    const { scoreAllContacts } = require('./scoring');
    db.run(`
      INSERT INTO daily_digest_log
        (id, run_date, new_contacts, context_entries, scores_updated, summaries_regen, follow_ups_sent, errors, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `, [
      uuid(),
      today,
      discoveryResult?.stats?.new || 0,
      0,
      scoringResult?.scored || 0,
      overdueFollowUps.length,
      discoveryResult?.success === false ? discoveryResult.error : null,
      durationMs,
      new Date().toISOString(),
    ]);
  }

  // ── Step 8: Send notification ───────────────────────────────────────────────
  if (sendNotification && !dryRun && !quietHours) {
    try {
      await messaging.sendDigest(digest);
    } catch (err) {
      console.warn('[daily] Failed to send digest notification:', err.message);
    }
  }

  console.log(`[daily] Digest complete in ${durationMs}ms. ${digest.summary}`);

  return digest;
}

// ── Build digest text ────────────────────────────────────────────────────────

function buildDigest({ discoveryResult, discoveryStats, discoveryQueue, scoringResult, needsAttention, overdueFollowUps, dryRun, durationMs }) {
  const lines = [];
  const today = new Date().toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`  VERDANTIA CRM — Daily Digest`);
  lines.push(`  ${today}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(``);

  // Discovery
  if (discoveryResult?.success) {
    const { stats } = discoveryResult;
    if (stats.new > 0) {
      lines.push(`📬 NEW CONTACTS — ${stats.new} discovered`);
      lines.push(`   + ${stats.updated} signal updates · ${stats.skipped} skipped`);
      lines.push(``);
    }

    if (discoveryQueue > 0) {
      lines.push(`📋 DISCOVERY QUEUE — ${discoveryQueue} awaiting review`);
      if (discoveryStats.progressPct >= 80) {
        lines.push(`   Auto-add threshold: ${discoveryStats.progressPct}% (${discoveryStats.decisions}/${discoveryStats.threshold})`);
      }
      lines.push(``);
    }
  } else if (discoveryResult?.error === 'GRAPH_AUTH_EXPIRED' || discoveryResult?.error === 'Not authenticated') {
    lines.push(`⚠️  DISCOVERY — Not authenticated. Run Graph setup.`);
    lines.push(``);
  }

  // Overdue follow-ups
  if (overdueFollowUps.length > 0) {
    lines.push(`🚨 OVERDUE FOLLOW-UPS — ${overdueFollowUps.length}`);
    for (const fu of overdueFollowUps.slice(0, 5)) {
      const daysOverdue = Math.round((Date.now() - new Date(fu.due_date).getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`   ${fu.contact_name || 'Unknown'}${fu.company ? ` (${fu.company})` : ''}`);
      lines.push(`   "${fu.reason || 'follow up'}" — ${daysOverdue}d overdue`);
    }
    lines.push(``);
  }

  // Contacts needing attention
  if (needsAttention.length > 0) {
    lines.push(`👁  NEEDS ATTENTION — ${needsAttention.length}`);
    for (const c of needsAttention.slice(0, 4)) {
      const nudge = scoring.generateNudge(c);
      lines.push(`   ${c.name}${c.company ? ` · ${c.company}` : ''}`);
      lines.push(`   Score: ${c.relationship_score} · ${nudge}`);
    }
    lines.push(``);
  }

  // Scoring
  if (scoringResult?.scored > 0) {
    lines.push(`🔄 SCORES UPDATED — ${scoringResult.scored} contacts rescored`);
    lines.push(``);
  }

  // Summary line
  const totalIssues = (overdueFollowUps.length || 0) + (discoveryQueue || 0) + (needsAttention.length || 0);
  if (totalIssues === 0) {
    lines.push(`✅ All clear. Nothing needs immediate attention.`);
  } else {
    lines.push(`⚡ ${totalIssues} action item${totalIssues > 1 ? 's' : ''} — review above.`);
  }

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (dryRun) {
    lines.push(`  [DRY RUN — no changes persisted]`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  return {
    date: today,
    lines,
    summary: `${discoveryResult?.stats?.new || 0} new contacts · ${overdueFollowUps.length} overdue · ${needsAttention.length} need attention`,
    sections: {
      discovery: discoveryResult,
      scoring: scoringResult,
      overdueFollowUps,
      needsAttention,
    },
    durationMs,
    dryRun,
  };
}

// ── Quick check (no Graph API, just database state) ──────────────────────────

/**
 * Lightweight digest that doesn't call Graph — just surfaces DB state.
 * Use when Graph isn't configured or as a pre-check before full digest.
 */
function quickDigest() {
  const today = new Date().toISOString().split('T')[0];

  const queueSize = db.get(`SELECT COUNT(*) as c FROM discovery_review WHERE status = 'pending'`)?.c || 0;
  const overdueCount = db.get(`
    SELECT COUNT(*) as c FROM follow_ups
    WHERE status = 'pending'
      AND due_date < ?
      AND (snoozed_until IS NULL OR snoozed_until < ?)
  `, [today, today])?.c || 0;

  const needsAttentionCount = db.get(`
    SELECT COUNT(*) as c FROM contacts
    WHERE suppressed = 0
      AND (relationship_score < 40 OR last_touched_at < datetime('now', '-14 days'))
  `)?.c || 0;

  const totalContacts = db.get(`SELECT COUNT(*) as c FROM contacts WHERE suppressed = 0`)?.c || 0;

  return {
    queueSize,
    overdueCount,
    needsAttentionCount,
    totalContacts,
    hasWork: queueSize > 0 || overdueCount > 0 || needsAttentionCount > 0,
  };
}

module.exports = {
  runDailyDigest,
  quickDigest,
  buildDigest,
};
