const express = require('express');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const app = express();
const PORT = 3099;

const WS_ROOT     = path.join(__dirname, '..', '..', '..', 'website-studio');
const LEADS_DIR   = path.join(WS_ROOT, 'LEADS');
const CRM_DIR     = path.join(WS_ROOT, 'CRM');
const CAMPAIGNS_DIR = path.join(WS_ROOT, 'CAMPAIGNS');
const SUPPRESSION_FILE = path.join(CRM_DIR, 'SUPPRESSION.md');
const INDEX_FILE = path.join(__dirname, 'data', 'leads-index.json');

app.use(express.json());
app.use(express.static(__dirname));

// ── Utilities ────────────────────────────────────────────────────────────────

function readDirDeep(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      readDirDeep(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function readMD(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return { data, content: content.trim() };
  } catch {
    return null;
  }
}

function extractFrontmatter(raw) {
  try {
    const { data, content } = matter(raw);
    return { data, content: content.trim() };
  } catch {
    return { data: {}, content: raw.trim() };
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Stage inference ───────────────────────────────────────────────────────────

function inferStage(leadPath) {
  const checks = [
    { file: 'STATUS.md', extract: (raw) => {
        const { data } = extractFrontmatter(raw);
        return data.stage;
      }},
    { file: 'PITCH.md', extract: () => 'PITCH_DRAFTED' },
    { file: 'CONCEPT_BRIEF.md', extract: () => 'CONCEPT_CREATED' },
    { file: 'WEBSITE_AUDIT.md', extract: () => 'WEBSITE_AUDITED' },
    { file: 'NO_SITE_BRIEF.md', extract: () => 'NO_SITE_BRIEF_CREATED' },
    { file: 'BUSINESS.md', extract: () => 'BUSINESS_RESEARCHED' },
    { file: 'LEAD_RECORD.md', extract: () => 'LEAD_QUALIFIED' },
  ];

  for (const check of checks) {
    const fp = path.join(leadPath, check.file);
    if (fs.existsSync(fp)) {
      if (check.extract) {
        const raw = fs.readFileSync(fp, 'utf-8');
        const result = check.extract(raw);
        if (result) return result;
      }
      return null;
    }
  }
  return 'LEAD_FOUND';
}

// ── Lead parsing ─────────────────────────────────────────────────────────────

function parseLead(leadPath) {
  const name = path.basename(leadPath);
  const lead = {
    slug: name,
    path: leadPath,
    name: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    stage: 'LEAD_FOUND',
    score: null,
    category: null,
    location: null,
    website: null,
    suppressed: false,
    suppressionReason: null,
    suppressionDate: null,
    suppressionAddedBy: null,
    approvalStatus: null,
    rejectionReason: null,
    parkedReason: null,
    files: {},
    stageHistory: [],
    nextAction: null,
  };

  const allFiles = readDirDeep(leadPath);
  for (const f of allFiles) {
    lead.files[path.basename(f)] = f;
  }

  // Parse STATUS.md first
  const statusPath = path.join(leadPath, 'STATUS.md');
  if (fs.existsSync(statusPath)) {
    const raw = fs.readFileSync(statusPath, 'utf-8');
    const { data, content } = extractFrontmatter(raw);
    if (data.stage) lead.stage = data.stage;
    if (data.approvalStatus) lead.approvalStatus = data.approvalStatus;
    if (data.rejectionReason) lead.rejectionReason = data.rejectionReason;
    if (data.parkedReason) lead.parkedReason = data.parkedReason;
    if (data.nextAction) lead.nextAction = data.nextAction;
    if (data.stageHistory) lead.stageHistory = data.stageHistory;
  }

  // Parse LEAD_RECORD.md
  const recordPath = path.join(leadPath, 'LEAD_RECORD.md');
  if (fs.existsSync(recordPath)) {
    const raw = fs.readFileSync(recordPath, 'utf-8');
    const { data } = extractFrontmatter(raw);
    if (data.category) lead.category = data.category;
    if (data.subCategory) lead.subCategory = data.subCategory;
    if (data.location) lead.location = data.location;
    if (data.website) lead.website = data.website;
    if (data.score || data.totalScore) lead.score = data.score || data.totalScore;
    if (data.disposition) lead.disposition = data.disposition;
  }

  // Infer stage from file presence
  if (lead.stage === 'LEAD_FOUND' || !lead.stage) {
    lead.stage = inferStage(leadPath);
  }

  // Suppression check
  if (lead.stage === 'SUPPRESSED' || lead.suppressed) {
    lead.suppressed = true;
  }

  return lead;
}

// ── Suppression parsing ───────────────────────────────────────────────────────

function parseSuppressionList() {
  const suppressed = [];
  if (!fs.existsSync(SUPPRESSION_FILE)) return suppressed;
  const lines = fs.readFileSync(SUPPRESSION_FILE, 'utf-8').split('\n');
  let section = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('##')) { section = trimmed; continue; }
    // Skip blanks, comments, table headers, and template placeholders
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('-') || trimmed === '|') continue;
    if (trimmed.startsWith('**')) continue;
    // Skip template placeholder lines
    if (trimmed.startsWith('{') || trimmed.includes('{business') || trimmed.includes('{reason}')) continue;
    const parts = trimmed.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      if (parts[0] && parts[0] !== 'Business' && !parts[0].startsWith('{')) {
        suppressed.push({
          slug: parts[0],
          reason: parts[1] || '',
          date: parts[2] || '',
          addedBy: parts[3] || '',
          section: section.replace('## ', '').replace(' Auto-Suppressed', '').replace(' Nero-Declared', ''),
        });
      }
    }
  }
  return suppressed;
}

