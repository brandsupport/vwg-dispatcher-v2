# Dispatcher 2.0 — Implementation Status

**Reviewed:** 26 November 2026  
**Scope:** Public dashboard, Offline Reporting Studio and Cloudflare Worker/D1 foundation.

This document distinguishes working prototype/reporting capabilities from production operations. A visible screen or clickable prototype control does not, by itself, mean the underlying live service has been implemented.

## Implemented and verified in the current prototype

| Area | Current implementation | Boundary |
|---|---|---|
| Dashboard shell | Fifteen navigable workspaces, global search, period and inbox controls, responsive cards/tables and CSV exports | Public, unauthenticated static application |
| Offline Reporting Studio | Reads the tracker workbook or separate CSVs in the browser; maps Assignments, Activity Log, Team & Shifts and optional Email Details; pseudonymises agent references; produces aggregate JSON and local CSVs | No source workbook rows are uploaded or persisted |
| Brand classification | Uses a mapped Brand value, Email Details join by Email Key / ID, and the recognised Hub de-tag subject pattern as a fallback. Specific matching supports Audi, Volkswagen, SEAT, Škoda, CUPRA and Volkswagen Commercial Vehicles | Unmatched or ambiguous rows remain unclassified; there is no general manual review/override workflow yet |
| Team Performance | Initial assignments, allocation share by inbox, current-owner portfolio, owner workload and brand share by colleague | Resolution-rate/solve-time metrics require explicit source status and timestamps; not all workbook versions provide them |
| Resolution reporting | Resolved/closed state can be reconciled from supported ticket status or Activity Log lifecycle events; explicit resolver attribution and elapsed solve time are calculated when their evidence exists | Owner association in an Activity Log row is not proof of the authenticated person who resolved the ticket |
| Email Performance | Aggregate Email Details metrics for Open, Missing - Confirmation Pending and Completed, brand/inbox mix, missing metadata and recorded handling duration | Handling duration is receipt-to-first-missing detection for confirmed exits; it is not first response or business resolution |
| Workflow analytics | Event counts, distinct ticket references affected, category breakdowns and reconciled scope ratios | Imported snapshot is aggregate; events are not an authenticated employee-activity score |
| Imported Activity Log | Read-only view of accepted source events with search, event-type/colleague/date filters and local CSV export | No trusted actor identity, persistent audit store or tamper-evident guarantee |
| Roster & Coverage | Pseudonymised roster directory, Early/Late shifts, Egypt-local scheduled hours and scheduled headcount overlaps | Scheduled headcount only; not live availability or capacity |
| Reports & Exports | Separate local CSV builders for daily, weekly, management, individual, brand and reliability report formats | Downloads are generated from the snapshot in the current browser tab |
| Private colleague names | Direct Studio handoff transfers names to the dashboard; the dashboard remembers only `agent_ref` / `display_name` pairs in a separate browser-local directory and restores them on later imports on that device | Not included in public source or shared JSON; not an identity/authentication control; clear with **Clear saved names** |
| Backend foundation | Staging D1 foundation schema and separate Cloudflare Worker with Access-oriented role checks and read-only endpoints for liveness, identity/permissions, inbox catalogue, readiness and audit reads | Staging foundation, not an operational backend; protected routes fail closed while Access role configuration is incomplete |

## Not implemented or not production-ready

### 1. Live operational data and actions

- No production connection from the public dashboard to Outlook shared mailboxes, the Excel tracker, Citrix or Microsoft 365.
- No live ticket queue, ticket detail retrieval, message preview, attachment access or ticket-level search from the imported snapshot. The aggregate snapshot deliberately removes ticket references and message/source rows; Live Operations' individual ticket workbench therefore remains synthetic.
- No API endpoints for ticket creation/update, assignment, handover, manual reassignment, recovery/restoration, category changes or assignment confirmation.
- No live queue streaming, scheduled snapshot refresh, incremental sync or verified reconciliation with the operational workbook/mailboxes.
- The existing Outlook VBA dispatcher is a separate operational component; the public web dashboard does not control it.

