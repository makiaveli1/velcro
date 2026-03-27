// Messaging Adapter — Sends notifications via OpenClaw
// Integrates with the local OpenClaw gateway for webchat delivery

const fs = require('fs');
const path = require('path');
const http = require('http');

// ── Config ───────────────────────────────────────────────────────────────────

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || null;

// Load from openclaw config if available
const CONFIG_PATH = path.join(process.env.HOME || '/home/likwid', '.openclaw', 'openclaw.json');
function loadOpenClawConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function gatewayRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, GATEWAY_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (GATEWAY_TOKEN) {
      options.headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Status ───────────────────────────────────────────────────────────────────

/**
 * Check if OpenClaw messaging is reachable.
 */
async function getStatus() {
  try {
    const res = await gatewayRequest('GET', '/api/health');
    return {
      reachable: res.status < 500,
      status: res.body,
    };
  } catch (err) {
    return {
      reachable: false,
      error: err.message,
    };
  }
}

// ── Send to webchat ───────────────────────────────────────────────────────────

/**
 * Send a message to the webchat channel.
 * This uses OpenClaw's internal messaging to reach the user via webchat.
 */
async function sendToWebchat(text) {
  const config = loadOpenClawConfig();
  const channel = config.channels?.webchat;

  if (!channel) {
    // Fallback: try direct send via gateway session injection
    return sendViaSession(text);
  }

  try {
    const res = await gatewayRequest('POST', '/api/messages/send', {
      channel: 'webchat',
      text,
    });
    return res;
  } catch (err) {
    // Fallback to session method
    return sendViaSession(text);
  }
}

// ── Send via session injection (best effort) ──────────────────────────────────

async function sendViaSession(text) {
  // Try to get the main session and send a message into it
  try {
    const sessionsRes = await gatewayRequest('GET', '/api/sessions?limit=5');
    if (sessionsRes.body?.sessions?.length > 0) {
      const mainSession = sessionsRes.body.sessions.find(s => s.label === 'main')
        || sessionsRes.body.sessions[0];

      if (mainSession?.key) {
        const res = await gatewayRequest('POST', `/api/sessions/${mainSession.key}/messages`, {
          text,
          type: 'text',
        });
        return { success: true, via: 'session', sessionKey: mainSession.key };
      }
    }
  } catch (err) {
    // Gateway not reachable — this is expected when running in isolation
  }

  return { success: false, reason: 'No gateway access — digest queued for next user interaction' };
}

// ── Send digest ───────────────────────────────────────────────────────────────

/**
 * Send the daily digest to the user via webchat.
 * The digest is an array of lines from the daily service.
 */
async function sendDigest(digestData) {
  const { lines } = digestData;
  const text = lines.join('\n');
  return sendToWebchat(text);
}

// ── Send alert ────────────────────────────────────────────────────────────────

/**
 * Send an immediate alert (discovery queue needs review, etc.).
 * Used for high-priority notifications.
 */
async function sendAlert(category, message) {
  const alertText = `🔔 *${category}*\n\n${message}`;
  return sendToWebchat(alertText);
}

// ── Format helpers ────────────────────────────────────────────────────────────

/**
 * Format a contact mention for webchat.
 */
function mentionContact(name, company) {
  if (company) return `${name} (${company})`;
  return name;
}

/**
 * Format a short digest line.
 */
function formatLine(emoji, text) {
  return `${emoji}  ${text}`;
}

module.exports = {
  getStatus,
  sendToWebchat,
  sendDigest,
  sendAlert,
  formatLine,
  mentionContact,
};
