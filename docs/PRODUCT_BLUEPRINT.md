# Dispatcher 2.0 — Product Blueprint

## Product vision

A management-grade operations intelligence platform for the VWG Brand Support shared-mailbox operation. It combines management insight, workforce management, dispatch controls and a durable audit trail.

## Confirmed product decisions

- Standalone web application and separate GitHub repository.
- Management is the primary audience.
- Agents have a private personal-performance view; managers can see the whole operation.
- Full Operations Management (Model B): roster, eligibility, inbox configuration, dispatch rules and system settings.
- Mixed control governance: routine actions can execute immediately after permission checks and confirmation; sensitive changes require preview and stronger authorisation; critical changes are audited.
- Resolution measurement includes elapsed time and active handling time, shown separately.
- The initial web prototype is built with synthetic data before Excel integration.
- The four monitored folders are Agency Detags, Detags, Transfers and Unadopts.
- Brand reporting is required (Volkswagen, Audi, Škoda, SEAT, CUPRA, Volkswagen Commercial Vehicles, Other / unclassified).
- Member allocation share is required for each folder.

## Navigation model

- Overview
- Live Operations
- Ticket Analytics
- Brand Insights
- Workflow Analytics
- Folder Share
- Team Performance
- My Performance
- Roster & Coverage
- Dispatch Configuration
- Reliability Centre
- Audit & Reports
- Administration

## Analytics model

### Ticket volume

Track distinct tickets received, initially assigned, resolved, outstanding at snapshot time, reopened and unassigned. Keep assignment events separate from unique ticket counts.

### Brand mix

Count distinct received tickets by validated brand. Support period and folder filters. Maintain an Other / unclassified bucket for uncertain cases. Brand counts must reconcile to the ticket total in scope.

### Member share by folder

For each folder, display each member's distinct tickets initially assigned and the member's percentage of all distinct tickets initially assigned in that folder during the selected period. The percentages should reconcile to 100% (subject to a clearly explained unassigned bucket).

Show handover, reassignment and recovery activity as separate event measures. If a later view counts all agents who touched a ticket, label it as overlapping involvement rather than allocation share.

### Workload

Display current open tickets by folder/member separately from historical allocation. Consider scheduled hours, shift group, eligibility and ticket complexity when making fairness comparisons.

### Resolution

Show total elapsed resolution time, active handling time, assignment delay, first response, median and average duration, ageing bands and agreed target performance. Active time requires explicit active/paused/resumed events; do not estimate it from assignment and resolution timestamps.

### Workflow ratios

Show counts and rates for manual allocations, automatic allocations, handovers, flags, recoveries, reassignments and failed assignment attempts. Distinguish unique tickets affected from event counts.

## Operations management

Managers will eventually be able to manage:

- Global dispatch state and emergency stop.
- Inbox-specific dispatch state.
- Manual assignment, reassignment and handover.
- Flag review.
- Agent eligibility by folder.
- Early/late rosters and special coverage windows.
- Workload balancing and allocation rules.
- Performance targets and alert thresholds.
- System health and recovery queues.

No controls are active in the current prototype.

## Roles and privacy

- System Administrator: complete platform and security configuration.
- Operations Manager: operational and workforce management, subject to specific critical permissions.
- Agent: own performance and own ticket activity only.

All access restrictions must be checked server-side.

## Event history

The event model must preserve ticket received, first assignment, further assignments, handover, manual override, flag raised/cleared, recovery, resolution, reopening and source-sync errors. Events should be append-only, timestamped and deduplicated. Configuration changes also require versioned audit history.

## Delivery sequence

1. Visual and interaction design.
2. Standalone prototype with synthetic data.
3. Authentication, permissions and dedicated database.
4. Read-only Excel/Outlook data integration.
5. Reconciliation and historical backfill.
6. Controlled write actions and operational safeguards.
7. Advanced intelligence and forecasting.

## Current boundary

The prototype has no production data, no Outlook connection, no workbook connection, no authentication flow and no operational side effects. Deployment must remain gated until authentication or Cloudflare Access protection is configured.
