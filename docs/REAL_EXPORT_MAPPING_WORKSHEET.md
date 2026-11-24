# Real operational export mapping worksheet

Use this worksheet only after the relevant data owner and security process have approved the export, fields, processing device and report handling. Do not paste real customer, vehicle, colleague or ticket data into this worksheet or commit completed copies to this public repository.

The actual workbook headers have now been reviewed. The mapping below is specific to the **Assignments** and **Activity Log** sheets. The Activity Log CSV is selected twice in Reporting Studio: once for the optional assignment-history input and once for workflow history. The Boolean `Event Type` column is not used.

## 1. Ticket / current-state export — Assignments sheet (required)

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Stable ticket key used only in browser memory to join and deduplicate rows |
| Inbox / folder | Yes | `Source Inbox` | Must resolve to Agency Detags, Detags, Transfers or Unadopts |
| Current status | Yes | `Status` | Resolved / Closed / Complete count as resolved; other or unknown statuses are conservatively treated as open and flagged |
| Current owner | Yes | `Current Owner` | Direct owner value is converted to a keyed pseudonymous reference; unassigned values are treated as unassigned |
| Received timestamp | No | `Received At (UK)` | Only ISO date or ISO datetime with an explicit timezone is accepted for daily grouping |
| Brand | No | **Not present** | Leave unmapped. Tickets will be Other / unclassified; do not infer brand from email subject |

The source must contain one current-state row per unique ticket. Confirm that `Current Owner`, `Status` and `Source Inbox` are the latest authoritative values. A duplicate `Email Key / ID` is skipped after the first row, so the export must be sorted or filtered to ensure the current row is first.

## 2. Assignment history — Activity Log sheet (optional)

Select the **same Activity Log CSV** again in the Reporting Studio's Assignment history input.

| Studio field | Required? | Exact source header | Rule |
|---|---|---|---|
| Ticket reference | Yes | `Email Key / ID` | Must join to a ticket in Assignments |
| New owner / assigned agent | Yes | `Original Assignee` | Used for keyed pseudonymisation; confirm this remains the original first-assigned colleague in every activity row |
| Assignment type | Yes | `Assignment Flag` | Only `auto assigned` is currently counted as a first allocation |
| Inbox / folder | No | `Source Inbox` | Must match the current-state inbox |
| Assignment timestamp | No | `Event Time (Egypt)` | Optional quality field; must include explicit UTC offset to pass timestamp checks |

**Important allocation limitation:** `manual assignment captured` is counted as a manual-assignment workflow event, not as a first allocation. The label alone cannot distinguish a first manual allocation from a later manual reassignment. This avoids inflating first-assignment shares. If manual first allocations need to count, the tracker must provide a reliable first-assignment indicator or a confirmed event-order rule. Do not count handovers, category changes, baseline registration or queued state as first assignments.

## 3. Workflow history — Activity Log sheet (optional)

Select the **same Activity Log CSV** in the Workflow / activity input. Map:

| Studio field | Required? | Exact source header |
|---|---|---|
| Ticket reference | Yes | `Email Key / ID` |
| Workflow event type | Yes | `Assignment Flag` |
| Inbox / folder | No | `Source Inbox` |
| Event timestamp | No | `Event Time (Egypt)` |

Do **not** map `Event Type`: its `true` / `false` values are Boolean markers, not event categories.

Current event interpretation in the sanitiser:

| Assignment Flag | Sanitised event / treatment |
|---|---|
| `auto assigned` | Assigned; also eligible for first-allocation count |
| `handover` | Handover |
| `manual assignment captured` | Manual assignment; not counted as first allocation |
| `category removal detected` | Recovery requested (provisional mapping; confirm with the tracker owner) |
| `category restored` | Recovery restored |
| `pending item not found` | Exception |
| `MULTIPLE_CATEGORIES_PENDING` | Exception |
| `baseline registered` | Baseline state; excluded from workflow events |
| `queued` | Queue state; excluded from workflow events |

There is no distinct reassignment flag in the values supplied so far. Do not infer reassignment from a handover or manual assignment. Counts for unknown/unmapped event labels remain excluded and appear in data-quality checks.

## 4. Columns that must remain unmapped

Do not map or export `Email Subject`, `Handover Notes`, `Details / Notes`, `LoginUserEmail (optional)`, email/message content, customer names, customer email addresses, telephone numbers, postal addresses, vehicle registration marks, VINs, finance/contract numbers, attachment names, `Outlook Entry ID` or `Outlook Store ID`. The reporting schema has no destination for them. Do not add them to the JSON export, dashboard or this public repository.

Other fields such as Incident Count, Last Incident At, Last Verified At, Record Updated At, Allocated At (Egypt), Roster Period Start, Pending Since (Egypt), Last Category State and Handover Count are not part of the current report mapping. They should remain unmapped until a separate, approved metric is defined.

## 5. Timestamp handling

The Studio accepts date-only values or ISO timestamps with an explicit timezone offset. A value labelled UK or Egypt time but exported without an offset is not enough to infer a reliable UTC instant. Leave optional timestamp fields unmapped when the export has no explicit offset; do not silently assume the current UK/Egypt offset, because daylight-saving rules are date-dependent. No response-time, handling-time or resolution-duration metric is calculated.

## 6. Approval and reconciliation sign-off

Complete this section outside the public repository, in the organisation's approved change/data-governance location.

| Review item | Confirmed by data owner / security reviewer |
|---|---|
| Export purpose and reporting scope approved | |
| Source system and exact workbook sheet identified | |
| Assignments export contains one current-state row per unique Email Key / ID | |
| Current row is first where duplicate keys are present | |
| Activity Log contains the relevant event history and stable ticket key | |
| Original Assignee is confirmed to represent the original first allocation throughout the activity history | |
| `auto assigned` is confirmed to represent an initial assignment, not an automated reassignment | |
| Manual first assignments are either separately identified or explicitly excluded from allocation share | |
| Inbox/folder mapping confirmed against the four monitored workstreams | |
| Status values and resolved/open interpretation confirmed | |
| Category removal/restoration interpretation confirmed | |
| Timestamp format and timezone offsets confirmed | |
| Prohibited personal/customer/vehicle/internal mailbox identifiers excluded | |
| Approved processing device/location and report retention confirmed | |
| Data owner / security approval reference recorded in approved location | |

## 7. First-run reconciliation

Before accepting a report, compare the Studio's preview with the approved source totals. Confirm that ticket records equal the four inbox totals; resolved plus outstanding equals ticket records; first-assignment totals do not exceed ticket records; and current owner workload does not exceed outstanding work. Brand mix will remain unclassified until an approved brand field is added. Review every skipped, duplicate, unmapped and ambiguous row. Only then download the sanitised JSON and import it into Dispatcher 2.0.

**Do not enter production data until approval is explicit.** This public repository and dashboard are not private data stores or access-controlled reporting systems.