### 2. Authentication, authorisation and deployment security

- The GitHub Pages frontend is public and unauthenticated. A manually imported snapshot is not protected by a sign-in boundary.
- Cloudflare Access identity-provider policy and role-group mappings have not been configured for the staging Worker; the protected API intentionally fails closed without them.
- No production identity provider, MFA policy, server-issued application session, user lifecycle, session revocation or enforced role-specific frontend/API workflow is connected.
- The browser-local colleague directory is only a convenience for displaying names on one device. It is not a trusted identity directory, permission system or shared team-wide directory.

### 3. Database and backend services

- The D1 schema is a foundation only. The dashboard is not connected to it.
- No approved production database, production secrets, production backups/restore procedure or operational retention policy is configured.
- No transactional operational write service, durable integration outbox processing, idempotent assignment API, ownership/version conflict handling or external side-effect acknowledgement flow is implemented.
- The current Worker API is read-only; the schema's presence of future-facing tables does not mean their workflows or API endpoints exist.

### 4. Audit and reliability

- The imported Activity Log is a read-only representation of the workbook's recorded events. It cannot prove who authenticated and performed an action.
- No production append-only audit ingestion, trusted actor claims, signed/externally replicated audit chain, retention enforcement or privileged-change approval history is connected.
- Reliability Centre data remains a demonstration. Live dispatcher heartbeat, mailbox/Excel connection telemetry, queue age/depth, retry/backoff health, write reconciliation, Worker/database health and incident alerting are not wired to live sources.

### 5. Workforce, fairness and dispatch control

- Roster views do not have live attendance, break, leave, absence or availability signals.
- Inbox eligibility, skills/capability constraints, minimum staffing targets, hours-adjusted fairness and actual capacity forecasts are not derived from the current imported roster.
- Dispatch Configuration is a local scenario/preview workspace. It cannot validate against live conditions, obtain authenticated approval, apply a new policy or roll back a live configuration.
- No live global or per-inbox emergency stop, pause/resume command, manager approval workflow or verified dispatch-control API exists in the web application.

### 6. Performance measures still awaiting evidence

- First-response time and first-human-response attribution.
- Active handling time separated from elapsed time, including pause/resume intervals.
- Assignment delay, ageing bands, target/SLA performance and breach alerts.
- Reopen rate based on complete, trusted lifecycle history.
- A fully agreed and auditable fairness denominator that accounts for hours scheduled, absence, inbox eligibility and work complexity.
- Ticket-level solve-time/resolver metrics remain conditional on explicit resolution fields and reliable ownership history. Email receipt-to-exit handling time must not be presented as a substitute.

### 7. Data quality and workflow management

- There is no in-dashboard unclassified-brand review queue with saved per-ticket corrections that can be reused on later imports.
- The Hub form subject rule improves classification for the known de-tag subject format; other email templates or non-form messages need their own validated mapping rules.
- Imports are manual and point-in-time. There is no scheduled refresh, source-change detection or multi-user shared reporting workspace.
- Private name mappings do not sync across different browsers/devices and must be re-imported on each new device.

## Recommended implementation order

1. Complete the security design and obtain company approval for a private authenticated frontend and data-processing boundary.
2. Configure and test Cloudflare Access identity/groups, secrets, private origin policy and production-grade D1 separation before connecting operational data.
3. Implement read-only live source adapters and reconciliation first; prove the four inboxes, workbook state and event history match before enabling writes.
4. Add transactional assignment/recovery/configuration APIs with idempotency, an outbox, verified Outlook/Excel acknowledgements and an append-only trusted audit trail.
5. Add live queue, current availability/absence and dispatcher telemetry, then implement SLA/response/active-handling/fairness measures only when their source events are reliable.
6. Add brand review/correction workflow and governed multi-device colleague directory access under authenticated permissions.

**Production readiness:** not ready. The current public site is a reporting/prototype frontend; the backend is a staging foundation. Do not connect real customer-level operational data or enable live dispatch actions until security, identity, integrations, transactional writes and audit requirements have been approved and validated.
