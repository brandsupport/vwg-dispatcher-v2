# Real operational export mapping worksheet

Use this worksheet only after the relevant data owner and security process have approved the export, fields, processing device and report handling. Do not paste real customer, vehicle, colleague or ticket data into this worksheet or commit completed copies to this public repository.

The actual tracker is exported as one Excel workbook containing five worksheets. Upload that complete `.xlsx` or `.xls` file once in Reporting Studio; do not export or split tabs. Select `Assignments` for ticket/current state, `Activity Log` twice (first-assignment history and workflow/event history), and `Team & Shifts` for the roster. The other two tabs remain in the workbook and are ignored. **`Event Type` contains the actual dispatcher event name; `Assignment Flag` contains TRUE/FALSE.** The old mapping was reversed and caused missing workflow and first-assignment results.

## 1. Ticket / current-state data — `Assignments` worksheet (required)

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Stable ticket key used only in browser memory to join and deduplicate rows |
| Inbox / folder | Yes | `Source Inbox` | Must resolve to Agency Detags, Detags, Transfers or Unadopts |
| Tracker assignment status | Yes | `Status` | Dispatcher state such as Queued, Assigned, Recovered or Needs Review. It is not a resolved/open lifecycle status and must not be used to calculate resolution rate or solve time |
| Current owner | Yes | `Current Owner` | Direct owner value is converted to a keyed pseudonymous reference; unassigned values are treated as unassigned |
| Received timestamp | No | `Received At (UK)` | Parsed as a UK-local calendar date (`Europe/London`); common tracker date strings and Excel date serials are supported |
| Brand | No | **Not present** | Brand reporting is marked Not recorded. The Studio will not classify every ticket as Other or infer brand from email subject or folder |

The source must contain one current-state row per unique ticket. Confirm that `Current Owner`, dispatcher `Status` and `Source Inbox` are the latest authoritative values. A blank `Current Owner` is counted separately as **No current owner**, not as an unassigned open ticket. A duplicate `Email Key / ID` is skipped after the first row, so the export must be sorted or filtered to ensure the current row is first. The sanitised ticket queue retains only a keyed HMAC ticket reference, inbox, tracker status, optional explicit Brand/lifecycle fields, received date and owner display name/reference; it does not retain subjects, notes or raw Outlook IDs.

## 2. Assignment history — `Activity Log` worksheet (optional)

Select the `Activity Log` worksheet in the workbook selector for the Assignment history input.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Must join to a ticket in Assignments |
| Original first assignee | Yes | `Original Assignee` | Matched locally to `Outlook Category (exact)` and converted to the same keyed agent reference |
| Actual event name | Yes | `Event Type` | Must be mapped to this field. Examples: `AUTO_ASSIGNMENT`, `MANUAL_ASSIGNMENT_CAPTURED`, `HANDOVER` |
| First-assignment flag | Yes for first-allocation metrics | `Assignment Flag` | Boolean TRUE/FALSE. Only a TRUE flag on `AUTO_ASSIGNMENT` or `MANUAL_ASSIGNMENT_CAPTURED` contributes a successful first allocation |
| Inbox / folder | No | `Source Inbox` | Must match the current-state inbox |
| Event timestamp | No | `Event Time (Egypt)` | Interpreted as an Egypt-local (`Africa/Cairo`) date/time. The source local timestamp is preserved; no UTC offset is invented |

**First-allocation rule:** `AUTO_ASSIGNMENT` with `Assignment Flag = TRUE` counts as an automatic first allocation. `MANUAL_ASSIGNMENT_CAPTURED` with `Assignment Flag = TRUE` counts as a manual first allocation. A FALSE flag, pending verification, handover, category removal/restoration, recovery, baseline registration or queued event does not count as a first allocation. The Boolean flag—not the event label alone—distinguishes first allocations from subsequent activity.

## 3. Workflow history — `Activity Log` worksheet (optional)

Select the same `Activity Log` worksheet again in the Workflow / activity input. This is a second mapping of the same tab, not a second file. Map:

| Studio field | Required? | Exact source header |
|---|---|---|
| Ticket reference | Yes | `Email Key / ID` |
| Workflow event type | Yes | `Event Type` |
| Original assignee | No | `Original Assignee` |
| Current owner at event | No | `Current Owner` |
| First-assignment flag | No | `Assignment Flag` (TRUE/FALSE) |
| Inbox / folder | No | `Source Inbox` |
| Event timestamp | No | `Event Time (Egypt)` |

