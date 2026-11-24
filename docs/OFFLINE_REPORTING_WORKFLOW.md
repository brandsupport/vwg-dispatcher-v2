# Offline Reporting Studio — operating guide

## Purpose

The Reporting Studio is a browser-local companion to Dispatcher 2.0. Its normal input is the **complete five-worksheet Excel tracker workbook** (`.xlsx` or `.xls`), uploaded once. You do not need to export worksheets individually. The Studio can also accept separate CSV extracts as a fallback.

Workbook and CSV contents are parsed, mapped, pseudonymised and aggregated in this browser tab. They are not uploaded to a server, Cloudflare Worker or API, and raw rows are not written to browser storage. The page loads the pinned SheetJS Community Edition parser script (version 0.20.3) from the official static CDN. This is a code-only download; the workbook is not sent to that CDN. The first load therefore requires internet access. This page is not fully disconnected/offline unless the approved parser script is separately hosted locally and the HTML script reference is changed.

The Studio does not connect to Outlook, Excel desktop, Cloudflare Workers or D1. The GitHub Pages deployment serves the application code only; selected workbook and CSV contents remain in browser memory.

## First test with synthetic files

The repository includes safe, fictional examples:

- `examples/synthetic-ticket-snapshot.csv`
- `examples/synthetic-assignment-history.csv`
- `examples/synthetic-workflow-history.csv`
- `examples/synthetic-team-roster.csv`

These CSV files are regression fixtures for the alternative CSV route. Open **Alternative: use separate CSV files** in the Studio, select the ticket, assignment, workflow and roster examples, check the suggested mappings, generate a local workspace key, and press **Sanitise locally**. The ticket and activity fixtures produce five ticket records, four validated first assignments (one further handover is not counted as a first assignment), and five workflow events. The synthetic roster exercises shift groups, scheduled hours and active/inactive fortnight status with fictional identities and deliberately fictional shift windows.

These examples contain no real customer, vehicle, mailbox or colleague information.

## Source file requirements

### Normal route — upload the complete five-tab workbook once

Choose the original tracker workbook in the main workbook input. The Studio suggests the following worksheet mapping:

| Reporting input | Workbook tab | Use |
|---|---|---|
| Ticket / current state | `Assignments` | Required; latest current-state row per ticket |
| Initial-allocation history | `Assignments` | Optional; select the same tab a second time to read Original Assignee, Boolean Assignment Flag, Status and Allocated At (Egypt) |
| Workflow / activity history | `Activity Log` | Optional; event names come from Event Type, not the Boolean Assignment Flag |
| Team & Shifts roster | `Team & Shifts` | Optional; roster identity and shift metadata |
| Other two tabs | Not selected | Retain them in the workbook; the Studio ignores them |

The same `Assignments` worksheet is selected twice by design: once for current ticket state and again for initial-allocation fields. `Activity Log` is selected for workflow events. Check the worksheet selectors before mapping the columns below. You only select one workbook file.

### Ticket / current-state snapshot — required

Map these fields:

| Studio field | Required | Meaning |
|---|---:|---|
| Ticket reference | Yes | A stable identifier used only in memory to join source rows. Never appears in outputs. |
| Inbox / folder | Yes | One of Agency Detags, Detags, Transfers or Unadopts. |
| Current status | Yes | Used only to distinguish resolved/closed from outstanding records. |
| Current owner | Yes | Used to calculate current open workload. Direct values are HMAC-pseudonymised before output. |
| Brand | No | Must match an approved brand label; unknown values become Other / unclassified. |
| Received timestamp | No | Date-only ISO format or an ISO timestamp with an explicit timezone. Used only for the reporting-period boundary. |

The file should be a current-state ticket snapshot, not raw mailbox content. A blank or unfamiliar status is treated conservatively as open and is flagged in data quality.

### Initial assignment history — optional

Select `Assignments` again. Map `Email Key / ID`, `Original Assignee`, `Assignment Flag`, `Source Inbox`, `Allocated At (Egypt)` and `Status`. TRUE/1 plus a successful status (`Assigned`, `Handed Over` or `Recovered`) counts once as an initial automatic allocation. FALSE, queued, pending, failed and review states are not counted. Handovers and recoveries do not create additional first allocations. `MANUAL_ASSIGNMENT_CAPTURED` is shown as a separate workflow event; it is not included in automatic first-allocation share because the current source does not reliably establish whether each manual event is a first allocation or a later reassignment.

### Workflow / activity history — optional

Select the `Activity Log` worksheet once. Map `Event Type` as the workflow category, plus `Email Key / ID`, `Source Inbox`, `Event Time (Egypt)`, `Original Assignee`, `Current Owner` and `Incident Count`. `Assignment Flag` is a TRUE/FALSE marker, not the event name. Do **not** map `Details / Notes`; it may contain subjects or free text. Event IDs and ticket IDs are HMAC-pseudonymised before export; timestamps are retained as UTC instants when the source value can be safely parsed.

### Team & Shifts roster — optional

Select the **Team & Shifts** worksheet. Map `Outlook Category (exact)` as the private join key and `Colleague` as the approved display name, plus `Shift Group`, `Shift Start (Egypt)`, `Shift End (Egypt)` and `Active This Fortnight`. The category is pseudonymised and never exported. The approved display name is retained in the browser-local snapshot for internal Team Performance, Roster and Activity Log screens. Treat the JSON as an internal workforce report containing colleague display names; store and share it only through approved private channels.

Use the **same private workspace key** for the Assignments, Activity Log and Team & Shifts worksheets on each reporting run so that pseudonymous references match across the workbook sources. The roster may include inactive colleagues; they remain in the directory but are excluded from active shift-coverage headcounts. The source does not provide inbox eligibility, break/absence timestamps or minimum staffing targets, so those measures remain unavailable.

