# Real operational export mapping worksheet

Use this worksheet only after the relevant data owner and security process have approved the export, fields, processing device and report handling. Do not paste real customer, vehicle, colleague or ticket data into this worksheet or commit completed copies to this public repository.

The tracker is one Excel workbook with five worksheets. Upload the complete `.xlsx` or `.xls` once; do not split it. Select `Assignments` for current ticket state and select the same `Assignments` tab again for initial-allocation history. Select `Activity Log` for workflow events, and `Team & Shifts` for roster data. The other two tabs remain in the workbook and are ignored. On `Assignments`, `Assignment Flag` is TRUE/FALSE. On `Activity Log`, `Event Type` contains the actual event name; `Assignment Flag` is only a Boolean marker.

## 1. Ticket / current-state data — `Assignments` worksheet (required)

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Stable ticket key used only in browser memory to join and deduplicate rows |
| Inbox / folder | Yes | `Source Inbox` | Must resolve to Agency Detags, Detags, Transfers or Unadopts |
| Current status | Yes | `Status` | Resolved / Closed / Complete count as resolved; other or unknown statuses are conservatively treated as open and flagged |
| Current owner | Yes | `Current Owner` | Direct owner value is converted to a keyed pseudonymous reference; unassigned values are treated as unassigned |
| Received timestamp | No | `Received At (UK)` | Only ISO date or ISO datetime with an explicit timezone is accepted for daily grouping |
| Brand | No | **Not present** | Leave unmapped. Tickets will be Other / unclassified; do not infer brand from email subject |

The source must contain one current-state row per unique ticket. Confirm that `Current Owner`, `Status` and `Source Inbox` are the latest authoritative values. A duplicate `Email Key / ID` is skipped after the first row, so the export must be sorted or filtered to ensure the current row is first.

## 2. Initial assignment history — `Assignments` worksheet (optional but recommended)

Select the same `Assignments` worksheet again in the Assignment history input. This mapping reads the original assignee, Boolean flag, status and allocation timestamp from the assignment register.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Joins the allocation record to its unique current-state ticket |
| New owner / assigned agent | Yes | `Original Assignee` | Pseudonymised with the same key as Current Owner and Team & Shifts category |
| Assignment type | Yes | `Assignment Flag` | TRUE/1 means the dispatcher recorded an automatic first allocation; FALSE is not counted |
| Inbox / folder | No | `Source Inbox` | Must match the current-state inbox |
| Assignment timestamp | No | `Allocated At (Egypt)` | Egypt-local wall-clock timestamp converted with IANA timezone rules |
| Assignment status | No | `Status` | Only Assigned, Handed Over or Recovered confirms a successful first-allocation record; pending/queued/review/failed states are not counted |

**Counting rule:** a TRUE Assignment Flag plus a successful Status on the Assignments row counts once as an initial automatic allocation. Handovers and recoveries do not create additional first allocations. MANUAL_ASSIGNMENT_CAPTURED is shown separately as a workflow event; it is not added to automatic first-allocation share because the current source does not reliably identify whether each manual event is a first allocation or a later reassignment.

## 3. Workflow / activity history — `Activity Log` worksheet (optional)

Select the `Activity Log` worksheet in the Workflow / activity input. Map:

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Used only in memory, then replaced by a keyed Ticket reference |
| Workflow event type | Yes | `Event Type` | Contains names such as AUTO_ASSIGNMENT, HANDOVER, CATEGORY_RESTORED and MANUAL_ASSIGNMENT_CAPTURED |
| Inbox / folder | No | `Source Inbox` | Must match one of the four monitored inboxes |
| Event timestamp | No | `Event Time (Egypt)` | Egypt-local value converted to UTC with Africa/Cairo timezone rules |
| Original assignee | No | `Original Assignee` | Joined locally to Team & Shifts and then replaced by approved display name + pseudonymous reference |
| Current owner | No | `Current Owner` | Shown separately from original assignee |
| Incident count | No | `Incident Count` | Integer context from the source row |

Do **not** map `Assignment Flag` as the event name; it is a TRUE/FALSE marker. Do not map `Details / Notes`; it may contain subjects or free text.

Activity Log Event Type is normalised to a fixed safe event category. The sanitiser recognises the saved dispatcher event codes, including automatic assignment, handover, manual assignment captured, category removal/restoration, reconciliation, queued state, dry-run previews and exceptions. Unknown event labels are skipped and counted in data-quality checks. Owner fields describe the ticket's original/current ownership, not a verified human actor who performed the event.

