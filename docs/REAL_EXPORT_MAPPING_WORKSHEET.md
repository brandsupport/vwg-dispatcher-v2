# Real operational export mapping worksheet

Use this worksheet only after the relevant data owner and security process have approved the export, fields, processing device and report handling. Do not paste real customer, vehicle, colleague or ticket data into this worksheet or commit completed copies to this public repository.

The current tracker is exported as one Excel workbook containing six worksheets. Upload that complete `.xlsx` or `.xls` file once in Reporting Studio; do not split the tabs. Select `Assignments` for ticket/current state, `Activity Log` twice (assignment history and workflow history), `Team & Shifts` for the roster and the optional `Email Details` tab for email lifecycle metrics. `Dashboard` and `Settings` remain in the workbook and are ignored. **In Activity Log, column B (`Event Type`) holds the event name; column G (`Assignment Flag`) is only TRUE/FALSE.**

## 1. Ticket / current-state data — `Assignments` worksheet (required)

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Stable ticket key used only in browser memory to join and deduplicate rows |
| Inbox / folder | Yes | `Source Inbox` | Must resolve to Agency Detags, Detags, Transfers or Unadopts |
| Current status | Yes | `Status` | Resolved / Closed / Complete count as resolved; other or unknown statuses are conservatively treated as open and flagged |
| Current owner | Yes | `Current Owner` | Direct owner value is converted to a keyed pseudonymous reference; unassigned values are treated as unassigned |
| Received timestamp | No | `Received At (UK)` | Only ISO date or ISO datetime with an explicit timezone is accepted for daily grouping |
| Brand | No today | **Not present** | Add an explicit Brand field in a compatible tracker build. Until then tickets remain unclassified; never infer brand from email subject |
| Resolution Status | No today | **Not present** | Proposed explicit Open / Resolved / Closed / Reopened state; do not reuse operational Status |
| Resolved At (UK) | No today | **Not present** | Proposed completion timestamp; required with Received At (UK) for elapsed solve time |
| Resolved By | No today | **Not present** | Proposed exact Outlook category of the colleague who completed the ticket |

The source must contain one current-state row per unique ticket. Confirm that `Current Owner`, `Status` and `Source Inbox` are the latest authoritative values. A duplicate `Email Key / ID` is skipped after the first row, so the export must be sorted or filtered to ensure the current row is first.

## 2. Assignment history — `Activity Log` worksheet (optional)

Select the `Activity Log` worksheet in the workbook selector for the Assignment history input.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Must join to a ticket in Assignments |
| New owner / assigned agent | Yes | `Original Assignee` | Used for keyed pseudonymisation; confirm this remains the original first-assigned colleague in every activity row |
| Assignment event type | Yes | `Event Type` | `AUTO_ASSIGNMENT` and `MANUAL_ASSIGNMENT_CAPTURED` are explicit first allocations (automatic / manual respectively) |
| Inbox / folder | No | `Folder Path` (column D) | The original Activity Log folder at the time of the event; it can differ from the ticket’s current Inbox after a move |
| Assignment timestamp | No | `Event Time (Egypt)` | Optional quality field; must include explicit UTC offset to pass timestamp checks |

**Initial allocation rule:** `AUTO_ASSIGNMENT` is counted as an automatic first allocation and `MANUAL_ASSIGNMENT_CAPTURED` as a manual first allocation. Exact duplicate rows for the same ticket, original assignee, inbox and event are de-duplicated. Conflicting initial records remain excluded as ambiguous. Do not count `HANDOVER`, category removals, recovery, queue state or system failures as first allocations.

## 3. Workflow history — `Activity Log` worksheet (optional)

Select the same `Activity Log` worksheet again in the Workflow / activity input. This is a second mapping of the same tab, not a second file. Map:

