# Offline Reporting Studio — operating guide

## Purpose

The Reporting Studio is a browser-local companion to Dispatcher 2.0. Its normal input is the **complete current Excel tracker workbook** (`.xlsx` or `.xls`), uploaded once. You do not need to export worksheets individually. The optional Email Details worksheet adds email lifecycle metrics; older workbooks without it remain supported. The Studio can also accept separate CSV extracts as a fallback.

Workbook and CSV contents are parsed, mapped, pseudonymised and aggregated in this browser tab. They are not uploaded to a server, Cloudflare Worker or API, and raw rows are not written to browser storage. The page loads the pinned SheetJS Community Edition parser script (version 0.20.3) from the official static CDN. This is a code-only download; the workbook is not sent to that CDN. The first load therefore requires internet access. This page is not fully disconnected/offline unless the approved parser script is separately hosted locally and the HTML script reference is changed.

The Studio does not connect to Outlook, Excel desktop, Cloudflare Workers or D1. The GitHub Pages deployment serves the application code only; selected workbook and CSV contents remain in browser memory.

## First test with synthetic files

The repository includes safe, fictional examples:

- `examples/synthetic-ticket-snapshot.csv`
- `examples/synthetic-assignment-history.csv`
- `examples/synthetic-workflow-history.csv`
- `examples/synthetic-team-roster.csv`
- `examples/synthetic-email-details.csv`

These CSV files are regression fixtures for the alternative CSV route. Open **Alternative: use separate CSV files** in the Studio, select the ticket, assignment, workflow and roster examples, check the suggested mappings, generate a local workspace key, and press **Sanitise locally**. The ticket and activity fixtures produce five ticket records, four validated first assignments (one further handover is not counted as a first assignment), and five workflow events. The synthetic roster exercises shift groups, scheduled hours and active/inactive fortnight status with fictional identities and deliberately fictional shift windows.

These examples contain no real customer, vehicle, mailbox or colleague information.

## Source file requirements

### Normal route — upload the complete tracker workbook once

Choose the original tracker workbook in the main workbook input. The current workbook contains six worksheets. The Studio suggests the following worksheet mapping:

| Reporting input | Workbook tab | Use |
|---|---|---|
| Ticket / current state | `Assignments` | Required; current ticket state |
| Assignment history | `Activity Log` | Optional; use this same tab for the assignment-history input |
| Workflow / activity history | `Activity Log` | Optional; select the same tab a second time |
| Team & Shifts roster | `Team & Shifts` | Optional; roster identity and shift metadata |
| Email lifecycle metrics | `Email Details` | Optional; brand, Inbox exit status, recorded handling time and pseudonymised owner aggregates |
| Dashboard and Settings | Not selected | Retain them in the workbook; the Studio ignores them |

The same `Activity Log` worksheet is deliberately selected in two different inputs because the assignment and workflow views use different column mappings. Check the worksheet selectors before mapping the columns below. You only select one workbook file. The Email Details selector will only auto-select a worksheet whose name is `Email Details` / an approved alias, or whose complete 12-field Email Details header schema matches. It will never guess `Assignments` based on a few shared columns. If no valid tab is detected, the selector remains blank and the Studio explains that the operational workbook needs the dedicated Email Details tab added/upgraded before lifecycle metrics can be produced.

### Ticket / current-state snapshot — required

Map these fields:

| Studio field | Required | Meaning |
|---|---:|---|
| Ticket reference | Yes | A stable identifier used only in memory to join source rows. Never appears in outputs. |
| Inbox / folder | Yes | One of Agency Detags, Detags, Transfers or Unadopts. |
| Current status | Yes | Operational dispatcher state. Values such as Assigned, Queued, Recovered or Handed Over are **not** proof that a ticket is resolved. |
| Current owner | Yes | Used to calculate current open workload. Direct values are HMAC-pseudonymised before output. |
| Brand | No today | The current workbook has no Brand column. Add an explicit approved Brand field to the tracker; until then all tickets remain unclassified. |
| Received timestamp | No | Parsed as UK-local time because the source header explicitly identifies UK time. Invalid or ambiguous values are excluded from date metrics. |
| Resolution status | No today | Proposed tracker field. Use explicit Open / Resolved / Closed / Reopened values; do not reuse the operational Assignment Status. |
| Resolved timestamp | No today | Proposed tracker field. Required alongside Received At (UK) to calculate elapsed solve time. |
| Resolved by | No today | Proposed exact Outlook category field so a completed ticket can be attributed to the resolver. Names stay in a separate private lookup. |

