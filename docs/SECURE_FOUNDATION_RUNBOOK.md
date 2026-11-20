# Dispatcher 2.0 — Secure Foundation Runbook

## Scope and safety boundary

This branch adds a Cloudflare Worker API, a D1 schema and Cloudflare Access JWT validation. It is a staging foundation only.

- The existing static dashboard remains unchanged.
- No Outlook, Excel, Salesforce or mailbox integration is configured.
- No production records or real colleague identities are included.
- No assignment, reassignment, roster or dispatch write endpoint exists.
- The Worker denies identities not explicitly provisioned in the `app_users` table.
- Team-wide analytics are restricted to System Administrator and Operations Manager roles.
- Agent ticket access is scoped to the agent identity stored server-side.

Do not point this staging API at production data until security review, access approval, backup/restore testing and data-protection approval are complete.

## Architecture

- Static frontend: existing GitHub Pages prototype for synthetic-only preview.
- API: Cloudflare Worker (`worker/index.js`).
- Authentication: Cloudflare Access JWT assertion, verified against the Access team's published JWKS.
- Authorisation: active identity and role loaded from D1 on every protected request.
- Database: Cloudflare D1, with migrations in `migrations/`.
- Audit: append-only `audit_log`; ticket history in append-only `ticket_events`.

The Worker trusts neither browser-supplied role values nor a role claim from the Access JWT. The email claim identifies the user; the database determines whether they are provisioned and what role they have.

## 1. Create a staging D1 database

From a trusted terminal with Wrangler authenticated to the correct Cloudflare account:

```sh
npm install
npx wrangler login
npx wrangler d1 create vwg-dispatcher-staging
```

Copy the returned database ID into `wrangler.toml` at `[[d1_databases]].database_id`. Do not commit credentials or account tokens.

Apply the initial migration to staging:

```sh
npx wrangler d1 migrations apply dispatcher-db --remote
```

If Wrangler reports that the database binding/name differs, use the database name shown in the created D1 resource and keep the binding name `DB` in the Worker config.

## 2. Configure Cloudflare Access

In the Cloudflare Zero Trust dashboard:

1. Create an Access application for the intended staging API hostname (for example, `dispatcher-api-staging.<your-domain>`).
2. Create an allow policy limited to the approved company identities or identity group.
3. Do not use a public/bypass policy.
4. Copy the team domain and application audience (AUD) from the Access application details.
5. Set Worker secrets/variables:
   - `ACCESS_TEAM_DOMAIN`: the HTTPS team domain, e.g. `https://example.cloudflareaccess.com`.
   - `ACCESS_AUD`: the exact audience tag for this Access application.

Set them as secrets rather than committing values:

```sh
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
```

Cloudflare Access must protect the API hostname. The Worker independently validates the JWT and checks the D1 user allowlist/role.

## 3. Deploy the Worker

Update `wrangler.toml` with the actual staging D1 database ID, then:

```sh
npx wrangler deploy
```

Verify the public health route:

```sh
curl https://<worker-hostname>/api/health
```

Expected response has `ok: true`. This endpoint reveals no user or ticket data.

## 4. Provision the first administrator

Only after the Access policy is in place, provision the approved administrator email in D1 using a secure, authenticated administrative workflow. The initial schema intentionally does not create a default administrator and the Worker has no public self-registration endpoint.

For an initial controlled staging bootstrap, an authorised Cloudflare account operator can run a parameterised D1 insert from a trusted environment after confirming the exact email and obtaining approval. Never place real email addresses in Git history or public seed files.

Example SQL shape (replace placeholders locally; do not commit the replaced values):

```sql
INSERT INTO app_users (id, email, role, active)
VALUES ('<random-user-id>', '<approved-email>', 'system_administrator', 1);
```

Create agent profile records and agent-role mappings only after the real roster has been approved for this staging environment.

## 5. API smoke tests

- `GET /api/health`: public, returns service health only.
- `GET /api/me`: requires Access JWT and a provisioned active D1 user.
- `GET /api/overview/summary`: System Administrator / Operations Manager only.
- `GET /api/agents`: System Administrator / Operations Manager only.
- `GET /api/my/tickets`: Agent only; query is scoped to the server-side agent ID.

Expected security tests:

1. No JWT → 401.
2. Invalid/expired JWT → 401.
3. Valid Access identity absent from D1 → 403.
4. Inactive D1 identity → 403.
5. Agent requests team overview → 403 and an audit event.
6. Agent requests own tickets → only records assigned to their mapped agent ID.
7. Browser-supplied role or agent ID has no effect on permissions.

## 6. Data model and metric integrity

- All stored event timestamps are ISO-8601 UTC strings.
- Convert to UK mailbox time or Africa/Cairo shift time only for presentation and schedule calculations.
- `ticket_events` and `audit_log` are protected by database triggers against updates/deletes.
- Deduplicate source retries with `source_event_key` and/or `idempotency_key`.
- The first-assignment share must be derived from each distinct ticket's initial assignment event, never from all later assignment events.
- Handover, recovery and reassignment are separate event types.
- Active handling time must be calculated only from explicit start/pause/resume/end sessions in `handling_sessions`.
- Outstanding workload is a current-state snapshot, not a historical allocation-share metric.
- Brand counts must use validated `brand_id`; uncertain tickets belong in Other / unclassified.

## Not yet implemented

- Frontend sign-in/session UX and API connection.
- User/agent provisioning interface.
- Outlook/Excel read-only ingestion and reconciliation.
- Source-event queue processor and retry policy.
- Ticket ingestion/write API.
- Configuration approval workflow and operational write controls.
- Production logging/alerting, backup policy, retention policy and formal security review.

These are deliberate follow-on steps, not implied capabilities.
