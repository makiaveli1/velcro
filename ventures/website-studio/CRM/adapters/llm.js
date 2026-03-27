function logStub(methodName) {
  console.log(`[llm adapter] ${methodName} called, but no real LLM is configured yet.`);
}

function generateSummary(text, contactContext = []) {
  logStub('generateSummary');
  return 'LLM summary generation is not configured yet.';
}

function generateDraft(contact, thread, context = []) {
  logStub('generateDraft');
  return {
    subject: `Draft for ${contact?.name || 'contact'} pending LLM integration`,
    body: 'Draft generation is not configured yet. This is a placeholder response.',
  };
}

function generateContactProfile(contact, interactions = []) {
  logStub('generateContactProfile');
  return {
    relationship_type: 'unknown',
    comms_style: 'unknown',
    key_topics: '[]',
  };
}

function extractSearchTerm(query) {
  const fromForMatch = query.match(/(?:for|about|show|find)\s+([a-z0-9@.' -]+)/i);
  if (fromForMatch) {
    return fromForMatch[1].trim();
  }

  return query.trim();
}

function parseQuery(query) {
  logStub('parseQuery');

  const normalized = String(query || '').trim();
  const lower = normalized.toLowerCase();
  const entities = {};
  const params = {};
  let intent = 'unknown';
  let response = 'I could not confidently map that query yet.';

  if (!normalized) {
    return {
      intent: 'empty',
      entities,
      params,
      response: 'No query text was provided.',
    };
  }

  if (lower.includes('dashboard') || lower.includes('overview') || lower.includes('summary')) {
    intent = 'dashboard_overview';
    response = 'This looks like a dashboard summary request.';
  } else if (lower.includes('follow up') || lower.includes('follow-up') || lower.includes('due')) {
    intent = 'followups_due';
    response = 'This looks like a follow-up query.';
  } else if (lower.includes('discovery') || lower.includes('queue') || lower.includes('approve')) {
    intent = 'discovery_queue';
    response = 'This looks like a discovery queue query.';
  } else if (lower.includes('meeting') || lower.includes('attendee') || lower.includes('action item')) {
    intent = 'meetings';
    response = 'This looks like a meetings query.';
  } else if (lower.includes('draft') || lower.includes('email')) {
    intent = 'drafts';
    response = 'This looks like an email drafts query.';
  } else if (lower.includes('interaction') || lower.includes('email thread') || lower.includes('message')) {
    intent = 'interactions';
    response = 'This looks like an interactions query.';
  } else if (lower.includes('contact') || lower.includes('person') || /@/.test(lower)) {
    intent = 'search_contacts';
    entities.searchTerm = extractSearchTerm(normalized);
    params.search = entities.searchTerm;
    response = `This looks like a contact search for "${entities.searchTerm}".`;
  }

  const priorityMatch = lower.match(/priority\s+(\d+)/i);
  if (priorityMatch) {
    entities.priority = Number(priorityMatch[1]);
    params.priority = entities.priority;
  }

  return {
    intent,
    entities,
    params,
    response,
  };
}

module.exports = {
  generateSummary,
  generateDraft,
  generateContactProfile,
  parseQuery,
};
