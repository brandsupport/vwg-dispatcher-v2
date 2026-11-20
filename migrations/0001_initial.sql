-- Dispatcher 2.0 initial schema.
-- All timestamps are ISO-8601 UTC strings. Convert to UK/Egypt local time only for display.
-- Apply to an empty staging D1 database first. Never seed real operational data here.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('system_administrator', 'operations_manager', 'agent')),
  agent_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((role = 'agent' AND agent_id IS NOT NULL) OR role <> 'agent')
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS inboxes (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  source_folder_path TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS agent_inbox_eligibility (
  agent_id TEXT NOT NULL REFERENCES agents(id),
  inbox_id TEXT NOT NULL REFERENCES inboxes(id),
  eligible INTEGER NOT NULL DEFAULT 1 CHECK (eligible IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  changed_by_user_id TEXT REFERENCES app_users(id),
  PRIMARY KEY (agent_id, inbox_id, effective_from)
);

CREATE TABLE IF NOT EXISTS agent_shifts (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  shift_group TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  starts_at_local TEXT NOT NULL,
  ends_at_local TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  roster_note TEXT,
  created_by_user_id TEXT REFERENCES app_users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_ticket_key TEXT NOT NULL,
  inbox_id TEXT NOT NULL REFERENCES inboxes(id),
  brand_id TEXT REFERENCES brands(id),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','unassigned','assigned','in_progress','waiting','resolved','reopened','closed')),
  received_at TEXT NOT NULL,
  first_assigned_at TEXT,
  resolved_at TEXT,
  current_assignee_agent_id TEXT REFERENCES agents(id),
  subject TEXT,
  source_updated_at TEXT,
  last_event_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (source_system, source_ticket_key)
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'received','initial_assignment','assignment','handover','reassignment',
    'manual_override','assignment_restored','flag_raised','flag_cleared',
    'first_response','handling_started','handling_paused','handling_resumed',
    'resolved','reopened','source_sync_error','note'
  )),
  occurred_at TEXT NOT NULL,
  actor_user_id TEXT REFERENCES app_users(id),
  actor_agent_id TEXT REFERENCES agents(id),
  from_agent_id TEXT REFERENCES agents(id),
  to_agent_id TEXT REFERENCES agents(id),
  source_event_key TEXT UNIQUE,
  idempotency_key TEXT UNIQUE,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS handling_sessions (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  started_at TEXT NOT NULL,
  paused_at TEXT,
  ended_at TEXT,
  start_event_id TEXT REFERENCES ticket_events(id),
  end_event_id TEXT REFERENCES ticket_events(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS dispatch_config_versions (
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','active','superseded','disabled')),
  effective_from TEXT,
  effective_to TEXT,
  changed_by_user_id TEXT REFERENCES app_users(id),
  change_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (config_key, version)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES app_users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('requested','succeeded','failed','denied')),
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS integration_sync_runs (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','partial','failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_rejected INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);

CREATE TABLE IF NOT EXISTS integration_inbox (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','processed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  last_error TEXT,
  UNIQUE (source_system, event_key)
);

CREATE INDEX IF NOT EXISTS idx_tickets_inbox_received ON tickets(inbox_id, received_at);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_status ON tickets(current_assignee_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_brand_received ON tickets(brand_id, received_at);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_time ON ticket_events(ticket_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_ticket_events_type_time ON ticket_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_time ON audit_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_integration_inbox_status ON integration_inbox(status, received_at);
CREATE INDEX IF NOT EXISTS idx_handling_sessions_ticket ON handling_sessions(ticket_id, started_at);

-- Historical ticket and audit events are append-only. Corrections are represented by new events.
CREATE TRIGGER IF NOT EXISTS ticket_events_no_update
BEFORE UPDATE ON ticket_events BEGIN
  SELECT RAISE(ABORT, 'ticket_events are append-only');
END;
CREATE TRIGGER IF NOT EXISTS ticket_events_no_delete
BEFORE DELETE ON ticket_events BEGIN
  SELECT RAISE(ABORT, 'ticket_events are append-only');
END;
CREATE TRIGGER IF NOT EXISTS audit_log_no_update
BEFORE UPDATE ON audit_log BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
BEFORE DELETE ON audit_log BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

INSERT OR IGNORE INTO inboxes (id, key, display_name) VALUES
  ('inbox-agency', 'agency', 'Agency Detags'),
  ('inbox-detags', 'detags', 'Detags'),
  ('inbox-transfers', 'transfers', 'Transfers'),
  ('inbox-unadopts', 'unadopts', 'Unadopts');

INSERT OR IGNORE INTO brands (id, key, display_name) VALUES
  ('brand-vw', 'vw', 'Volkswagen'),
  ('brand-audi', 'audi', 'Audi'),
  ('brand-skoda', 'skoda', 'Škoda'),
  ('brand-seat', 'seat', 'SEAT'),
  ('brand-cupra', 'cupra', 'CUPRA'),
  ('brand-vwcv', 'vwcv', 'Volkswagen Commercial Vehicles'),
  ('brand-other', 'other', 'Other / unclassified');
