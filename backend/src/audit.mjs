import { ApiError } from "./auth.mjs";
import { hmacSha256Hex } from "./crypto.mjs";

export async function recordAuthenticatedRead(env, principal, eventType, resource, requestId) {
  if (!env?.DB || typeof env.DB.batch !== "function") {
    throw new ApiError(503, "database_not_configured");
  }

  let actorRefHash;
  try {
    actorRefHash = await hmacSha256Hex(env.AUDIT_ACTOR_HASH_KEY, principal.subjectId);
  } catch {
    throw new ApiError(503, "audit_identity_protection_not_configured");
  }

  const now = new Date().toISOString();
  const eventId = globalThis.crypto.randomUUID();
  const metadata = JSON.stringify({ method: "GET", resource, request_id: requestId });

  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO principals (principal_ref_hash, first_seen_at_utc, last_seen_at_utc) VALUES (?, ?, ?) " +
        "ON CONFLICT(principal_ref_hash) DO UPDATE SET last_seen_at_utc = excluded.last_seen_at_utc"
      ).bind(actorRefHash, now, now),
      env.DB.prepare(
        "INSERT INTO audit_events (event_id, event_type, actor_ref_hash, actor_role, target_type, " +
        "occurred_at_utc, correlation_id, metadata_json, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(eventId, eventType, actorRefHash, principal.role, resource, now, requestId, metadata, "succeeded")
    ]);
  } catch {
    // Fail closed: do not return an authenticated read if its audit write fails.
    throw new ApiError(503, "audit_write_unavailable");
  }

  return actorRefHash;
}