The current workbook cannot support a resolution rate or solve-time calculation: it has no explicit resolution status, resolved timestamp or resolver field. A future tracker build can populate these fields after the resolution workflow is agreed. The Studio will show **Not tracked** until those columns are present; it does not treat Recovered, Assigned or Handed Over as resolved.

### Assignment history — optional

Map ticket reference, new owner / assigned agent, and assignment type. Inbox is optional when the ticket snapshot supplies the authoritative inbox.

For the VWG tracker, map **Event Type** (column B) as the assignment event type and **Original Assignee** as the colleague reference. **AUTO_ASSIGNMENT** contributes to automatic first allocations; **MANUAL_ASSIGNMENT_CAPTURED** contributes to manual first allocations. Identical duplicate first-allocation rows for the same ticket, agent, inbox and method are de-duplicated; genuinely conflicting first-assignment records are excluded as ambiguous. **Assignment Flag** (column G) is a Boolean marker and must not be mapped as the event type.

### Workflow / activity history — optional

For the VWG tracker, select the **Activity Log** worksheet a second time as the workflow input. It is the same tab in the same workbook, not a second file. Map **Email Key / ID** to ticket reference, **Event Type** (column B) to workflow event type, **Source Inbox** to inbox and **Event Time (Egypt)** to the optional event timestamp. Map **Original Assignee** (E) and **Current Owner** (F) as optional person references; map **Assignment Flag** (G) separately as a Boolean and **Incident Count** (H) when present. Column G is not the event name. The Activity Log schema is A Event Time, B Event Type, C Email Key / ID, D Folder Path, E Original Assignee, F Current Owner, G Assignment Flag, H Incident Count, I Details. Never map **Details / Notes** (I): it can contain free text or personal data and is not exported. For system-level events with no Email Key / ID, the Studio retains the event in a separate System / cross-Inbox scope.

The sanitiser recognises the dispatcher's explicit event values, including AUTO_ASSIGNMENT, MANUAL_ASSIGNMENT_CAPTURED, HANDOVER, category-removal/review events, recovery/restoration events, and known failure/exception events. The Boolean Assignment Flag is never treated as an event label. Event involvement is not claimed to be the authenticated person who performed the action.

### Team & Shifts roster — optional

Select the **Team & Shifts** worksheet from the same workbook. Map **Outlook Category (exact)** as the join identity, then **Shift Group**, **Shift Start (Egypt)**, **Shift End (Egypt)** and **Active This Fortnight**. Map **Colleague** as an optional display name for the **separate private lookup export**. The public JSON still contains only pseudonymous references and shift metadata; colleague names and Outlook categories are not included. In the dashboard, import the JSON first, then click **Load colleague names** and select the matching private name-lookup CSV. Use the same workspace key that was used to create the JSON. The names are applied only in that browser tab; the shared JSON remains pseudonymised.

Use the **same private workspace key** for Assignments, Activity Log, Team & Shifts and Email Details on every run. Download both the sanitised JSON and the private agent-name lookup; keep the latter separate and do not upload it to GitHub or share it with the JSON. The roster may include inactive colleagues; they remain in the directory but are excluded from active shift-coverage headcounts. The source does not provide inbox eligibility, break/absence timestamps or minimum staffing targets, so those measures remain unavailable.

### Email Details lifecycle metrics — optional

Select the **Email Details** worksheet from the same workbook, or provide a separate Email Details CSV. The sheet provides the following fields:

