import { ApiError, authenticateRequest, requirePermission } from "./auth.mjs";
import { recordAuthenticatedRead } from "./audit.mjs";

const SERVICE_NAME = "vwg-dispatcher-api";
const API_PREFIX = "/api/v1";

function baseHeaders(requestId) {
  return new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Vary": "Origin",
    "X-Request-ID": requestId
  });
}

function allowedOrigins(env) {
  return new Set(
    String(env?.APP_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

function responseHeaders(request, env, requestId) {
  const headers = baseHeaders(requestId);
  const origin = request.headers.get("Origin");
  if (origin) {
    if (!allowedOrigins(env).has(origin)) throw new ApiError(403, "origin_not_allowed");
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

function jsonResponse(payload, status, headers) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function requireDatabase(env) {
  if (!env?.DB || typeof env.DB.prepare !== "function") {
    throw new ApiError(503, "database_not_configured");
  }
  return env.DB;
}

async function handleGet(request, env, ctx, requestId, headers) {
  const url = new URL(request.url);
  const path = url.pathname;
  const principal = await authenticateRequest(ctx, env);

  if (path === API_PREFIX + "/me") {
    requirePermission(principal, "profile:read");
    const actorRef = await recordAuthenticatedRead(env, principal, "identity.profile_read", "profile", requestId);
    return jsonResponse({
      authenticated: true,
      identity_provider: "cloudflare_access",
      principal_ref: actorRef,
      role: principal.role,
      permissions: principal.permissions
    }, 200, headers);
  }

  if (path === API_PREFIX + "/inboxes") {
    requirePermission(principal, "inboxes:read");
    await recordAuthenticatedRead(env, principal, "inboxes.catalogue_read", "inboxes", requestId);
    const db = requireDatabase(env);
    const result = await db.prepare(
      "SELECT code, display_name, enabled FROM inboxes ORDER BY display_order ASC"
    ).all();
    return jsonResponse({ items: result.results || [] }, 200, headers);
  }

  if (path === API_PREFIX + "/system/readiness") {
    requirePermission(principal, "system:read");
    const db = requireDatabase(env);
    const schema = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).bind("inboxes").first();
    return jsonResponse({
      api: "ready",
      database: schema ? "connected" : "not_ready",
      schema: schema ? "foundation-0001" : "not_applied"
    }, schema ? 200 : 503, headers);
  }

  if (path === API_PREFIX + "/audit") {
    requirePermission(principal, "audit:read");
    const rawLimit = url.searchParams.get("limit");
    const parsedLimit = rawLimit === null ? 50 : Number(rawLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new ApiError(400, "invalid_limit");
    }
    const limit = Math.min(parsedLimit, 100);

    await recordAuthenticatedRead(env, principal, "audit.events_read", "audit_events", requestId);
    const db = requireDatabase(env);
    const result = await db.prepare(
      "SELECT event_id, event_type, actor_ref_hash, actor_role, target_type, occurred_at_utc, " +
      "correlation_id, metadata_json, result FROM audit_events " +
      "ORDER BY occurred_at_utc DESC, event_id DESC LIMIT ?"
    ).bind(limit).all();

    const items = (result.results || []).map((row) => {
      let metadata = {};
      try {
        metadata = JSON.parse(row.metadata_json || "{}");
      } catch {
        metadata = { unavailable: true };
      }
      return { ...row, metadata };
    });
    return jsonResponse({ items, limit }, 200, headers);
  }

  throw new ApiError(404, "route_not_found");
}

export default {
  async fetch(request, env, ctx) {
    const requestId = globalThis.crypto.randomUUID();
    let headers = baseHeaders(requestId);

    try {
      headers = responseHeaders(request, env, requestId);
      const url = new URL(request.url);

      if (url.pathname === "/healthz") {
        if (request.method !== "GET") throw new ApiError(405, "method_not_allowed");
        return jsonResponse({ ok: true, service: SERVICE_NAME, check: "liveness" }, 200, headers);
      }

      if (request.method === "OPTIONS") {
        if (!request.headers.get("Origin")) throw new ApiError(400, "origin_required");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Access-Control-Max-Age", "600");
        return new Response(null, { status: 204, headers });
      }

      if (!url.pathname.startsWith(API_PREFIX + "/")) {
        throw new ApiError(404, "route_not_found");
      }
      if (request.method !== "GET") {
        headers.set("Allow", "GET, OPTIONS");
        throw new ApiError(405, "method_not_allowed");
      }

      return await handleGet(request, env, ctx, requestId, headers);
    } catch (error) {
      const safeError = error instanceof ApiError ? error : new ApiError(503, "service_unavailable");
      console.error(JSON.stringify({
        event: "dispatcher_api_request_failed",
        request_id: requestId,
        status: safeError.status,
        code: safeError.code
      }));
      return jsonResponse({ error: safeError.code, request_id: requestId }, safeError.status, headers);
    }
  }
};
