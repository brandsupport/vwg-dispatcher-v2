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
| Ticket / current state | `Assignments` | Required; current ticket state |
| Assignment history | `Activity Log` | Optional; use this same tab for the assignment-history input |
| Workflow / activity history | `Activity Log` | Optional; select the same tab a second time |
| Team & Shifts roster | `Team & Shifts` | Optional; roster identity and shift metadata |
| Other two tabs | Not selected | Retain them in the workbook; the Studio ignores them |

The same `Activity Log` worksheet is deliberately selected in two different inputs because the assignment and workflow views use different column mappings. Check the worksheet selectors before mapping the columns below. You only select one workbook file.

### Ticket / current-state snapshot — required

Map these fields:

| Studio field | Required | Meaning |
|---|---:|---|
| Ticket reference | Yes | A stable identifier used only in memory to join source rows. Never appears in outputs. |
| Inbox / folder | Yes | One of Agency Detags, Detags, Transfers or Unadopts. |
| Dispatcher status | Yes | Assignment/recovery workflow state only (e.g. Queued, Assigned, Recovered, Needs Review). It is not ticket lifecycle. |
| Current owner | Yes | Used to count current-owner records. It is not treated as open work unless explicit lifecycle status exists. Agent identity is HMAC-pseudonymised and the separate roster display name is retained. |
| Brand | No | Not present in the current workbook. Brand Insights shows Not recorded rather than inferring or treating all records as Other. |
| Received timestamp | No | `Received At (UK)` is parsed as a UK-local calendar date (`Europe/London`) when the tracker format is recognised. |

The file should be a current-state ticket snapshot, not raw mailbox content. A blank `Current Owner` is counted as No current owner. A blank or unfamiliar dispatcher status is not reinterpreted as open/closed lifecycle state. The Studio does not find Brand, Lifecycle Status, Resolved At or Resolved By in the current workbook, so brand and resolution metrics are Not recorded until those fields are added.

### Assignment history — `Activity Log` worksheet

Map `Email Key / ID` to ticket reference, `Original Assignee` to the original first assignee, `Event Type` to actual event name and `Assignment Flag` to TRUE/FALSE first-assignment flag. Also map `Source Inbox` and `Event Time (Egypt)`. Only `AUTO_ASSIGNMENT` with a TRUE flag contributes an automatic first allocation; `MANUAL_ASSIGNMENT_CAPTURED` with a TRUE flag contributes a manual first allocation. Pending verification, handovers, category changes, recovery and baseline events do not count as first allocations. A ticket must exist in Assignments and the event inbox must match its current inbox. Multiple distinct first-allocation rows for one ticket are excluded as ambiguous.

### Workflow / activity history — optional

For workflow history, select the **same Activity Log worksheet again**. Map `Event Type` to the actual event name, `Assignment Flag` to TRUE/FALSE, `Original Assignee`, `Current Owner`, `Source Inbox` and `Event Time (Egypt)`. `Event Type` is not Boolean. The Studio produces grouped event totals and individual sanitised Activity Log rows. Each event row contains an HMAC ticket reference, source event, Egypt-local timestamp/date, inbox, original/current owner names and first-assignment flag. Raw Email Key / ID and Details / Notes are removed.

### Team & Shifts roster — optional

Select the **Team & Shifts** worksheet from the same workbook. Map `Outlook Category (exact)` as the join identity and `Colleague` as the separate display name, then Shift Group, Shift Start (Egypt), Shift End (Egypt) and Active This Fortnight. The category is used only in browser memory to derive the HMAC agent reference and is removed. The Colleague display name is retained in the local JSON snapshot so the dashboard can identify agents. Store the downloaded file only in an approved private location.

Use the **same private workspace key** for the Assignments, Activity Log and Team & Shifts worksheets on each reporting run so that pseudonymous references match across the workbook sources. The roster may include inactive colleagues; they remain in the directory but are excluded from active shift-coverage headcounts. The source does not provide inbox eligibility, break/absence timestamps or minimum staffing targets, so those measures remain unavailable.

## Import the aggregate snapshot into Dispatcher 2.0

After sanitising approved extracts, use **Download JSON snapshot** in the Studio. Open the Dispatcher dashboard in another tab, select **Import snapshot** in the top bar, and choose the downloaded `dispatcher-reporting-snapshot.json` file.

The dashboard accepts the supported `dispatcher-reporting-snapshot-1` sanitised snapshot. It validates the four inbox totals, optional Brand/lifecycle availability, HMAC ticket/agent references, ticket queue rows, assignment-method totals, row-level Activity Log events, roster display names/shift values and quality counters. Colleague display names are intentionally retained for the local manager view; raw Outlook categories and raw Email Key / ID are not.

The imported snapshot is used in these aggregate workspaces:

