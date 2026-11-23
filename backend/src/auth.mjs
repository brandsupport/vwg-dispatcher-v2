export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const ROLE_PERMISSIONS = Object.freeze({
  platform_admin: Object.freeze(["profile:read", "inboxes:read", "system:read", "audit:read"]),
  operations_manager: Object.freeze(["profile:read", "inboxes:read", "system:read", "audit:read"]),
  team_agent: Object.freeze(["profile:read"]),
  auditor: Object.freeze(["profile:read", "system:read", "audit:read"])
});

const ROLE_GROUPS = Object.freeze([
  ["platform_admin", "ACCESS_GROUP_PLATFORM_ADMIN"],
  ["operations_manager", "ACCESS_GROUP_OPERATIONS_MANAGER"],
  ["team_agent", "ACCESS_GROUP_TEAM_AGENT"],
  ["auditor", "ACCESS_GROUP_AUDITOR"]
]);

function normalizeGroups(identity) {
  const sources = [identity?.groups, identity?.idp?.groups, identity?.custom?.groups];
  const values = new Set();

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (typeof item === "string" && item.trim()) {
        values.add(item.trim());
        continue;
      }
      if (item && typeof item === "object") {
        for (const candidate of [item.id, item.name, item.value, item.displayName]) {
          if (typeof candidate === "string" && candidate.trim()) values.add(candidate.trim());
        }
      }
    }
  }
  return values;
}

export function resolveRole(identity, env) {
  const subjectId = identity?.user_uuid || identity?.sub;
  if (typeof subjectId !== "string" || !subjectId.trim()) {
    throw new ApiError(403, "identity_subject_missing");
  }

  const configured = ROLE_GROUPS.map(([role, envKey]) => ({
    role,
    group: typeof env?.[envKey] === "string" ? env[envKey].trim() : ""
  }));

  if (configured.some((item) => !item.group)) {
    throw new ApiError(503, "authorization_mapping_not_configured");
  }

  const configuredGroups = configured.map((item) => item.group);
  if (new Set(configuredGroups).size !== configuredGroups.length) {
    throw new ApiError(503, "authorization_mapping_ambiguous");
  }

  const identityGroups = normalizeGroups(identity);
  const matches = configured.filter((item) => identityGroups.has(item.group));

  // Deliberately deny overlapping roles until a separately reviewed elevation model exists.
  if (matches.length !== 1) return null;
  return matches[0].role;
}

export async function authenticateRequest(ctx, env) {
  if (!ctx?.access || typeof ctx.access.getIdentity !== "function") {
    throw new ApiError(401, "cloudflare_access_required");
  }

  let identity;
  try {
    identity = await ctx.access.getIdentity();
  } catch {
    throw new ApiError(401, "cloudflare_access_identity_unavailable");
  }

  const subjectId = identity?.user_uuid || identity?.sub;
  const role = resolveRole(identity, env);
  if (!role) throw new ApiError(403, "role_not_authorized");

  return { subjectId, role, permissions: ROLE_PERMISSIONS[role] };
}

export function requirePermission(principal, permission) {
  if (!principal?.permissions?.includes(permission)) {
    throw new ApiError(403, "permission_denied");
  }
}
