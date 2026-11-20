# Dispatcher 2.0 — Secure Staging Foundation Runbook

## Scope and current boundary

This branch provides a staging foundation only.

- The existing GitHub Pages address remains a public, synthetic-data-only demonstration.
- The authenticated staging application and API are served together from one Cloudflare Worker `workers.dev` origin.
- Sign-in uses Microsoft Entra ID (OpenID Connect). Cloudflare Zero Trust / Access is not used.
- Authorisation is based on the active account and role stored in the Dispatcher D1 database.
- No Outlook, Excel, Salesforce or mailbox integration is configured.
- No production records or real colleague identities are included.
- No ticket assignment, reassignment, roster, eligibility or dispatch write endpoint exists.
- Agents can only access their own ticket endpoint; team-wide endpoints are manager/admin only.

Cloudflare describes `workers.dev` as intended for quick starts and personal or hobby projects, not business-critical production workloads. Keep this environment limited to staging and synthetic data. Do not load production ticket, colleague, workload or performance data here.

## Architecture

- Frontend and API: one Cloudflare Worker, served from its `workers.dev` hostname.
- Static dashboard assets: bundled with the Worker and passed through the Worker before being served.
- Identity provider: the organisation's Microsoft Entra tenant.
- Authentication: OAuth 2.0 authorisation-code flow with PKCE, OIDC nonce/state checks and Microsoft signing-key validation.
- Session: random opaque session token; only its SHA-256 hash is stored in D1.
- Browser cookie: Secure, HttpOnly, SameSite=Lax, host-only cookie with an eight-hour lifetime.
- Authorisation: active identity, role and agent mapping loaded from D1 on each protected request.
- Database: dedicated Cloudflare D1 database, with migrations in `migrations/`.
- Audit: authentication and protected access events are recorded in the append-only audit log.

The Worker does not trust a browser-supplied role, agent ID or email as an authorisation decision. It validates the Microsoft ID token, checks the configured tenant, binds the stable Entra object ID to a pre-provisioned email allowlist entry, and then reads the role from D1.

## 1. Cloudflare staging resources

The current Wrangler configuration points to the staging D1 database:

- Database: `vwg-dispatcher-staging`
- Database ID: configured in `wrangler.toml`
- Worker: `vwg-dispatcher-api`
- Worker hostname: generated under the account's `workers.dev` subdomain

No custom domain or Cloudflare Access application is required for this staging setup.

From a trusted terminal:

```sh
npm install
npx wrangler login
npm run db:remote
```

Confirm the migration completes against `vwg-dispatcher-staging`. Do not substitute another database name or ID.

## 2. Register the Microsoft Entra application

This step uses the organisation's existing work/school identity tenant. It does not grant Dispatcher access by itself; D1 provisioning remains mandatory.

1. Open the Microsoft Entra admin centre and select the organisation's tenant.
2. Go to **Applications → App registrations → New registration**.
3. Use a clear name such as `VWG Dispatcher 2.0 Staging`.
4. Choose **Accounts in this organisational directory only (Single tenant)**.
5. Register the application. Record the **Application (client) ID** and **Directory (tenant) ID**.
6. Under **Authentication**, add a **Web** platform redirect URI:
   `https://<worker-name>.<account-subdomain>.workers.dev/api/auth/callback`
7. Under **Certificates & secrets**, create a client secret and copy its value immediately.

The exact redirect URI must match the Worker hostname and callback path character-for-character. Deploy the Worker once first if you need Cloudflare to show you the generated hostname.

The application requests only the OIDC scopes `openid profile email`; it does not request Outlook, mailbox, Graph or SharePoint permissions. Do not add broader API permissions.

You need permission to register an application in the organisation's Entra tenant (Microsoft documents the Application Developer role as a minimum). The organisation may restrict user app registrations or require an administrator to create/approve the app. If the option is blocked, stop and ask the authorised IT/Entra administrator to create the single-tenant registration and provide the client ID, tenant ID and client-secret value through an approved secure channel. Do not attempt to bypass company policy.

