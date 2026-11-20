# Security and deployment gate

## Current status

The GitHub Pages site is a public demonstration containing synthetic data only. A separate draft-branch staging Worker foundation is being prepared. It is not deployed and is not connected to Outlook, Excel or production tickets.

## Staging authentication design

- Microsoft Entra ID single-tenant OpenID Connect sign-in.
- OAuth authorisation-code flow with PKCE, state and nonce verification.
- Microsoft ID-token signature, issuer, audience and tenant validation.
- Explicit D1 `app_users` allowlist and server-owned role/agent mapping.
- First sign-in binds the pre-provisioned account to its Entra object ID.
- Opaque random session tokens; only SHA-256 hashes are stored in D1.
- Secure, HttpOnly, SameSite=Lax host-only session cookie; eight-hour expiry.
- D1 session revocation on sign-out and immediate access rejection for inactive users.
- Dashboard and API served from the same Worker origin to avoid cross-site session cookies.
- No Cloudflare Zero Trust / Access dependency.

Microsoft Entra app registration may be restricted by company policy. If the user cannot register an application, an authorised organisation administrator must create/approve the single-tenant OIDC app. Do not bypass company approval.

## Public demo restrictions

A private GitHub repository does not make a website deployed from it private. Do not add real ticket, colleague, workload or performance information, credentials, or production endpoints to the public Pages demo.

The Worker uses a `workers.dev` hostname for staging only. Do not treat it as a business-critical production host or load live operational data into it.

## Required before any live pilot

1. Complete company IT/security approval of the Entra app and staging design.
2. Review tenant restrictions, allowed user population, and joiner/mover/leaver process.
3. Verify ID-token validation, session expiry, revocation and account deactivation.
4. Test manager, administrator and agent authorisation, including cross-agent data isolation.
5. Add CSRF/origin protection to every future state-changing route.
6. Add abuse controls and monitoring for authentication and sensitive endpoints.
7. Complete D1 backup/restore, retention, privacy and incident-response procedures.
8. Review audit access to individual-performance information.
9. Build user provisioning and operational approval workflows.
10. Keep staging, demo and production data stores and secrets separate.

## Operational safety

No ticket assignment, reassignment, roster, eligibility, dispatch configuration or other operational write API is enabled in this foundation. The application must not indicate that an action succeeded until a backend confirms it.

Never commit Microsoft client secrets, tokens, mailbox credentials, real user lists or live ticket contents.
