# VWG Dispatcher 2.0 — User Guide

**Edition:** Final Reporting Edition · target release v2.0.0  
**Operating model:** Excel tracker → Offline Reporting Studio → sanitised JSON → Dashboard

## 1. What this application does

Dispatcher 2.0 turns an approved copy of the VWG Brand Support tracker into aggregate management reporting across Agency Detags, Detags, Transfers and Unadopts.

The Reporting Studio reads the workbook locally in the browser, checks mappings and data quality, pseudonymises agent references and prepares a sanitised JSON snapshot. The dashboard validates that snapshot and displays the reporting views.

This is a manual, point-in-time reporting workflow. It does not connect to Outlook, Citrix, the live Excel workbook, OneDrive, Microsoft Graph or a mailbox API. It does not assign, move, categorise, recover or reply to emails.

## 2. Before starting

Use an organisation-approved device and browser, and an approved copy of the tracker workbook. Open both the Dashboard and Reporting Studio in the **same browser profile on the same device**. Keep the private workspace key in an approved private location.

Only process and import data that the relevant company data owner has approved for this reporting use. The GitHub Pages dashboard is public and unauthenticated; it is not an access-control boundary.

## 3. Prepare a snapshot in Reporting Studio

1. Open the Reporting Studio from the Dashboard's persistent **Reporting Studio** link, or open `reporting-studio.html`.
2. Select the complete tracker workbook (`.xlsx`, `.xls` or `.xlsm`). The workbook should contain its normal tracker tabs; do not upload an Assignments-only export as a substitute for the full workbook.
3. Select the source worksheets in the Studio:
   - **Assignments** → ticket/current-state source (required).
   - **Activity Log** → assignment history.
   - **Activity Log** again → workflow/activity history. This is a second mapping of the same sheet.
   - **Team & Shifts** → roster (optional).
   - **Email Details** → email lifecycle metrics and local Order Number / VIN lookup (optional when that source is absent).
   - **Dashboard** and **Settings** are ignored.
4. Review each proposed column mapping. Auto-detection is a suggestion, not an approval. In Activity Log, map column B **Event Type** as the event type and column D **Folder Path** as the event Inbox. Do not map column G **Assignment Flag** as an event name, and do not map column I **Details**.
5. For Email Details, select the actual Email Details sheet. Do not substitute Assignments or Activity Log. Follow the exact field allow-list in [Real Export Mapping Worksheet](REAL_EXPORT_MAPPING_WORKSHEET.md).
6. Enter or generate a private workspace key of at least 32 characters. Reuse the same key for every reporting run so pseudonymous agent references remain consistent. Store the key securely; never include it with the JSON, email it, commit it or paste it into a public issue.
7. Press **Sanitise locally**. The workbook is parsed in the browser tab. Review the source-row quality checks, skipped/duplicate counts, unmapped values and warning messages before using the report.

## 4. Load the dashboard

There are two supported routes:

**Direct hand-off (recommended):** after sanitising, choose **Open dashboard with this data**. The Studio opens the Dashboard in another tab and transfers the validated snapshot through the browser's same-origin BroadcastChannel. Keep both pages in the same browser profile. Wait for the Dashboard to confirm that the import succeeded.

**JSON file hand-off:** choose **Download JSON snapshot**. Open the Dashboard and choose **Import snapshot** (or the first-run import action on Overview), then select the downloaded JSON file. The Dashboard validates the schema before displaying it. The snapshot file contains sanitised aggregate reporting fields only.

The Report CSVs action downloads separate aggregate reports. It is not a substitute for importing the JSON snapshot.

## 5. Use the Dashboard

The ten reporting workspaces are:

- **Overview:** management summary, inbox performance, initial allocation distribution and import data-quality summary.
- **Current Operations:** a clearly labelled demonstration workbench. Its individual ticket queue and ticket details are synthetic; it is not the live Outlook queue.
- **Ticket Analytics:** aggregate ticket-flow and current-state measures.
- **Email Performance:** Email Details lifecycle state, brand/inbox mix and recorded handling-duration summaries.
- **Brand Insights:** classified brand volumes and distribution.
- **Workflow Analytics:** recorded first allocations, handovers, recoveries and other mapped workflow events.
- **Team Performance:** first-allocation distribution, per-inbox allocation matrix, current-owner workload and available per-agent brand/resolution/handling measures.
- **Roster & Coverage:** supplied roster and Egypt-local scheduled shift windows.
- **Audit History:** imported sanitised Activity Log search and event details; local Order Number / VIN matches are available when the same-browser private lookup has been populated from Email Details.
- **Reports & Exports:** local aggregate CSV report builders.

Use the global Inbox selector to scope supported views. The period selector is locked when a point-in-time snapshot is loaded because the snapshot does not contain a complete history for arbitrary date ranges.

## 6. Privacy and local browser data

The shared JSON snapshot does not contain direct colleague names, raw Email Key / ID values, Internet Message IDs, Order Numbers, VINs, email subjects or message bodies.

The Studio saves a separate private browser-local directory containing pseudonymous agent-reference/display-name pairs and a restricted Email Details lookup used for Order Number / VIN search. That lookup contains the selected identifiers plus validated ticket reference, brand, Inbox, status, dates and pseudonymous agent references. It is stored in the same-origin browser's local storage and is not embedded in the shared JSON or public JavaScript.

Consequences:

- Use the same browser profile and device for the Studio and Dashboard if you need colleague names or Order Number / VIN search.
- A JSON file moved to another device or browser does not carry this private directory.
- Refreshing the Dashboard clears the imported snapshot from tab memory. The separate private directory remains on that browser until it is explicitly cleared.
- **Use demo** clears the imported snapshot from the current tab and returns the dashboard to synthetic sample data.
- **Clear local names & lookup** removes the private colleague-name and Order Number / VIN lookup directory from the current browser.
- Do not export, share, email or commit the private directory. Do not treat it as a security or identity control.

## 7. Metric interpretation

- Initial allocation share counts distinct tickets by the first validated assignment. Handover, reassignment and recovery events must not inflate first-allocation share.
- Current open workload is a current-state measure, not historical allocation volume.
- Email **Completed** means a monitored email was confirmed absent from the four monitored Inboxes by the dispatcher’s full-scan confirmation rule. Recorded handling duration is not first human response time, active handling time or business ticket solve time.
- Ticket resolution, resolver attribution and solve time are shown only when the required source fields and supported lifecycle evidence exist.
- Roster coverage is scheduled headcount from the supplied shift windows. It is not proof of live attendance, availability, break status or inbox eligibility.
- Aggregate agent measures are descriptive management indicators; they are not a formal HR rating or proof of individual conduct.

## 8. Known boundaries

The reporting release does not provide authenticated sign-in, role-based data access, live mailbox access, a live individual ticket queue, dispatch controls, assignment writes, real-time synchronisation, trusted operational audit ingestion, live Reliability Centre telemetry, SLA alerts or full availability/absence management.

Five additional workspace implementations (Folder Share, My Performance, Dispatch Configuration, Reliability Centre and Administration) are retained in the codebase but hidden from the reporting navigation. They are not active production services.

For detailed source columns and event interpretation, use [Real Export Mapping Worksheet](REAL_EXPORT_MAPPING_WORKSHEET.md), [Offline Reporting Workflow](OFFLINE_REPORTING_WORKFLOW.md) and [Implementation Status](IMPLEMENTATION_STATUS.md).
