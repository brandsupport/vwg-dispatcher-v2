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
| Inbox / folder | No | `Source Inbox` | Must match the current-state inbox |
| Assignment timestamp | No | `Event Time (Egypt)` | Optional quality field; must include explicit UTC offset to pass timestamp checks |

**Initial allocation rule:** `AUTO_ASSIGNMENT` is counted as an automatic first allocation and `MANUAL_ASSIGNMENT_CAPTURED` as a manual first allocation. Exact duplicate rows for the same ticket, original assignee, inbox and event are de-duplicated. Conflicting initial records remain excluded as ambiguous. Do not count `HANDOVER`, category removals, recovery, queue state or system failures as first allocations.

## 3. Workflow history — `Activity Log` worksheet (optional)

Select the same `Activity Log` worksheet again in the Workflow / activity input. This is a second mapping of the same tab, not a second file. Map:

| Studio field | Required? | Exact source header |
|---|---|---|
| Ticket reference | Yes | `Email Key / ID` |
| Workflow event type | Yes | `Event Type` |
| Inbox / folder | No | `Source Inbox` |
| Event timestamp | No | `Event Time (Egypt)` |

Do **not** map `Assignment Flag` as the event type. It is a separate Boolean value (`TRUE` / `FALSE`). Map it only to the optional Assignment flag field.

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

## 5. Columns that must remain unmapped

Do not map or export `Email Subject`, `Handover Notes`, `Details / Notes`, `LoginUserEmail (optional)`, email/message content, customer names, customer email addresses, telephone numbers, postal addresses, vehicle registration marks, VINs, finance/contract numbers, attachment names, `Outlook Entry ID` or `Outlook Store ID`. The reporting schema has no destination for them. Do not add them to the JSON export, dashboard or this public repository.

Other fields such as Incident Count, Last Incident At, Last Verified At, Record Updated At, Allocated At (Egypt), Roster Period Start, Pending Since (Egypt), Last Category State and Handover Count are not part of the current report mapping. They should remain unmapped until a separate, approved metric is defined.

## 6. Timestamp and resolution handling

The source headers explicitly identify local time: `Received At (UK)` and `Resolved At (UK)` are interpreted in Europe/London; `Event Time (Egypt)` is interpreted in Africa/Cairo. Date-dependent daylight-saving rules are applied, and ambiguous or nonexistent daylight-saving clock times are excluded rather than guessed. ISO timestamps with an explicit offset remain preferred.

Elapsed solve time is calculated only when a ticket has an explicit resolved state (or a valid resolved timestamp when the state field is unavailable) and both received and resolved instants are valid. The snapshot reports average, median and p90 elapsed minutes for timed resolved tickets. This is elapsed clock time, not business-hours handling time. Per-agent resolved counts require an explicit Resolved By field. A formal agent resolution rate is not claimed until the business agrees a denominator and the tracker reliably records ownership over the ticket lifecycle.

## 7. Approval and reconciliation sign-off

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

## 8. First-run reconciliation

Before accepting a report, compare the Studio's preview with the approved source totals. Confirm that ticket records equal the four inbox totals; when resolution tracking is enabled, resolved plus outstanding equals ticket records; first-assignment totals do not exceed ticket records; and current owner workload does not exceed outstanding work. Brand mix remains unclassified until an approved Brand field is added. Resolution metrics remain unavailable until a compatible tracker records Resolution Status, Resolved At (UK) and (for per-agent counts) Resolved By. Review every skipped, duplicate, unmapped and ambiguous row. Only then download the sanitised JSON and import it into Dispatcher 2.0.

**Do not enter production data until approval is explicit.** This public repository and dashboard are not private data stores or access-controlled reporting systems.
