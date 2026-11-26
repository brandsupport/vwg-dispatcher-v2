# VWG Dispatch Intelligence — Dispatcher 2.0

A standalone operations intelligence and management platform for the VWG Brand Support ticket operation.

> **Current status: synthetic-data dashboard with a browser-local Reporting Studio and staging backend foundation.** The public dashboard has no live Outlook or Excel connection. Studio processes Assignments, Activity Log, Team & Shifts and optional Email Details locally in the browser, then exports a pseudonymised aggregate JSON snapshot. After sanitisation it saves colleague `{agent_ref, display_name}` pairs plus a separate private Order Number / VIN lookup index in the same-origin browser-local directory. The lookup index contains only Order Number, VIN, brand, Inbox, lifecycle status, received/completion dates and a pseudonymous ticket reference; it links a local email match to sanitised Activity Log events without putting raw identifiers into the shared JSON. Full workbook rows, subjects, message bodies, raw email keys and human-readable names are never included in the shared JSON or public JavaScript. Order Numbers and VINs remain in the same browser/device local storage until cleared with the dashboard's **Clear local names & lookup** control. The directory is not an authentication boundary. The individual ticket queue remains demonstration-only. The frontend is public, unauthenticated and not an access-control boundary; only company-approved sanitised aggregate snapshots should be imported. A staging D1 database and Worker have been created separately, but the dashboard is not connected to them; no production database, approved identity integration, real operational data feed or operational write route is configured.

## Cherry Glass design system and workspace navigation

The dashboard and standalone Reporting Studio share the Dispatcher **Cherry Glass** visual system: a black-cherry canvas, translucent cherry-tinted panels, vivid cherry-red and rose accents, and restrained plum highlights. The Studio keeps the same Knowledge Base home-page VW mark artwork and animated glass-tile construction, recoloured with the Cherry Glass accents. Typography, cards, controls, spacing and table surfaces use a consistent component scale with overflow-safe layouts. The imported Activity Log keeps the dark Cherry Glass palette with a simplified search-first toolbar, responsive filters, sticky event headings and horizontal scrolling. It can search the private browser-local Email Details index by Order Number or VIN and show linked sanitised Activity Log events; it does not expose full email subjects or message bodies. Both pages end with matching signature footers featuring a neon-gradient Momo credit.

The dashboard provides a persistent **Reporting Studio** entry in its workspace navigation. The Studio header provides a matching, always-visible **Dashboard** return button. Both pages remain independently loadable; the Studio retains its local-only processing boundary.

## Implementation status

See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for the verified list of implemented prototype capabilities, production boundaries and outstanding features as of 26 November 2026.

## Product direction

Dispatcher 2.0 is being developed independently from the VWG Brand Support Knowledge Base. It will have its own repository, application deployment, authentication/authorisation model, data store and operational audit history.

The platform is designed to help authorised managers understand and manage the four shared-mailbox workstreams:

- Agency Detags
- Detags
- Transfers
- Unadopts

Its central goals are to make ticket volume, brand mix, workload allocation, resolution performance, team fairness and dispatcher reliability understandable and auditable.

## Current prototype

The v2.0 reporting release exposes ten navigable workspaces:

- Overview and Current Operations snapshot.
- Ticket Analytics and aggregate ticket-flow reporting.
- Email Performance for Email Details lifecycle state and confirmed-exit handling time.
- Brand Insights for Volkswagen, Audi, Škoda, SEAT, CUPRA, Volkswagen Commercial Vehicles and Other / unclassified.
- Workflow Analytics for handovers, flags, manual allocation, recoveries, reassignments and exceptions.
- Team Performance 2.0, including the merged per-inbox allocation matrix, anonymised member profiles, workload, brand mix and available resolution/handling measures.
- Roster & Coverage 2.0 with the filterable anonymised directory and Egypt-local scheduled coverage.
- Audit History with Activity Log search and same-device private Order Number / VIN lookup.
- Reports & Exports for local management and operational CSV outputs.

The source code deliberately retains the hidden My Performance, Folder Share, Dispatch Configuration, Reliability Centre and Administration views, including their renderers, data models, styles and export logic. They are not exposed in this reporting release and can be reactivated or completed in a later authenticated/operational milestone. Folder Share analysis is already available within Team Performance.

