import { createRemoteJWKSet, jwtVerify } from "jose";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};
const SESSION_COOKIE = "__Host-vwg-dispatcher-session";
const OAUTH_COOKIE = "__Host-vwg-dispatcher-oauth";
const SESSION_SECONDS = 8 * 60 * 60;
const OAUTH_SECONDS = 10 * 60;
const encoder = new TextEncoder();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function requestId(request) {
  return request.headers.get("cf-ray") || crypto.randomUUID();
}

function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return SESSION_COOKIE + "=" + token + "; Path=/; Max-Age=" + maxAge + "; Secure; HttpOnly; SameSite=Lax";
}

function oauthCookie(state, maxAge = OAUTH_SECONDS) {
  return OAUTH_COOKIE + "=" + state + "; Path=/; Max-Age=" + maxAge + "; Secure; HttpOnly; SameSite=Lax";
}

function clearCookie(name) {
  return name + "=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";
}

function redirect(location, cookies = []) {
  const headers = new Headers({
    location,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer"
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function microsoftConfig(env) {
  const tenant = env.MS_TENANT_ID?.trim();
  const clientId = env.MS_CLIENT_ID?.trim();
  const clientSecret = env.MS_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret || tenant === "common" || tenant === "organizations") {
    return null;
  }
  return { tenant, clientId, clientSecret };
}

async function startMicrosoftLogin(request, env) {
  const config = microsoftConfig(env);
  if (!config) return json({ error: "Microsoft sign-in is not configured yet" }, 503);

  const url = new URL(request.url);
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const challenge = await sha256(verifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OAUTH_SECONDS * 1000).toISOString();

  await env.DB.prepare("DELETE FROM oauth_transactions WHERE expires_at <= ?")
    .bind(now.toISOString()).run();
  await env.DB.prepare(
    "INSERT INTO oauth_transactions (state_hash, nonce, code_verifier, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(await sha256(state), nonce, verifier, expiresAt, now.toISOString()).run();

  const callback = new URL("/api/auth/callback", url.origin).toString();
  const authorize = new URL(
    "https://login.microsoftonline.com/" + config.tenant + "/oauth2/v2.0/authorize"
  );
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: callback,
    response_mode: "query",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256"
  }).toString();

  return redirect(authorize.toString(), [oauthCookie(state)]);
}

async function completeMicrosoftLogin(request, env) {
  const config = microsoftConfig(env);
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieState = cookieValue(request, OAUTH_COOKIE);
  const fail = (reason = "signin_failed") =>
    redirect(url.origin + "/login.html?error=" + encodeURIComponent(reason), [clearCookie(OAUTH_COOKIE)]);

  if (!config) return json({ error: "Microsoft sign-in is not configured yet" }, 503);
  if (url.searchParams.has("error")) return fail("signin_cancelled");
  if (!state || !code || !cookieState || state !== cookieState) return fail("invalid_signin_state");

  const now = new Date().toISOString();
  const stateHash = await sha256(state);
  const transaction = await env.DB.prepare(
    "SELECT nonce, code_verifier, expires_at FROM oauth_transactions WHERE state_hash = ? AND expires_at > ? LIMIT 1"
  ).bind(stateHash, now).first();

  await env.DB.prepare("DELETE FROM oauth_transactions WHERE state_hash = ?").bind(stateHash).run();
  if (!transaction) return fail("signin_expired");

  const callback = new URL("/api/auth/callback", url.origin).toString();
  const tokenBody = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: callback,
    code_verifier: transaction.code_verifier,
    scope: "openid profile email"
  });

  try {
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/" + config.tenant + "/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: tokenBody
      }
    );
    if (!tokenResponse.ok) return fail("microsoft_token_exchange_failed");
    const tokenSet = await tokenResponse.json();
    if (typeof tokenSet.id_token !== "string") return fail("missing_identity_token");

    const issuer = "https://login.microsoftonline.com/" + config.tenant + "/v2.0";
    const jwks = createRemoteJWKSet(
      new URL("https://login.microsoftonline.com/" + config.tenant + "/discovery/v2.0/keys")
    );
    const { payload } = await jwtVerify(tokenSet.id_token, jwks, {
      issuer,
      audience: config.clientId,
      nonce: transaction.nonce
    });

    const tenantId = typeof payload.tid === "string" ? payload.tid.toLowerCase() : "";
    const objectId = typeof payload.oid === "string" ? payload.oid : "";
    const emailClaim =
      typeof payload.preferred_username === "string" ? payload.preferred_username :
      typeof payload.email === "string" ? payload.email : "";
    const email = emailClaim.trim().toLowerCase();

    if (tenantId !== config.tenant.toLowerCase() || !objectId || !email) {
      return fail("identity_not_accepted");
    }

    let user = await env.DB.prepare(
      "SELECT id, email, role, agent_id, active, entra_object_id FROM app_users WHERE entra_object_id = ? LIMIT 1"
    ).bind(objectId).first();

    if (!user) {
      const invited = await env.DB.prepare(
        "SELECT id, email, role, agent_id, active, entra_object_id FROM app_users WHERE email = ? COLLATE NOCASE LIMIT 1"
      ).bind(email).first();

      if (!invited || invited.active !== 1 ||
          (invited.entra_object_id && invited.entra_object_id !== objectId)) {
        return fail("account_not_provisioned");
      }

      if (!invited.entra_object_id) {
        try {
          await env.DB.prepare(
            "UPDATE app_users SET entra_object_id = ?, updated_at = ? WHERE id = ? AND entra_object_id IS NULL"
          ).bind(objectId, new Date().toISOString(), invited.id).run();
        } catch {
          return fail("identity_link_failed");
        }
      }

      user = await env.DB.prepare(
        "SELECT id, email, role, agent_id, active, entra_object_id FROM app_users WHERE entra_object_id = ? LIMIT 1"
      ).bind(objectId).first();
    }

    if (!user || user.active !== 1) return fail("account_not_provisioned");

    const sessionToken = randomToken();
    const sessionId = crypto.randomUUID();
    const sessionHash = await sha256(sessionToken);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + SESSION_SECONDS * 1000).toISOString();

    await env.DB.prepare(
      "INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(sessionId, user.id, sessionHash, expiresAt, createdAt.toISOString()).run();

    await recordAudit(env, user, "auth.login", "app_user", user.id, "succeeded", null, requestId(request));
    return redirect(url.origin + "/", [
      sessionCookie(sessionToken),
      clearCookie(OAUTH_COOKIE)
    ]);
  } catch {
    return fail("signin_verification_failed");
  }
}

