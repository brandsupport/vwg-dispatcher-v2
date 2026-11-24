# VWG Dispatcher 2.0 — Backend & Database Foundation 1.0

**Status: staging foundation verified; not production-ready.** The D1 database `vwg-dispatcher-staging` was created and its `foundation-0001` schema, 12 application tables, 16 indexes, two audit triggers and four inbox seed records were verified. The staging Worker `vwg-dispatcher-api-staging` has a version in Cloudflare deployment history. Cloudflare Access, role-group variables and the audit HMAC secret are not configured; protected API routes therefore remain fail-closed. No production database, live Citrix/Outlook/Excel connection or real operational data is configured.

The backend is a separate Cloudflare Worker service. The existing GitHub Pages frontend remains a public synthetic-data demo and is not connected to this API.

## Architecture

- Runtime: Cloudflare Workers (ES modules).
- Relational database: Cloudflare D1 with versioned SQL migrations.
- Authentication: Cloudflare Access. The Worker requires the Access invocation context and a configured identity-provider group mapping. It never trusts identity headers supplied by the browser.
- Authorization: server-side role and permission checks; deny by default.
- Audit: pseudonymized actor references, HMAC-SHA-256, atomic D1 batch writes and SQLite triggers preventing application-level audit UPDATE/DELETE.
- Transport: exact CORS origin allow-list, no wildcard, no-store responses and security headers.

D1 was selected for the first Cloudflare-native foundation because the current operation is a relatively small four-inbox service and the existing Cloudflare Worker setup can be reused. D1 databases are single-threaded, so query duration and write contention must be measured before enabling high-volume assignment writes. Keep the schema and service boundaries narrow enough to revisit PostgreSQL/Hyperdrive if measured concurrency or data growth requires it.

## Current API surface

All routes except GET /healthz require Cloudflare Access and a uniquely matching, configured role group.

| Route | Permission | Behaviour |
|---|---|---|
| GET /healthz | None | Liveness only; does not claim database or integration readiness |
| GET /api/v1/me | profile:read | Returns role and permissions, never email or raw subject ID |
| GET /api/v1/inboxes | inboxes:read | Reads the four seeded inbox definitions |
| GET /api/v1/system/readiness | system:read | Checks the initial D1 schema |
| GET /api/v1/audit | audit:read | Read-only, paginated audit view; page size capped at 100 |

There are deliberately **no ticket CRUD, assignment, recovery, configuration-apply, Outlook or Excel routes** in Foundation 1.0. The next stage must implement those with verified source data, transactional writes, idempotency and explicit business approval.

## Role mapping

Set four exact group identifiers in the Cloudflare Worker variables:

- ACCESS_GROUP_PLATFORM_ADMIN
- ACCESS_GROUP_OPERATIONS_MANAGER
- ACCESS_GROUP_TEAM_AGENT
- ACCESS_GROUP_AUDITOR

The Access identity must include the corresponding groups. Configure the identity provider so the group information is available to the Worker through ctx.access.getIdentity(). The application requires exactly one matching role group; no match, overlapping matches or missing configuration is denied. There is no email-domain fallback and no default administrator.

Cloudflare Access must protect the Worker itself. The code additionally fails closed when ctx.access is absent, so removing or bypassing the Access policy does not grant API access. The application uses the trusted Access subject UUID (or sub) as its principal input, then stores only an HMAC pseudonym in the database and audit stream.

## Data model

Migration 0001_foundation.sql creates:
- the four inbox definitions;
- pseudonymized principals;
- ticket current-state records, with no subject, message body, customer email or attachment fields;
- separate assignment history and workflow events;
- roster shift and inbox eligibility history;
- versioned dispatch configuration records;
- idempotency keys and a reference-only outbox for future integrations;
- append-only application audit events.

Current ticket state and historical assignment events are intentionally separate. The unique partial index permits only one initial assignment per ticket. Brand values are constrained to approved codes, including other and unclassified. Free-text mailbox content and attachments are intentionally excluded from this foundation.

The audit triggers reject ordinary UPDATE and DELETE statements. This is an application-level append-only guard, **not** a cryptographic tamper-proof or externally immutable audit service. Database administrators can change schema objects, so production integrity, retention, backups and external log replication still require approval and implementation.

## Local development

Requirements: Node.js 22+, Python 3.10+ and Wrangler.

1. Copy wrangler.example.toml to wrangler.toml.
2. Create a local-only secret file:
   - cp .dev.vars.example .dev.vars
   - openssl rand -hex 32
   Put the generated value in AUDIT_ACTOR_HASH_KEY in .dev.vars.
3. The example Wrangler file includes a placeholder D1 UUID for local-only use. Do not use it for a remote deployment. If Wrangler requires a local database identity, create a development D1 database with npx wrangler d1 create vwg-dispatcher-foundation and put the returned ID into your local wrangler.toml.
4. Apply the migration locally with npm run migrate:local.
5. Run npm run check and npm test.
6. Start the local Worker with npm run dev.

The access.dev section simulates a local Cloudflare Access identity for development only. It is not production authentication. Do not expose a local development server to the internet.

## Staging Worker deployment

A dedicated staging-only Wrangler configuration is provided in `wrangler.staging.toml`. It targets the existing D1 database `vwg-dispatcher-staging` and Worker name `vwg-dispatcher-api-staging`. The D1 database ID in that file is an identifier, not an API credential. This configuration does not target production.