`Event Type` is the event category. `Assignment Flag` is a Boolean first-assignment marker. The sanitised snapshot retains individual event rows with a pseudonymous ticket reference, timestamp, event name, inbox, original/current owner display names and the flag. Raw `Email Key / ID` and `Details / Notes` are removed.

Current source event interpretation:

| `Event Type` | Sanitised event / first-allocation treatment |
|---|---|
| `AUTO_ASSIGNMENT` | Automatic first allocation only when `Assignment Flag = TRUE` |
| `MANUAL_ASSIGNMENT_CAPTURED` | Manual first allocation only when `Assignment Flag = TRUE` |
| `AUTO_ASSIGNMENT_PENDING_VERIFICATION` | Pending verification; not a successful first allocation |
| `HANDOVER` | Handover; not a first allocation |
| `CATEGORY_REMOVAL_DETECTED`, `CATEGORY_REMOVAL_PENDING`, `CATEGORY_REMOVAL_VERIFY_PENDING` | Category/removal flag events |
| `CATEGORY_RESTORED`, `RESTORATION_MARKER_REMOVED` | Recovery/restoration events |
| `RECOVERY_REQUIRES_REVIEW` | Recovery held for review |
| `RECOVERY_FAILED`, `ASSIGNMENT_CONFIRMATION_FAILED`, `PENDING_ITEM_NOT_FOUND`, `MULTIPLE_CATEGORIES_PENDING` | Exception / failed-verification events |
| `BASELINE_REGISTERED` | Baseline event; not a first allocation |
| `NEW_MAIL_QUEUED` | Received / queued event; not a first allocation |

Unknown or unmapped event labels remain excluded and appear in data-quality checks.

## 4. Team & Shifts roster — optional

Select the **Team & Shifts** worksheet from the same five-tab workbook in the roster input.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Agent identity | Yes | `Outlook Category (exact)` | Used only in browser memory to join with `Original Assignee` / `Current Owner`, then converted to the same keyed pseudonymous agent reference |
| Shift group | Yes | `Shift Group` | Only `Early` and `Late` are accepted |
| Shift start | Yes | `Shift Start (Egypt)` | Must be `HH:mm`; retained as Egypt-local schedule metadata |
| Shift end | Yes | `Shift End (Egypt)` | Must be `HH:mm` and later than the shift start |
| Active this fortnight | Yes | `Active This Fortnight` | Accepts Yes/No (or equivalent Boolean values) |

`Outlook Category (exact)` is the join key; `Colleague` is the separate human-readable display name. The category is used only in browser memory to derive the keyed agent reference and is removed. The display name is retained in the local JSON snapshot and imported dashboard so managers can identify each roster profile. **The JSON therefore contains staff display names and must be stored only in an approved private location.** Shift group, start/end times and active-fortnight status are retained alongside the HMAC agent reference.

**Use the same private workspace key** for the Assignments, Activity Log and Team & Shifts inputs in every reporting run. Otherwise the pseudonymous agent references will not join, and the Dashboard will flag roster entries that do not match the ticket or assignment data.

The roster file must contain one unique row per Outlook category. Invalid shift groups, malformed times, duplicate categories or invalid Yes/No values are skipped and counted in data-quality checks. The source does not provide inbox eligibility, breaks, absence dates or minimum staffing targets; these must not be inferred from the shift schedule.

## 5. Fields deliberately retained in the sanitised local snapshot

The JSON snapshot contains a read-only ticket queue with HMAC-pseudonymised ticket references, inbox, tracker status, optional explicit Brand/lifecycle fields, received date and current-owner reference/name. It also contains individual Activity Log rows with HMAC ticket reference, event type, inbox, local timestamp, original/current owner reference/name and Boolean first-assignment flag. Team & Shifts display names are retained for manager use. These names and event metadata are sensitive enough to require approved local processing and private storage. The workbook contents are not uploaded to a server.

## 6. Columns that must remain unmapped

Do not map or export `Email Subject`, `Handover Notes`, `Details / Notes`, `LoginUserEmail (optional)`, email/message content, customer names, customer email addresses, telephone numbers, postal addresses, vehicle registration marks, VINs, finance/contract numbers, attachment names, `Outlook Entry ID` or `Outlook Store ID`. The reporting schema has no destination for them. Do not add them to the JSON export, dashboard or this public repository.