// ── Campaign parsing ─────────────────────────────────────────────────────────

function parseCampaigns() {
  const campaigns = [];
  if (!fs.existsSync(CAMPAIGNS_DIR)) return campaigns;
  const dirs = fs.readdirSync(CAMPAIGNS_DIR, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const campaignPath = path.join(CAMPAIGNS_DIR, d.name);
    const brief = readMD(path.join(campaignPath, 'BRIEF.md'));
    const results = readMD(path.join(campaignPath, 'RESULTS.md'));

    // Parse body fields — BRIEF.md uses **Key:** value format
    let bodyFields = {};
    if (brief?.content) {
      const fieldRe = /\*\*([^*]+):\*\* (.+)/g;
      let m;
      while ((m = fieldRe.exec(brief.content)) !== null) {
        bodyFields[m[1].trim().toLowerCase().replace(/ /g, '_')] = m[2].trim();
      }
    }

    campaigns.push({
      slug: d.name,
      path: campaignPath,
      name: d.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      status: brief?.data?.status || bodyFields['status'] || 'UNKNOWN',
      startDate: brief?.data?.['campaign_start'] || bodyFields['campaign_start'] || bodyFields['campaign_start'.replace(/_/g, ' ')] || '',
      targetSegment: bodyFields['target_segment'] || '',
      targetGeography: bodyFields['target_geography'] || '',
      metrics: {
        totalLeads: 0,
        qualified: 0,
        researched: 0,
        pitched: 0,
        approved: 0,
        sent: 0,
        responses: 0,
        won: 0,
      },
    });
  }
  return campaigns;
}

// ── Index builder ─────────────────────────────────────────────────────────────

