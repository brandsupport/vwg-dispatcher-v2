# VWG Dispatcher 2.0.0 — Final Reporting Edition

## Release summary

Dispatcher 2.0.0 packages the existing snapshot-based reporting workflow as a focused management reporting product. The reporting workflow remains:

**Excel tracker → Offline Reporting Studio → sanitised JSON snapshot → Dashboard**

This release does not replace or modify the live Outlook VBA dispatcher or its Excel tracker.

## What is included

- Ten focused reporting workspaces with a consistent Cherry Glass interface.
- A first-run Overview guide that explains the snapshot workflow and clearly identifies synthetic demo data.
- A four-step Reporting Studio guide covering workbook selection, mapping, local sanitisation and dashboard hand-off.
- Local workbook/CSV processing and explicit mapping for Assignments, Activity Log, Team & Shifts and optional Email Details.
- Direct Studio-to-Dashboard hand-off and downloadable JSON import fallback.
- Private same-browser colleague display-name resolution and Order Number / VIN lookup kept separate from the shared JSON.
- Data-quality checks, aggregate report CSVs, and documented metric definitions.
- Retained hidden source implementations for future milestones, without exposing unfinished screens in the reporting navigation.

## Clarified product boundaries

- Dashboard figures are synthetic until an approved sanitised snapshot is imported.
- A snapshot is point-in-time and held in the current dashboard tab's memory.
- Current Operations individual ticket queue and sample ticket details remain demonstration-only.
- No OneDrive, Microsoft Graph, Outlook relay, automatic sync, live mailbox connection or dispatch action is included.
- The public dashboard is unauthenticated and is not an access-control boundary.
- Order Number / VIN search depends on the private lookup being present in the same browser profile/device used for the Studio run.

## Compatibility and privacy

- Older supported snapshots remain subject to the dashboard's current schema validator.
- Workbooks without Email Details can still be used; Email Performance and private Order Number / VIN lookup will be unavailable or incomplete.
- The shared JSON excludes full workbook rows, email subjects/bodies, raw email keys, Internet Message IDs, colleague names, Order Numbers and VINs.
- The browser-local directory is a convenience for same-device display and lookup, not an identity store or secure customer-data vault.

## Release acceptance

Before publishing the v2.0.0 tag, run the documented workflow against the current approved tracker workbook in the target browser and complete the [Final Release Checklist](FINAL_RELEASE_CHECKLIST.md). Passing CI validates source structure and fixtures; it does not prove the user's live workbook or browser profile has been accepted.
