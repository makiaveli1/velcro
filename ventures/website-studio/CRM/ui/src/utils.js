// Shared utilities

/**
 * Format a date string or timestamp to a relative time label
 * e.g. "3 days ago", "just now", "Mar 24"
 */
export function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return formatDate(dateStr);
}

/**
 * Format date as "Mar 24" or "Mar 24, 2026"
 */
export function formatDate(dateStr, includeYear = false) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const opts = { month: 'short', day: 'numeric' };
  if (includeYear) opts.year = 'numeric';
  return date.toLocaleDateString('en-IE', opts);
}

/**
 * Format full date "Monday, March 27, 2026"
 */
export function formatFullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IE', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * Get score color based on value 0–100
 */
export function scoreColor(score) {
  if (score <= 30) return 'var(--signal-rose)';
  if (score <= 50) return 'var(--signal-amber)';
  if (score <= 70) return 'var(--signal-sky)';
  return 'var(--signal-emerald)';
}

/**
 * Get score label
 */
export function scoreLabel(score) {
  if (score <= 30) return 'Cold';
  if (score <= 50) return 'Warm';
  if (score <= 70) return 'Active';
  return 'Strong';
}

/**
 * Normalize a priority value to a string key.
 * Handles: integers 1–4, lowercase strings, uppercase strings.
 * Returns null if the value is not a recognized priority.
 */
function normalizePriority(p) {
  if (p == null) return null;
  // Already a string — normalize to lowercase
  if (typeof p === 'string') return p.trim().toLowerCase() || null;
  // Integer priority mapping (DB stores 1=Critical, 2=High, 3=Normal, 4=Low)
  const intMap = { 1: 'critical', 2: 'high', 3: 'normal', 4: 'low' };
  return intMap[p] ?? null;
}

/**
 * Get priority badge variant
 */
export function priorityVariant(p) {
  const map = { critical: 'badge-rose', high: 'badge-amber', normal: 'badge-default', low: 'badge-default' };
  const key = normalizePriority(p);
  return (key && map[key]) || 'badge-default';
}

/**
 * Get priority label
 */
export function priorityLabel(p) {
  const map = { critical: 'CRITICAL', high: 'HIGH', normal: 'NORMAL', low: 'LOW' };
  const key = normalizePriority(p);
  return ((key && map[key]) ?? p?.toUpperCase()) || '—';
}

/**
 * Get interaction dot color class
 */
export function interactionDotClass(type) {
  const map = {
    email: 'email', meeting: 'meeting', call: 'call', note: 'note', draft: 'draft',
    message: 'email', 'email_received': 'email', 'email_sent': 'email',
  };
  return map[type?.toLowerCase()] || 'note';
}

/**
 * Format interaction type label
 */
export function interactionLabel(type) {
  const map = {
    email: 'Email', meeting: 'Meeting', call: 'Call', note: 'Note',
    draft: 'Draft', message: 'Message', email_received: 'Email received',
    email_sent: 'Email sent', followup: 'Follow-up', created: 'Added',
  };
  return map[type?.toLowerCase()] || type;
}

/**
 * Format snooze option label
 */
export function snoozeLabel(option) {
  const map = { '1h': '1 hour', today: 'Today evening', tomorrow: 'Tomorrow morning', '3d': 'In 3 days', '1w': 'Next week' };
  return map[option] || option;
}

/**
 * Get initials from a name
 */
export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Clamp a number
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Debounce a function
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