| Studio field | Workbook column | Reporting treatment |
|---|---:|---|
| Email Key / ID | A | Used only in this browser tab to de-duplicate rows; never exported |
| Brand | C | Aggregated into brand counts; blank/unknown values are reported as missing/unclassified |
| Order Number | D | Value is never exported; used only to count rows where both Order Number and VIN are blank |
| VIN | E | Value is never exported; used only to count rows where both Order Number and VIN are blank |
| Received At (UK) | F | Timezone-validated; used for daily receipt counts |
| First Source Inbox | G | Used for the four-Inbox breakdown; this remains the original source when an email is moved |
| Original Assignee | I | HMAC-pseudonymised before owner aggregation |
| Current Owner | J | HMAC-pseudonymised before owner aggregation |
| Completion Status | K | Only Open, Missing - Confirmation Pending and Completed are recognised |
| First Missing At (UK) | L | Fallback for the first-missing detection timestamp if Completion Time is blank |
| Completion Time (UK) | M | The dispatcher's first-missing full-scan detection time; not a first response or business-resolution timestamp |
| Handling Time (Minutes) | N | Existing tracker value; summarised only for Completed rows |

Internet Message ID (column B), Last Monitored Inbox (H) and Metadata Captured At (O) are not exported. The sanitiser never exports Email Key / ID, Internet Message ID, Order Number, VIN, subjects, source rows or direct colleague names. Order/VIN strings are used only for blank/nonblank checks in memory; the JSON contains counts only.

The dispatcher sets a row to **Missing - Confirmation Pending** when the first successful full scan finds the email absent from all four monitored Inboxes. It changes to **Completed** only after a second successful full scan at least 120 seconds later confirms the absence. A move between monitored Inboxes should remain visible in the next complete scan and should not be counted as an exit. Completion Time is the first-missing detection time saved by the tracker. Handling time therefore means **Received At (UK) to first-missing detection**, and is not first-response time, active handling time or business resolution time. Only completed rows with a valid non-negative handling value contribute to the average, median and p90.

## Import the aggregate snapshot into Dispatcher 2.0

After sanitising approved extracts, use **Download JSON snapshot** in the Studio. Open the Dispatcher dashboard in another tab, select **Import snapshot** in the top bar, and choose the downloaded `dispatcher-reporting-snapshot.json` file.

The dashboard accepts only the supported `dispatcher-reporting-snapshot-1` aggregate format. It checks the four inbox totals, overall totals, brand totals, allocation reconciliation, HMAC-style pseudonymous agent references, optional roster structure and shift values, optional Email Details status/inbox/brand/owner rollups, workflow event allow-list and quality counters. Unknown properties (including raw email, order, VIN or colleague fields) are discarded when the dashboard rebuilds its in-memory data object.

The imported snapshot is used in these aggregate workspaces:

- Overview — inbox totals, brand demand, first assignments where supplied, open workload and source data-quality checks.
- Brand Insights — brand totals across all inboxes. Brand-by-inbox detail is not included in this snapshot.
- Workflow Analytics — mapped event totals and distinct tickets affected, where a workflow file was included.
- Folder Share and Team Performance — first-allocation shares and current open workload grouped by pseudonymised agent reference, where assignment history was included. If Team & Shifts was supplied with the same key, the views also show pseudonymised shift group, Egypt-local scheduled hours and active-fortnight status.
- Roster & Coverage — imported roster directory, Early/Late group totals, and scheduled headcount by Egypt-local shift interval. Inactive roster profiles remain visible but are excluded from coverage calculations. Inbox eligibility, live availability, breaks, absences and staffing targets are not inferred.
- Ticket Analytics — aggregate-only snapshot view. It does not expose ticket references or individual ticket details.
- Email Performance — when Email Details was supplied, shows Open / Missing - Confirmation Pending / Completed status counts, first-source-Inbox and brand breakdowns, pseudonymised owner aggregates, daily receipts/exits and receipt-to-first-missing handling-time summaries.

**Live Operations remains a synthetic demonstration workbench.** The sanitised snapshot contains no ticket references, subjects, message details or individual source rows, so it cannot populate a real ticket queue or open real ticket timelines. Email Performance is a separate aggregate view: its Completed status confirms absence from all four monitored Inboxes on two successful full scans at least 120 seconds apart. Its handling time is receipt-to-first-missing detection, not first response or business resolution. SLA, first-response time, audit history, reliability incidents and dispatch controls are not populated by this import. Imported roster data is limited to the approved shift fields and does not establish live availability or capacity.

