# Dispatcher 2.0.0 — Final Release Checklist

Use this checklist before tagging and sharing the Final Reporting Edition.

## Automated release gates

- [ ] Pull request is reviewed and merged to `main`.
- [ ] Full GitHub Actions validation workflow passes on the merge commit.
- [ ] GitHub Pages deployment completes successfully.
- [ ] Dashboard and Studio asset query versions match the final release.
- [ ] README, user guide, implementation status and release notes agree on product boundaries.
- [ ] GitHub source archive is generated from the final `v2.0.0` tag.

## Manual acceptance with the approved tracker workbook

- [ ] Open Reporting Studio and Dashboard in the same target browser profile/device.
- [ ] Select the complete current tracker workbook.
- [ ] Map Assignments as ticket/current state.
- [ ] Map Activity Log separately for assignment history and workflow history.
- [ ] Map Team & Shifts if the roster tab is available.
- [ ] Map Email Details only when the actual Email Details schema is present.
- [ ] Confirm Activity Log Event Type (column B) and Folder Path (column D) are mapped correctly; do not map Assignment Flag or Details as the event type.
- [ ] Use the same private workspace key as the previous reporting run.
- [ ] Sanitise locally and review row counts, skipped/duplicate/unmapped values and warnings.
- [ ] Complete the direct Studio-to-Dashboard hand-off and confirm the Dashboard acknowledgement.
- [ ] Separately test JSON download followed by Dashboard import.
- [ ] Confirm the private colleague directory is restored in the same browser profile/device.
- [ ] Search a known approved test Order Number and VIN in Audit History; confirm the matching Email Details record and linked Activity Log events appear.
- [ ] Compare four-inbox totals, initial allocations, brand totals and Email Details lifecycle metrics against the source workbook.
- [ ] Check Team Performance, roster coverage and all relevant CSV exports.
- [ ] Refresh the Dashboard and confirm the imported snapshot is cleared; import again to repeat the check.
- [ ] Verify **Clear local names & lookup** removes the private same-browser directory.

## Privacy and presentation checks

- [ ] Confirm the shared JSON contains no raw Email Key / ID, Internet Message ID, colleague names, Order Numbers, VINs, email subjects or message bodies.
- [ ] Confirm the private Order Number / VIN lookup is not placed in the shared sanitised JSON snapshot or exported aggregate CSVs.
- [ ] Confirm the dashboard identifies synthetic demo data when no snapshot is loaded.
- [ ] Confirm Current Operations identifies its individual queue as demonstration-only.
- [ ] Confirm no control implies live assignment, mailbox connection, authentication or production reliability that is not configured.
- [ ] Confirm the public/unauthenticated and snapshot-only limitations are understood by the intended users.

## Sign-off

- Business/data owner approval: ____________________
- Manual workbook acceptance completed by: ____________________
- Target browser/device: ____________________
- Acceptance date: ____________________
- Release tag / commit: ____________________

**Do not mark the manual acceptance gates complete solely because GitHub Actions passes.** CI fixtures are not a substitute for checking the approved operational workbook in the target browser.
