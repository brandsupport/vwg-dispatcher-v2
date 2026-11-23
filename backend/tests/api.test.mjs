import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";

const GROUPS = {
  platform_admin: "dispatch-platform-admin",
  operations_manager: "dispatch-operations-manager",
  team_agent: "dispatch-team-agent",
  auditor: "dispatch-auditor"
};

class FakeD1 {
  constructor() {
    this.principals = new Map();
    this.auditEvents = [];
    this.lastAuditLimit = null;
    this.inboxes = [
      { code: "agency", display_name: "Agency Detags", enabled: 1 },
      { code: "detags", display_name: "Detags", enabled: 1 },
      { code: "transfers", display_name: "Transfers", enabled: 1 },
      { code: "unadopts", display_name: "Unadopts", enabled: 1 }
    ];
  }

  prepare(sql) {
    const db = this;
    const statement = {
      sql,
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (sql.includes("sqlite_master")) return { name: "inboxes" };
        return null;
      },
      async all() {
        if (sql.includes("FROM inboxes")) return { results: db.inboxes };
        if (sql.includes("FROM audit_events")) {
          db.lastAuditLimit = this.values[0];
          return { results: db.auditEvents.slice(-this.values[0]).reverse() };
        }
        return { results: [] };
      },
      async run() {
        return { success: true, meta: { changes: 1 } };
      }
    };
    return statement;
  }

  async batch(statements) {
    for (const statement of statements) {
      if (statement.sql.includes("INSERT INTO principals")) {
        const [hash, firstSeen, lastSeen] = statement.values;
        const current = this.principals.get(hash);
        this.principals.set(hash, {
          first_seen_at_utc: current?.first_seen_at_utc || firstSeen,
          last_seen_at_utc: lastSeen
        });
      } else if (statement.sql.includes("INSERT INTO audit_events")) {
        const [eventId, eventType, actorHash, actorRole, targetType, occurredAt, correlationId, metadata, result] = statement.values;
        this.auditEvents.push({
          event_id: eventId,
          event_type: eventType,
          actor_ref_hash: actorHash,
          actor_role: actorRole,
          target_type: targetType,
          occurred_at_utc: occurredAt,
          correlation_id: correlationId,
          metadata_json: metadata,
          result
        });
      }
    }
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  }
}

function makeEnv(overrides = {}) {
  return {
    DB: new FakeD1(),
    AUDIT_ACTOR_HASH_KEY: "local-test-key-that-is-long-enough-for-hmac-256",
    APP_ALLOWED_ORIGINS: "https://dispatcher.example.invalid,http://localhost:8787",
    ACCESS_GROUP_PLATFORM_ADMIN: GROUPS.platform_admin,
    ACCESS_GROUP_OPERATIONS_MANAGER: GROUPS.operations_manager,
    ACCESS_GROUP_TEAM_AGENT: GROUPS.team_agent,
    ACCESS_GROUP_AUDITOR: GROUPS.auditor,
    ...overrides
  };
}

function makeContext(groups, subject = "local-user-001") {
  return {
    access: {
      async getIdentity() {
        return {
          user_uuid: subject,
          email: "must-not-be-returned@example.invalid",
          groups
        };
      }
    }
  };
}

function makeRequest(path, options = {}) {
  return new Request("https://api.example.invalid" + path, options);
}

test("healthz is liveness-only and does not require an identity", async () => {
  const response = await worker.fetch(makeRequest("/healthz"), makeEnv(), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "vwg-dispatcher-api",
    check: "liveness"
  });
});

test("protected API denies missing Access context even if identity headers are spoofed", async () => {
  const request = makeRequest("/api/v1/me", {
    headers: { "X-Authenticated-Email": "admin@example.invalid" }
  });
  const response = await worker.fetch(request, makeEnv(), {});
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "cloudflare_access_required");
});

test("protected API denies identities without a stable Access subject", async () => {
  const ctx = { access: { async getIdentity() { return { email: "user@example.invalid", groups: [GROUPS.platform_admin] }; } } };
  const response = await worker.fetch(makeRequest("/api/v1/me"), makeEnv(), ctx);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "identity_subject_missing");
});

