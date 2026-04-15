// Microsoft Graph Adapter
// Handles OAuth2, API calls for contacts, calendar, and email

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ── Config ───────────────────────────────────────────────────────────────────
// Canonical path: ~/.openclaw/graph/ — shared between velcro CRM and signal-loom
const GRAPH_DIR = path.join(process.env.HOME ?? '/home/likwid', '.openclaw', 'graph');
const CONFIG_PATH = path.join(GRAPH_DIR, 'graph.json');
const TOKEN_PATH  = path.join(GRAPH_DIR, 'graph_token.json');

let deviceCodeSetupState = null;

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function saveToken(token) {
  const dir = path.dirname(TOKEN_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

function normalizeExpiresAtMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 1e12 ? numeric : numeric * 1000;
}

function readStoredToken() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    const expiresAtMs = normalizeExpiresAtMs(token.expires_at);
    return {
      ...token,
      expires_at: expiresAtMs,
    };
  } catch {
    return null;
  }
}

function loadToken() {
  const token = readStoredToken();
  if (!token) return null;
  if (token.expires_at && Date.now() > token.expires_at - 60_000) {
    return null; // Expired or too close to expiry for safe use
  }
  return token;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const proto = options.protocol === 'https:' ? https : http;
    const req = proto.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ── OAuth2 — Device Code Flow (best for CLI/local apps) ──────────────────────

/**
 * Step 1: Request device code from Azure AD
 * Returns { device_code, user_code, verification_uri, interval }
 */
async function getDeviceCode(config) {
  const params = new url.URLSearchParams({
    client_id: config.clientId,
    scope: 'offline_access https://graph.microsoft.com/.default',
  });

  const res = await httpRequest({
    protocol: 'https:',
    hostname: 'login.microsoftonline.com',
    path: `/${config.tenantId}/oauth2/v2.0/devicecode`,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, params.toString());

  if (res.status !== 200) throw new Error(`Device code error: ${JSON.stringify(res.body)}`);
  // Normalize snake_case Azure response to camelCase for internal use
  const body = res.body;
  return {
    device_code: body.device_code,
    user_code: body.user_code,
    verification_uri: body.verification_uri,
    interval: body.interval,
    expires_in: body.expires_in,
  };
}

/**
 * Step 2: Poll for token using device code
 * Returns { access_token, refresh_token, expires_in }
 */
async function pollForToken(deviceCode, config, intervalMs = 5000) {
  const params = new url.URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: config.clientId,
    device_code: deviceCode,
  });

  while (true) {
    await new Promise(r => setTimeout(r, intervalMs));

    const res = await httpRequest({
      protocol: 'https:',
      hostname: 'login.microsoftonline.com',
      path: `/${config.tenantId}/oauth2/v2.0/token`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, params.toString());

    if (res.status === 200) {
      const token = {
        ...res.body,
        acquired_at: Date.now(),
        expires_at: Date.now() + res.body.expires_in * 1000,
      };
      saveToken(token);
      return token;
    }

    if (res.body.error === 'authorization_pending') continue;
    if (res.body.error === 'slow_down') { intervalMs += 5000; continue; }
    throw new Error(`Token poll error: ${JSON.stringify(res.body)}`);
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken, config) {
  const params = new url.URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: refreshToken,
  });

  const res = await httpRequest({
    protocol: 'https:',
    hostname: 'login.microsoftonline.com',
    path: `/${config.tenantId}/oauth2/v2.0/token`,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, params.toString());

  if (res.status !== 200) throw new Error(`Token refresh failed: ${JSON.stringify(res.body)}`);
  const token = { ...res.body, acquired_at: Date.now(), expires_at: Date.now() + res.body.expires_in * 1000 };
  saveToken(token);
  return token;
}

function getDeviceCodeSetupStatus() {
  const storedToken = readStoredToken();
  const validToken = loadToken();
  const now = Date.now();

  if (deviceCodeSetupState?.pending && deviceCodeSetupState.expiresAtMs && now >= deviceCodeSetupState.expiresAtMs) {
    deviceCodeSetupState = {
      ...deviceCodeSetupState,
      pending: false,
      lastError: deviceCodeSetupState.lastError || 'Device code expired before authentication completed',
      expiredAtMs: now,
    };
  }

  const pending = !!deviceCodeSetupState?.pending && !validToken;

  return {
    pending,
    hasToken: !!storedToken,
    hasValidToken: !!validToken,
    lastError: deviceCodeSetupState?.lastError || null,
  };
}

async function startDeviceCodeSetup(config = loadConfig()) {
  if (!config) {
    throw new Error('No graph.json config found. Create config/graph.json with { clientId, tenantId }');
  }

  const now = Date.now();
  if (deviceCodeSetupState?.pending && (!deviceCodeSetupState.expiresAtMs || now < deviceCodeSetupState.expiresAtMs)) {
    return {
      device_code: deviceCodeSetupState.deviceCode,
      user_code: deviceCodeSetupState.userCode,
      verification_uri: deviceCodeSetupState.verificationUrl,
      interval: Math.max(1, Math.round((deviceCodeSetupState.intervalMs || 5000) / 1000)),
      expires_in: deviceCodeSetupState.expiresAtMs
        ? Math.max(0, Math.round((deviceCodeSetupState.expiresAtMs - now) / 1000))
        : null,
    };
  }

  const deviceCode = await getDeviceCode(config);
  const intervalMs = (Number(deviceCode.interval) || 5) * 1000;
  const expiresAtMs = now + (Number(deviceCode.expires_in) || 900) * 1000;

  deviceCodeSetupState = {
    pending: true,
    startedAtMs: now,
    expiresAtMs,
    intervalMs,
    deviceCode: deviceCode.device_code,
    userCode: deviceCode.user_code,
    verificationUrl: deviceCode.verification_uri,
    lastError: null,
  };

  pollForToken(deviceCode.device_code, config, intervalMs)
    .then((token) => {
      if (deviceCodeSetupState?.deviceCode === deviceCode.device_code) {
        deviceCodeSetupState = {
          ...deviceCodeSetupState,
          pending: false,
          completedAtMs: Date.now(),
          lastError: null,
          tokenExpiresAtMs: token.expires_at || null,
        };
      }
    })
    .catch((error) => {
      if (deviceCodeSetupState?.deviceCode === deviceCode.device_code) {
        deviceCodeSetupState = {
          ...deviceCodeSetupState,
          pending: false,
          failedAtMs: Date.now(),
          lastError: error.message,
        };
      }
      console.warn('[graph] Device code polling failed:', error.message);
    });

  return deviceCode;
}

// ── Token management ──────────────────────────────────────────────────────────

/**
 * Get a valid access token, refreshing if needed.
 * Returns null if not authenticated (requires setup).
 */
async function getAccessToken(config = null) {
  const cfg = config || loadConfig();
  if (!cfg) return null;

  let token = loadToken();
  if (token?.refresh_token) {
    try {
      if (token.expires_at && Date.now() > token.expires_at - 120_000) {
        token = await refreshAccessToken(token.refresh_token, cfg);
      }
    } catch (err) {
      console.warn('[graph] Token refresh failed, trying device flow:', err.message);
      token = null;
    }
  }

  if (!token) {
    console.warn('[graph] No valid token. Run setup() to authenticate.');
    return null;
  }

  return token.access_token;
}

// ── Graph API caller ──────────────────────────────────────────────────────────

async function graphGet(endpoint, token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await httpRequest({
    protocol: 'https:',
    hostname: 'graph.microsoft.com',
    path: `/v1.0${endpoint}${query ? '?' + query : ''}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (res.status === 401) throw new Error('GRAPH_AUTH_EXPIRED');
  if (res.status === 429) throw new Error('GRAPH_RATE_LIMITED');
  if (res.status !== 200) throw new Error(`Graph API error ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
}

// ── Discovery: Fetch recent emails ────────────────────────────────────────────

/**
 * Fetch messages from last N days.
 * Returns array of message objects with sender, recipients, subject, bodyPreview.
 */
async function getRecentMessages(token, daysBack = 1) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const messages = [];
  let nextLink = null;

  do {
    const params = new url.URLSearchParams({
      '$select': 'id,subject,bodyPreview,from,toRecipients,ccRecipients,isRead,receivedDateTime,conversationId',
      '$filter': `receivedDateTime ge ${since}`,
      '$top': '50',
      '$orderby': 'receivedDateTime desc',
    });
    const base = nextLink ? nextLink.replace('https://graph.microsoft.com/v1.0', '') : `/me/messages?${params.toString()}`;

    const res = await graphGet(base, token);
    if (res.value) messages.push(...res.value);
    nextLink = res['@odata.nextLink'] || null;
  } while (nextLink && messages.length < 500);

  return messages;
}

/**
 * Extract unique contacts from message senders and recipients.
 * Filters out internal domain, noreply, newsletters.
 */
function extractContactsFromMessages(messages, myEmailDomain = null) {
  const seen = new Map();

  for (const msg of messages) {
    const from = msg.from;
    const senderEmail = from?.emailAddress?.address?.toLowerCase();
    if (!senderEmail) continue;

    // Skip internal domain
    if (myEmailDomain && senderEmail.endsWith(`@${myEmailDomain}`)) continue;
    // Skip noreply/no-reply
    if (/^no-?reply@/i.test(senderEmail) || /^(noreply|no-reply)@/i.test(senderEmail)) continue;

    const key = senderEmail;
    if (!seen.has(key)) {
      seen.set(key, {
        email: senderEmail,
        name: from.emailAddress?.name || senderEmail.split('@')[0],
        source: 'email_sender',
        signal_count: 1,
        signal_quality: 'medium',
        thread_ref: msg.conversationId,
        last_seen: msg.receivedDateTime,
      });
    } else {
      const existing = seen.get(key);
      existing.signal_count++;
      existing.last_seen = msg.receivedDateTime;
      if (msg.conversationId !== existing.thread_ref) existing.thread_ref = null; // multi-thread
    }

    // Add recipients (to/cc) — be careful about count
    const allRecipients = [
      ...(msg.toRecipients || []),
      ...(msg.ccRecipients || []),
    ];

    if (allRecipients.length <= 5) {
      for (const recip of allRecipients) {
        const rEmail = recip.emailAddress?.address?.toLowerCase();
        if (!rEmail) continue;
        if (myEmailDomain && rEmail.endsWith(`@${myEmailDomain}`)) continue;
        if (/^no-?reply@/i.test(rEmail)) continue;

        if (!seen.has(rEmail)) {
          seen.set(rEmail, {
            email: rEmail,
            name: recip.emailAddress?.name || rEmail.split('@')[0],
            source: 'email_recipient',
            signal_count: 1,
            signal_quality: 'low',
            thread_ref: msg.conversationId,
            last_seen: msg.receivedDateTime,
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}

// ── Discovery: Fetch recent calendar events ───────────────────────────────────

/**
 * Fetch calendar events from last N days.
 * Returns array of event objects.
 */
async function getRecentEvents(token, daysBack = 1, daysForward = 7) {
  const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const endTime   = new Date(Date.now() + daysForward * 24 * 60 * 60 * 1000).toISOString();
  const events = [];
  let nextLink = null;

  do {
    const params = new url.URLSearchParams({
      startDateTime: startTime,
      endDateTime: endTime,
      '$select': 'id,subject,bodyPreview,start,end,attendees,isOnlineMeeting',
      '$top': '50',
      '$orderby': 'start/dateTime asc',
    });
    const base = nextLink ? nextLink.replace('https://graph.microsoft.com/v1.0', '') : `/me/calendarView?${params.toString()}`;

    const res = await graphGet(base, token);
    if (res.value) events.push(...res.value);
    nextLink = res['@odata.nextLink'] || null;
  } while (nextLink && events.length < 200);

  return events;
}

/**
 * Extract contacts from meeting attendees.
 * Filters out large meetings (10+ attendees) and default rooms.
 */
function extractContactsFromEvents(events) {
  const seen = new Map();

  for (const event of events) {
    const attendees = event.attendees || [];
    // Filter: skip if more than 10 attendees (too noisy)
    if (attendees.length > 10) continue;

    for (const att of attendees) {
      const email = att.emailAddress?.address?.toLowerCase();
      if (!email) continue;
      // Skip resource rooms
      if (att.emailAddress?.type === 'resource') continue;
      // Skip noreply patterns
      if (/^no-?reply@/i.test(email)) continue;

      const status = att.status?.response || 'none';
      const isOrganizer = att.type === 'organizer';

      if (!seen.has(email)) {
        seen.set(email, {
          email,
          name: att.emailAddress?.name || email.split('@')[0],
          source: 'calendar_attendee',
          signal_count: 1,
          signal_quality: isOrganizer ? 'high' : status === 'accepted' ? 'medium' : 'low',
          meeting_ref: event.id,
          last_seen: event.start?.dateTime || event.start,
          is_organizer: isOrganizer ? 1 : 0,
        });
      } else {
        const existing = seen.get(email);
        existing.signal_count++;
        existing.last_seen = event.start?.dateTime || existing.last_seen;
        if (isOrganizer) existing.is_organizer = 1;
        if (existing.signal_quality !== 'high' && status === 'accepted') {
          existing.signal_quality = 'medium';
        }
      }
    }
  }

  return Array.from(seen.values());
}

// ── Signal quality scoring ────────────────────────────────────────────────────

/**
 * Score a discovered contact's signal quality based on interaction patterns.
 * Returns: 'high' | 'medium' | 'low'
 */
function scoreSignalQuality(contact) {
  // High: 3+ emails AND at least 1 calendar meeting
  if (contact.signal_count >= 3 && contact.hasCalendarSignal) return 'high';
  // High: was meeting organizer with 2+ signal
  if (contact.is_organizer && contact.signal_count >= 2) return 'high';
  // Medium: 2+ emails
  if (contact.signal_count >= 2) return 'medium';
  // Low: everything else
  return 'low';
}

// ── Auth setup ────────────────────────────────────────────────────────────────

/**
 * Interactive setup flow for first-time authentication.
 * Prints a URL for the user to visit, then polls for the token.
 */
async function setupInteractive() {
  const config = loadConfig();
  if (!config) {
    throw new Error('No graph.json config found. Create config/graph.json with { clientId, tenantId }');
  }

  console.log('[graph] Requesting device code...');
  const dc = await getDeviceCode(config);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Microsoft Graph — Authentication Setup                   ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  console.log('║  1. Open this URL in your browser:                       ║');
  console.log('║                                                           ║');
  console.log(`║    ${String(dc.verification_uri).substring(0, 46).padEnd(46)}║`);
  console.log('║                                                           ║');
  console.log('║  2. Enter this code when prompted:                       ║');
  console.log('║                                                           ║');
  console.log(`║    ${String(dc.user_code).padEnd(46)}║`);
  console.log('║                                                           ║');
  console.log('║  3. Complete the login in your browser                   ║');
  console.log('║                                                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const token = await pollForToken(dc.device_code, config, dc.interval * 1000 || 5000);
  console.log('[graph] Authentication successful!');
  console.log(`[graph] Token acquired. Expires in ${Math.round((token.expires_at - Date.now()) / 60000)} minutes.`);
  return token;
}

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * Check authentication status without throwing.
 * Returns: { authenticated: bool, hasConfig: bool, expiresAt: string|null }
 */
async function getStatus() {
  const config = loadConfig();
  const token = readStoredToken();
  const expiresAtMs = token?.expires_at || null;
  const expiresAt = expiresAtMs ? new Date(expiresAtMs).toISOString() : null;
  const tokenLoaded = !!token;
  const tokenExpired = expiresAtMs ? Date.now() > expiresAtMs : false;

  if (!config) {
    return {
      authenticated: false,
      hasConfig: false,
      tokenLoaded,
      tokenExpired,
      expiresAtMs,
      expiresAt,
      message: 'No graph.json config found',
    };
  }

  if (!token?.access_token) {
    return {
      authenticated: false,
      hasConfig: true,
      tokenLoaded,
      tokenExpired,
      expiresAtMs,
      expiresAt,
      message: tokenLoaded ? 'Stored token missing access token — run setup()' : 'Not authenticated — run setup()',
    };
  }

  if (tokenExpired) {
    return {
      authenticated: false,
      hasConfig: true,
      tokenLoaded,
      tokenExpired: true,
      expiresAtMs,
      expiresAt,
      message: 'Token expired — run setup()',
    };
  }

  // Try a lightweight call to verify token
  try {
    await graphGet('/me/', token.access_token);
    return {
      authenticated: true,
      hasConfig: true,
      tokenLoaded,
      tokenExpired: false,
      expiresAtMs,
      expiresAt,
      message: 'Authenticated',
    };
  } catch (err) {
    if (err.message === 'GRAPH_AUTH_EXPIRED') {
      return {
        authenticated: false,
        hasConfig: true,
        tokenLoaded,
        tokenExpired: true,
        expiresAtMs,
        expiresAt,
        message: 'Token expired — run setup()',
      };
    }
    return {
      authenticated: false,
      hasConfig: true,
      tokenLoaded,
      tokenExpired,
      expiresAtMs,
      expiresAt,
      message: err.message,
    };
  }
}

// ── Mock mode (for testing without Graph) ─────────────────────────────────────

/**
 * Generate mock discovery data for testing the pipeline without Graph access.
 * Use only in development.
 */
function generateMockDiscovery() {
  const contacts = [
    { email: 'sarah.obrien@techflow.ie', name: 'Sarah O\'Brien', source: 'email_sender', signal_count: 5, signal_quality: 'high', thread_ref: 'mock-thread-1', last_seen: new Date().toISOString() },
    { email: 'james.k@freelance.dev', name: 'James K.', source: 'calendar_attendee', signal_count: 3, signal_quality: 'medium', meeting_ref: 'mock-meeting-1', last_seen: new Date().toISOString() },
    { email: 'fiona.kane@kaneventdesign.com', name: 'Fiona Kane', source: 'email_sender', signal_count: 2, signal_quality: 'medium', thread_ref: 'mock-thread-2', last_seen: new Date().toISOString() },
    { email: 'noreply@newsletter.ie', name: 'Newsletter', source: 'email_sender', signal_count: 12, signal_quality: 'low', thread_ref: 'mock-thread-3', last_seen: new Date().toISOString() },
    { email: 'internal@verdantia.it', name: 'Internal', source: 'email_sender', signal_count: 20, signal_quality: 'low', thread_ref: 'mock-thread-4', last_seen: new Date().toISOString() },
  ];
  return contacts;
}

module.exports = {
  loadConfig,
  readStoredToken,
  loadToken,
  getAccessToken,
  setupInteractive,
  startDeviceCodeSetup,
  getDeviceCodeSetupStatus,
  getStatus,
  getRecentMessages,
  getRecentEvents,
  extractContactsFromMessages,
  extractContactsFromEvents,
  scoreSignalQuality,
  generateMockDiscovery,
  // Exported for testing
  getDeviceCode,
  pollForToken,
  refreshAccessToken,
};
