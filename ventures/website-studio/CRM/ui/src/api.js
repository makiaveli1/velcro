// Verdantia CRM — API Layer
const BASE = '/api';

// ── Response normalizers ─────────────────────────────────
// Normalize backend responses to match frontend assumptions.
// These prevent crashes when the backend changes field names or returns null.

// Normalize contact detail — backend uses snake_case and may return null arrays.
function normalizeContactDetail(data) {
  if (!data || data.error) return data;
  return {
    ...data,
    // Backend returns follow_ups (snake_case) — normalize to both so callers work
    follow_ups: Array.isArray(data.follow_ups) ? data.follow_ups : [],
    // Ensure arrays are always arrays to prevent .map() crashes
    interactions: Array.isArray(data.interactions) ? data.interactions : [],
    summary: data.summary || {},
  };
}

function normalizeMailboxDetail(detail = {}) {
  return {
    configured: false,
    authenticated: false,
    tokenHealthy: false,
    sharedMailboxConfigured: false,
    sendAsVerified: false,
    reason: 'Mailbox status unavailable',
    blockerCode: 'not_authenticated',
    nextFix: 'Run `graph setup` to authenticate Microsoft Graph.',
    ...detail,
  };
}

function normalizePolicyDetail(detail = {}, fallback = {}) {
  const baseFileExists = fallback.fileExists ?? detail.fileExists ?? false;
  return {
    filePath: null,
    fileExists: baseFileExists,
    fileMissing: !(detail.fileExists ?? baseFileExists),
    ready: fallback.ready ?? baseFileExists,
    reason: fallback.reason ?? (baseFileExists ? 'Policy defined' : 'Outreach policy not defined'),
    ...detail,
    fileExists: detail.fileExists ?? baseFileExists,
    fileMissing: detail.fileMissing ?? !(detail.fileExists ?? baseFileExists),
    ready: detail.ready ?? fallback.ready ?? (detail.fileExists ?? baseFileExists),
    reason: detail.reason ?? fallback.reason ?? ((detail.fileExists ?? baseFileExists) ? 'Policy defined' : 'Outreach policy not defined'),
  };
}

function normalizeTokenInfo(tokenInfo = {}, graph = {}) {
  return {
    tokenLoaded: false,
    expiresAtMs: null,
    expiresAt: graph.tokenExpiresAt || null,
    tokenAgeMinutes: null,
    ...tokenInfo,
  };
}

function normalizeSystemStatus(data) {
  if (!data || data.error) return data;

  const tokenInfo = normalizeTokenInfo(data.tokenInfo, data.graph || {});
  const mailboxDetail = normalizeMailboxDetail(data.mailboxDetail);
  const policyDetail = normalizePolicyDetail(data.policy?.detail, data.policy || {});

  return {
    ...data,
    overall: data.overall || {},
    graph: {
      ...(data.graph || {}),
      tokenExpiresAt: data.graph?.tokenExpiresAt || tokenInfo.expiresAt || null,
    },
    mailbox: data.mailbox || {},
    mailboxDetail,
    policy: {
      ...(data.policy || {}),
      fileExists: data.policy?.fileExists ?? policyDetail.fileExists,
      fileMissing: data.policy?.fileMissing ?? policyDetail.fileMissing,
      detail: policyDetail,
    },
    tokenInfo,
    systemBlockers: Array.isArray(data.systemBlockers) ? data.systemBlockers : [],
    systemWarnings: Array.isArray(data.systemWarnings) ? data.systemWarnings : [],
    wsStats: data.wsStats || {},
    nextFixes: Array.isArray(data.nextFixes) ? data.nextFixes : [],
  };
}

function normalizeDashboardData(data) {
  if (!data || data.error) return data;
  const wsReadiness = data.wsReadiness || {};
  return {
    ...data,
    wsHealth: data.wsHealth || {},
    wsUrgent: Array.isArray(data.wsUrgent) ? data.wsUrgent : [],
    wsBlocked: Array.isArray(data.wsBlocked) ? data.wsBlocked : [],
    wsApprovedNotSent: Array.isArray(data.wsApprovedNotSent) ? data.wsApprovedNotSent : [],
    wsReadiness: {
      ...wsReadiness,
      systemBlockers: Array.isArray(wsReadiness.systemBlockers) ? wsReadiness.systemBlockers : [],
      systemWarnings: Array.isArray(wsReadiness.systemWarnings) ? wsReadiness.systemWarnings : [],
      mailboxDetail: normalizeMailboxDetail(wsReadiness.mailboxDetail),
      policyDetail: normalizePolicyDetail(wsReadiness.policyDetail),
    },
  };
}