test("authorization mapping fails closed when a role group is not configured", async () => {
  const env = makeEnv({ ACCESS_GROUP_AUDITOR: "" });
  const response = await worker.fetch(makeRequest("/api/v1/me"), env, makeContext([GROUPS.platform_admin]));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "authorization_mapping_not_configured");
});

test("a user matching more than one role group is denied", async () => {
  const response = await worker.fetch(
    makeRequest("/api/v1/me"),
    makeEnv(),
    makeContext([GROUPS.platform_admin, GROUPS.operations_manager])
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "role_not_authorized");
});

test("platform administrator profile is pseudonymized and does not expose email", async () => {
  const env = makeEnv();
  const response = await worker.fetch(
    makeRequest("/api/v1/me"),
    env,
    makeContext([GROUPS.platform_admin])
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.role, "platform_admin");
  assert.equal(body.authenticated, true);
  assert.ok(body.permissions.includes("audit:read"));
  assert.equal(JSON.stringify(body).includes("must-not-be-returned@example.invalid"), false);
  assert.equal(env.DB.principals.size, 1);
  assert.equal(env.DB.auditEvents.length, 1);
  assert.equal(env.DB.auditEvents[0].event_type, "identity.profile_read");
  assert.equal(env.DB.auditEvents[0].actor_ref_hash.length, 64);
});

test("operations manager can read the four inbox catalogue entries", async () => {
  const env = makeEnv();
  const response = await worker.fetch(
    makeRequest("/api/v1/inboxes"),
    env,
    makeContext([GROUPS.operations_manager])
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.items.map((item) => item.code), ["agency", "detags", "transfers", "unadopts"]);
  assert.equal(env.DB.auditEvents[0].event_type, "inboxes.catalogue_read");
});

test("team agents cannot read the global audit ledger", async () => {
  const env = makeEnv();
  const response = await worker.fetch(
    makeRequest("/api/v1/audit"),
    env,
    makeContext([GROUPS.team_agent])
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "permission_denied");
  assert.equal(env.DB.auditEvents.length, 0);
});

test("auditors can read audit events and page size is capped at 100", async () => {
  const env = makeEnv();
  const response = await worker.fetch(
    makeRequest("/api/v1/audit?limit=5000"),
    env,
    makeContext([GROUPS.auditor])
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.limit, 100);
  assert.equal(env.DB.lastAuditLimit, 100);
  assert.equal(env.DB.auditEvents[0].event_type, "audit.events_read");
});

test("invalid audit page size is rejected", async () => {
  const response = await worker.fetch(
    makeRequest("/api/v1/audit?limit=0"),
    makeEnv(),
    makeContext([GROUPS.auditor])
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_limit");
});

test("readiness checks the initial database schema", async () => {
  const response = await worker.fetch(
    makeRequest("/api/v1/system/readiness"),
    makeEnv(),
    makeContext([GROUPS.platform_admin])
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    api: "ready",
    database: "connected",
    schema: "foundation-0001"
  });
});

test("browser origins must match the exact configured allow-list", async () => {
  const env = makeEnv();
  const allowed = await worker.fetch(
    makeRequest("/api/v1/me", { headers: { Origin: "https://dispatcher.example.invalid" } }),
    env,
    makeContext([GROUPS.platform_admin])
  );
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://dispatcher.example.invalid");
  assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"), "true");

  const denied = await worker.fetch(
    makeRequest("/api/v1/me", { headers: { Origin: "https://attacker.example.invalid" } }),
    env,
    makeContext([GROUPS.platform_admin])
  );
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error, "origin_not_allowed");
});

test("CORS preflight only succeeds for an exact allow-listed origin", async () => {
  const response = await worker.fetch(
    makeRequest("/api/v1/me", { method: "OPTIONS", headers: { Origin: "http://localhost:8787" } }),
    makeEnv(),
    {}
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
});

test("unsupported write methods are not exposed in the foundation API", async () => {
  const response = await worker.fetch(
    makeRequest("/api/v1/inboxes", { method: "POST" }),
    makeEnv(),
    {}
  );
  assert.equal(response.status, 405);
  assert.equal((await response.json()).error, "method_not_allowed");
});