Global reporting-period, inbox and search controls are available across the dashboard. Sample ticket details open in a modal and CSV exports work with synthetic data. The Dispatch Configuration scenario preview recalculates a local illustrative priority order only; it does not persist settings, create assignments or contact an operational service.

The shared JSON and public code continue to use anonymised agent references only. Studio automatically saves the matching colleague display names in the same-origin browser-local directory; the dashboard reads that directory on the same browser/device. This is a display convenience, not authentication, proof of identity or an access-control boundary. Do not publish colleague names in source code or shared snapshots.

## Overview and Current Operations

These are deliberately different workspaces:

- **Overview** is the management/performance view. It summarises selected-period ticket demand, first allocations, completions, inbox pressure, brand mix and allocation distribution. It avoids the individual ticket queue.
- **Current Operations** is the ticket workbench. It is where an operator searches and filters individual sample tickets, checks unassigned or at-risk work, reviews the attention list, and inspects illustrative coverage and recent sample events.

Without an imported snapshot, the public dashboard uses synthetic sample data. When a sanitised snapshot is explicitly imported, the aggregate analytics views use only imported counts and pseudonymised agent references for the current tab session. If Team & Shifts is included, Team Performance and Roster & Coverage also use keyed pseudonymous shift groups, Egypt-local scheduled hours and active-fortnight status. If Email Details is included, Email Performance reports Open, Missing - Confirmation Pending and Completed counts, recorded handling-time summaries, brand completeness and source-Inbox breakdowns. This does not create a live feed or validate source quality beyond the checks displayed. The Current Operations page remains synthetic, is not connected to Outlook or Excel, and cannot assign, move, recover or update real tickets. SLA, first-response time, business resolution time and live availability are not supplied by the aggregate import.

## Offline Reporting Studio

The standalone `reporting-studio.html` companion is available through the persistent dashboard workspace link and the dashboard's Reports & Exports area. It reads a selected Excel workbook or CSV exports in the browser tab, applies explicit column mappings, HMAC-pseudonymises agent identifiers, and produces aggregate JSON/CSV reports. Workbook and CSV contents are not sent to a server, Worker or API and are not written to browser storage. The pinned SheetJS parser code is loaded from its static CDN unless it is separately hosted locally; the same static application files can be opened locally, but first-load parser access still needs to be available.

The inputs are a ticket/current-state snapshot (required), assignment history (optional), workflow/activity history (optional), Team & Shifts roster (optional) and Email Details lifecycle data (optional). For the current tracker workbook, upload the complete workbook once: use Assignments as ticket state, Activity Log twice, Team & Shifts as the roster and Email Details for lifecycle metrics. Dashboard and Settings remain in the workbook and are ignored. Older workbooks without Email Details remain supported, but Email Performance metrics will not be available. In Activity Log, map column B `Event Type` as the event name; column G `Assignment Flag` is only TRUE/FALSE. Automatic and manual first allocations come from `AUTO_ASSIGNMENT` and `MANUAL_ASSIGNMENT_CAPTURED`. Email Details maps Brand, received time, first source Inbox, original/current owner, completion status, first-missing/completion timestamps and recorded handling minutes. Email Key / ID is used only for local duplicate removal; order number and VIN are used only to count rows where both are blank. Those raw values and Internet Message IDs are never exported. Reuse the same private workspace key. Studio exports the sanitised JSON and automatically stores only the `{agent_ref, display_name}` mapping in the browser-local directory. Importing the downloaded JSON in the same browser/device resolves colleague names without an extra file or manual import; the direct dashboard handoff also works. **Clear saved names** removes the directory. Snapshot, workbook rows and customer data are not stored in browser storage. Email Details supplies email brand mix and inbox-exit handling metrics, not business ticket resolution. Ticket-level brand or resolution performance still requires explicit fields in the ticket/current-state source. See [docs/REAL_EXPORT_MAPPING_WORKSHEET.md](docs/REAL_EXPORT_MAPPING_WORKSHEET.md) and [docs/OFFLINE_REPORTING_WORKFLOW.md](docs/OFFLINE_REPORTING_WORKFLOW.md).

