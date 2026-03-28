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
export const apiDashboard = () => request('/dashboard');

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

// ── Graph ────────────────────────────────────────────────
export const apiRunDiscovery = () =>
  request('/graph/run-discovery', { method: 'POST' });

// ── Test message ─────────────────────────────────────────
export const apiTestMessage = () =>
  request('/test-message', { method: 'POST' });

// ── Interactions ─────────────────────────────────────────
export const apiCreateInteraction = (contactId, data) =>
  request(`/contacts/${contactId}/interactions`, { method: 'POST', body: JSON.stringify(data) });

// ── Outbound Queue ───────────────────────────────────────
export const apiOutboundQueue = () => request('/outbound/queue');
export const apiOutboundReadiness = () => request('/outbound/readiness');
export const apiOutboundTransition = (id, action) =>
  request(`/outbound/leads/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
