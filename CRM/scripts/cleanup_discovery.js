#!/usr/bin/env node
// Cleanup: reject internal domain entries, mark obvious noise as skipped
const { db } = require('../db/database');

// Reject internal domain
const internal = db.getOne(`SELECT id, email FROM discovery_review WHERE email LIKE '%@verdantia.ie%' AND status='pending'`);
if (internal) {
  console.log('Rejecting (internal domain):', internal.email);
  db.run(`UPDATE discovery_review SET status='skipped', decision_at=datetime('now'), decided_by='system' WHERE id=?`, [internal.id]);
}

// Mark obvious newsletters/noise as skipped
const noise = [
  'offers@betterquote.email',
  'post-training@mail.aitinkerers.org',
  'anthropic-team@mail.anthropic.com',
  'mssecurity-noreply@microsoft.com',
  'microsoft-noreply@microsoft.com',
];

for (const email of noise) {
  const entry = db.getOne(`SELECT id FROM discovery_review WHERE email=? AND status='pending'`, [email]);
  if (entry) {
    db.run(`UPDATE discovery_review SET status='skipped', decision_at=datetime('now'), decided_by='system' WHERE id=?`, [entry.id]);
    console.log('Skipped (noise):', email);
  } else {
    console.log('Already processed:', email);
  }
}

// Count remaining
const pending = db.get(`SELECT COUNT(*) as c FROM discovery_review WHERE status='pending'`)?.c || 0;
const total = db.get(`SELECT COUNT(*) as c FROM discovery_review`)?.c || 0;
console.log(`\nDiscovery queue: ${pending} pending / ${total} total`);
