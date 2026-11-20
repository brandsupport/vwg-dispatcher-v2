import { createRemoteJWKSet, jwtVerify } from "jose";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function requestId(request) {
  return request.headers.get("cf-ray") || crypto.randomUUID();
}

async function authenticate(request, env) {
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) return { error: json({ error: "Authentication required" }, 401) };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { error: json({ error: "Authentication is not configured" }, 503) };
  }

  try {
    const issuer = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
    const jwks = createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs"));
    const { payload } = await jwtVerify(assertion, jwks, {
      issuer,
      audience: env.ACCESS_AUD
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email) return { error: json({ error: "Authenticated identity has no email claim" }, 403) };

    const user = await env.DB.prepare(
      "SELECT id, email, role, agent_id, active FROM app_users WHERE email = ? COLLATE NOCASE LIMIT 1"
    ).bind(email).first();

    if (!user || user.active !== 1) {
      return { error: json({ error: "This identity is not authorised for Dispatcher" }, 403) };
    }
    return { user };
  } catch {
    return { error: json({ error: "Invalid or expired access assertion" }, 401) };
  }
}

function hasRole(user, allowed) {
  return allowed.includes(user.role);
}

async function recordAudit(env, user, action, targetType, targetId, outcome, reason, id) {
  await env.DB.prepare(`
    INSERT INTO audit_log
      (id, actor_user_id, action, target_type, target_id, outcome, reason, request_id, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), user?.id ?? null, action, targetType, targetId ?? null,
    outcome, reason ?? null, id, new Date().toISOString()
  ).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = requestId(request);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "vwg-dispatcher-api", environment: env.APP_ENV || "unset" }, 200, { "x-request-id": id });
    }

    if (!url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    const auth = await authenticate(request, env);
    if (auth.error) return auth.error;
    const user = auth.user;

    if (request.method === "GET" && url.pathname === "/api/me") {
      return json({
        id: user.id,
        email: user.email,
        role: user.role,
        agentId: user.role === "agent" ? user.agent_id : null
      }, 200, { "x-request-id": id });
    }

    if (request.method === "GET" && url.pathname === "/api/overview/summary") {
      if (!hasRole(user, ["system_administrator", "operations_manager"])) {
        await recordAudit(env, user, "overview.summary.read", "overview", null, "denied", "Role does not permit team-wide analytics", id);
        return json({ error: "Forbidden" }, 403);
      }
      const [ticketCounts, inboxCounts] = await Promise.all([
        env.DB.prepare(`
          SELECT
            COUNT(*) AS received,
            SUM(CASE WHEN status = 'unassigned' THEN 1 ELSE 0 END) AS unassigned,
            SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) AS resolved,
            SUM(CASE WHEN status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS outstanding
          FROM tickets
        `).first(),
        env.DB.prepare(`
          SELECT i.id, i.key, i.display_name,
            COUNT(t.id) AS total_tickets,
            SUM(CASE WHEN t.status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS outstanding
          FROM inboxes i LEFT JOIN tickets t ON t.inbox_id = i.id
          WHERE i.active = 1 GROUP BY i.id, i.key, i.display_name ORDER BY i.display_name
        `).all()
      ]);
      return json({
        source: "database",
        generatedAt: new Date().toISOString(),
        tickets: {
          received: ticketCounts?.received ?? 0,
          unassigned: ticketCounts?.unassigned ?? 0,
          resolved: ticketCounts?.resolved ?? 0,
          outstanding: ticketCounts?.outstanding ?? 0
        },
        inboxes: inboxCounts.results || []
      }, 200, { "x-request-id": id });
    }

    if (request.method === "GET" && url.pathname === "/api/agents") {
      if (!hasRole(user, ["system_administrator", "operations_manager"])) {
        await recordAudit(env, user, "agents.list", "agents", null, "denied", "Role does not permit team directory access", id);
        return json({ error: "Forbidden" }, 403);
      }
      const result = await env.DB.prepare(
        "SELECT id, display_name, active FROM agents ORDER BY display_name"
      ).all();
      return json({ agents: result.results || [] }, 200, { "x-request-id": id });
    }

    if (request.method === "GET" && url.pathname === "/api/my/tickets") {
      if (user.role !== "agent" || !user.agent_id) return json({ error: "Forbidden" }, 403);
      const result = await env.DB.prepare(`
        SELECT id, source_ticket_key, inbox_id, brand_id, status, received_at,
          first_assigned_at, resolved_at, current_assignee_agent_id
        FROM tickets
        WHERE current_assignee_agent_id = ?
        ORDER BY received_at DESC LIMIT 200
      `).bind(user.agent_id).all();
      return json({ tickets: result.results || [] }, 200, { "x-request-id": id });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed. Operational write routes are not enabled in this phase." }, 405);
    }
    return json({ error: "Not found" }, 404);
  }
};
