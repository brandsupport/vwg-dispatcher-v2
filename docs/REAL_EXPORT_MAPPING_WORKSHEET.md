# Real operational export mapping worksheet

Use this worksheet only after the relevant data owner and security process have approved the export, fields, processing device and report handling. Do not paste real customer, vehicle, colleague or ticket data into this worksheet or commit completed copies to this public repository.

The **Actual source header** cells are intentionally blank. Fill them from the exact header row of each approved export; do not guess from a display label or assume two systems use the same column names. Then use the Reporting Studio's mapping selectors to map each field.

## 1. Ticket / current-state export (required)

| Studio field | Required? | Meaning / acceptance rule | Actual source header |
|---|---|---|---|
| Ticket reference | Yes | Stable unique key used only in browser memory to join and deduplicate rows | |
| Inbox / folder | Yes | Must resolve to Agency Detags, Detags, Transfers or Unadopts | |
| Current status | Yes | Resolved / Closed / Complete count as resolved; other or unknown statuses are conservatively treated as open and flagged | |
| Current owner | Yes | Direct owner value is converted to a keyed pseudonymous reference; unassigned values are treated as unassigned | |
| Brand | No | Explicit brand field only; unknown values remain Other / unclassified | |
| Received timestamp | No | ISO date or ISO datetime with an explicit timezone; otherwise excluded from date grouping and counted as ambiguous | |

Required source review: confirm that one row represents one current ticket, the ticket reference is stable and unique, the inbox is the authoritative current folder, and the status/current owner fields are current-state values. Do not use an email/message export as a substitute.

## 2. Assignment history export (optional)

| Studio field | Required? | Meaning / acceptance rule | Actual source header |
|---|---|---|---|
| Ticket reference | Yes | Must join to a ticket in the current-state snapshot | |
| New owner / assigned agent | Yes | Required for HMAC pseudonymisation; blank and unassigned values are excluded | |
| Assignment type | Yes | Only explicit Initial / First assignment / Initial allocation values count toward first allocation | |
| Inbox / folder | No | If supplied, must match the authoritative inbox from the ticket snapshot | |
| Assignment timestamp | No | Retained only for source-quality checks; not used to claim response or resolution timing | |

Required source review: confirm which exact event values represent the first-ever assignment, whether the history contains repeated/replayed events, and whether ticket IDs and inbox values use the same key/meaning as the ticket snapshot. Handover, manual reassignment, recovery and subsequent owner changes must not be mapped as first assignment.

## 3. Workflow / activity history export (optional)

| Studio field | Required? | Meaning / acceptance rule | Actual source header |
|---|---|---|---|
| Ticket reference | Yes | Must join to a ticket in the current-state snapshot | |
| Workflow event type | Yes | Must map to a fixed allow-list: received, flagged, handover, assigned, manual assignment, reassigned, recovery requested/held/restored, resolved, reopened or exception | |
| Inbox / folder | No | If absent, the Studio uses the authoritative inbox from the ticket snapshot | |
| Event timestamp | No | Must be timezone-explicit to pass time-quality checks; aggregate export does not retain event-level timestamps | |

Required source review: confirm what each event label means in the source system. Do not map free-text notes, email subjects, comments or error descriptions to Workflow event type.

## 4. Fields that must not be mapped

Do not map ticket subjects, email bodies, customer names, customer email addresses, telephone numbers, postal addresses, vehicle registration marks, VINs, finance/contract numbers, free-text notes, attachment names or message content. The current schema has no destination for those fields. Do not add them to the JSON export, dashboard or this repository.

## 5. Approval and reconciliation sign-off

Complete this section outside the public repository, in the organisation's approved change/data-governance location.

| Review item | Confirmed by data owner / security reviewer |
|---|---|
| Export purpose and reporting scope approved | |
| Source system and export view identified | |
| Ticket-level source contains one current-state row per unique ticket | |
| Ticket reference join key and deduplication rule confirmed | |
| Inbox/folder mapping confirmed against the four monitored workstreams | |
| Status values and resolved/open interpretation confirmed | |
| First-assignment event values distinguished from handovers/reassignments/recoveries | |
| Brand source field and unknown-brand treatment confirmed | |
| Timestamp format and timezone confirmed | |
| Prohibited personal/customer/vehicle fields excluded | |
| Approved processing device/location and report retention confirmed | |
| Data owner / security approval reference recorded in approved location | |

## 6. First-run reconciliation

Before accepting a report, compare the Studio's preview with the approved source totals. Confirm that ticket records equal the four inbox totals; brand totals equal ticket records; first-assignment totals do not exceed ticket records; resolved plus outstanding equals ticket records; and current owner workload does not exceed outstanding work. Review every skipped, duplicate, unmapped and ambiguous row. Only then download the sanitised JSON and import it into Dispatcher 2.0.

**Do not enter production data until approval is explicit.** This public repository and dashboard are not private data stores or access-controlled reporting systems.