async function currentSession(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await sha256(token);
  return env.DB.prepare(
    "SELECT u.id, u.email, u.role, u.agent_id, u.active, s.id AS session_id " +
    "FROM user_sessions s JOIN app_users u ON u.id = s.user_id " +
    "WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.active = 1 LIMIT 1"
  ).bind(tokenHash, new Date().toISOString()).first();
}

function hasRole(user, allowed) {
  return allowed.includes(user.role);
}

async function recordAudit(env, user, action, targetType, targetId, outcome, reason, id) {
  await env.DB.prepare(
    "INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, outcome, reason, request_id, occurred_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    crypto.randomUUID(), user?.id ?? null, action, targetType, targetId ?? null,
    outcome, reason ?? null, id, new Date().toISOString()
  ).run();
}

async function logout(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!origin || origin !== url.origin) return json({ error: "Invalid request origin" }, 403);

  const token = cookieValue(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256(token);
    const session = await env.DB.prepare(
      "SELECT u.id, u.email, u.role, u.agent_id, u.active " +
      "FROM user_sessions s JOIN app_users u ON u.id = s.user_id " +
      "WHERE s.token_hash = ? AND s.revoked_at IS NULL LIMIT 1"
    ).bind(tokenHash).first();

    await env.DB.prepare(
      "UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL"
    ).bind(new Date().toISOString(), tokenHash).run();

    if (session) {
      await recordAudit(env, session, "auth.logout", "app_user", session.id, "succeeded", null, requestId(request));
    }
  }

  return json({ ok: true }, 200, { "set-cookie": clearCookie(SESSION_COOKIE) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = requestId(request);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const session = await currentSession(request, env);
      if (!session) return redirect(url.origin + "/login.html");
      return env.ASSETS.fetch(request);
    }

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "vwg-dispatcher-api",
        environment: env.APP_ENV || "unset",
        authentication: "microsoft-oidc"
      }, 200, { "x-request-id": id });
    }

    if (request.method === "GET" && url.pathname === "/api/auth/login") {
      return startMicrosoftLogin(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/auth/callback") {
      return completeMicrosoftLogin(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      return logout(request, env);
    }

    const user = await currentSession(request, env);
    if (!user) return json({ error: "Authentication required" }, 401, { "x-request-id": id });

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
        env.DB.prepare(
          "SELECT COUNT(*) AS received, " +
          "SUM(CASE WHEN status = 'unassigned' THEN 1 ELSE 0 END) AS unassigned, " +
          "SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) AS resolved, " +
          "SUM(CASE WHEN status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS outstanding " +
          "FROM tickets"
        ).first(),
        env.DB.prepare(
          "SELECT i.id, i.key, i.display_name, COUNT(t.id) AS total_tickets, " +
          "SUM(CASE WHEN t.status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS outstanding " +
          "FROM inboxes i LEFT JOIN tickets t ON t.inbox_id = i.id " +
          "WHERE i.active = 1 GROUP BY i.id, i.key, i.display_name ORDER BY i.display_name"
        ).all()
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
      const result = await env.DB.prepare(
        "SELECT id, source_ticket_key, inbox_id, brand_id, status, received_at, " +
        "first_assigned_at, resolved_at, current_assignee_agent_id " +
        "FROM tickets WHERE current_assignee_agent_id = ? " +
        "ORDER BY received_at DESC LIMIT 200"
      ).bind(user.agent_id).all();
      return json({ tickets: result.results || [] }, 200, { "x-request-id": id });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed. Operational write routes are not enabled in this phase." }, 405);
    }
    return json({ error: "Not found" }, 404);
  }
};
