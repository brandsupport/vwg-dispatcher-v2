# Dispatcher 2.0 — Final Reporting Edition Scope

**Target version:** v2.0.0  
**Status:** release scope frozen; subject to final real-workbook user acceptance checks.

## Product definition

Dispatcher 2.0 Final Reporting Edition is a snapshot-based management reporting application for the four VWG Brand Support inbox workstreams. It transforms an approved Excel tracker copy into sanitised aggregate reporting through a browser-local workflow.

It is not a live dispatch service, not an Outlook add-in, not an authenticated operational console and not a replacement for the existing VBA dispatcher or Excel tracker.

## Included in v2.0.0

- Ten active dashboard workspaces: Overview, Current Operations, Ticket Analytics, Email Performance, Brand Insights, Workflow Analytics, Team Performance, Roster & Coverage, Audit History, and Reports & Exports.
- Standalone Offline Reporting Studio for workbook / CSV selection, explicit mapping, local sanitisation, pseudonymisation, data-quality review and JSON/CSV export.
- Direct Studio-to-Dashboard transfer and JSON file import fallback.
- Private same-browser colleague display-name directory and Order Number / VIN lookup, separate from the shared snapshot.
- Snapshot schema validation, clear imported/demo state, filters, metric definitions and aggregate CSV exports.
- Responsive Cherry Glass visual design, first-run dashboard guide, Studio reporting-cycle guide, user documentation and release notes.
- Retained source implementations for Folder Share, My Performance, Dispatch Configuration, Reliability Centre and Administration; these stay hidden from ordinary reporting navigation. Folder Share allocation matrix remains available under Team Performance.

## Explicitly out of scope

- OneDrive or SharePoint sync, Microsoft Graph, Outlook mail relay, Power Automate or background file pickup.
- Live Outlook shared mailbox reads/writes or live Citrix connection.
- Real-time ticket queue, message body/attachment retrieval, ticket-level live search or message preview.
- Assignment, category, handover, reassignment, recovery, pause/resume or emergency-stop controls.
- Production authentication, MFA, role-based data permissions or multi-user protected reporting.
- A production Worker/D1 connection, automatic snapshot refresh, shared server-side data store or trusted live audit service.
- New HR scoring, first-human-response, active handling, SLA or live attendance metrics without reliable source events.

## Operating boundaries

1. The Excel tracker and existing Outlook VBA dispatcher remain the operational source of truth.
2. Reporting Studio processes the selected workbook locally in the browser; it does not upload workbook rows to a Worker or API.
3. The shared JSON contains only validated sanitised aggregate reporting data and pseudonymous references.
4. Direct names and the restricted Order Number / VIN lookup are stored separately in the same-origin browser-local directory; they are device/profile-specific and are not included in the shared JSON.
5. A snapshot imported into the dashboard remains in tab memory only. Refresh clears it; the private browser-local directory is cleared separately.
6. The public GitHub Pages dashboard is unauthenticated. Only company-approved sanitised aggregate snapshots may be used; do not use the site as a protected customer-record system.
7. Current Operations individual ticket workbench remains synthetic and must not be represented as a live mailbox queue.

## Definition of done

- The full validator workflow passes on the release branch and on the final main commit.
- Dashboard and Studio assets are versioned together and have matching final release styling.
- A current approved tracker workbook is tested manually in the target browser. Mapping, validation, direct hand-off, JSON fallback, Order Number / VIN lookup and CSV exports are checked. A synthetic fixture does not replace this acceptance check.
- The user guide, mapping references, release notes and implementation-status boundary are present.
- The source ZIP is generated from the final v2.0.0 tag, not from an unreviewed branch.
- The release communicates the remaining public/unauthenticated and snapshot-only limitations.
