# Security and deployment gate

## Current status

This repository currently contains a demonstration-only dashboard. It has no authentication, no server-side API and no live data connection.

## Important

A private GitHub repository controls source-code visibility only. It does not automatically protect a website deployed from that repository.

Do not publish a production dashboard or add real ticket, colleague, workload or performance information until an access-control layer is configured.

## Required before production

1. Choose application login with server-enforced role permissions, Cloudflare Access, or a layered approach.
2. Protect all data APIs independently of the browser interface.
3. Enforce manager and administrator permissions on the server.
4. Restrict agent requests to the signed-in agent's own records.
5. Keep secrets in Cloudflare environment secrets, never in source files.
6. Use a dedicated Dispatcher 2.0 database and account/session tables.
7. Log access to sensitive individual-performance information and all operational actions.
8. Add CSRF/origin checks, rate limits, secure session cookies and account recovery controls.
9. Test unauthorised API access, cross-agent data access and session revocation.
10. Keep demo and production environments separate.

## Demo data

All current dashboard data is synthetic. Agent labels are placeholders. They must not be interpreted as real team performance.