The studio does not upload data to D1, call the Worker or feed the dashboard automatically. It creates a local aggregate snapshot for controlled review. To use the aggregates in Dispatcher 2.0, download the JSON snapshot, return to the dashboard, choose **Import snapshot**, and select the downloaded JSON. The dashboard validates the schema, totals, inbox rollups, brand totals, pseudonymous agent references, allocation shares, optional roster records and event allow-list before rebuilding a safe in-memory snapshot. The imported snapshot stays in memory only for the current browser tab; the separate private colleague-name directory is the only browser-persisted item. The imported data powers Overview, aggregate Ticket Analytics, Brand Insights, Workflow Analytics, Folder Share, Team Performance, the snapshot-based Current Operations workstream summary, and (when supplied) Roster & Coverage. Audit History displays the sanitised Activity Log entries. Imported roster coverage counts active scheduled headcount by Egypt-local shift interval; inactive profiles remain listed but are excluded from coverage. Inbox eligibility, breaks, absence events and staffing targets are not inferred. The ticket workbench remains synthetic-data-only: imported snapshots do not contain ticket references, subjects or individual source rows. Individual ticket-level queue details remain demonstration data because the aggregate export deliberately removes source ticket identifiers and message content. A snapshot is point-in-time, so the reporting-period selector is disabled while it is loaded. Use **Use demo** or refresh the page to clear the imported snapshot; the separate private name directory remains on this device until **Clear saved names** is used. Nothing is uploaded or connected to an operational API. Real operational exports still require approval from the relevant company data owner/security process.

## Backend & Database Foundation 1.0

The repository includes a separate Cloudflare Worker API and D1 migration foundation under backend/. The staging D1 schema has been created and its tables, indexes, triggers, schema version and four inbox seed records were verified in Cloudflare. The staging Worker was built and appears in the Cloudflare deployment view. It remains separate from the public GitHub Pages frontend.

The initial API is read-only and exposes a liveness endpoint, authenticated identity/permission summary, the four inbox definitions, database schema readiness and an authorised audit read. Cloudflare Access is required for protected API routes. The Worker resolves one approved IdP group to one role, denies missing or overlapping role mappings, and ignores identity headers supplied by clients.

The first D1 migration creates pseudonymized principals, ticket current state, separate assignment and workflow history, roster shifts, inbox eligibility, versioned dispatch proposals, idempotency records, a reference-only outbox and append-only audit rows. It does not store mailbox subjects, message bodies, customer addresses, attachments or credentials. Current ticket state is kept separately from historical assignment events; initial assignment is unique per ticket.

The backend has automated tests for unauthenticated access, role separation, exact CORS origins, pseudonymized audit writes, the four inboxes, schema constraints, one-initial-assignment enforcement and audit update/delete guards.

**Staging is not production-ready.** Cloudflare Access and its role groups were not configured, and the protected API deliberately fails closed without that trusted identity context. The dashboard is not connected to the staging Worker or D1. There is no production database, no live Citrix/Outlook/Excel feed, no real operational data and no production secret configuration. The Cloudflare dashboard inspection reported the staging version in its active deployment view with 100% traffic allocation and 0 requests/sec at the time of inspection; verify its current rollout before making deployment changes. Production use remains gated on company security approval and an approved authentication design.

D1 is single-threaded per database. Query duration, write contention, storage growth and recovery requirements must be measured before implementing live assignment writes. The audit triggers are an application-level append-only guard, not a cryptographic or externally immutable ledger.

## Metric definitions to preserve

### Brand reporting

Brand counts should represent distinct tickets, not the number of assignment or handover events. Brand classification should prefer an explicit, validated brand field or approved reference mapping. Ambiguous tickets remain **Other / unclassified** until confirmed. Never infer a brand solely from weak or ambiguous subject text.

The brand view should be filterable by reporting period and inbox, with counts and percentage share of received distinct tickets.

### Member share by folder

The primary allocation-share metric should be based on the **initial/first assignment** for each unique ticket in a folder:

`member initial-allocation share = distinct tickets first assigned to member in folder ÷ all distinct tickets first assigned in folder`

This gives a fair view of the dispatcher’s original allocation distribution. It should not inflate a member’s share because a ticket was later handed over, restored or reassigned.

Show handover, reassignment and recovery events separately. A future secondary "handled/touched tickets" view can show every agent who worked on a ticket, but those member percentages may overlap and should be labelled accordingly.

Outstanding workload is a separate current-state snapshot. It must not be conflated with historical allocation share.

### Team workload and event interpretation

Team Performance keeps three measures separate:

