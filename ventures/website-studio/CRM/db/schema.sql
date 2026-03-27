CREATE TABLE IF NOT EXISTS schema_version (
  version         INTEGER PRIMARY KEY,
  description     TEXT,
  applied_at      TEXT
);

-- contacts: people
CREATE TABLE IF NOT EXISTS contacts (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  company         TEXT,
  role            TEXT,
  priority        INTEGER DEFAULT 2,
  relationship_score INTEGER DEFAULT 50,
  source          TEXT DEFAULT 'manual',
  discovery_method TEXT,
  auto_add_mode   INTEGER DEFAULT 0,
  skip_patterns   TEXT,
  created_at      TEXT,
  updated_at      TEXT,
  last_touched_at TEXT,
  suppressed      INTEGER DEFAULT 0,
  suppression_reason TEXT,
  notes           TEXT
);

-- companies
CREATE TABLE IF NOT EXISTS companies (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  domain          TEXT,
  industry        TEXT,
  size            TEXT,
  website         TEXT,
  linked_people   INTEGER DEFAULT 0,
  company_news_count INTEGER DEFAULT 0,
  created_at      TEXT,
  updated_at      TEXT
);

-- interactions
CREATE TABLE IF NOT EXISTS interactions (
  id              TEXT PRIMARY KEY,
  contact_id      TEXT REFERENCES contacts(id),
  company_id      TEXT REFERENCES companies(id),
  type            TEXT NOT NULL,
  direction       TEXT,
  subject         TEXT,
  body_preview    TEXT,
  thread_id       TEXT,
  source_id       TEXT,
  happened_at     TEXT,
  created_at      TEXT
);

-- contact_context
CREATE TABLE IF NOT EXISTS contact_context (
  id              TEXT PRIMARY KEY,
  contact_id      TEXT REFERENCES contacts(id),
  entry_type      TEXT,
  content         TEXT,
  embedding       BLOB,
  source_id       TEXT,
  created_at      TEXT
);

-- contact_summaries
CREATE TABLE IF NOT EXISTS contact_summaries (
  id              TEXT PRIMARY KEY,
  contact_id      TEXT REFERENCES contacts(id),
  summary         TEXT,
  relationship_type TEXT,
  communication_style TEXT,
  key_topics      TEXT,
  generated_at    TEXT
);

-- follow_ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id              TEXT PRIMARY KEY,
  contact_id      TEXT REFERENCES contacts(id),
  due_date        TEXT,
  snoozed_until   TEXT,
  status          TEXT DEFAULT 'pending',
  priority        INTEGER DEFAULT 2,
  reason          TEXT,
  recurrence      TEXT,
  last_touched    TEXT,
  created_at      TEXT,
  updated_at      TEXT
);

-- meetings
CREATE TABLE IF NOT EXISTS meetings (
  id              TEXT PRIMARY KEY,
  graph_id        TEXT UNIQUE,
  subject         TEXT,
  start_time      TEXT,
  end_time        TEXT,
  body_preview    TEXT,
  transcript_path TEXT,
  summary         TEXT,
  action_items_count INTEGER DEFAULT 0,
  created_at      TEXT,
  updated_at      TEXT
);

-- meeting_attendees
CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id      TEXT REFERENCES meetings(id),
  contact_id      TEXT REFERENCES contacts(id),
  response_status TEXT,
  PRIMARY KEY (meeting_id, contact_id)
);

-- meeting_action_items
CREATE TABLE IF NOT EXISTS meeting_action_items (
  id              TEXT PRIMARY KEY,
  meeting_id      TEXT REFERENCES meetings(id),
  contact_id      TEXT REFERENCES contacts(id),
  description     TEXT,
  assignee        TEXT,
  ownership_flag  TEXT,
  linked_task_url TEXT,
  status          TEXT DEFAULT 'open',
  due_date        TEXT,
  created_at      TEXT
);

-- company_news
CREATE TABLE IF NOT EXISTS company_news (
  id              TEXT PRIMARY KEY,
  company_id      TEXT REFERENCES companies(id),
  headline        TEXT,
  url             TEXT,
  source          TEXT,
  signal_type     TEXT,
  published_at    TEXT,
  created_at      TEXT
);

-- discovery_review
CREATE TABLE IF NOT EXISTS discovery_review (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  name            TEXT,
  company         TEXT,
  role            TEXT,
  source          TEXT NOT NULL,
  signal_count    INTEGER DEFAULT 1,
  signal_quality  TEXT,
  email_thread_ref TEXT,
  meeting_ref     TEXT,
  status          TEXT DEFAULT 'pending',
  skip_pattern_id TEXT,
  decision_at     TEXT,
  decided_by      TEXT,
  created_at      TEXT
);

-- skip_patterns
CREATE TABLE IF NOT EXISTS skip_patterns (
  id              TEXT PRIMARY KEY,
  pattern_type    TEXT NOT NULL,
  pattern_value   TEXT NOT NULL,
  hit_count       INTEGER DEFAULT 1,
  created_at      TEXT,
  updated_at      TEXT
);

-- email_drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id              TEXT PRIMARY KEY,
  contact_id      TEXT REFERENCES contacts(id),
  subject         TEXT,
  body            TEXT,
  status          TEXT DEFAULT 'proposed',
  thread_ref      TEXT,
  context_used    TEXT,
  proposed_at     TEXT,
  approved_at     TEXT,
  approved_by     TEXT,
  sent_at         TEXT
);

-- daily_digest_log
CREATE TABLE IF NOT EXISTS daily_digest_log (
  id              TEXT PRIMARY KEY,
  run_date        TEXT,
  new_contacts    INTEGER DEFAULT 0,
  context_entries INTEGER DEFAULT 0,
  scores_updated  INTEGER DEFAULT 0,
  summaries_regen INTEGER DEFAULT 0,
  follow_ups_sent INTEGER DEFAULT 0,
  errors          TEXT,
  duration_ms     INTEGER,
  created_at      TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);
CREATE INDEX IF NOT EXISTS idx_contacts_suppressed ON contacts(suppressed);
CREATE INDEX IF NOT EXISTS idx_contacts_relationship_score ON contacts(relationship_score);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_happened_at ON interactions(happened_at);
CREATE INDEX IF NOT EXISTS idx_contact_context_contact_id ON contact_context(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_summaries_contact_id ON contact_summaries(contact_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_contact_id ON follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_due_date ON follow_ups(status, due_date);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_company_news_company_id ON company_news(company_id);
CREATE INDEX IF NOT EXISTS idx_discovery_review_status ON discovery_review(status);
CREATE INDEX IF NOT EXISTS idx_discovery_review_decision_at ON discovery_review(decision_at);
CREATE INDEX IF NOT EXISTS idx_skip_patterns_type_value ON skip_patterns(pattern_type, pattern_value);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_drafts(status);
CREATE INDEX IF NOT EXISTS idx_daily_digest_log_run_date ON daily_digest_log(run_date);
