// LLM Adapter — Multi-provider LLM integration
// Supports: MiniMax (Anthropic API), OpenAI-compatible, Ollama (local)
// Config: set API key in config/llm.json or env vars

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'llm.json');

function loadConfig() {
  // Priority: env vars > config file
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model   = process.env.LLM_MODEL || 'MiniMax-M2.7';

  if (apiKey) {
    return { apiKey, baseUrl, model };
  }

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {}
  }

  return null;
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

function llmRequest(body, config) {
  return new Promise((resolve, reject) => {
    const base = config.baseUrl || 'https://api.minimax.io/anthropic';
    const url = new URL(`${base}/v1/messages`);
    const isHttps = url.protocol === 'https:';
    const proto = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-path-access': 'true',
      },
    };

    const req = proto.request(options, (res) => {
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
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function chatRequest(messages, config, options = {}) {
  const { maxTokens = 1024, temperature = 0.7 } = options;
  const body = {
    model: config.model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  const res = await llmRequest(body, config);

  if (res.status !== 200) {
    throw new Error(`LLM API error ${res.status}: ${JSON.stringify(res.body)}`);
  }

  return res.body;
}

// ── Status ────────────────────────────────────────────────────────────────────

function getStatus() {
  const config = loadConfig();
  if (!config?.apiKey) {
    return { configured: false, message: 'No LLM config found. Set LLM_API_KEY env var or create config/llm.json' };
  }
  return { configured: true, model: config.model, baseUrl: config.baseUrl };
}

// ── Core generation ───────────────────────────────────────────────────────────

/**
 * Generate text with the LLM.
 * Returns raw text content.
 */
async function generate(prompt, options = {}) {
  const config = loadConfig();
  if (!config?.apiKey) {
    return { error: 'LLM not configured', stub: true };
  }

  try {
    const messages = [
      { role: 'user', content: prompt }
    ];

    const res = await chatRequest(messages, config, {
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
    });

    return { content: res.content?.[0]?.text || '', usage: res.usage };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Generate with system prompt + user prompt.
 */
async function generateWithSystem(systemPrompt, userPrompt, options = {}) {
  const config = loadConfig();
  if (!config?.apiKey) {
    return { error: 'LLM not configured', stub: true };
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const res = await chatRequest(messages, config, {
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.5,
    });

    return { content: res.content?.[0]?.text || '', usage: res.usage };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Contact summary generation ─────────────────────────────────────────────────

/**
 * Generate a relationship summary for a contact.
 * Requires: name, company, role, recent interactions, context entries.
 */
async function generateContactSummary(contact, interactions = [], contextEntries = []) {
  const config = loadConfig();
  if (!config?.apiKey) {
    return generateStubSummary(contact);
  }

  const interactionSummary = interactions.slice(0, 10).map(i => {
    const date = new Date(i.happened_at).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });
    return `[${date}] ${i.type.toUpperCase()} ${i.direction ? `(${i.direction})` : ''}: ${i.subject || i.body_preview || '(no subject)'}`;
  }).join('\n') || 'No interactions recorded';

  const contextSummary = contextEntries.map(e => `- ${e.entry_type}: ${e.content}`).join('\n') || 'No context entries';

  const systemPrompt = `You are a CRM relationship analyst. Given a contact's profile and interaction history, generate a concise, useful relationship summary.

Rules:
- Write 2-4 paragraphs maximum
- First person: "Gbemi" refers to the CRM owner
- Be specific: name their role, company, what they've discussed, any preferences or patterns noticed
- Note communication style if detectable (formal, casual, brief, verbose, prefers calls vs email)
- Flag if the relationship seems to have gone cold or needs attention
- Do NOT be generic — use specific facts from the data
- If you don't have enough data, say "Not enough data to generate a meaningful summary yet."

Format:
RELATIONSHIP_TYPE: <client|prospect|partner|vendor|peer|unknown>
COMMUNICATION_STYLE: <brief|verbose|formal|casual|phone-preferred|email-preferred>
KEY_TOPICS: <comma-separated topics>
SUMMARY: <2-4 paragraph summary>`;

  const userPrompt = `Contact name: ${contact.name}
Company: ${contact.company || 'Unknown'}
Role: ${contact.role || 'Unknown'}
Priority: ${contact.priority === 1 ? 'Critical' : contact.priority === 2 ? 'Normal' : 'Low'}

Recent interactions (newest first):
${interactionSummary}

Context entries:
${contextSummary}`;

  try {
    const result = await generateWithSystem(systemPrompt, userPrompt, { maxTokens: 1024, temperature: 0.4 });
    if (result.stub) return result;
    if (result.error) throw new Error(result.error);

    return parseSummaryResponse(result.content, contact);
  } catch (err) {
    return generateStubSummary(contact, err.message);
  }
}

function parseSummaryResponse(text, contact) {
  const lines = text.split('\n');
  const result = {
    relationship_type: 'unknown',
    comms_style: 'unknown',
    key_topics: [],
    summary_text: '',
    raw: text,
  };

  let inSummary = false;
  const summaryLines = [];

  for (const line of lines) {
    if (line.startsWith('RELATIONSHIP_TYPE:')) result.relationship_type = line.replace('RELATIONSHIP_TYPE:', '').trim().toLowerCase().replace(/[^a-z]/g, '');
    else if (line.startsWith('COMMUNICATION_STYLE:')) result.comms_style = line.replace('COMMUNICATION_STYLE:', '').trim().toLowerCase();
    else if (line.startsWith('KEY_TOPICS:')) result.key_topics = line.replace('KEY_TOPICS:', '').split(',').map(t => t.trim()).filter(Boolean);
    else if (line.startsWith('SUMMARY:')) { inSummary = true; summaryLines.push(line.replace('SUMMARY:', '').trim()); }
    else if (inSummary) summaryLines.push(line.trim());
  }

  result.summary_text = summaryLines.join(' ').trim();
  return result;
}

function generateStubSummary(contact, error = null) {
  return {
    relationship_type: 'unknown',
    comms_style: 'unknown',
    key_topics: [],
    summary_text: error
      ? `Summary generation unavailable: ${error}`
      : 'LLM not configured — set LLM_API_KEY or configure in config/llm.json',
    stub: true,
  };
}

// ── Email draft generation ─────────────────────────────────────────────────────

/**
 * Generate a grounded email draft for a contact.
 * Pulls: CRM context, recent interactions, meeting notes, follow-up reason.
 */
async function generateEmailDraft(contact, options = {}) {
  const { threadRef, contextUsed = [], followUpReason, tone = 'professional' } = options;

  const config = loadConfig();
  if (!config?.apiKey) {
    return {
      subject: `Following up — ${contact.company || contact.name}`,
      body: 'Email draft generation requires LLM configuration. Set LLM_API_KEY or configure in config/llm.json.',
      stub: true,
    };
  }

  // Build context string
  const toneInstructions = {
    professional: 'Professional, warm, clear. Business-appropriate but personable.',
    warm: 'Warm, friendly, personal. Strong human connection.',
    casual: 'Casual and conversational. Brief and direct.',
  };

  const ctxLines = contextUsed.slice(0, 5).map(c => `- ${c}`);
  const contextStr = ctxLines.length > 0 ? ctxLines.join('\n') : 'No specific CRM context available';

  const systemPrompt = `You are Gbemi's CRM assistant. Generate a concise, natural-sounding email draft.

Rules:
- Write as Gbemi (Oluwagbemi Enoch Akadiri), a professional who runs a web/AI consulting business (Verdantia)
- Keep emails short and focused — 3-6 sentences typically
- Include a clear but gentle call to action
- No fluff, no corporate jargon
- Sign as "Gbemi" or "Best" — not formal sign-offs
- Match the requested tone: ${toneInstructions[tone] || toneInstructions.professional}
- Do NOT invent facts not in the context
- Do NOT include any [bracketed placeholder] text — fill in the actual content`;

  const userPrompt = `Generate an email draft.

Recipient: ${contact.name}${contact.role ? ` (${contact.role})` : ''}${contact.company ? ` at ${contact.company}` : ''}
Their email: ${contact.email}

Follow-up reason: ${followUpReason || 'General follow-up'}

Relevant CRM context (use this to personalize):
${contextStr}

Email subject line:`;

  try {
    const result = await generateWithSystem(systemPrompt, userPrompt, { maxTokens: 768, temperature: 0.65 });
    if (result.stub) return result;
    if (result.error) throw new Error(result.error);

    const { subject, body } = parseDraftResponse(result.content);
    return { subject, body, tone, context_used: contextUsed, stub: false };
  } catch (err) {
    return { subject: `Following up`, body: `Draft generation failed: ${err.message}`, stub: true, error: err.message };
  }
}

function parseDraftResponse(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let subject = lines[0] || 'Following up';
  let body = lines.slice(1).join('\n').trim();

  // If no clear separator, treat first line as subject if it's short
  if (subject.length > 80) {
    body = text;
    subject = 'Following up';
  }

  // Remove "Subject:" prefix if present
  subject = subject.replace(/^Subject:\s*/i, '').trim();

  return { subject, body };
}

// ── NL Query parsing ───────────────────────────────────────────────────────────

/**
 * Parse a natural language query and return structured intent + entities.
 * Uses the LLM for disambiguation.
 */
async function parseQuery(query) {
  const config = loadConfig();
  if (!config?.apiKey) {
    return parseQueryRuleBased(query); // Fallback to rule-based
  }

  const systemPrompt = `You are a CRM query parser. Given a natural language query about contacts and CRM data, extract:
1. INTENT: what the user wants to do
2. ENTITIES: names, companies, emails mentioned
3. PARAMS: filters and options

INTENTS (pick the best match):
- search_contacts: find a person or company
- about_contact: get details about a specific contact
- followup_create: create or schedule a follow-up
- followup_list: see pending follow-ups
- who_needs_attention: contacts that need outreach
- weekly_summary: what changed recently
- stats: numbers and counts
- discovery_queue: review pending contacts
- unknown: unclear intent

Rules:
- Respond ONLY with valid JSON
- No markdown, no explanation, no preamble
- Example: {"intent": "about_contact", "entities": {"name": "Sarah O'Brien"}, "params": {}, "response_hint": "Showing Sarah O'Brien's dossier"}`;

  try {
    const result = await generateWithSystem(systemPrompt, query, { maxTokens: 256, temperature: 0.1 });
    if (result.error) throw new Error(result.error);

    const parsed = JSON.parse(result.content);
    return {
      ...parsed,
      query,
      llm_parsed: true,
    };
  } catch (err) {
    // Fallback to rule-based
    return { ...parseQueryRuleBased(query), parse_error: err.message };
  }
}

/**
 * Rule-based query parser — used when LLM isn't configured.
 * Handles common patterns reliably.
 */
function parseQueryRuleBased(query) {
  const q = query.toLowerCase().trim();
  const entities = {};
  const params = {};

  // Extract name in quotes
  const quotedMatch = query.match(/"([^"]+)"/) || query.match(/'([^']+)'/);
  if (quotedMatch) entities.name = quotedMatch[1];

  // Extract "at [company]"
  const atMatch = q.match(/at\s+([a-z0-9\s&.-]+?)(?:\s|$|\?)/i);
  if (atMatch) entities.company = atMatch[1].trim();

  // Extract "in X days/weeks"
  const inDaysMatch = q.match(/in\s+(\d+)\s+(day|week|month)s?/i);
  if (inDaysMatch) params.inDays = parseInt(inDaysMatch[1]);

  // Intent detection
  let intent = 'unknown';

  if (/who\s+(should\s+I|needs?|has|was)?\s*attention/i.test(q)) intent = 'who_needs_attention';
  else if (/follow\s*up/i.test(q) && /\d/.test(q)) intent = 'followup_create';
  else if (/follow\s*up/i.test(q)) intent = 'followup_list';
  else if (/about|profile|dossier|tell me/i.test(q) && /who|what/.test(q)) intent = 'about_contact';
  else if (/about|profile|dossier|tell me/i.test(q)) intent = 'about_contact';
  else if (/who\s+at|people\s+at|team\s+at/i.test(q)) { intent = 'search_contacts'; entities.company = entities.company || atMatch?.[1]; }
  else if (/week|changed|recent|updates?/i.test(q)) intent = 'weekly_summary';
  else if (/stats?|numbers?|count|total/i.test(q)) intent = 'stats';
  else if (/discovery|queue|approve|new\s+contact/i.test(q)) intent = 'discovery_queue';
  else if (/contact|person|email/i.test(q)) { intent = 'search_contacts'; entities.name = entities.name || quotedMatch?.[1]; }
  else if (/company|organization/i.test(q)) intent = 'search_company';

  return {
    intent,
    entities,
    params,
    query,
    llm_parsed: false,
    response_hint: generateResponseHint(intent, entities, params),
  };
}

function generateResponseHint(intent, entities, params) {
  if (intent === 'who_needs_attention') return 'Showing contacts that need attention';
  if (intent === 'about_contact' && entities.name) return `Showing dossier for ${entities.name}`;
  if (intent === 'followup_create' && entities.name) return `Creating follow-up for ${entities.name}`;
  if (intent === 'followup_list') return 'Showing your follow-up queue';
  if (intent === 'stats') return 'Showing CRM statistics';
  if (intent === 'discovery_queue') return 'Showing discovery queue';
  return 'Showing search results';
}

// ── Batch summary generation ───────────────────────────────────────────────────

/**
 * Regenerate summaries for all contacts with interactions but no summary.
 * Returns count of summaries generated.
 */
async function regenerateStaleSummaries() {
  const { db } = require('../db/database');
  const { uuid } = require('../db/database');

  // Find contacts that have interactions but no summary or stale summary
  const contacts = db.all(`
    SELECT DISTINCT c.id, c.name, c.company, c.role, c.priority
    FROM contacts c
    INNER JOIN interactions i ON i.contact_id = c.id
    LEFT JOIN contact_summaries cs ON cs.contact_id = c.id
    WHERE c.suppressed = 0
      AND (cs.id IS NULL OR cs.generated_at < datetime('now', '-7 days'))
    ORDER BY c.last_touched_at DESC
    LIMIT 20
  `);

  let generated = 0;
  let errors = 0;

  for (const contact of contacts) {
    const interactions = db.all(
      `SELECT * FROM interactions WHERE contact_id = ? ORDER BY happened_at DESC LIMIT 20`,
      [contact.id]
    );
    const contextEntries = db.all(
      `SELECT * FROM contact_context WHERE contact_id = ? ORDER BY created_at DESC LIMIT 10`,
      [contact.id]
    );

    try {
      const summary = await generateContactSummary(contact, interactions, contextEntries);

      // Upsert summary
      db.run(
        `INSERT OR REPLACE INTO contact_summaries (id, contact_id, summary, relationship_type, communication_style, key_topics, generated_at)
         VALUES (
           COALESCE((SELECT id FROM contact_summaries WHERE contact_id = ?), ?),
           ?, ?, ?, ?, ?, ?
         )`,
        [
          contact.id,
          contact.id,
          summary.summary_text || 'Summary unavailable',
          summary.relationship_type || 'unknown',
          summary.comms_style || 'unknown',
          JSON.stringify(summary.key_topics || []),
          new Date().toISOString(),
        ]
      );
      generated++;
    } catch (err) {
      errors++;
    }
  }

  return { requested: contacts.length, generated, errors };
}

module.exports = {
  getStatus,
  generate,
  generateWithSystem,
  generateContactSummary,
  generateEmailDraft,
  parseQuery,
  parseQueryRuleBased,
  regenerateStaleSummaries,
};