- **Initial allocation:** distinct tickets first assigned to a member in each inbox. The share denominator remains the full inbox first-assignment total, even when member rows are searched or filtered.
- **Current open workload:** a current-state snapshot. It is not scaled by the reporting period and must not be treated as historical allocation volume.
- **Workflow events:** handover, reassignment, recovery, manual assignment and flag counts are shown separately from unique tickets affected. The prototype does not attribute these aggregate events to individual members.

First-response time and active handling time remain unavailable. The separate Email Details measure is recorded receipt-to-first-missing detection time for emails that reached Completed after two successful full-Inbox scans at least 120 seconds apart; it is not a first response or business-resolution measure. Elapsed ticket solve time and per-agent resolved counts require explicit Resolution Status, Resolved At (UK) and Resolved By source fields. A formal ticket resolution rate also requires a defined per-agent denominator and reliable ownership history. Raw allocation volume is descriptive, not a performance ranking or proof of fairness.

### Roster and coverage interpretation

Roster & Coverage 2.0 uses explicit shift windows to derive overlap intervals. Without an imported roster it uses anonymised sample placeholders only; with a sanitised snapshot it uses the supplied pseudonymised Team & Shifts roster and excludes inactive-fortnight profiles from scheduled headcount. The imported roster does not supply inbox eligibility, timestamped availability, break/absence coverage or minimum staffing targets. The sample eligibility policy marks each sample profile as eligible for all four inboxes, but no live eligibility source is connected.

Availability values are untimestamped snapshots. They must not be subtracted from shift coverage or treated as live break/absence coverage. Minimum staffing targets, fortnightly rotations and coverage sufficiency remain unconfigured until approved operational rules and source data are loaded. Egypt-local shift schedules and UK mailbox timestamps must remain separate.

### Dispatch configuration design

Dispatch Configuration 2.0 is a **planning workspace, not an active rules engine**. All proposed controls are marked Not configured until a private backend, approved source data and server-side permissions exist.

The proposed policy is organised into six areas:

- **Global allocation model:** one shared fairness view across Agency Detags, Detags, Transfers and Unadopts, rather than treating each inbox as an isolated pool.
- **Workload weighting:** current open workload may influence candidate priority. It remains separate from historical first-assignment counts and must use a timestamped current-state snapshot.
- **Shift and availability eligibility:** use the approved Egypt-local rota plus timestamped availability events. Do not subtract untimestamped availability snapshots from coverage.
- **Four-inbox routing:** validate a versioned, manager-owned eligibility allow-list before scoring an agent for a specific inbox.
- **Recovery behaviour:** restore the original owner where that owner remains valid; otherwise hold the item for review rather than silently assigning a new owner.
- **Assignment safeguards:** enforce idempotency, atomic claim or version checks, controlled retries, verified write outcomes and append-only audit records.

The local scenario preview lets a reader choose an inbox and vary the influence of the synthetic global open-work snapshot. Its relative priority scores are illustrative only, are not a live routing forecast, and never create or change an assignment. The exported CSV is a design proposal with current readiness gaps, not an active configuration file.

The proposed change lifecycle is **Draft → Validate → Approve → Apply → Audit**. In the public prototype, only local drafting and scenario exploration are available. Validation and approval are blocked until trusted roster and availability sources plus authentication exist; Apply is blocked because there is no backend write path; persistent Audit is not configured. A button click or local calculation must never be reported as a successful operational change.

### Audit History 2.0

Audit History 2.0 is a **synthetic, read-only event investigation workspace**. The 20 example events are stored in the public front-end source and are not drawn from Outlook, Excel, an employee audit trail or a production service.

The event ledger derives its counts from the same sample records it displays. It separates event count from distinct ticket count, and separates ticket-linked activity from configuration and access-governance examples. Inbox, category, outcome, actor and free-text filters apply to the same event set; the filtered CSV includes the event identity, UK-labelled sample timestamp, actor and role, entity, ticket and correlation IDs, outcome, reason, approval, before/after values, source and evidence note.

Selecting an event opens its details and the related ticket or correlation timeline. The detail view distinguishes the event's before/after values from its reason, approval record, evidence note and source label. The configuration example demonstrates draft, review and blocked-apply stages; an approval shown in a sample record does not activate a real setting. A timeout is represented as an **unknown outcome**, not silently converted into success or failure.