- Overview — ticket records, first assignments, no-current-owner counts, UK received-date coverage and data-quality warnings. Resolution/open figures remain Not recorded without lifecycle fields.
- Live Operations — a distinct read-only queue from the sanitised snapshot with HMAC ticket references, inbox, tracker status, owner name and UK received date. No subject/body is included and this is not a live mailbox.
- Ticket Analytics — state by inbox, received-date coverage and source-field availability.
- Brand Insights — displays brand totals only when an explicit Brand field is present; otherwise it explains the missing source field.
- Workflow Analytics — automatic/manual first-allocation split and actual Activity Log event totals.
- Folder Share and Team Performance — named roster profiles, first-allocation shares and current-owner counts. Resolution rate and solve time remain unavailable until lifecycle fields are recorded.
- Activity Log — individual sanitised event rows with Egypt-local time, event name, original/current owner, first-assignment flag and HMAC ticket reference.
- Roster & Coverage — named directory, Early/Late group totals and scheduled headcount by Egypt-local interval. Inactive profiles remain visible but are excluded from coverage. Eligibility, live availability, breaks and absences are not inferred.

The imported queue and Activity Log are point-in-time read-only views. They do not show subjects/bodies or provide assignment/restore actions. Resolver performance, solve time, SLA, response time, reopened rate and active handling time require additional approved source fields.

**Access and approval:** the GitHub Pages dashboard is public and unauthenticated. Import is a browser-memory convenience, not an access-control or confidentiality boundary. Only use company-approved, sanitised aggregate snapshots on an approved device and in line with the data owner's/security team's instructions. Do not import customer-level exports, raw ticket IDs, subjects, message content or direct colleague identifiers. The snapshot is point-in-time: the dashboard disables the period selector while it is loaded. The imported data exists only in JavaScript memory for the current tab. It is not uploaded, written to browser storage or connected to a backend. **Use demo** returns to synthetic sample data; refreshing or closing the tab clears the import.

## Pseudonym key

Generate a 32-byte random workspace key in the studio and save it to an approved private location. Reuse the same key for later imports when consistent agent references are required. The key is used as an HMAC-SHA-256 key; raw agent identifiers are not exported.

Do not commit, email, upload or include the key with any reporting file. The studio does not retain it. Losing the key means later pseudonymous agent references will change.

## Outputs

The Studio produces a sanitised JSON snapshot and CSV files for received-date volume, inbox summary, brand status/totals, agent allocation, automatic/manual first-assignment methods, named roster, grouped workflow events, individual sanitised Activity Log rows, sanitised ticket queue and data quality. Ticket/event references are HMAC pseudonyms. Raw Email Key / ID, Outlook category values, Outlook Entry ID, Outlook Store ID, subjects, bodies, Handover Notes and Details / Notes are excluded. Colleague display names are retained for local manager use, so exports must be stored in an approved private location.

## Interpretation and limits

- A ticket record in the current-state input is not automatically a ticket received during the selected dashboard period. The output labels this as **Ticket records**, not received volume.
- Current open workload is a state snapshot. It is not historical allocation volume.
- First-assignment share uses distinct tickets with one unambiguous initial-assignment event as the denominator, per inbox. Handover, reassignment and recovery are separate workflow activity.
- Workflow event count and distinct tickets affected are different measures and may overlap across event types.
- The tool does not estimate first response, elapsed resolution, active handling time, SLA performance, reopen rate, productivity ranking or hours-adjusted fairness. Shift coverage is scheduled headcount from the supplied Egypt-local roster only, not a live capacity or availability measure.
- `Received At (UK)` is grouped as a UK-local calendar date (`Europe/London`); `Event Time (Egypt)` is grouped as an Egypt-local calendar date (`Africa/Cairo`). Source wall-clock values are preserved; no UTC offset is invented.
- `Assignments.Status` is a dispatcher assignment/recovery state, not ticket lifecycle. Resolved/open totals, resolver rates and solve time remain Not recorded until explicit lifecycle fields exist.
- Brand totals remain Not recorded until an explicit Brand field is added.
- Duplicate ticket rows are skipped after the first matching ticket reference, and the quality report warns about them. Review the source export before relying on the totals.
- Assignment rows that are missing required values, do not join to the ticket snapshot, conflict with the ticket inbox, or contain ambiguous first-assignment duplicates are excluded and reported.

## Operational boundary

This is a local sanitisation and reporting tool only. It does not connect to the Citrix virtual machine, Outlook, the Excel tracker, Microsoft 365, the Cloudflare Worker or D1. It cannot change assignments, categories, roster records, configuration or mailbox state.

Do not import real operational exports until the company's data owner/security process has approved the export, the fields, the location where the files are processed, the generated reports, and their retention. The public dashboard uses synthetic sample data by default. It can also accept a manually imported, company-approved sanitised aggregate JSON snapshot for aggregate analytics; individual ticket queues and details remain synthetic. The local studio and public dashboard are not an authenticated private management dashboard.