## Import the aggregate snapshot into Dispatcher 2.0

After sanitising approved extracts, use **Download JSON snapshot** in the Studio. Open the Dispatcher dashboard in another tab, select **Import snapshot** in the top bar, and choose the downloaded `dispatcher-reporting-snapshot.json` file.

The dashboard accepts `dispatcher-reporting-snapshot-2` (and remains compatible with older v1 synthetic fixtures). It checks inbox and overall totals, brand reconciliation, keyed ticket/event/agent references, named roster structure, shifts, Activity Log event allow-list and quality counters. Unknown properties (including any accidentally added raw ticket or colleague fields) are discarded when the dashboard rebuilds its in-memory data object.

The imported snapshot is used in these aggregate workspaces:

- Overview — inbox totals, brand demand, first assignments where supplied, open workload and source data-quality checks.
- Brand Insights — brand totals across all inboxes. Brand-by-inbox detail is not included in this snapshot.
- Workflow Analytics — mapped event totals and distinct tickets affected, where a workflow file was included.
- Folder Share and Team Performance — first-allocation shares and current open workload grouped by pseudonymised agent reference, where assignment history was included. If Team & Shifts was supplied with the same key, the views also show pseudonymised shift group, Egypt-local scheduled hours and active-fortnight status.
- Roster & Coverage — imported roster directory, Early/Late group totals, and scheduled headcount by Egypt-local shift interval. Inactive roster profiles remain visible but are excluded from coverage calculations. Inbox eligibility, live availability, breaks, absences and staffing targets are not inferred.
- Ticket Analytics — aggregate-only snapshot view. It does not expose ticket references or individual ticket details.

**Imported Live Operations is a source-activity feed, not a live queue.** It shows recognised Activity Log events from the imported workbook and does not refresh from Outlook or change categories. The Activity Log screen is a simple searchable event register, not a security audit ledger. The import still removes raw ticket IDs, email subjects, notes, mailbox entry/store IDs and customer content. The current source contains no Brand field, terminal resolved status, resolved timestamp or resolver identity; brand distribution, resolution time and individual resolution-rate metrics therefore remain unavailable. Without an imported snapshot, Live Operations remains the separate synthetic ticket workbench.

**Access and approval:** the GitHub Pages dashboard is public and unauthenticated. Import is a browser-memory convenience, not an access-control or confidentiality boundary. Only use company-approved, sanitised aggregate snapshots on an approved device and in line with the data owner's/security team's instructions. Do not import customer-level exports, raw ticket IDs, subjects, message content or direct colleague identifiers. The snapshot is point-in-time: the dashboard disables the period selector while it is loaded. The imported data exists only in JavaScript memory for the current tab. It is not uploaded, written to browser storage or connected to a backend. **Use demo** returns to synthetic sample data; refreshing or closing the tab clears the import.

## Pseudonym key

Generate a 32-byte random workspace key in the studio and save it to an approved private location. Reuse the same key for later imports when consistent agent references are required. The key is used as an HMAC-SHA-256 key; raw agent identifiers are not exported.

Do not commit, email, upload or include the key with any reporting file. The studio does not retain it. Losing the key means later pseudonymous agent references will change.

## Outputs

The studio produces one aggregate JSON snapshot and seven aggregate CSVs:

- Inbox summary — ticket-record count, first assignments, resolved, open and unassigned.
- Brand summary — approved brand counts and share.
- Agent allocation — keyed agent reference, inbox, first assignments, first-assignment share and current open workload.
- Workflow summary — event count and distinct tickets affected, separately.
- Team roster — pseudonymous agent reference, shift group, Egypt-local start/end and active-fortnight status (only when a roster was supplied).
- Data quality — row counts, skipped rows, duplicates and mapping warnings.

Ticket references and source rows are used only in memory to join and deduplicate. They are not included in outputs. No subject, body, email address, vehicle identifier, attachment, note or free-text source field is exported.

## Interpretation and limits

- A ticket record in the current-state input is not automatically a ticket received during the selected dashboard period. The output labels this as **Ticket records**, not received volume.
- Current open workload is a state snapshot. It is not historical allocation volume.
- First-assignment share uses distinct tickets with one unambiguous initial-assignment event as the denominator, per inbox. Handover, reassignment and recovery are separate workflow activity.
- Workflow event count and distinct tickets affected are different measures and may overlap across event types.
- The tool does not estimate first response, elapsed resolution, active handling time, SLA performance, reopen rate, productivity ranking or hours-adjusted fairness. Shift coverage is scheduled headcount from the supplied Egypt-local roster only, not a live capacity or availability measure.
- Date-only values are treated as UTC dates. Datetimes without an explicit timezone are not interpreted; they are counted as ambiguous.
- Duplicate ticket rows are skipped after the first matching ticket reference, and the quality report warns about them. Review the source export before relying on the totals.
- Assignment rows that are missing required values, do not join to the ticket snapshot, conflict with the ticket inbox, or contain ambiguous first-assignment duplicates are excluded and reported.

## Operational boundary

This is a local sanitisation and reporting tool only. It does not connect to the Citrix virtual machine, Outlook, the Excel tracker, Microsoft 365, the Cloudflare Worker or D1. It cannot change assignments, categories, roster records, configuration or mailbox state.

Do not import real operational exports until the company's data owner/security process has approved the export, the fields, the location where the files are processed, the generated reports, and their retention. The public dashboard uses synthetic sample data by default. It can also accept a manually imported, company-approved sanitised aggregate JSON snapshot for aggregate analytics; individual ticket queues and details remain synthetic. The local studio and public dashboard are not an authenticated private management dashboard.
