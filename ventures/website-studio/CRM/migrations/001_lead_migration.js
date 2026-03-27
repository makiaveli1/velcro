const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const { db, uuid } = require('../db/database');

const CRM_ROOT = path.resolve(__dirname, '..');
const LEADS_DIR = path.resolve(CRM_ROOT, '..', 'LEADS');
const SUPPRESSION_FILE = path.join(CRM_ROOT, 'SUPPRESSION.md');

const nowIso = () => new Date().toISOString();
const titleCaseFromSlug = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanOptional(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  if (/^(none|not found publicly|not found explicitly|n\/a|unknown)$/i.test(cleaned)) return null;
  return cleaned;
}

function readMatterFile(filePath) {
  if (!fs.existsSync(filePath)) return { data: {}, content: '' };
  return matter(fs.readFileSync(filePath, 'utf8'));
}

function extractLabeledValue(content, label) {
  const match = content.match(new RegExp(`\\*\\*${escapeRegExp(label)}:\\*\\*\\s*([^\\n]+)`, 'i'));
  return cleanOptional(match ? match[1].trim() : null);
}

function extractSection(content, sectionTitle) {
  const match = content.match(new RegExp(`##\\s+${escapeRegExp(sectionTitle)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i'));
  return match ? match[1].trim() : null;
}

function extractScore(statusData, recordContent) {
  if (Number.isFinite(Number(statusData.score))) return Number(statusData.score);
  const patterns = [/score\s*(\d+)\/100/i, /Total:\s*(\d+)\/100/i, /Score:\s*(\d+)\/100/i];
  for (const pattern of patterns) {
    const match = recordContent.match(pattern);
    if (match) return Number(match[1]);
  }
  return 50;
}

function parseIsoDate(value, fallback = nowIso()) {
  const cleaned = cleanOptional(value);
  if (!cleaned) return fallback;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? `${cleaned}T00:00:00Z` : cleaned;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function parseSuppressionMap() {
  const map = new Map();
  if (!fs.existsSync(SUPPRESSION_FILE)) return map;

  for (const line of fs.readFileSync(SUPPRESSION_FILE, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const parts = trimmed.split('|').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) continue;
    const [slug, reason] = parts;
    if (!slug || slug === 'Business' || slug.startsWith('_(')) continue;
    map.set(slug, cleanOptional(reason) || 'Suppressed in legacy suppression list');
  }

  return map;
}

function extractDomain(website) {
  if (!website) return null;
  try {
    const parsed = new URL(website.startsWith('http') ? website : `https://${website}`);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function ensureCompany(name, website) {
  if (!name) return null;

  const existing = db.getOne('SELECT * FROM companies WHERE lower(name) = lower(?) LIMIT 1', [name]);
  const timestamp = nowIso();
  const domain = extractDomain(website);

  if (existing) {
    db.run('UPDATE companies SET website = ?, domain = ?, updated_at = ? WHERE id = ?', [
      website || existing.website || null,
      domain || existing.domain || null,
      timestamp,
      existing.id,
    ]);
    return db.getOne('SELECT * FROM companies WHERE id = ?', [existing.id]);
  }

  const id = uuid();
  db.run(
    `INSERT INTO companies (id, name, domain, website, linked_people, company_news_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, domain, website || null, 0, 0, timestamp, timestamp]
  );
  return db.getOne('SELECT * FROM companies WHERE id = ?', [id]);
}

function refreshCompanyLinkCounts() {
  db.run(
    `UPDATE companies
     SET linked_people = (
       SELECT COUNT(*)
       FROM contacts
       WHERE contacts.company IS NOT NULL
         AND lower(contacts.company) = lower(companies.name)
     ),
     updated_at = ?`,
    [nowIso()]
  );
}

function placeholderEmail(slug) {
  return `no-email+${slug}@migration.invalid`;
}

function migrateLead(leadPath, suppressionMap) {
  const slug = path.basename(leadPath);
  const recordPath = path.join(leadPath, 'LEAD_RECORD.md');
  const statusPath = path.join(leadPath, 'STATUS.md');

  if (!fs.existsSync(recordPath)) {
    return { slug, status: 'skipped_missing_record' };
  }

  const record = readMatterFile(recordPath);
  const status = readMatterFile(statusPath);
  const recordContent = record.content || '';
  const statusContent = status.content || '';

  const name = titleCaseFromSlug(slug);
  const companyName = cleanOptional(record.data.company) || extractLabeledValue(recordContent, 'Business Name') || name;
  const rawEmail = cleanOptional(record.data.email) || cleanOptional(status.data.email) || extractLabeledValue(recordContent, 'Contact Email');
  const email = rawEmail || placeholderEmail(slug);
  const usedPlaceholderEmail = !rawEmail;
  const role = cleanOptional(record.data.role) || cleanOptional(status.data.role) || extractLabeledValue(recordContent, 'Business Category');
  const website = cleanOptional(record.data.website) || extractLabeledValue(recordContent, 'Website URL');
  const score = extractScore(status.data, recordContent);
  const source = cleanOptional(record.data.source) || cleanOptional(status.data.source) || extractLabeledValue(recordContent, 'Source') || 'lead_migration';
  const stage = cleanOptional(status.data.stage) || extractLabeledValue(statusContent, 'Current Stage') || extractLabeledValue(recordContent, 'Status');
  const createdAt = parseIsoDate(record.data.dateDiscovered || extractLabeledValue(recordContent, 'Date Discovered'));
  const updatedAt = parseIsoDate(status.data.lastUpdated || createdAt, createdAt);
  const suppressed = suppressionMap.has(slug) || /suppressed/i.test(stage || '') ? 1 : 0;
  const suppressionReason = suppressionMap.get(slug) || (suppressed ? stage || 'Suppressed in legacy CRM' : null);
  const signalSection = extractSection(recordContent, 'Initial Signal Observed');
  const notesSection = extractSection(recordContent, 'Notes');
  const notes = [
    'Migrated from the legacy file-based lead pipeline.',
    stage ? `Legacy stage: ${stage}.` : null,
    usedPlaceholderEmail ? 'Placeholder email generated during migration because no public email was found.' : null,
    signalSection ? `Signal: ${signalSection.replace(/\s+/g, ' ')}` : null,
    notesSection ? `Notes: ${notesSection.replace(/\s+/g, ' ')}` : null,
  ].filter(Boolean).join('\n');

  const existingContact = db.getOne('SELECT id FROM contacts WHERE email = ?', [email]);
  ensureCompany(companyName, website);

  if (existingContact) {
    return { slug, status: 'skipped_existing', usedPlaceholderEmail, suppressed };
  }

  db.run(
    `INSERT INTO contacts (
      id, email, name, company, role, priority, relationship_score, source,
      discovery_method, auto_add_mode, skip_patterns, created_at, updated_at,
      last_touched_at, suppressed, suppression_reason, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid(),
      email,
      name,
      companyName,
      role || null,
      2,
      score,
      'lead_migration',
      source,
      0,
      null,
      createdAt,
      updatedAt,
      updatedAt,
      suppressed,
      suppressionReason,
      notes,
    ]
  );

  return { slug, status: 'inserted', usedPlaceholderEmail, suppressed };
}

function migrate() {
  if (!fs.existsSync(LEADS_DIR)) throw new Error(`Leads directory not found: ${LEADS_DIR}`);

  const suppressionMap = parseSuppressionMap();
  const leadDirs = fs.readdirSync(LEADS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(LEADS_DIR, entry.name))
    .sort();

  const results = [];
  const run = db.transaction((dirs) => {
    for (const leadPath of dirs) {
      const result = migrateLead(leadPath, suppressionMap);
      results.push(result);
      console.log(`[lead migration] ${result.slug}: ${result.status}`);
    }
  });

  run(leadDirs);
  refreshCompanyLinkCounts();

  const summary = {
    leadsScanned: leadDirs.length,
    contactsInserted: results.filter((item) => item.status === 'inserted').length,
    existingContactsSkipped: results.filter((item) => item.status === 'skipped_existing').length,
    leadsSkippedMissingRecord: results.filter((item) => item.status === 'skipped_missing_record').length,
    placeholderEmails: results.filter((item) => item.usedPlaceholderEmail).length,
    suppressedContacts: results.filter((item) => item.suppressed === 1).length,
    totalContacts: db.getOne('SELECT COUNT(*) AS total FROM contacts')?.total || 0,
    totalCompanies: db.getOne('SELECT COUNT(*) AS total FROM companies')?.total || 0,
  };

  console.log('');
  console.log('Lead migration complete');
  console.log(`- Leads scanned: ${summary.leadsScanned}`);
  console.log(`- Contacts inserted: ${summary.contactsInserted}`);
  console.log(`- Existing contacts skipped: ${summary.existingContactsSkipped}`);
  console.log(`- Leads skipped (missing LEAD_RECORD.md): ${summary.leadsSkippedMissingRecord}`);
  console.log(`- Placeholder emails generated: ${summary.placeholderEmails}`);
  console.log(`- Suppressed contacts preserved: ${summary.suppressedContacts}`);
  console.log(`- Total contacts in CRM: ${summary.totalContacts}`);
  console.log(`- Total companies in CRM: ${summary.totalCompanies}`);

  return summary;
}

if (require.main === module) {
  try {
    migrate();
  } catch (error) {
    console.error('[lead migration] failed:', error.message);
    process.exit(1);
  }
}

module.exports = { migrate };