function buildIndex() {
  const suppressionList = parseSuppressionList();
  const suppressedSlugs = new Set(suppressionList.map(s => s.slug));

  const leads = [];
  if (fs.existsSync(LEADS_DIR)) {
    const dirs = fs.readdirSync(LEADS_DIR, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const leadPath = path.join(LEADS_DIR, d.name);
      const lead = parseLead(leadPath);
      if (suppressedSlugs.has(lead.slug)) {
        lead.suppressed = true;
        const sup = suppressionList.find(s => s.slug === lead.slug);
        if (sup) {
          lead.suppressionReason = sup.reason;
          lead.suppressionDate = sup.date;
          lead.suppressionAddedBy = sup.addedBy;
        }
      }
      leads.push(lead);
    }
  }

  const campaigns = parseCampaigns();

  // Stage distribution for campaign
  for (const campaign of campaigns) {
    const stageCounts = {};
    for (const lead of leads) {
      stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
    }
    campaign.stageDistribution = stageCounts;
    // Count approved sends from leads in APPROVED/OUTREACH_SENT/FOLLOW_UP_PENDING/WON
    campaign.approvedSends = leads.filter(l =>
      ['APPROVED', 'OUTREACH_SENT', 'FOLLOW_UP_PENDING', 'WON'].includes(l.stage)
    ).length;
  }

  return { leads, campaigns, suppressionList };
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/index — full index (uses cached JSON if fresh)
app.get('/api/index', (req, res) => {
  try {
    const index = buildIndex();
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    res.json(index);
  } catch (err) {
    console.error('Index build error:', err);
    res.status(500).json({ error: 'Failed to build index' });
  }
});

// GET /api/leads — list all leads
app.get('/api/leads', (req, res) => {
  try {
    const index = buildIndex();
    res.json(index.leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:slug — full lead detail with file contents
app.get('/api/leads/:slug', (req, res) => {
  const { slug } = req.params;
  const leadPath = path.join(LEADS_DIR, slug);
  if (!fs.existsSync(leadPath)) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const lead = parseLead(leadPath);

  // Read all key files
  const fileContents = {};
  for (const [name, fp] of Object.entries(lead.files)) {
    const raw = fs.readFileSync(fp, 'utf-8');
    const { data, content } = extractFrontmatter(raw);
    fileContents[name] = { data, content };
  }

  res.json({ ...lead, fileContents });
});

// PUT /api/leads/:slug/status — update lead status (approve/reject/park)
app.put('/api/leads/:slug/status', (req, res) => {
  const { slug } = req.params;
  const { stage, approvalStatus, rejectionReason, parkedReason, nextAction, notes } = req.body;
  const leadPath = path.join(LEADS_DIR, slug);
  if (!fs.existsSync(leadPath)) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const statusPath = path.join(leadPath, 'STATUS.md');
  const timestamp = new Date().toISOString().split('T')[0];

  // Use gray-matter to properly parse existing frontmatter
  let existingData = {};
  let existingContent = '';
  if (fs.existsSync(statusPath)) {
    try {
      const parsed = matter(fs.readFileSync(statusPath, 'utf-8'));
      existingData = parsed.data || {};
      existingContent = parsed.content;
    } catch {}
  }

  // Merge new values
  if (stage)           existingData.stage = stage;
  if (approvalStatus)   existingData.approvalStatus = approvalStatus;
  if (rejectionReason) existingData.rejectionReason = rejectionReason;
  if (parkedReason)    existingData.parkedReason = parkedReason;
  if (nextAction)      existingData.nextAction = nextAction;

  // Build stage history entry
  const historyEntry = {
    date: timestamp,
    stage: stage || existingData.stage || '',
    action: approvalStatus || '',
    owner: 'Nero',
    notes: notes || (rejectionReason || parkedReason || ''),
  };

  let stageHistory = existingData.stageHistory || [];
  // Avoid duplicate consecutive entries
  const last = stageHistory[stageHistory.length - 1];
  if (!last || last.action !== historyEntry.action || last.stage !== historyEntry.stage) {
    stageHistory = [...stageHistory, historyEntry];
  }
  existingData.stageHistory = stageHistory;

  // Serialize frontmatter (manual YAML for clean output)
  let fm = '---\n';
  for (const [k, v] of Object.entries(existingData)) {
    if (k === 'stageHistory') continue; // handled in body
    fm += `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}\n`;
  }
  fm += '---\n';

  // Build body with stage history table
  let body = existingContent || '';
  // Remove existing stage history section
  body = body.replace(/^## Stage History\n[\s\S]*$/m, '').trim();

  const tableHeader = '| Date | Stage | Action | Owner | Notes |\n|---|---|---|---|---|';
  const tableRows = stageHistory.map(h =>
    `| ${h.date} | ${h.stage} | ${h.action} | ${h.owner} | ${h.notes} |`
  ).join('\n');

  body += (body ? '\n\n' : '') + '## Stage History\n\n' + tableHeader + '\n' + tableRows + '\n';

  fs.writeFileSync(statusPath, fm + '\n' + body);
  res.json({ success: true, slug, stage: existingData.stage, approvalStatus: existingData.approvalStatus });
});

// GET /api/suppression — suppression list
app.get('/api/suppression', (req, res) => {
  res.json(parseSuppressionList());
});

// GET /api/campaigns — campaign list
app.get('/api/campaigns', (req, res) => {
  res.json(parseCampaigns());
});

// GET /api/campaigns/:slug — single campaign
app.get('/api/campaigns/:slug', (req, res) => {
  const { slug } = req.params;
  const campaignPath = path.join(CAMPAIGNS_DIR, slug);
  if (!fs.existsSync(campaignPath)) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  const brief = readMD(path.join(campaignPath, 'BRIEF.md'));
  const results = readMD(path.join(campaignPath, 'RESULTS.md'));
  res.json({ slug, path: campaignPath, brief, results });
});

// GET /api/campaigns/:slug/leads — leads in campaign
app.get('/api/campaigns/:slug/leads', (req, res) => {
  const { slug } = req.params;
  const campaignPath = path.join(CAMPAIGNS_DIR, slug);
  const campaignLeadsDir = path.join(campaignPath, 'LEADS');
  const leads = [];
  if (fs.existsSync(campaignLeadsDir)) {
    const dirs = fs.readdirSync(campaignLeadsDir, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const leadPath = path.join(campaignLeadsDir, d.name);
      leads.push(parseLead(leadPath));
    }
  }
  res.json(leads);
});

app.listen(PORT, () => {
  console.log(`Website Studio CRM Cockpit running at http://localhost:${PORT}`);
});
