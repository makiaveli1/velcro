const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const DB_DIR = __dirname;
const DB_FILE = path.join(DB_DIR, 'crm.sqlite');
const SCHEMA_FILE = path.join(DB_DIR, 'schema.sql');
const INITIAL_SCHEMA_VERSION = 1;

fs.mkdirSync(DB_DIR, { recursive: true });

const connection = new Database(DB_FILE);
connection.pragma('journal_mode = WAL');
connection.pragma('foreign_keys = ON');

function normalizeParams(params) {
  if (Array.isArray(params)) {
    return params;
  }

  return params || {};
}

function initializeDatabase() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    throw new Error(`Schema file not found: ${SCHEMA_FILE}`);
  }

  const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  connection.exec(schemaSql);

  const existingVersion = connection
    .prepare('SELECT version FROM schema_version WHERE version = ?')
    .get(INITIAL_SCHEMA_VERSION);

  if (!existingVersion) {
    connection
      .prepare(
        'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)'
      )
      .run(
        INITIAL_SCHEMA_VERSION,
        'Initial Relationship Intelligence CRM schema',
        new Date().toISOString()
      );

    console.log('Database schema initialized at version 1');
  }
}

initializeDatabase();

const db = {
  connection,
  get(sql, params = {}) {
    return connection.prepare(sql).get(normalizeParams(params));
  },
  getOne(sql, params = {}) {
    return connection.prepare(sql).get(normalizeParams(params));
  },
  all(sql, params = {}) {
    return connection.prepare(sql).all(normalizeParams(params));
  },
  run(sql, params = {}) {
    return connection.prepare(sql).run(normalizeParams(params));
  },
  transaction(fn) {
    return connection.transaction(fn);
  },
};

function uuid() {
  return uuidv4();
}

module.exports = {
  db,
  uuid,
};