The screen deliberately does not show an audit-completeness percentage. A static sample cannot establish completeness, authenticity, tamper resistance or retention. The “append-only model” wording describes a design requirement only: the public site has no persistent audit store, authenticated actor identity, server-side authorisation, cryptographic integrity chain, production event ingestion or real approval workflow. No event selection or export changes an assignment, permission, configuration or mailbox record.

Before production use, the service must preserve stable event IDs, trusted actor and approver identities, timezone-aware timestamps, correlation and idempotency references, before/after values, reasons, approvals, verified execution outcomes and linked corrective events. Corrections must be appended with explicit references to the earlier record rather than silently overwriting history. Retention, access permissions, integrity verification and audit export controls must be enforced server-side.

### Reliability Centre 2.0

Reliability Centre 2.0 is a **synthetic exception-investigation workspace**, not a live monitoring console. Its ten anonymised example records demonstrate the structure of write failures, unknown write outcomes, transient retries, recovery holds, duplicate deliveries, concurrency conflicts and stale-write guards.

The screen derives all counts from the sample incident records in the selected inbox scope. A case reference is counted once; retry attempts are retained as fields within that case and do not inflate the number of incidents. It distinguishes:
- A **rejected write**, where the sample response indicates that the write was refused.
- An **unknown write outcome**, where a timeout leaves it unclear whether the underlying operation committed. This must be reconciled against canonical mailbox and tracker state before any repeat attempt.
- A **duplicate delivery signal**, which may be marked suppressed in a sample record or held for review when a canonical event identity has not been established.
- A **concurrency or stale-write guard**, which indicates a sample request was blocked before it could overwrite a newer record.

Recovery examples preserve the original owner as the starting point. A production recovery must verify the current mailbox category, tracker row and eligibility before restoring that owner; otherwise it should hold for review. The prototype provides no retry, restore, assign or queue-control action.

The integration-readiness list deliberately reports Outlook event ingestion, the Excel tracker adapter, dispatcher heartbeat, recovery worker and persistent audit storage as Not connected / Not configured. The UI cannot infer service health, live queue depth, actual latency, or successful writes without authenticated telemetry and backend verification.

The CSV export includes only the currently filtered synthetic case records and labels the file as demonstration data. It is an investigation example, not an operational incident export.

### Administration & Security 2.0

Administration & Security 2.0 is a **proposed governance catalogue**, not an active identity or security administration service. Its four role templates (Platform Administrator, Operations Manager, Team Agent and Read-only Auditor), permission comparison matrix and access-request examples are design material for policy review. The four access requests are synthetic illustrations and do not represent real colleagues, accounts or decisions.

The proposed role model follows least privilege and separation of duties:
- Platform administrators own identity lifecycle, security policy, integration registration and retention administration; routine ticket handling should use a separate lower-privilege identity.
- Operations managers receive proposed operational queue, roster, dispatch-proposal, reporting and audit-read access, but not platform identity, security, secret or retention administration.
- Team agents are scoped to assigned work and personal reporting. Access to other agents' private performance, full audit exports, platform settings and configuration administration is not proposed.
- Read-only auditors receive proposed audit and approved reporting access, without ticket assignment, roster changes or platform administration.

The matrix is not enforced by the browser. Hiding a button or filtering a menu is not an authorisation control. Before production, every protected API and object must validate an authenticated principal and an explicit permission on the server, default to deny, restrict each record to an authorised scope, and test privilege escalation and cross-user access. Privileged changes require independent review where appropriate, documented reason, time-bounded elevation and an auditable result.

The security baseline reports identity provider, MFA, server-side authorisation, session lifecycle, request protection, rate limiting, audit telemetry, secret management, encryption and backup controls as Not configured / Not connected / Not verified. No control is represented as active. A production session design must use server-issued sessions, secure HttpOnly and SameSite cookies, expiry, rotation and revocation; validate CSRF and CORS boundaries; protect exports; and log privileged actions.

No retention period is selected or implied. Ticket content, workflow events, security events, exports, reports and backups each require a separately approved purpose, owner, retention rule, legal-hold process and defensible deletion or anonymisation method. The prototype cannot make a legal retention decision.

