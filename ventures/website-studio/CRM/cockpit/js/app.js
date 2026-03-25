// app.js — Website Studio CRM Cockpit

// ── State ───────────────────────────────────────────────────
let allLeads = [];
let suppressionList = [];
let campaigns = [];
let currentView = 'pipeline';
let filters = { stage: '', category: '', location: '', scoreMin: '', scoreMax: '', status: '' };
let searchQuery = '';
let currentLeadDetail = null;

// ── Stage config ─────────────────────────────────────────────
const STAGES = [
  { id: 'LEAD_FOUND',            label: 'Lead Found',       short: 'Lead Found',       cls: 's-LEAD_FOUND' },
  { id: 'LEAD_QUALIFIED',         label: 'Lead Qualified',   short: 'Qualified',        cls: 's-LEAD_QUALIFIED' },
  { id: 'BUSINESS_RESEARCHED',    label: 'Business Research', short: 'Researched',       cls: 's-BUSINESS_RESEARCHED' },
  { id: 'WEBSITE_AUDITED',        label: 'Website Audited',   short: 'Audited',          cls: 's-WEBSITE_AUDITED' },
  { id: 'NO_SITE_BRIEF_CREATED',  label: 'No-Site Brief',     short: 'Brief Created',    cls: 's-NO_SITE_BRIEF_CREATED' },
  { id: 'CONCEPT_CREATED',       label: 'Concept Created',   short: 'Concept',          cls: 's-CONCEPT_CREATED' },
  { id: 'PITCH_DRAFTED',         label: 'Pitch Drafted',     short: 'Pitch',            cls: 's-PITCH_DRAFTED' },
  { id: 'APPROVAL_QUEUED',        label: 'Approval Queued',   short: 'Queued',           cls: 's-APPROVAL_QUEUED' },
  { id: 'APPROVED',              label: 'Approved',          short: 'Approved',         cls: 's-APPROVED' },
  { id: 'OUTREACH_SENT',         label: 'Outreach Sent',    short: 'Sent',             cls: 's-OUTREACH_SENT' },
  { id: 'FOLLOW_UP_PENDING',     label: 'Follow-Up Pending', short: 'Follow-Up',       cls: 's-FOLLOW_UP_PENDING' },
  { id: 'WON',                  label: 'Won',               short: 'Won',             cls: 's-WON' },
  { id: 'LOST',                 label: 'Lost',              short: 'Lost',            cls: 's-LOST' },
  { id: 'NO_RESPONSE',          label: 'No Response',       short: 'No Response',     cls: 's-NO_RESPONSE' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));

function stageLabel(id) { return STAGE_MAP[id]?.label || id; }
function stageCls(id)   { return STAGE_MAP[id]?.cls  || 's-LEAD_FOUND'; }
function stageShort(id) { return STAGE_MAP[id]?.short || id; }

function stageColor(id) {
  const map = {
    'LEAD_FOUND': '#71717a',
    'LEAD_QUALIFIED': '#71717a',
    'BUSINESS_RESEARCHED': '#6366f1',
    'WEBSITE_AUDITED': '#60a5fa',
    'NO_SITE_BRIEF_CREATED': '#60a5fa',
    'CONCEPT_CREATED': '#34d399',
    'PITCH_DRAFTED': '#10b981',
    'APPROVAL_QUEUED': '#fbbf24',
    'APPROVED': '#f97316',
    'OUTREACH_SENT': '#a78bfa',
    'FOLLOW_UP_PENDING': '#c084fc',
    'WON': '#22c55e',
    'LOST': '#ef4444',
    'NO_RESPONSE': '#dc2626',
    'SUPPRESSED': '#991b1b',
  };
  return map[id] || '#71717a';
}

// ── Init ────────────────────────────────────────────────────
async function init() {
  document.getElementById('ws-root-display').textContent = 'LEADS: …/LEADS';

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const view = el.dataset.view;
      if (view) showView(view);
    });
  });

  // Filter button
  document.getElementById('filter-btn').addEventListener('click', () => {
    const panel = document.getElementById('filter-panel');
    panel.classList.toggle('hidden');
  });

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderKanban();
  });

  // Filter inputs
  ['f-stage','f-category','f-location','f-score-min','f-score-max','f-status'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => readFilters());
    el.addEventListener('input',  () => readFilters());
  });

  document.getElementById('filter-clear').addEventListener('click', clearFilters);

  // Modal close
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('lead-detail').addEventListener('click', e => {
    if (e.target.id === 'lead-detail') closeDetail();
  });

  await loadData();
  populateFilterStage();
  showView('pipeline');
}

