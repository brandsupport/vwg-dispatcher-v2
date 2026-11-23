# Security and deployment gate

## Current status

This repository contains a public synthetic-data dashboard and backend foundation source under backend/. The backend Worker API has not been deployed. There is no production D1 database, Cloudflare Access application, server-side role configuration, secret material or live data connection.

## Important

A private GitHub repository controls source-code visibility only. It does not automatically protect a website deployed from that repository.

The static demonstration UI may be published publicly only while it contains synthetic records and anonymised placeholder members. Backend source code is also public; this is acceptable only while it contains no secrets or real records. Do not add real ticket, colleague, workload or performance information, credentials, or production endpoints to this repository.

## Required before production

1. Obtain company security/IT approval for the hosting, identity, database and data-processing model.
2. Configure Cloudflare Access to protect the backend Worker and verify that unauthenticated requests are denied.
3. Configure exact IdP group identifiers for the four roles. The API denies missing, overlapping or unconfigured role groups.
4. Enforce manager and administrator permissions on the server.
5. Restrict agent requests to the signed-in agent's own records.
6. Keep secrets in Cloudflare Worker secrets, never in source files or GitHub variables. Use separate high-entropy actor-hash keys per environment.
7. Create separate development and production D1 databases, apply reviewed migrations and test backup/restore before importing records.
8. Preserve append-only audit records for sensitive reads and all future operational actions; add external integrity/retention controls because SQLite triggers alone are not tamper-proof.
9. Keep the exact CORS origin allow-list, request validation, rate limits and session/CSRF protections under review before any write endpoints are added.
10. Test unauthorised API access, group/role mapping, cross-agent data access, origin checks and Access session revocation.
11. Keep demo, development and production environments separate. Do not connect the public GitHub Pages demo to production records.

## Demo data

All current dashboard data is synthetic. Agent labels are placeholders. They must not be interpreted as real team performance.


## Backend foundation status

The Worker API currently has only read-only endpoints: liveness, authenticated profile/permissions, inbox catalogue, schema readiness and audit read. There are no ticket write, assignment, recovery, configuration-apply, Outlook or Excel routes.

The D1 audit triggers block ordinary UPDATE and DELETE statements, but this is not a cryptographic tamper-proof or immutable audit service. No production migration has been applied. Do not deploy until the backend README production gate has been completed and approved.
