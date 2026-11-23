import pathlib
import sqlite3
import unittest


MIGRATION = pathlib.Path(__file__).parents[1] / "migrations" / "0001_foundation.sql"


class FoundationSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.db.close()

    def seed_principal_and_ticket(self):
        principal = "a" * 64
        self.db.execute(
            "INSERT INTO principals (principal_ref_hash, first_seen_at_utc, last_seen_at_utc) VALUES (?, ?, ?)",
            (principal, "2026-11-23T08:00:00Z", "2026-11-23T08:00:00Z"),
        )
        self.db.execute(
            "INSERT INTO tickets (ticket_id, source_system, source_item_ref_hash, inbox_code, received_at_utc, "
            "last_observed_at_utc, state, brand_code, brand_source, current_owner_ref_hash, created_at_utc, updated_at_utc) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "ticket-1", "outlook", "b" * 64, "detags",
                "2026-11-23T08:00:00Z", "2026-11-23T08:00:00Z",
                "assigned", "unclassified", "unclassified", principal,
                "2026-11-23T08:00:00Z", "2026-11-23T08:00:00Z",
            ),
        )
        return principal

    def test_four_inboxes_are_seeded_once(self):
        rows = self.db.execute("SELECT code, display_name FROM inboxes ORDER BY display_order").fetchall()
        self.assertEqual(rows, [
            ("agency", "Agency Detags"),
            ("detags", "Detags"),
            ("transfers", "Transfers"),
            ("unadopts", "Unadopts"),
        ])
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM inboxes").fetchone()[0], 4)

    def test_assignment_history_allows_only_one_initial_assignment_per_ticket(self):
        principal = self.seed_principal_and_ticket()
        values = (
            "assignment-1", "ticket-1", "detags", "initial", None, principal,
            principal, "initial_dispatch", "idem-1", "corr-1",
            "2026-11-23T08:01:00Z", 1,
        )
        statement = (
            "INSERT INTO assignment_events (event_id, ticket_id, inbox_code, assignment_kind, previous_owner_ref_hash, "
            "new_owner_ref_hash, actor_ref_hash, reason_code, idempotency_key, correlation_id, occurred_at_utc, source_ticket_version) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        self.db.execute(statement, values)
        duplicate = list(values)
        duplicate[0] = "assignment-2"
        duplicate[8] = "idem-2"
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(statement, duplicate)

    def test_audit_events_reject_update_and_delete(self):
        self.seed_principal_and_ticket()
        actor = "a" * 64
        self.db.execute(
            "INSERT INTO audit_events (event_id, event_type, actor_ref_hash, actor_role, target_type, occurred_at_utc, "
            "correlation_id, metadata_json, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "audit-1", "ticket.read", actor, "operations_manager", "ticket",
                "2026-11-23T08:01:00Z", "corr-1", '{"route":"/api/v1/tickets"}', "succeeded",
            ),
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE audit_events SET result = 'failed' WHERE event_id = 'audit-1'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM audit_events WHERE event_id = 'audit-1'")

    def test_invalid_ticket_brand_is_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO tickets (ticket_id, source_system, source_item_ref_hash, inbox_code, received_at_utc, "
                "last_observed_at_utc, state, brand_code, brand_source, created_at_utc, updated_at_utc) "
                "VALUES ('ticket-x', 'outlook', ?, 'detags', '2026-11-23T08:00:00Z', '2026-11-23T08:00:00Z', "
                "'received', 'guess-from-subject', 'unclassified', '2026-11-23T08:00:00Z', '2026-11-23T08:00:00Z')",
                ("c" * 64,),
            )

    def test_idempotency_keys_are_unique_per_actor_and_operation(self):
        principal = self.seed_principal_and_ticket()
        values = (
            "idem-row-1", principal, "ticket.assign", "client-key-1", "d" * 64,
            "completed", 200, "assignment-1", "2026-11-23T08:01:00Z", "2026-11-24T08:01:00Z",
        )
        statement = (
            "INSERT INTO idempotency_keys (idempotency_id, principal_ref_hash, operation_code, idempotency_key, "
            "request_hash, state, response_status, result_ref, created_at_utc, expires_at_utc) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        self.db.execute(statement, values)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(statement, ("idem-row-2", *values[1:]))


if __name__ == "__main__":
    unittest.main()