function readFilters() {
  filters.stage    = document.getElementById('f-stage').value;
  filters.category  = document.getElementById('f-category').value.trim().toLowerCase();
  filters.location  = document.getElementById('f-location').value.trim().toLowerCase();
  filters.scoreMin  = parseInt(document.getElementById('f-score-min').value) || '';
  filters.scoreMax  = parseInt(document.getElementById('f-score-max').value) || '';
  filters.status    = document.getElementById('f-status').value;
  renderKanban();
}

function clearFilters() {
  filters = { stage: '', category: '', location: '', scoreMin: '', scoreMax: '', status: '' };
  document.getElementById('f-stage').value = '';
  document.getElementById('f-category').value = '';
  document.getElementById('f-location').value = '';
  document.getElementById('f-score-min').value = '';
  document.getElementById('f-score-max').value = '';
  document.getElementById('f-status').value = '';
  searchQuery = '';
  document.getElementById('search-input').value = '';
  renderKanban();
}

async function loadData() {
  try {
    const data = await API.get('/index');
    allLeads        = data.leads        || [];
    suppressionList = data.suppressionList || [];
    campaigns       = data.campaigns     || [];
  } catch(e) {
    console.error('Failed to load data:', e);
  }
}

function populateFilterStage() {
  const sel = document.getElementById('f-stage');
  STAGES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    sel.appendChild(opt);
  });
}

// ── View routing ─────────────────────────────────────────────
async function showView(view) {
  currentView = view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navEl) navEl.classList.add('active');

  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  // Refresh data
  await loadData();

  switch (view) {
    case 'pipeline':    renderKanban(); break;
    case 'approvals':   renderApprovals(); break;
    case 'campaign':    renderCampaign(); break;
    case 'suppression': renderSuppression(); break;
  }
}

// ── Kanban Pipeline ──────────────────────────────────────────
function filteredLeads() {
  return allLeads.filter(l => {
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery) && !l.slug.includes(searchQuery)) return false;
    if (filters.stage && l.stage !== filters.stage) return false;
    if (filters.category && !(l.category || '').toLowerCase().includes(filters.category)) return false;
    if (filters.location && !(l.location || '').toLowerCase().includes(filters.location)) return false;
    if (filters.scoreMin && (l.score == null || l.score < filters.scoreMin)) return false;
    if (filters.scoreMax && (l.score == null || l.score > filters.scoreMax)) return false;
    if (filters.status === 'suppressed' && !l.suppressed) return false;
    if (filters.status === 'active'   &&  l.suppressed) return false;
    return true;
  });
}