To connect the staging Worker through Cloudflare Workers Builds:

1. In Cloudflare, create or select the Worker named exactly `vwg-dispatcher-api-staging`.
2. Open **Settings → Builds → Connect** and connect `brandsupport/vwg-dispatcher-v2`, branch `main`.
3. Set **Root directory** to `backend`. Leave the build command empty. The staging build was configured to use `npx wrangler versions upload --config wrangler.staging.toml`; do not change it to `wrangler deploy` without first reviewing the active rollout and completing the security gate.
4. The current API implementation still requires Cloudflare Access for protected routes. No Access policy or role groups have been configured because the authentication design is being reconsidered. Do not connect real data or use protected routes until an approved replacement/authentication design is implemented and tested.

Required runtime configuration in **Settings → Variables & Secrets**:

- Add the four plain-text variables `ACCESS_GROUP_PLATFORM_ADMIN`, `ACCESS_GROUP_OPERATIONS_MANAGER`, `ACCESS_GROUP_TEAM_AGENT`, and `ACCESS_GROUP_AUDITOR`. Each value must be the exact group identifier returned in the Access identity for the approved identity-provider group. Do not use email domains as role identifiers.
- Configure the identity provider to expose its group membership to the Worker identity. Cloudflare documents that IdP groups are not automatically included in the application token; configure the relevant custom SAML attribute or OIDC claim, then verify the full identity returned by `ctx.access.getIdentity()` contains the matching groups.
- Add `AUDIT_ACTOR_HASH_KEY` as a **secret**, not a plain-text variable. Generate a unique high-entropy value of at least 32 characters in an approved password manager or secrets manager. Never commit it to Git or send it in chat.
- Leave `APP_ALLOWED_ORIGINS` unset until an approved authenticated frontend origin exists. Do not allow the public GitHub Pages synthetic demo as a production data origin.

In **Workers & Pages → vwg-dispatcher-api-staging → Access**, protect **all traffic**, including the `workers.dev` hostname, with an allow policy limited to the approved organization and identity provider. Verify that unauthorized requests are blocked before enabling any application use. The Worker also denies API requests when Access context or a unique role mapping is missing.

Workers Builds deploys on commits to the connected production branch. Do not connect this staging Worker to a production database, and do not create a production Worker or production database until the separate production approval gate below is signed off.


### Staging build activation policy

The Git-connected staging build was configured with `npx wrangler versions upload --config wrangler.staging.toml`. However, the Cloudflare dashboard was subsequently inspected and showed version `9f4fb56e` in the active deployment view with 100% traffic allocation and 0 requests/sec at that time. Treat the staging Worker as potentially serving traffic until its current rollout is checked in Cloudflare. Do not infer exposure or non-exposure from the command name alone, and do not promote, roll back or change traffic as part of this reporting-studio work. Protected routes remain fail-closed because the Access identity and role mappings are not configured.

## Production gate — do not skip

Before creating a production D1 database or deploying the Worker:

1. Obtain company security/IT approval for Cloudflare Workers, D1, Access and the data-processing location/retention model.
2. Create separate development and production D1 databases. Do not point local development at production.
3. Configure a Cloudflare Access application that protects the Worker. Restrict the sign-in policy to the approved organization and approved identity provider; verify group membership and session revocation.
4. Configure the four role group identifiers from the approved identity-provider groups. Ensure the groups are present in the full Access identity returned to the Worker. The role map is intentionally deny-by-default.
5. Add AUDIT_ACTOR_HASH_KEY as a Worker secret using npx wrangler secret put AUDIT_ACTOR_HASH_KEY. Generate a unique high-entropy value; never place it in source control, GitHub variables or browser code.
6. Set APP_ALLOWED_ORIGINS to the exact production application origin. Do not use *. The public GitHub Pages demo is not an approved production origin.
7. Review the migration and backup/restore process, apply it to the development database first, and run a restore test.
8. Only after all checks pass, apply approved migrations to production and deploy the Worker. Verify unauthenticated requests return 401/403 and that each role can access only its approved endpoints.

A production command sequence, after replacing the placeholder database ID and configuring Access/secrets:

- npx wrangler d1 migrations apply vwg-dispatcher-foundation --remote --config wrangler.toml
- npx wrangler deploy --config wrangler.toml

Do not run those commands against a real account until the production gate above is signed off. The staging D1 schema and Worker deployment were configured separately in the Cloudflare account before this reporting-studio branch. This repository change performs no Cloudflare account changes or remote migrations.

## Operational invariants for the next stage

- Store canonical event instants in UTC; render mailbox timestamps in Europe/London and shift schedules in Africa/Cairo.
- Initial assignment share counts a unique ticket once. Handover, recovery and reassignment remain distinct events.
- Current open workload is a state snapshot, not a historical allocation count.
- Every future assignment write must use an idempotency key and atomic version/ownership checks.
- Unknown write outcome must remain unknown until reconciled; never silently retry a possibly committed write.
- External Outlook/Excel side effects must use a durable outbox and verified acknowledgements.
- Never store credentials, mailbox message bodies, customer addresses or attachment contents in the public frontend or this foundation database model.