| Studio field | Required? | Exact source header |
|---|---|---|
| Ticket reference | Yes | `Email Key / ID` |
| Workflow event type | Yes | `Event Type` |
| Inbox / folder | No | `Folder Path` (column D) |
| Event timestamp | No | `Event Time (Egypt)` |

The tracker Activity Log schema is A:I: A `Event Time (Egypt)`, B `Event Type`, C `Email Key / ID`, D `Folder Path`, E `Original Assignee`, F `Current Owner`, G `Assignment Flag` (Boolean `TRUE` / `FALSE`), H `Incident Count`, I `Details`. Map B as the event type and D as the historical Inbox/folder. Do **not** map G as the event type. Never map I `Details` because it can contain subjects or personal data. Original assignment counts remain with the original folder even if the email later moves.

Current event interpretation in the sanitiser (using the actual column B event codes):

| Event Type | Sanitised event / treatment |
|---|---|
| `AUTO_ASSIGNMENT` | Automatic first allocation |
| `MANUAL_ASSIGNMENT_CAPTURED` | Manual first allocation |
| `HANDOVER` | Handover event; does not inflate first-allocation count |
| `CATEGORY_REMOVAL_DETECTED`, `CATEGORY_REMOVAL_PENDING`, `CATEGORY_REMOVAL_VERIFY_PENDING` | Flag / review |
| `CATEGORY_RESTORED`, `RESTORATION_MARKER_REMOVED`, `RECOVERY_STATE_RECONCILED`, `RECOVERED` | Recovery / restoration |
| `RECOVERY_BLOCKED`, `RECOVERY_REQUIRES_REVIEW` | Recovery hold / review |
| `QUEUE_SAVE_FAILED`, `PENDING_ITEM_NOT_FOUND`, `MULTIPLE_CATEGORIES_PENDING`, `RECOVERY_FAILED` and known handler failures | Exception / failure |
| `QUEUED`, `BACKLOG_NEEDS_REVIEW`, `NEW_MAIL_NEEDS_REVIEW` | Queue / review event |
| `BASELINE_REGISTERED`, `BASELINE_COMPLETE` | Baseline state; not a first allocation |

There is no distinct reassignment flag in the values supplied so far. Do not infer reassignment from a handover or manual assignment. Counts for unknown/unmapped event labels remain excluded and appear in data-quality checks.

## 4. Team & Shifts roster — optional

Select the **Team & Shifts** worksheet from the same six-tab workbook in the roster input.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Agent identity | Yes | `Outlook Category (exact)` | Used only in browser memory to join with `Original Assignee` / `Current Owner`, then converted to the same keyed pseudonymous agent reference |
| Shift group | Yes | `Shift Group` | Only `Early` and `Late` are accepted |
| Shift start | Yes | `Shift Start (Egypt)` | Must be `HH:mm`; retained as Egypt-local schedule metadata |
| Shift end | Yes | `Shift End (Egypt)` | Must be `HH:mm` and later than the shift start |
| Active this fortnight | Yes | `Active This Fortnight` | Accepts Yes/No (or equivalent Boolean values) |
| Private display name | No | `Colleague` | Used only for the separate private agent-name lookup; never included in the shared JSON |

`Colleague` is not required as a second identity field; the exact Outlook category is the join key. The roster may include inactive colleagues so the snapshot can distinguish the whole roster from the active-fortnight headcount. Shift metadata is included only as pseudonymous agent reference, shift group, start/end time and active-fortnight Boolean. Colleague names and Outlook category values are not written to the JSON snapshot or public repository. After processing, the Studio offers a separate `dispatcher-private-agent-name-lookup.csv` download. Keep it private. Import the sanitised JSON into the dashboard first, then use **Import private names** to load this CSV locally in the same browser tab. The name lookup is not embedded in the JSON.

**Use the same private workspace key** for the Assignments, Activity Log and Team & Shifts inputs in every reporting run. Otherwise the pseudonymous agent references will not join, and the Dashboard will flag roster entries that do not match the ticket or assignment data.