function renderKanban() {
  const board  = document.getElementById('kanban-board');
  const empty  = document.getElementById('pipeline-empty');
  const sub    = document.getElementById('pipeline-sub');
  const leads  = filteredLeads();

  const countByStage = {};
  leads.forEach(l => { countByStage[l.stage] = (countByStage[l.stage] || 0) + 1; });

  sub.textContent = `${allLeads.length} total leads · ${leads.length} shown`;

  if (leads.length === 0) {
    board.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  board.innerHTML = '';

  STAGES.forEach(stage => {
    const stageLeads = leads.filter(l => l.stage === stage.id);
    if (stageLeads.length === 0 && filters.stage !== stage.id) return;

    const col = document.createElement('div');
    col.className = 'kanban-col';

    const header = document.createElement('div');
    header.className = 'kanban-col-header';

    const title = document.createElement('span');
    title.className = 'kanban-col-title';
    title.textContent = stage.short;

    const count = document.createElement('span');
    count.className = 'kanban-col-count';
    count.textContent = stageLeads.length;

    header.appendChild(title);
    header.appendChild(count);

    const cards = document.createElement('div');
    cards.className = 'kanban-col-cards';

    stageLeads.forEach(lead => {
      cards.appendChild(renderLeadCard(lead));
    });

    col.appendChild(header);
    col.appendChild(cards);
    board.appendChild(col);
  });
}

function renderLeadCard(lead) {
  const card = document.createElement('div');
  card.className = 'lead-card' + (lead.suppressed ? ' suppressed' : '');
  card.addEventListener('click', () => openLeadDetail(lead.slug));

  const name = document.createElement('div');
  name.className = 'lead-card-name';
  name.textContent = lead.name;

  const meta = document.createElement('div');
  meta.className = 'lead-card-meta';
  meta.textContent = [lead.category, lead.location].filter(Boolean).join(' · ');

  const footer = document.createElement('div');
  footer.className = 'lead-card-footer';

  const stageBadge = document.createElement('span');
  stageBadge.className = `badge-status ${stageCls(lead.stage)}`;
  stageBadge.textContent = stageShort(lead.stage);

  let scoreEl = '';
  if (lead.score != null) {
    const cls = lead.score >= 56 ? 'score-high' : lead.score >= 41 ? 'score-mid' : 'score-low';
    const scoreSpan = document.createElement('span');
    scoreSpan.className = `badge-score ${cls}`;
    scoreSpan.textContent = lead.score;
    footer.appendChild(scoreSpan);
  }

  footer.appendChild(stageBadge);

  card.appendChild(name);
  card.appendChild(meta);
  card.appendChild(footer);

  if (lead.suppressed) {
    const supBadge = document.createElement('span');
    supBadge.className = 'badge-suppressed';
    supBadge.textContent = 'Suppressed';
    card.appendChild(supBadge);
  }

  return card;
}

// ── Lead Detail ──────────────────────────────────────────────
async function openLeadDetail(slug) {
  try {
    currentLeadDetail = await API.get(`/leads/${slug}`);
    renderLeadDetail();
    document.getElementById('lead-detail').classList.remove('hidden');
  } catch(e) {
    toast('Failed to load lead details', 'error');
  }
}

function closeDetail() {
  document.getElementById('lead-detail').classList.add('hidden');
  currentLeadDetail = null;
}

function renderLeadDetail() {
  const lead = currentLeadDetail;
  if (!lead) return;

  document.getElementById('detail-name').textContent = lead.name;

  const metaParts = [lead.category, lead.location, lead.website ? `🌐 ${lead.website}` : 'No website'].filter(Boolean);
  document.getElementById('detail-meta').innerHTML = metaParts.join(' <span style="color:var(--text-3)">·</span> ');

  const body = document.getElementById('detail-body');
  body.innerHTML = '';

  // ── Top info row
  const infoRow = document.createElement('div');
  infoRow.className = 'detail-section';

  const grid = document.createElement('div');
  grid.className = 'detail-grid';

  const fields = [
    ['Slug', lead.slug],
    ['Stage', stageLabel(lead.stage)],
    ['Category', lead.category || '—'],
    ['Sub-Category', lead.subCategory || '—'],
    ['Location', lead.location || '—'],
    ['Website', lead.website || 'None'],
    ['Disposition', lead.disposition || '—'],
    ['Next Action', lead.nextAction || '—'],
  ];

  fields.forEach(([label, value]) => {
    const field = document.createElement('div');
    field.className = 'detail-field';
    field.innerHTML = `<div class="detail-label">${label}</div><div class="detail-value">${value || '—'}</div>`;
    grid.appendChild(field);
  });

  infoRow.appendChild(grid);
  body.appendChild(infoRow);

  // ── Suppression
  if (lead.suppressed) {
    const sup = document.createElement('div');
    sup.className = 'detail-section';
    sup.innerHTML = `
      <div class="detail-section-title">Suppression</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span class="badge-suppressed">Suppressed</span>
        <span style="font-size:13px;color:var(--text-2)">${lead.suppressionReason || 'No reason recorded'}</span>
        ${lead.suppressionDate ? `<span style="font-size:12px;color:var(--text-3)">${lead.suppressionDate} · ${lead.suppressionAddedBy || ''}</span>` : ''}
      </div>`;
    body.appendChild(sup);
  }

  // ── Score
  if (lead.score != null) {
    const scoreEl = document.createElement('div');
    scoreEl.className = 'detail-section';
    const cls = lead.score >= 56 ? 'high' : lead.score >= 41 ? 'mid' : 'low';
    scoreEl.innerHTML = `
      <div class="detail-section-title">Lead Score</div>
      <div class="detail-score-bar">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px;font-weight:700">${lead.score}</span>
          <span style="font-size:12px;color:var(--text-3)">/100</span>
          <span class="badge-status ${stageCls(lead.disposition)}" style="margin-left:4px">${lead.disposition || ''}</span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill ${cls}" style="width:${lead.score}%"></div>
        </div>
      </div>`;
    body.appendChild(scoreEl);
  }

  // ── Approval status
  if (lead.approvalStatus) {
    const approvalEl = document.createElement('div');
    approvalEl.className = 'detail-section';
    let html = `<div class="detail-section-title">Approval</div>`;
    html += `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">`;
    if (lead.approvalStatus === 'APPROVED') html += `<span class="badge-status s-WON" style="background:rgba(34,197,94,0.25);color:#4ade80">Approved</span>`;
    else if (lead.approvalStatus === 'REJECTED') html += `<span class="badge-status s-LOST">Rejected</span>`;
    else if (lead.approvalStatus === 'PARKED') html += `<span class="badge-status s-APPROVAL_QUEUED">Parked</span>`;
    else html += `<span class="badge-status">${lead.approvalStatus}</span>`;
    html += `</div>`;
    if (lead.rejectionReason) html += `<div style="font-size:13px;color:var(--text-2);margin-top:6px"><strong>Rejection reason:</strong> ${lead.rejectionReason}</div>`;
    if (lead.parkedReason)    html += `<div style="font-size:13px;color:var(--text-2);margin-top:6px"><strong>Park reason:</strong> ${lead.parkedReason}</div>`;
    approvalEl.innerHTML = html;
    body.appendChild(approvalEl);
  }

  // ── Website Audit / No-Site Brief
  const auditFile = lead.fileContents?.['WEBSITE_AUDIT.md'] || lead.fileContents?.['NO_SITE_BRIEF.md'];
  if (auditFile) {
    const section = document.createElement('div');
    section.className = 'detail-section';
    const fileName = lead.fileContents?.['WEBSITE_AUDIT.md'] ? 'Website Audit' : 'No-Site Brief';
    const preview = auditFile.content.slice(0, 600) + (auditFile.content.length > 600 ? '…' : '');
    section.innerHTML = `
      <div class="detail-section-title">${fileName}</div>
      <div class="file-block"><div class="file-block-title">Executive Summary</div>${escapeHtml(preview)}</div>`;
    body.appendChild(section);
  }

  // ── Concept Brief
  if (lead.fileContents?.['CONCEPT_BRIEF.md']) {
    const cb = lead.fileContents['CONCEPT_BRIEF.md'];
    const preview = cb.content.slice(0, 500) + (cb.content.length > 500 ? '…' : '');
    const section = document.createElement('div');
    section.className = 'detail-section';
    section.innerHTML = `
      <div class="detail-section-title">Concept Brief</div>
      <div class="file-block">${escapeHtml(preview)}</div>`;
    body.appendChild(section);
  }

  // ── Pitch Draft
  if (lead.fileContents?.['PITCH.md']) {
    const pitch = lead.fileContents['PITCH.md'];
    const preview = pitch.content.slice(0, 600) + (pitch.content.length > 600 ? '…' : '');
    const section = document.createElement('div');
    section.className = 'detail-section';
    section.innerHTML = `
      <div class="detail-section-title">Pitch Draft</div>
      <div class="file-block">${escapeHtml(preview)}</div>`;
    body.appendChild(section);
  }

  // ── Stage History
  if (lead.fileContents?.['STATUS.md'] && lead.stageHistory?.length > 0) {
    const section = document.createElement('div');
    section.className = 'detail-section';
    let html = `<div class="detail-section-title">Stage History</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="text-align:left;color:var(--text-3);font-size:11px">
        <th style="padding:4px 8px">Date</th><th style="padding:4px 8px">Stage</th><th style="padding:4px 8px">Action</th><th style="padding:4px 8px">Owner</th><th style="padding:4px 8px">Notes</th>
      </tr>`;
    lead.stageHistory.forEach(h => {
      html += `<tr style="border-top:1px solid var(--border);color:var(--text-2)">
        <td style="padding:5px 8px">${h.date || ''}</td>
        <td style="padding:5px 8px">${h.stage || ''}</td>
        <td style="padding:5px 8px">${h.action || ''}</td>
        <td style="padding:5px 8px">${h.owner || ''}</td>
        <td style="padding:5px 8px">${h.notes || ''}</td>
      </tr>`;
    });
    html += '</table>';
    section.innerHTML = html;
    body.appendChild(section);
  }

  // ── File paths
  if (Object.keys(lead.files).length > 0) {
    const section = document.createElement('div');
    section.className = 'detail-section';
    let html = `<div class="detail-section-title">Source Files</div>`;
    Object.entries(lead.files).forEach(([name, fp]) => {
      html += `<div style="font-size:11px;color:var(--text-3);margin-bottom:3px;word-break:break-all"><code>${fp.replace(/\/home\/likwid\/.openclaw\/workspace\/ventures\/website-studio\//, '')}</code></div>`;
    });
    section.innerHTML = html;
    body.appendChild(section);
  }

  // ── Approval actions (only in APPROVAL_QUEUED)
  if (lead.stage === 'APPROVAL_QUEUED') {
    renderApprovalPanel(body, lead);
  }
}

function renderApprovalPanel(container, lead) {
  const section = document.createElement('div');
  section.className = 'detail-section';
  section.id = 'approval-panel';
  section.innerHTML = `
    <div class="detail-section-title">Nero — Approval Decision</div>
    <textarea class="approval-notes" id="approval-notes" placeholder="Notes (optional for approve, required for reject)"></textarea>
    <div class="approval-actions">
      <button class="btn btn-success" onclick="submitApproval('${lead.slug}', 'APPROVED')">✓ Approve</button>
      <button class="btn btn-danger"  onclick="submitApproval('${lead.slug}', 'REJECTED')">✕ Reject</button>
      <button class="btn btn-warning"  onclick="submitApproval('${lead.slug}', 'PARKED')">⏸ Park</button>
    </div>`;
  container.appendChild(section);
}

async function submitApproval(slug, action) {
  const notes = document.getElementById('approval-notes')?.value || '';
  const rejectNotes = document.getElementById('approval-notes')?.value || '';

  if (action === 'REJECTED' && !rejectNotes.trim()) {
    toast('Please add a rejection reason in the notes field', 'error');
    return;
  }

  const newStage = action === 'APPROVED' ? 'APPROVED'
                 : action === 'REJECTED' ? 'LOST'
                 : 'LEAD_FOUND'; // PARKED → park it back

  try {
    await API.put(`/leads/${slug}/status`, {
      stage: newStage,
      approvalStatus: action,
      rejectionReason: action === 'REJECTED' ? rejectNotes : undefined,
      parkedReason:    action === 'PARKED'   ? rejectNotes : undefined,
      notes: notes,
    });
    toast(`Lead ${action.toLowerCase()} successfully`, 'success');
    closeDetail();
    await loadData();
    if (currentView === 'approvals') renderApprovals();
    else renderKanban();
  } catch(e) {
    toast('Failed to update lead: ' + e.message, 'error');
  }
}

// ── Approval Queue ───────────────────────────────────────────
function renderApprovals() {
  const list  = document.getElementById('approval-list');
  const empty = document.getElementById('approval-empty');
  const badge = document.getElementById('approval-count');

  const queued = allLeads.filter(l => l.stage === 'APPROVAL_QUEUED');

  badge.textContent = queued.length;
  badge.style.display = queued.length > 0 ? 'inline' : 'none';

  if (queued.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = '';
  queued.forEach(lead => {
    const card = document.createElement('div');
    card.className = 'approval-card';
    card.id = `approval-card-${lead.slug}`;

    const scoreCls = lead.score >= 56 ? 'score-high' : lead.score >= 41 ? 'score-mid' : 'score-low';

    let pitchPreview = 'No pitch draft yet.';
    if (lead.fileContents?.['PITCH.md']) {
      const raw = lead.fileContents['PITCH.md'].content;
      const hookMatch = raw.match(/Opening hook[\s\S]*?\*\*[\s\S]{0,300}/);
      pitchPreview = hookMatch ? hookMatch[0].replace(/[*#]/g, '').slice(0, 300) : raw.slice(0, 300);
    }

    let conceptSummary = '';
    if (lead.fileContents?.['CONCEPT_BRIEF.md']) {
      const essence = lead.fileContents['CONCEPT_BRIEF.md'].content.match(/## Business Essence[\s\S]{0,300}/);
      conceptSummary = essence ? essence[0].replace(/[*#]/g, '').slice(0, 300) : '';
    }

    card.innerHTML = `
      <div class="approval-card-header">
        <div>
          <div class="approval-card-name">${lead.name}</div>
          <div class="approval-card-meta">${[lead.category, lead.location].filter(Boolean).join(' · ')}</div>
        </div>
        ${lead.score != null ? `<div class="approval-card-score badge-score ${scoreCls}">${lead.score}</div>` : ''}
      </div>

      ${conceptSummary ? `<div><div class="approval-section-label">Concept Direction</div><div class="approval-preview" style="max-height:80px;font-size:12px;color:var(--text-2);margin-top:4px">${escapeHtml(conceptSummary.slice(0, 200))}</div></div>` : ''}

      <div>
        <div class="approval-section-label">Pitch Preview</div>
        <div class="approval-preview">${escapeHtml(pitchPreview)}</div>
      </div>

      <div>
        <textarea class="approval-notes" id="notes-${lead.slug}" placeholder="Decision notes (required for rejection)"></textarea>
      </div>

      <div class="approval-actions">
        <button class="btn btn-success" onclick="submitApprovalCard('${lead.slug}', 'APPROVED')">✓ Approve</button>
        <button class="btn btn-danger"  onclick="submitApprovalCard('${lead.slug}', 'REJECTED')">✕ Reject</button>
        <button class="btn btn-warning" onclick="submitApprovalCard('${lead.slug}', 'PARKED')">⏸ Park</button>
        <button class="btn btn-ghost btn-sm" onclick="openLeadDetail('${lead.slug}')" style="margin-left:auto">View Full Details</button>
      </div>`;

    list.appendChild(card);
  });
}

async function submitApprovalCard(slug, action) {
  const notes = document.getElementById(`notes-${slug}`)?.value || '';

  if (action === 'REJECTED' && !notes.trim()) {
    toast('Please add a rejection reason in the notes field', 'error');
    return;
  }

  const newStage = action === 'APPROVED' ? 'APPROVED'
                 : action === 'REJECTED' ? 'LOST'
                 : 'LEAD_FOUND';

  try {
    await API.put(`/leads/${slug}/status`, {
      stage: newStage,
      approvalStatus: action,
      rejectionReason: action === 'REJECTED' ? notes : undefined,
      parkedReason:    action === 'PARKED'   ? notes : undefined,
      notes: notes,
    });
    toast(`${allLeads.find(l => l.slug === slug)?.name || slug} ${action.toLowerCase()}`, 'success');
    await loadData();
    renderApprovals();
    renderKanban();
  } catch(e) {
    toast('Failed: ' + e.message, 'error');
  }
}

// ── Campaign View ─────────────────────────────────────────────
function renderCampaign() {
  const content = document.getElementById('campaign-content');
  const campaign = campaigns[0]; // dublin-trades-round-1

  if (!campaign) {
    content.innerHTML = `<div class="empty-state"><h3>No active campaign</h3><p>Create a campaign in CAMPAIGNS/ to track it here.</p></div>`;
    return;
  }

  // Compute stats from all leads
  const s = {
    total:   allLeads.length,
    found:   allLeads.filter(l => ['LEAD_FOUND','LEAD_QUALIFIED','BUSINESS_RESEARCHED'].includes(l.stage)).length,
    qualified: allLeads.filter(l => ['LEAD_QUALIFIED','BUSINESS_RESEARCHED','WEBSITE_AUDITED','NO_SITE_BRIEF_CREATED'].includes(l.stage)).length,
    audited: allLeads.filter(l => ['WEBSITE_AUDITED','NO_SITE_BRIEF_CREATED','CONCEPT_CREATED'].includes(l.stage)).length,
    concept: allLeads.filter(l => ['CONCEPT_CREATED','PITCH_DRAFTED'].includes(l.stage)).length,
    pitched: allLeads.filter(l => ['PITCH_DRAFTED','APPROVAL_QUEUED'].includes(l.stage)).length,
    queued:  allLeads.filter(l => l.stage === 'APPROVAL_QUEUED').length,
    approved: allLeads.filter(l => ['APPROVED','OUTREACH_SENT','FOLLOW_UP_PENDING','WON'].includes(l.stage)).length,
    sent:    allLeads.filter(l => ['OUTREACH_SENT','FOLLOW_UP_PENDING','WON'].includes(l.stage)).length,
    won:     allLeads.filter(l => l.stage === 'WON').length,
    maxSends: 5,
  };

  const activeStages = ['LEAD_FOUND','LEAD_QUALIFIED','BUSINESS_RESEARCHED','WEBSITE_AUDITED','NO_SITE_BRIEF_CREATED','CONCEPT_CREATED','PITCH_DRAFTED','APPROVAL_QUEUED','APPROVED','OUTREACH_SENT','FOLLOW_UP_PENDING','WON','LOST','NO_RESPONSE'];

  let html = `
  <div class="campaign-hero">
    <div class="campaign-name">${campaign.name}</div>
    <div class="campaign-status" style="color:${campaign.status === 'ACTIVE' ? '#22c55e' : '#fbbf24'}">${campaign.status}</div>
    <div class="campaign-meta">
      <span>📍 ${campaign.targetGeography || 'Dublin'}</span>
      <span>🏷 ${campaign.targetSegment || 'Plumbers + Electricians'}</span>
      <span>📅 Started ${campaign.startDate || '—'}</span>
    </div>
  </div>

  <div class="campaign-stats">
    <div class="stat-card">
      <div class="stat-value">${s.total}</div>
      <div class="stat-label">Leads Found</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.qualified}</div>
      <div class="stat-label">Qualified</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.audited}</div>
      <div class="stat-label">Audited</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.concept}</div>
      <div class="stat-label">Concepts</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.pitched}</div>
      <div class="stat-label">Pitched</div>
    </div>
    <div class="stat-card highlight">
      <div class="stat-value">${s.sent}/${s.maxSends}</div>
      <div class="stat-label">Sends Used</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.won}</div>
      <div class="stat-label">Won</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${s.queued}</div>
      <div class="stat-label">In Approval Queue</div>
    </div>
  </div>

  <div class="stage-distribution">
    <div class="stage-dist-title">Stage Distribution</div>`;

  const maxCount = Math.max(...activeStages.map(st => allLeads.filter(l => l.stage === st).length), 1);

  activeStages.forEach(stageId => {
    const count = allLeads.filter(l => l.stage === stageId).length;
    if (count === 0 && filters.stage !== stageId) return;
    const pct = (count / maxCount) * 100;
    const color = stageColor(stageId);
    html += `
    <div class="stage-bar-row">
      <div class="stage-bar-label">${stageLabel(stageId)}</div>
      <div class="stage-bar-track">
        <div class="stage-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="stage-bar-count">${count}</div>
    </div>`;
  });

  html += `</div>`;
  content.innerHTML = html;
}

// ── Suppression View ─────────────────────────────────────────
function renderSuppression() {
  const list  = document.getElementById('suppression-list');
  const empty = document.getElementById('suppression-empty');

  if (suppressionList.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = '';
  suppressionList.forEach(s => {
    const item = document.createElement('div');
    item.className = 'suppression-item';
    item.innerHTML = `
      <div>
        <div class="suppression-name">${s.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
        <div class="suppression-reason">${s.reason || 'No reason'}</div>
      </div>
      <div>
        <div class="suppression-section">${s.section}</div>
        <div class="suppression-date">${s.date}${s.addedBy ? ` · ${s.addedBy}` : ''}</div>
      </div>
      <div style="text-align:right">
        <div class="suppression-date">${s.slug}</div>
      </div>`;
    list.appendChild(item);
  });
}

// ── Utilities ────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