## 3. Configure Worker secrets

Use Wrangler from a trusted terminal. Each command prompts for the value; do not put values in source code, GitHub, chat or screenshots.

```sh
npx wrangler secret put MS_TENANT_ID
npx wrangler secret put MS_CLIENT_ID
npx wrangler secret put MS_CLIENT_SECRET
```

The tenant ID and client ID are identifiers; the client secret is a credential. Treat all three as deployment configuration and keep them out of Git.

## 4. Provision the first administrator

There is no public self-registration and no default administrator.

After the D1 migration, provision an approved administrator account in D1 using the Cloudflare dashboard's D1 SQL console or Wrangler from a trusted terminal. Replace the email with the exact sign-in address/UPN in the organisation's Entra tenant:

```sql
INSERT INTO app_users (id, email, role, active)
VALUES ('dispatcher-initial-admin', '<approved-work-email>', 'system_administrator', 1);
```

Only an authorised person should perform this action. The first successful sign-in links the account to its signed Entra object ID. Subsequent authentication uses that stable object ID rather than relying on a mutable email claim.

For agents, create an `agents` row first, then an `app_users` row with `role = 'agent'` and the matching `agent_id`. Provision only approved users. Never seed real colleagues or email addresses in repository migrations.

## 5. Prepare and deploy the staging Worker

The root dashboard files remain the source of truth. The asset preparation script copies them plus `login.html` into the ignored `public/` build directory.

```sh
npm run deploy
```

Wrangler deploys the Worker and bundled static assets to the account's `workers.dev` hostname. The dashboard root is protected by the server-side session check; the login page and health endpoint are public.

Verify:

- `GET /api/health` returns `ok: true` and identifies the Microsoft OIDC authentication mode.
- Opening the application root without a session redirects to `/login.html`.
- The Microsoft sign-in button redirects to the configured organisation tenant.
- A pre-provisioned account can sign in and reach the dashboard.
- An account absent from `app_users` is rejected.
- The profile control signs out and revokes the session.

## 6. Security tests

Before considering even a controlled pilot, verify:

1. Unauthenticated requests to `/api/me`, team analytics and agent ticket routes return 401.
2. Invalid, expired, wrong-tenant, wrong-audience or nonce-mismatched ID tokens are rejected.
3. A Microsoft account not present in the D1 allowlist is rejected.
4. An inactive D1 account is rejected, including when it has an existing session.
5. Deactivated/revoked sessions cannot access protected routes.
6. An Agent calling team overview or agent-directory routes receives 403.
7. An Agent ticket query is scoped using the server-side `agent_id`.
8. Browser-supplied role or agent ID values have no effect on authorisation.
9. Logout revokes the D1 session and clears the browser cookie.
10. No ticket/dispatch write endpoint is enabled.

## 7. Data and metric integrity

- Store event timestamps as ISO-8601 UTC strings.
- Convert to UK mailbox time or Africa/Cairo shift time only for display and schedule calculations.
- `ticket_events` and `audit_log` are append-only; corrections are represented by new events.
- Deduplicate source retries with `source_event_key` and/or `idempotency_key`.
- First-assignment share derives from each distinct ticket's initial assignment event, not later assignment events.
- Handover, recovery and reassignment remain separate event types.
- Active handling time is calculated only from explicit start/pause/resume/end sessions.
- Outstanding workload is a current-state snapshot, not a historical allocation-share metric.
- Brand counts use validated `brand_id`; uncertain tickets remain Other / unclassified.

## Not yet implemented

- User/agent provisioning interface and approval workflow.
- Outlook/Excel read-only ingestion and reconciliation.
- Source-event queue processor and retry policy.
- Ticket ingestion/write API.
- Configuration approval workflow and operational write controls.
- Production hosting and approved company domain.
- Production monitoring, alerting, backup/restore, retention policy and formal security/privacy review.

These are deliberate follow-on items. This staging foundation must not be represented as connected to live operations.