The roster file must contain one unique row per Outlook category. Invalid shift groups, malformed times, duplicate categories or invalid Yes/No values are skipped and counted in data-quality checks. The source does not provide inbox eligibility, breaks, absence dates or minimum staffing targets; these must not be inferred from the shift schedule.

## 5. Email Details lifecycle metrics — optional

Select the **Email Details** worksheet from the same tracker workbook, or a separate Email Details CSV, as the optional Email lifecycle metrics source.

| Studio field | Exact Email Details header | Treatment |
|---|---|---|
| Email key | `Email Key / ID` (A) | Used only in browser memory to de-duplicate rows; never exported |
| Brand | `Brand` (C) | Aggregated into email brand counts; blank/unknown values remain missing or unclassified |
| Order number | `Order Number` (D) | Raw value never exported; used only to count rows where both Order Number and VIN are blank |
| VIN | `VIN` (E) | Raw value never exported; used only to count rows where both Order Number and VIN are blank |
| Received timestamp | `Received At (UK)` (F) | Parsed in Europe/London and grouped by UTC receipt date |
| First source Inbox | `First Source Inbox` (G) | Used for the four-Inbox breakdown; remains the original Inbox when a message moves |
| Original assignee | `Original Assignee` (I) | HMAC-pseudonymised using the same private workspace key |
| Current owner | `Current Owner` (J) | HMAC-pseudonymised using the same private workspace key |
| Completion status | `Completion Status` (K) | Only Open, Missing - Confirmation Pending and Completed are recognised |
| First missing timestamp | `First Missing At (UK)` (L) | Fallback detection timestamp when Completion Time is blank |
| Completion timestamp | `Completion Time (UK)` (M) | First-missing full-scan detection time; not business resolution or first response |
| Handling duration | `Handling Time (Minutes)` (N) | Existing tracker measure; included in duration summaries for Completed rows only |

The Studio does not map Internet Message ID (B), Last Monitored Inbox (H) or Metadata Captured At (O). It never exports Email Key / ID, Internet Message ID, Order Number, VIN, email subjects, message content, individual source rows or direct colleague names. The order and VIN columns are used only as blank/nonblank flags in memory.

**Completion semantics:** the dispatcher first records `Missing - Confirmation Pending` when a successful full scan no longer sees the email in any of the four monitored Inboxes. A second successful full scan at least 120 seconds later must confirm the absence before the state becomes `Completed`. A move between monitored Inboxes should still be seen by the next full scan and should not be treated as completion. The saved Completion Time is the first-missing detection time. Handling Time is therefore receipt-to-first-missing detection for confirmed exits, not first-response time, active handling time or business solve time.

Only completed rows with a valid non-negative stored handling duration contribute to average, median and p90 handling-time summaries. Email brand mix is a separate lifecycle measure; it must not be combined with distinct ticket brand totals from the Assignments/current-state source. Email `Completed` must not be treated as ticket `Resolved`.

## 6. Columns that must remain unmapped

Do not map or export `Email Subject`, `Handover Notes`, `Details / Notes`, `LoginUserEmail (optional)`, email/message content, customer names, customer email addresses, telephone numbers, postal addresses, vehicle registration marks, finance/contract numbers, attachment names, `Outlook Entry ID` or `Outlook Store ID`. Email Key / ID, Internet Message ID, Order Number and VIN may be selected only for the narrowly defined local duplicate-removal / blank-count operations in the Email Details mapping; their values must never appear in the JSON, CSVs, dashboard or this public repository.

Other fields such as Incident Count, Last Incident At, Last Verified At, Record Updated At, Allocated At (Egypt), Roster Period Start, Pending Since (Egypt), Last Category State and Handover Count are not part of the current report mapping. They should remain unmapped until a separate, approved metric is defined.

## 7. Timestamp and resolution handling