## 4. Team & Shifts roster — optional

Select the **Team & Shifts** worksheet from the same five-tab workbook in the roster input.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Agent identity / join key | Yes | `Outlook Category (exact)` | Used only in browser memory to join with Current Owner / Original Assignee, then converted to a keyed pseudonymous reference |
| Display name | No | `Colleague` | Retained as the approved internal display label for management and Activity Log screens; never used as the join key |
| Shift group | Yes | `Shift Group` | Only `Early` and `Late` are accepted |
| Shift start | Yes | `Shift Start (Egypt)` | Must be `HH:mm`; retained as Egypt-local schedule metadata |
| Shift end | Yes | `Shift End (Egypt)` | Must be `HH:mm` and later than the shift start |
| Active this fortnight | Yes | `Active This Fortnight` | Accepts Yes/No (or equivalent Boolean values) |

`Colleague` is the display name; `Outlook Category (exact)` is the private join key. The category is HMAC-pseudonymised and never written to JSON. The approved display name is retained in the browser-local snapshot so managers can recognise colleagues on internal Team Performance, Roster and Activity Log screens. The JSON contains personal display names and must be treated as an internal workforce report: keep it in approved private storage and do not post it publicly or share externally. Inactive colleagues stay in the directory but are excluded from active shift-coverage calculations.

**Use the same private workspace key** for the Assignments, Activity Log and Team & Shifts inputs in every reporting run. Otherwise the pseudonymous agent references will not join, and the Dashboard will flag roster entries that do not match the ticket or assignment data.

The roster file must contain one unique row per Outlook category. Invalid shift groups, malformed times, duplicate categories or invalid Yes/No values are skipped and counted in data-quality checks. The source does not provide inbox eligibility, breaks, absence dates or minimum staffing targets; these must not be inferred from the shift schedule.

## 5. Columns that must remain unmapped

Do not map or export `Email Subject`, `Handover Notes`, `Details / Notes`, `LoginUserEmail (optional)`, email/message content, customer names, customer email addresses, telephone numbers, postal addresses, vehicle registration marks, VINs, finance/contract numbers, attachment names, `Outlook Entry ID` or `Outlook Store ID`. The reporting schema has no destination for them. Do not add them to the JSON export, dashboard or this public repository.

`Incident Count` is used for event context and `Allocated At (Egypt)` for first-allocation timing. `Brand` is not present in the current Assignments register, so brand distribution is unavailable. The current saved dispatcher does not write a terminal resolved status, resolved timestamp or resolver identity, so resolution rate, elapsed resolution time and per-agent resolution rate cannot be calculated. `Last Incident At`, `Last Verified At`, `Record Updated At`, `Roster Period Start`, `Pending Since (Egypt)`, `Last Category State` and `Handover Count` remain unmapped until a separate approved metric is defined.

## 6. Timestamp handling

The Studio accepts explicit-offset timestamps and supported local workbook timestamp formats. For local values it applies Europe/London to Received At (UK), and Africa/Cairo to Allocated At / Event Time (Egypt). Ambiguous or nonexistent daylight-saving wall-clock times are not guessed; they are left without a parsed UTC instant and flagged in data quality. Elapsed resolution time remains unavailable because no resolved timestamp is present in the current source.

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
| Original Assignee is confirmed to represent the original first allocation throughout the activity history | |
| `auto assigned` is confirmed to represent an initial assignment, not an automated reassignment | |
| Manual first assignments are either separately identified or explicitly excluded from allocation share | |
| Inbox/folder mapping confirmed against the four monitored workstreams | |
| Status values and resolved/open interpretation confirmed | |
| Category removal is a flag/detection event and category restoration is a recovery event | |
| Timestamp format and timezone offsets confirmed | |
| Prohibited personal/customer/vehicle/internal mailbox identifiers excluded | |
| Approved processing device/location and report retention confirmed | |
| Data owner / security approval reference recorded in approved location | |

## 8. First-run reconciliation

Before accepting a report, compare the Studio's preview with the approved source totals. Confirm that ticket records equal the four inbox totals; resolved plus outstanding equals ticket records; first-assignment totals do not exceed ticket records; and current owner workload does not exceed outstanding work. Brand mix and resolution measures are marked Not supplied / Not recorded until the tracker writes structured source fields. Review every skipped, duplicate, unmapped and ambiguous row. Only then download the sanitised JSON and import it into Dispatcher 2.0.

**Do not enter production data until approval is explicit.** This public repository and dashboard are not private data stores or access-controlled reporting systems.