function normalizeOutboundQueue(data) {
  if (!data || data.error) return data;
  return {
    ...data,
    items: Array.isArray(data.items) ? data.items.map(item => ({
      ...item,
      deploymentBlockedBy: Array.isArray(item.deploymentBlockedBy) ? item.deploymentBlockedBy : [],
      warnings: Array.isArray(item.warnings) ? item.warnings : [],
      pitch: item.pitch || {},
    })) : [],
    mailboxDetail: normalizeMailboxDetail(data.mailboxDetail),
    policyDetail: normalizePolicyDetail(data.policyDetail),
    systemBlockers: Array.isArray(data.systemBlockers) ? data.systemBlockers : [],
    systemWarnings: Array.isArray(data.systemWarnings) ? data.systemWarnings : [],
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Health ──────────────────────────────────────────────
export const apiHealth = () => request('/health');

// ── Dashboard ───────────────────────────────────────────
export const apiDashboard = () => request('/dashboard').then(normalizeDashboardData);

// ── Contacts ────────────────────────────────────────────
export const apiContacts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/contacts${qs ? `?${qs}` : ''}`);
};
export const apiContact = (id) =>
  request(`/contacts/${id}`).then(normalizeContactDetail);
export const apiCreateContact = (data) =>
  request('/contacts', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateContact = (id, data) =>
  request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Discovery ───────────────────────────────────────────
export const apiDiscovery = () => request('/discovery');
export const apiDiscoveryStats = () => request('/discovery/stats');
export const apiApproveDiscovery = (id) =>
  request(`/discovery/${id}/approve`, { method: 'POST' });
export const apiRejectDiscovery = (id) =>
  request(`/discovery/${id}/reject`, { method: 'POST' });
export const apiSkipDiscovery = (id) =>
  request(`/discovery/${id}/skip`, { method: 'POST' });

// ── Follow-ups ──────────────────────────────────────────
export const apiFollowUps = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/followups${qs ? `?${qs}` : ''}`);
};
export const apiCreateFollowUp = (data) =>
  request('/followups', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateFollowUp = (id, data) =>
  request(`/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Scoring ─────────────────────────────────────────────
export const apiScoreBreakdown = (id) => request(`/scoring/breakdown/${id}`);

// ── Attention ───────────────────────────────────────────
export const apiAttention = () => request('/attention');

// ── Drafts ───────────────────────────────────────────────
export const apiDrafts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/drafts${qs ? `?${qs}` : ''}`);
};
export const apiCreateDraft = (data) =>
  request('/drafts', { method: 'POST', body: JSON.stringify(data) });
export const apiApproveDraft = (id) =>
  request(`/drafts/${id}/approve`, { method: 'POST' });
export const apiRejectDraft = (id) =>
  request(`/drafts/${id}/reject`, { method: 'POST' });

// ── Summaries ───────────────────────────────────────────
export const apiSummary = (contactId) => request(`/summaries/${contactId}`);
export const apiGenerateSummary = (contactId) =>
  request(`/summaries/${contactId}`, { method: 'POST' });

// ── NL Query ─────────────────────────────────────────────
export const apiQuery = (query) =>
  request('/query', { method: 'POST', body: JSON.stringify({ query }) });

// ── Config ───────────────────────────────────────────────
export const apiConfig = () => request('/config');

// ── Graph / System setup ─────────────────────────────────
export const apiRunDiscovery = () =>
  request('/graph/run-discovery', { method: 'POST' });
export const apiGraphStatus = () => request('/graph/status');
export const apiGraphRefresh = () => request('/graph/refresh', { method: 'POST' });
export const apiGraphSetupStart = () => request('/graph/setup/start', { method: 'POST' });
export const apiGraphSetupStatus = () => request('/graph/setup/status');
export const apiSystemStatus = () => request('/system-status').then(normalizeSystemStatus);
export const apiSystemStatusDiagnostic = () => request('/system-status/diagnostic');
export const apiSystemStatusVerify = () =>
  request('/system-status/verify', { method: 'POST' }).then(normalizeSystemStatus);
export const apiPolicyCreate = () => request('/policy/create', { method: 'POST' });

// ── Test message ─────────────────────────────────────────
export const apiTestMessage = () =>
  request('/test-message', { method: 'POST' });

// ── Interactions ─────────────────────────────────────────
export const apiCreateInteraction = (contactId, data) =>
  request(`/contacts/${contactId}/interactions`, { method: 'POST', body: JSON.stringify(data) });

// ── Outbound Queue ───────────────────────────────────────
export const apiOutboundQueue = () => request('/outbound/queue').then(normalizeOutboundQueue);
export const apiOutboundReadiness = () => request('/outbound/readiness');
export const apiOutboundTransition = (id, action) =>
  request(`/outbound/leads/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
export const apiHumanApprove = (leadId) =>
  request(`/outbound/leads/${leadId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action: 'human_approve' }),
  });
export const apiHumanDeny = (leadId) =>
  request(`/outbound/leads/${leadId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action: 'human_deny' }),
  });

// ── Pipeline ─────────────────────────────────────────────
export const apiPipeline = () => request('/pipeline');