**Access and approval:** the GitHub Pages dashboard is public and unauthenticated. Import is a browser-memory convenience, not an access-control or confidentiality boundary. Only use company-approved, sanitised aggregate snapshots on an approved device and in line with the data owner's/security team's instructions. Do not import customer-level exports, raw ticket IDs, subjects, message content or direct colleague identifiers. The snapshot is point-in-time: the dashboard disables the period selector while it is loaded. The imported data exists only in JavaScript memory for the current tab. It is not uploaded, written to browser storage or connected to a backend. **Use demo** returns to synthetic sample data; refreshing or closing the tab clears the import.

## Pseudonym key

Generate a 32-byte random workspace key in the studio and save it to an approved private location. Reuse the same key for later imports when consistent agent references are required. The key is used as an HMAC-SHA-256 key; raw agent identifiers are not exported.

Do not commit, email, upload or include the key with any reporting file. The studio does not retain it. Losing the key means later pseudonymous agent references will change.

## Outputs

The studio produces one aggregate JSON snapshot and seven core aggregate CSVs. When Email Details is supplied it also produces five Email Performance CSVs:

- Inbox summary — ticket-record count, first assignments, resolved, open and unassigned.
- Brand summary — approved brand counts and share.
- Agent allocation — keyed agent reference, inbox, first assignments, first-assignment share and current open workload.
- Workflow summary — event count and distinct tickets affected, separately.
- Team roster — pseudonymous agent reference, shift group, Egypt-local start/end and active-fortnight status (only when a roster was supplied).
- Data quality — row counts, skipped rows, duplicates and mapping warnings.
- Email Inbox summary — email records, Open, confirmation pending, Completed, missing brand and both Order Number + VIN blank, by first source Inbox.
- Email brand summary — email record and Completed counts by Brand.
- Email owner summary — pseudonymous current-owner email counts and handling-time aggregates.
- Email daily receipts and confirmed exits — date and first-source Inbox counts only.

Ticket references and source rows are used only in memory to join and deduplicate. They are not included in outputs. No subject, body, email address, vehicle identifier, attachment, note or free-text source field is exported.

## Interpretation and limits

- A ticket record in the current-state input is not automatically a ticket received during the selected dashboard period. The output labels this as **Ticket records**, not received volume.
- Current open workload is a state snapshot. It is not historical allocation volume.
- First-assignment share uses distinct tickets with one unambiguous initial-assignment event as the denominator, per inbox. Handover, reassignment and recovery are separate workflow activity.
- Workflow event count and distinct tickets affected are different measures and may overlap across event types.
- First-response time, active handling time, SLA performance, reopen rate and hours-adjusted fairness remain unavailable. The Email Details handling metric is receipt-to-first-missing detection time for Completed emails only; it is not first response or business solve time. Elapsed ticket solve time and per-agent resolved counts are calculated only after explicit Resolution Status, Resolved At (UK) and Resolved By fields are present in the ticket/current-state source. A formal resolution rate still requires an agreed per-agent denominator and reliable ownership history. Shift coverage is scheduled headcount from the supplied Egypt-local roster only, not a live capacity or availability measure.
- Date-only values are treated as UTC dates. Datetimes without an explicit timezone are not interpreted; they are counted as ambiguous.
- Duplicate ticket rows are skipped after the first matching ticket reference, and the quality report warns about them. Review the source export before relying on the totals.
- Assignment rows that are missing required values, do not join to the ticket snapshot, conflict with the ticket inbox, or contain ambiguous first-assignment duplicates are excluded and reported.

## Operational boundary

This is a local sanitisation and reporting tool only. It does not connect to the Citrix virtual machine, Outlook, the Excel tracker, Microsoft 365, the Cloudflare Worker or D1. It cannot change assignments, categories, roster records, configuration or mailbox state.

Do not import real operational exports until the company's data owner/security process has approved the export, the fields, the location where the files are processed, the generated reports, and their retention. The public dashboard uses synthetic sample data by default. It can also accept a manually imported, company-approved sanitised aggregate JSON snapshot for aggregate analytics; individual ticket queues and details remain synthetic. The local studio and public dashboard are not an authenticated private management dashboard.