The source headers explicitly identify local time: `Received At (UK)`, `First Missing At (UK)`, `Completion Time (UK)` and `Resolved At (UK)` are interpreted in Europe/London; `Event Time (Egypt)` is interpreted in Africa/Cairo. Date-dependent daylight-saving rules are applied, and ambiguous or nonexistent daylight-saving clock times are excluded rather than guessed. ISO timestamps with an explicit offset remain preferred. Email Completion Time is the first-missing full-scan detection time saved by the dispatcher, not a timestamp for first response or business resolution.

Elapsed solve time is calculated only when a ticket has an explicit resolved state (or a valid resolved timestamp when the state field is unavailable) and both received and resolved instants are valid. The snapshot reports average, median and p90 elapsed minutes for timed resolved tickets. This is elapsed clock time, not business-hours handling time. Per-agent resolved counts require an explicit Resolved By field. A formal agent resolution rate is not claimed until the business agrees a denominator and the tracker reliably records ownership over the ticket lifecycle.

## 8. Approval and reconciliation sign-off

Complete this section outside the public repository, in the organisation's approved change/data-governance location.

| Review item | Confirmed by data owner / security reviewer |
|---|---|
| Export purpose and reporting scope approved | |
| Complete six-tab workbook exported once; Email Details included when approved; no manual worksheet splitting required | |
| Email Details source has the expected A:O headers and stable Email Key / ID values for local de-duplication | |
| Email Key / ID, Internet Message ID, Order Number and VIN values are absent from the JSON output | |
| Email completion status values and the two-scan / 120-second exit confirmation rule are understood | |
| Email handling time is labelled receipt-to-first-missing detection, not first response or business resolution | |
| Source system and exact workbook sheet identified | |
| Assignments export contains one current-state row per unique Email Key / ID | |
| Current row is first where duplicate keys are present | |
| Activity Log contains the relevant event history and stable ticket key |
| Team & Shifts roster export is approved and has one unique row per exact Outlook category |
| Outlook category values join consistently to Original Assignee and Current Owner |
| Shift groups, Egypt-local start/end values and active-fortnight status are confirmed |
| Same private pseudonym key is used consistently for all exports | |
| `Event Type` (column B) is the event name and `Assignment Flag` (column G) is Boolean | |
| Original Assignee is confirmed to represent the original first allocation throughout the activity history | |
| `auto assigned` is confirmed to represent an initial assignment, not an automated reassignment | |
| Manual first assignments are either separately identified or explicitly excluded from allocation share | |
| Inbox/folder mapping confirmed against the four monitored workstreams | |
| Operational `Status` is not confused with the proposed `Resolution Status` field | |
| Brand mapping source and approved values confirmed, or brand reporting explicitly remains unavailable | |
| Resolved state, completion timestamp and resolver attribution are captured by a compatible tracker build | |
| Status values and resolved/open interpretation confirmed | |
| Category removal is a flag/detection event and category restoration is a recovery event | |
| Timestamp format and timezone offsets confirmed | |
| Prohibited personal/customer/vehicle/internal mailbox identifiers excluded | |
| Approved processing device/location and report retention confirmed | |
| Data owner / security approval reference recorded in approved location | |

## 9. First-run reconciliation

Before accepting a report, compare the Studio's preview with the approved source totals. Confirm that ticket records equal the four Inbox totals; when ticket-resolution tracking is enabled, resolved plus outstanding equals ticket records; first-assignment totals do not exceed ticket records; and current owner workload does not exceed outstanding work. If Email Details is supplied, confirm that its status counts reconcile to Email Details rows, each first-source-Inbox total reconciles, brand totals reconcile, and confirmed exits do not exceed completed rows. Check that raw keys, message IDs, order numbers and VIN values are absent from the JSON. Review every skipped, duplicate, unmapped and ambiguous row. Only then download the sanitised JSON and import it into Dispatcher 2.0.

**Do not enter production data until approval is explicit.** This public repository and dashboard are not private data stores or access-controlled reporting systems.
