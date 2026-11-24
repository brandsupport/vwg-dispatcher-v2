# Offline Reporting Studio — operating guide

## Purpose

The Reporting Studio is a static, browser-local companion to Dispatcher 2.0. It turns approved CSV extracts into aggregate management reporting without connecting to Outlook, Excel, Cloudflare Workers or D1.

The files in this workflow are not sent to a server. CSV parsing, field selection, pseudonymisation and aggregation happen in the browser tab. The page contains no network client, telemetry integration, browser storage write or API call. The GitHub Pages deployment serves the application code only; selected CSV contents remain local to the browser.

For strict offline use, download `reporting-studio.html`, `reporting-studio.css` and `reporting-studio.js` together and open the HTML file locally. Keep all three files in the same folder.

## First test with synthetic files

The repository includes safe, fictional examples:

- `examples/synthetic-ticket-snapshot.csv`
- `examples/synthetic-assignment-history.csv`
- `examples/synthetic-workflow-history.csv`

Select all three in the studio, check the automatically suggested column mappings, generate a local workspace key, and press **Sanitise locally**. The expected result contains five ticket records, four validated first assignments (one further handover is not counted as a first assignment), and five workflow events.

These examples contain no real customer, vehicle, mailbox or colleague information.

## Source file requirements

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

### Assignment history — optional

Map ticket reference, new owner / assigned agent, and assignment type. Inbox is optional when the ticket snapshot supplies the authoritative inbox.

Only explicit values equivalent to **Initial**, **First assignment**, **Initial assignment**, **Initial allocation** or **First allocation** contribute to initial-allocation share. Manual assignments, handovers, reassignments and recoveries do not increase first-allocation share. A ticket must exist in the ticket snapshot and the assignment inbox must match the ticket's inbox. Multiple first-assignment rows for one ticket are excluded as ambiguous.

### Workflow / activity history — optional

Map ticket reference and workflow event type. Inbox is optional when it can be joined to the ticket snapshot. Event values are normalised through a fixed allow-list (received, flagged, handover, assigned, manual assignment, reassigned, recovery requested/held/restored, resolved, reopened and exception). Unknown or free-text values are dropped rather than copied into the output.

## Import the aggregate snapshot into Dispatcher 2.0

After sanitising approved extracts, use **Download JSON snapshot** in the Studio. Open the Dispatcher dashboard in another tab, select **Import snapshot** in the top bar, and choose the downloaded `dispatcher-reporting-snapshot.json` file.

The dashboard accepts only the supported `dispatcher-reporting-snapshot-1` aggregate format. It checks the four inbox totals, overall totals, brand totals, allocation reconciliation, HMAC-style pseudonymous agent references, workflow event allow-list and quality counters. Unknown properties (including any accidentally added raw ticket or colleague fields) are discarded when the dashboard rebuilds its in-memory data object.

The imported snapshot is used in these aggregate workspaces:

- Overview — inbox totals, brand demand, first assignments where supplied, open workload and source data-quality checks.
- Brand Insights — brand totals across all inboxes. Brand-by-inbox detail is not included in this snapshot.
- Workflow Analytics — mapped event totals and distinct tickets affected, where a workflow file was included.
- Folder Share and Team Performance — first-allocation shares and current open workload grouped by pseudonymised agent reference, where assignment history was included.
- Ticket Analytics — aggregate-only snapshot view. It does not expose ticket references or individual ticket details.

**Live Operations remains a synthetic demonstration workbench.** The sanitised snapshot contains no ticket references, subjects, message details or individual source rows, so it cannot populate a real ticket queue or open real ticket timelines. Roster, shift coverage, SLA, response time, handling time, audit history, reliability incidents and dispatch controls are not populated by this import.

**Access and approval:** the GitHub Pages dashboard is public and unauthenticated. Import is a browser-memory convenience, not an access-control or confidentiality boundary. Only use company-approved, sanitised aggregate snapshots on an approved device and in line with the data owner's/security team's instructions. Do not import customer-level exports, raw ticket IDs, subjects, message content or direct colleague identifiers. The snapshot is point-in-time: the dashboard disables the period selector while it is loaded. The imported data exists only in JavaScript memory for the current tab. It is not uploaded, written to browser storage or connected to a backend. **Use demo** returns to synthetic sample data; refreshing or closing the tab clears the import.

## Pseudonym key

Generate a 32-byte random workspace key in the studio and save it to an approved private location. Reuse the same key for later imports when consistent agent references are required. The key is used as an HMAC-SHA-256 key; raw agent identifiers are not exported.

Do not commit, email, upload or include the key with any reporting file. The studio does not retain it. Losing the key means later pseudonymous agent references will change.

## Outputs

The studio produces one aggregate JSON snapshot and five aggregate CSVs:

- Inbox summary — ticket-record count, first assignments, resolved, open and unassigned.
- Brand summary — approved brand counts and share.
- Agent allocation — keyed agent reference, inbox, first assignments, first-assignment share and current open workload.
- Workflow summary — event count and distinct tickets affected, separately.
- Data quality — row counts, skipped rows, duplicates and mapping warnings.

Ticket references and source rows are used only in memory to join and deduplicate. They are not included in outputs. No subject, body, email address, vehicle identifier, attachment, note or free-text source field is exported.

## Interpretation and limits

- A ticket record in the current-state input is not automatically a ticket received during the selected dashboard period. The output labels this as **Ticket records**, not received volume.
- Current open workload is a state snapshot. It is not historical allocation volume.
- First-assignment share uses distinct tickets with one unambiguous initial-assignment event as the denominator, per inbox. Handover, reassignment and recovery are separate workflow activity.
- Workflow event count and distinct tickets affected are different measures and may overlap across event types.
- The tool does not estimate first response, elapsed resolution, active handling time, SLA performance, reopen rate, productivity ranking or scheduled-hours fairness.
- Date-only values are treated as UTC dates. Datetimes without an explicit timezone are not interpreted; they are counted as ambiguous.
- Duplicate ticket rows are skipped after the first matching ticket reference, and the quality report warns about them. Review the source export before relying on the totals.
- Assignment rows that are missing required values, do not join to the ticket snapshot, conflict with the ticket inbox, or contain ambiguous first-assignment duplicates are excluded and reported.

## Operational boundary

This is a local sanitisation and reporting tool only. It does not connect to the Citrix virtual machine, Outlook, the Excel tracker, Microsoft 365, the Cloudflare Worker or D1. It cannot change assignments, categories, roster records, configuration or mailbox state.

Do not import real operational exports until the company's data owner/security process has approved the export, the fields, the location where the files are processed, the generated reports, and their retention. The public dashboard uses synthetic sample data by default. It can also accept a manually imported, company-approved sanitised aggregate JSON snapshot for aggregate analytics; individual ticket queues and details remain synthetic. The local studio and public dashboard are not an authenticated private management dashboard.
