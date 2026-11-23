PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

INSERT INTO app_metadata (key, value, updated_at_utc)
VALUES ('schema_version', 'foundation-0001', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at_utc = excluded.updated_at_utc;

CREATE TABLE IF NOT EXISTS inboxes (
  code TEXT PRIMARY KEY CHECK (code IN ('agency', 'detags', 'transfers', 'unadopts')),
  display_name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at_utc TEXT NOT NULL
);

INSERT INTO inboxes (code, display_name, display_order, enabled, created_at_utc) VALUES
  ('agency', 'Agency Detags', 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('detags', 'Detags', 2, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('transfers', 'Transfers', 3, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('unadopts', 'Unadopts', 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(code) DO NOTHING;

-- Principal identifiers are HMAC pseudonyms, not email addresses or display names.
CREATE TABLE IF NOT EXISTS principals (
  principal_ref_hash TEXT PRIMARY KEY CHECK (length(principal_ref_hash) = 64),
  first_seen_at_utc TEXT NOT NULL,
  last_seen_at_utc TEXT NOT NULL,
  disabled_at_utc TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL CHECK (source_system IN ('outlook')),
  source_item_ref_hash TEXT NOT NULL CHECK (length(source_item_ref_hash) = 64),
  inbox_code TEXT NOT NULL REFERENCES inboxes(code),
  received_at_utc TEXT NOT NULL,
  last_observed_at_utc TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'received', 'queued', 'assigned', 'in_progress', 'waiting',
    'resolved', 'closed', 'exception'
  )),
  brand_code TEXT NOT NULL DEFAULT 'unclassified' CHECK (brand_code IN (
    'volkswagen', 'audi', 'skoda', 'seat', 'cupra', 'vwcv', 'other', 'unclassified'
  )),
  brand_source TEXT NOT NULL DEFAULT 'unclassified' CHECK (brand_source IN (
    'explicit_source', 'approved_mapping', 'unclassified'
  )),
  current_owner_ref_hash TEXT REFERENCES principals(principal_ref_hash),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  UNIQUE (source_system, source_item_ref_hash)
);

CREATE INDEX IF NOT EXISTS idx_tickets_inbox_state_received
  ON tickets(inbox_code, state, received_at_utc);
CREATE INDEX IF NOT EXISTS idx_tickets_owner_state
  ON tickets(current_owner_ref_hash, state);
CREATE INDEX IF NOT EXISTS idx_tickets_last_observed
  ON tickets(last_observed_at_utc);

-- Assignment history is separate from the ticket current-owner snapshot.
CREATE TABLE IF NOT EXISTS assignment_events (
  event_id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id),
  inbox_code TEXT NOT NULL REFERENCES inboxes(code),
  assignment_kind TEXT NOT NULL CHECK (assignment_kind IN (
    'initial', 'manual', 'handover', 'reassignment', 'recovery'
  )),
  previous_owner_ref_hash TEXT REFERENCES principals(principal_ref_hash),
  new_owner_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  actor_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  reason_code TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  occurred_at_utc TEXT NOT NULL,
  source_ticket_version INTEGER NOT NULL CHECK (source_ticket_version > 0),
  CHECK (assignment_kind <> 'initial' OR previous_owner_ref_hash IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_one_initial_per_ticket
  ON assignment_events(ticket_id)
  WHERE assignment_kind = 'initial';
CREATE INDEX IF NOT EXISTS idx_assignment_new_owner_time
  ON assignment_events(new_owner_ref_hash, occurred_at_utc);
CREATE INDEX IF NOT EXISTS idx_assignment_ticket_time
  ON assignment_events(ticket_id, occurred_at_utc);

CREATE TABLE IF NOT EXISTS workflow_events (
  event_id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'received', 'flagged', 'handed_over', 'assigned', 'reassigned',
    'recovery_requested', 'recovery_held', 'recovery_restored',
    'resolved', 'reopened', 'exception'
  )),
  actor_ref_hash TEXT REFERENCES principals(principal_ref_hash),
  source_system TEXT NOT NULL CHECK (source_system IN ('dispatcher', 'outlook', 'excel_tracker')),
  source_event_ref_hash TEXT CHECK (source_event_ref_hash IS NULL OR length(source_event_ref_hash) = 64),
  correlation_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  occurred_at_utc TEXT NOT NULL,
  UNIQUE (source_system, source_event_ref_hash)
);

CREATE INDEX IF NOT EXISTS idx_workflow_ticket_time
  ON workflow_events(ticket_id, occurred_at_utc);
CREATE INDEX IF NOT EXISTS idx_workflow_type_time
  ON workflow_events(event_type, occurred_at_utc);

CREATE TABLE IF NOT EXISTS roster_shifts (
  shift_id TEXT PRIMARY KEY,
  principal_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  shift_code TEXT NOT NULL,
  local_shift_date TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  starts_at_utc TEXT NOT NULL,
  ends_at_utc TEXT NOT NULL,
  source_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'superseded')),
  created_at_utc TEXT NOT NULL,
  CHECK (ends_at_utc > starts_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_roster_principal_interval
  ON roster_shifts(principal_ref_hash, starts_at_utc, ends_at_utc);
CREATE INDEX IF NOT EXISTS idx_roster_timezone_local_date
  ON roster_shifts(time_zone, local_shift_date);

CREATE TABLE IF NOT EXISTS inbox_eligibility (
  eligibility_id TEXT PRIMARY KEY,
  principal_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  inbox_code TEXT NOT NULL REFERENCES inboxes(code),
  valid_from_utc TEXT NOT NULL,
  valid_to_utc TEXT,
  source_version TEXT NOT NULL,
  created_by_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  created_at_utc TEXT NOT NULL,
  CHECK (valid_to_utc IS NULL OR valid_to_utc > valid_from_utc)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_principal_inbox
  ON inbox_eligibility(principal_ref_hash, inbox_code, valid_from_utc, valid_to_utc);

CREATE TABLE IF NOT EXISTS dispatch_config_versions (
  config_id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE CHECK (version_number > 0),
  state TEXT NOT NULL CHECK (state IN ('draft', 'validated', 'approved', 'active', 'retired')),
  policy_json TEXT NOT NULL CHECK (json_valid(policy_json)),
  policy_hash TEXT NOT NULL CHECK (length(policy_hash) = 64),
  created_by_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  approved_by_ref_hash TEXT REFERENCES principals(principal_ref_hash),
  reason_code TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  approved_at_utc TEXT,
  activated_at_utc TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_dispatch_config
  ON dispatch_config_versions(state)
  WHERE state = 'active';

CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_id TEXT PRIMARY KEY,
  principal_ref_hash TEXT NOT NULL REFERENCES principals(principal_ref_hash),
  operation_code TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
  state TEXT NOT NULL CHECK (state IN ('in_progress', 'completed', 'unknown', 'failed')),
  response_status INTEGER,
  result_ref TEXT,
  created_at_utc TEXT NOT NULL,
  expires_at_utc TEXT NOT NULL,
  UNIQUE (principal_ref_hash, operation_code, idempotency_key),
  CHECK (expires_at_utc > created_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expires_at_utc);

-- Outbox stores references and state only; no email or ticket body payloads in this foundation.
CREATE TABLE IF NOT EXISTS outbox_events (
  outbox_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  source_reference_hash TEXT CHECK (source_reference_hash IS NULL OR length(source_reference_hash) = 64),
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN (
    'pending', 'in_progress', 'succeeded', 'failed', 'unknown', 'held'
  )),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at_utc TEXT,
  last_error_code TEXT,
  correlation_id TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_state_next_attempt
  ON outbox_events(state, next_attempt_at_utc);

-- Append-only application audit. This is not a cryptographic tamper-proof ledger.
CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_ref_hash TEXT NOT NULL CHECK (length(actor_ref_hash) = 64),
  actor_role TEXT NOT NULL CHECK (actor_role IN (
    'platform_admin', 'operations_manager', 'team_agent', 'auditor'
  )),
  target_type TEXT NOT NULL,
  occurred_at_utc TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  result TEXT NOT NULL CHECK (result IN ('succeeded', 'failed', 'denied', 'unknown')),
  schema_version TEXT NOT NULL DEFAULT 'foundation-0001'
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(occurred_at_utc DESC, event_id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_time ON audit_events(actor_ref_hash, occurred_at_utc DESC);

CREATE TRIGGER IF NOT EXISTS audit_events_no_update
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events is append-only');
END;
