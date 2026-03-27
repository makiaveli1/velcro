#!/usr/bin/env node
// Seed 49 fake decisions to test auto-add threshold (50 total)
const { db, uuid } = require('../db/database');

const statuses = ['approved', 'rejected', 'skipped'];
let added = 0;

for (let i = 0; i < 49; i++) {
  const status = statuses[i % 3];
  const email = `decision_${i}@test.local`;
  const name = `Test Contact ${i}`;

  try {
    db.run(
      `INSERT OR IGNORE INTO discovery_review (id, email, name, source, signal_count, signal_quality, status, decision_at, created_at)
       VALUES (?, ?, ?, 'email_sender', 1, 'medium', ?, ?, ?)`,
      [uuid(), email, name, status, new Date().toISOString(), new Date().toISOString()]
    );
    added++;
  } catch (err) {
    // Skip duplicates
  }
}

const decisions = db.get(
  `SELECT COUNT(*) as c FROM discovery_review WHERE status IN ('approved','rejected','skipped') AND decision_at IS NOT NULL`
)?.c || 0;

console.log(`Added ${added} decisions. Total: ${decisions}/${50}`);
console.log(`Threshold reached: ${decisions >= 50}`);