The integration register distinguishes Outlook mailbox events, the Excel tracker, identity provider, database/audit store and secret manager. No connector is connected and no credential is held in the browser. Production secrets must live in a protected server-side vault and be accessed through scoped service identities with rotation, access logging and revocation. The CSV is a proposed design blueprint only and is not an executable configuration file. 

Timezone governance is explicit: persist canonical timezone-aware UTC instants, display mailbox/ticket timestamps in **Europe/London**, and interpret roster and shift schedules in **Africa/Cairo**. Do not compare local wall-clock strings or apply a fixed offset across daylight-saving changes. Reporting cutoffs, late-arriving event treatment and holiday calendars remain unapproved until an owner defines them.


## Readability and typography

The shared dashboard typography has been increased slightly for easier scanning of headings, KPI labels, panel descriptions, tables, filters and status labels. The Reliability Centre, Audit History, Reports & Exports and Administration screens use a larger scoped type scale for their dense investigation details, permission matrices, review evidence and metadata. Responsive rules preserve horizontal scrolling for wide tables and stack the denser panels on narrow screens.

## Planned application areas

1. Overview
2. Current Operations
3. Ticket Analytics
4. Brand Insights
5. Workflow Analytics
6. Folder Share
7. Team Performance
8. My Performance
9. Roster & Coverage
10. Dispatch Configuration
11. Reliability Centre
12. Audit History
13. Reports & Exports
14. Administration

Access model under design:

- **System Administrator:** application settings, identities, permissions and critical configuration.
- **Operations Manager:** operational analytics, ticket actions, roster, eligibility, dispatch rules and reports.
- **Agent:** personal performance and own ticket activity only.

Agent privacy must be enforced by server-side authorisation, not by hiding UI components.

## Governance model

Use mixed control:

- Routine authorised actions can execute immediately after validation and confirmation.
- Sensitive roster, eligibility and dispatch configuration changes require preview and stronger authorisation; approval can be required by policy.
- Critical actions must require an explicit reason and confirmation.
- Every request, approval, execution result and failure must be auditable.
- The UI must never indicate success until the underlying service confirms success.

## Data and integration principles

The dashboard is being built before the Excel/Outlook integration. When integration begins:

- Give every ticket a stable internal identity.
- Preserve append-only ticket events and configuration history.
- Distinguish received, first assigned, handed over, reassigned, restored, resolved and reopened.
- Keep UK mailbox timestamps and Egyptian shift schedules explicit, using unambiguous timezone-aware timestamps.
- Deduplicate retried events.
- Keep current ticket state separate from historical events.
- Maintain an auditable integration status and failed-event queue.
- Build a read-only integration first; activate write controls only after verification and safety tests.

The existing Excel tracker remains an operational component until a deliberate migration is designed. Dispatcher 2.0 must not silently overwrite or discard its records.

## Security and deployment

**Do not publish this prototype to a publicly accessible production URL with real data.** A private GitHub repository does not automatically make a Cloudflare Pages deployment private.

Before live deployment or loading real ticket/member data, implement one of:

- Application authentication and server-enforced role-based access, backed by the Dispatcher 2.0 database; or
- Cloudflare Access in front of the dashboard, with an appropriate identity policy, plus server-side authorisation for any APIs.

The production application must use a dedicated data store and secrets, separate from the Knowledge Base. Never put API tokens, PINs, credentials or real mailbox content in this repository.

## Development

The current prototype is plain HTML, CSS and JavaScript with no package manager or build step.

For a local preview, open `index.html` in a modern browser or serve this folder with a static local web server.

Run the JavaScript syntax check:

```sh
node --check dashboard.js
```

A GitHub Pages workflow is provided for a public, synthetic-data-only UI preview. It publishes only `index.html`, `dashboard.css` and `dashboard.js` from the repository to the Pages artifact. Cloudflare Pages Functions, D1 schema, authentication and production deployment remain unconfigured.


## Original VW brand mark and readability

The Dispatcher and standalone Offline Reporting Studio reuse the Knowledge Base home-page VW logo construction and exact `src/vw-logo.png` artwork: a 46px translucent glass tile, 14px rounded corners, 30px masked glyph, dual glow and travelling conic edge. Its original artwork is retained while the surrounding edge, glyph glow and wordmark accents use the Dispatcher Cherry Glass cherry-red and rose palette. The Studio embeds its own copy so it remains standalone. Both interfaces retain the enlarged responsive typography scale.