Other fields such as Incident Count, Last Incident At, Last Verified At, Record Updated At, Allocated At (Egypt), Roster Period Start, Pending Since (Egypt), Last Category State and Handover Count are not part of the current report mapping. They should remain unmapped until a separate, approved metric is defined.

## 7. Timestamp handling

`Received At (UK)` is parsed as a UK-local calendar date (`Europe/London`); common DD/Mon/YYYY or DD/MM/YYYY tracker values, ISO values and Excel date serials are supported. `Event Time (Egypt)` is parsed as an Egypt-local calendar date (`Africa/Cairo`) from the supplied local timestamp; the original local timestamp string is preserved. No fixed UTC offset is invented. These fields support calendar grouping, not elapsed-time or SLA calculations. No response-time, handling-time or resolution-duration metric is calculated.

## 8. New dispatcher/tracker fields required for complete management reporting

The current workbook does not contain Brand or ticket lifecycle outcomes. These measures require an explicit source change:

| Measure | Required addition | Rule |
|---|---|---|
| Brand volumes | Controlled `Brand` field in Assignments (or validated immutable brand reference) | Approved values: Volkswagen, Audi, Škoda, SEAT, CUPRA, Volkswagen Commercial Vehicles, Other / unclassified. Never infer from subject or inbox |
| Resolution state | `Lifecycle Status` populated for every ticket | Distinguish open/in progress, resolved/closed and reopened. The current `Status` is a dispatcher assignment/recovery state |
| Solve time | `Resolved At (UK)` alongside `Received At (UK)` | Use `Europe/London` timezone rules; do not calculate from date-only or ambiguous timestamps |
| Resolver attribution | `Resolved By` stable colleague/category key | Allows resolved-by-agent counts and an agreed per-agent attribution rule |
| Reopen reporting | `REOPENED` Activity Log event and current lifecycle state | Distinguishes ticket lifecycle from additional assignment events |
| First response (if required) | `First Response At (UK)` and first-responder identity/event | First assignment is not the same as first response |

A per-agent performance view should report resolved-by-agent counts, an explicitly defined resolution rate and solve-time percentiles only after the organisation agrees the denominator/attribution rule. Do not combine assignments, handovers and resolutions into one productivity score. Before changing VBA, verify the exact installed dispatcher/tracker build and schema compatibility; do not install a module compiled for a different tracker version.

## 9. Approval and reconciliation sign-off

Complete this section outside the public repository, in the organisation's approved change/data-governance location.

| Review item | Confirmed by data owner / security reviewer |
|---|---|
| Export purpose and reporting scope approved | |
| Complete five-tab workbook exported once; no manual worksheet splitting required | |
| Source system and exact workbook sheet identified | |
| Assignments export contains one current-state row per unique Email Key / ID | |
| Current row is first where duplicate keys are present | |
| Activity Log contains the relevant event history and stable ticket key |
| Team & Shifts roster export is approved and has one unique row per exact Outlook category |
| Outlook category values join consistently to Original Assignee and Current Owner |
| Shift groups, Egypt-local start/end values and active-fortnight status are confirmed |
| Same private pseudonym key is used consistently for all exports | |
| Original Assignee is confirmed to represent the original first allocation throughout the activity history | |
| `auto assigned` is confirmed to represent an initial assignment, not an automated reassignment | |
| Manual first assignments are either separately identified or explicitly excluded from allocation share | |
| Inbox/folder mapping confirmed against the four monitored workstreams | |
| Dispatcher assignment-status values confirmed and kept separate from lifecycle outcomes | |
| Brand field and controlled population rule approved (or explicitly marked unavailable) | |
| Lifecycle status, resolved timestamp and resolver fields approved (or explicitly marked unavailable) | |
| Category removal is a flag/detection event and category restoration is a recovery event | |
| Timestamp format and timezone offsets confirmed | |
| Prohibited personal/customer/vehicle/internal mailbox identifiers excluded | |
| Approved processing device/location and report retention confirmed | |
| Data owner / security approval reference recorded in approved location | |

## 8. First-run reconciliation

Before accepting a report, compare the Studio's preview with the approved source totals. Confirm that ticket records equal the four inbox totals; first-assignment totals do not exceed ticket records; and records with/without a current owner reconcile to ticket totals. Resolved plus outstanding is checked only when a complete lifecycle status is supplied. Brand totals remain Not recorded until an explicit Brand field is present. Review every skipped, duplicate, unmapped and ambiguous row before downloading the snapshot.

**Do not enter production data until approval is explicit.** This public repository and dashboard are not private data stores or access-controlled reporting systems.
