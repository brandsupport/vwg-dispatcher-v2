# VWG Dispatch Intelligence — Dispatcher 2.0

A standalone operations intelligence and management platform for the VWG Brand Support ticket operation.

> **Current status: prototype / demonstration data only.** The dashboard does not connect to Outlook, the Excel dispatch tracker, or any production ticket source. All figures and member labels are synthetic. No operational controls execute actions.

## Product direction

Dispatcher 2.0 is being developed independently from the VWG Brand Support Knowledge Base. It will have its own repository, application deployment, authentication/authorisation model, data store and operational audit history.

The platform is designed to help authorised managers understand and manage the four shared-mailbox workstreams:

- Agency Detags
- Detags
- Transfers
- Unadopts

Its central goals are to make ticket volume, brand mix, workload allocation, resolution performance, team fairness and dispatcher reliability understandable and auditable.

## Current prototype

The complete UI foundation now includes fourteen navigable areas:

- Overview and live operations control room.
- Ticket analytics and ticket explorer with sample ticket detail timelines.
- Brand insights for Volkswagen, Audi, Škoda, SEAT, CUPRA, Volkswagen Commercial Vehicles and Other / unclassified.
- Workflow analytics for handovers, flags, manual allocation, recoveries, reassignments and exceptions.
- Folder share matrix showing each member's initial-allocation count and percentage share within each folder.
- Team performance with selectable member profiles.
- Private-performance screen layout (placeholder identity in the prototype).
- Roster and coverage.
- Dispatch configuration.
- Reliability centre.
- Audit history.
- Reports and CSV exports.
- Administration and environment overview.

Global reporting-period, inbox and search controls are available across the dashboard. Sample ticket details open in a modal, CSV exports work with synthetic data, and operational preview buttons only change local prototype state or display an explanatory message.

All member names remain anonymised (Agent 01–Agent 14). Do not replace them with real team names until authentication, role permissions and the live data connection are ready.

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

## Planned application areas

1. Overview
2. Live Operations
3. Ticket Analytics
4. Brand Insights
5. Workflow Analytics
6. Folder Share
7. Team Performance
8. My Performance
9. Roster & Coverage
10. Dispatch Configuration
11. Reliability Centre
12. Audit & Reports
13. Administration

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
