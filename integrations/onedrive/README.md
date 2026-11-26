# VWG Dispatcher 2.0 — OneDrive Bridge 1.0 (first connectivity test)

**Status:** first-stage smoke test only. This is not the operational exporter and does not yet connect the dashboard to OneDrive.

## Why this starts with a smoke test

The current dashboard is a public static GitHub Pages application. It cannot silently read a local OneDrive-synchronised folder. Automatic server-side OneDrive ingestion would require an approved Microsoft identity/application registration and a protected Microsoft Graph connection. Those credentials must never be placed in the public dashboard or the Outlook VBA source.

The staging Worker is currently a read-only API foundation. This first step deliberately does not add a write route, Graph credential, D1 migration or public data endpoint.

Before writing any tracker events, prove that the Citrix VBA host can write one harmless file into the same local OneDrive sync root used by the organisation.

## Files

- modVWGOneDriveBridgeSmoke.bas — standalone VBA standard module with two macros:
  - VWG_Bridge_CheckOneDriveRoot detects the local OneDrive sync-root path.
  - VWG_Bridge_WriteSmokeTest writes one harmless JSON marker file.
- Output folder: <OneDrive sync root>\VWGDispatcherBridge\smoke-test\

The module uses only intrinsic VBA features: Environ$, GetAttr, MkDir, Open, Print #, Close # and Name. It does not create a WScript.Shell, launch Command Prompt, read the registry, use WinHTTP/XMLHTTP, call the Worker, inspect workbook sheets, or read Outlook items.

## Test procedure in Citrix

1. Download the raw modVWGOneDriveBridgeSmoke.bas file from this repository.
2. Open the VBA editor in a **temporary test workbook/project**, not the live Outlook dispatcher project.
3. Use **File → Import File…** and import the .bas module.
4. Run VWG_Bridge_CheckOneDriveRoot.
5. If a local sync root is detected, run VWG_Bridge_WriteSmokeTest.
6. The macro creates a file similar to ODSMO​​KE-20261126-173100-123456-654321.json under VWGDispatcherBridge\smoke-test.
7. Verify that the **same file** appears in OneDrive on the web, or on another synchronised device. Do not treat a file visible only in the local Citrix folder as a successful cloud sync.
8. Report the detected folder path, whether the JSON appeared in OneDrive web, and any exact VBA error.

### If automatic path detection fails

Open the local OneDrive sync folder in File Explorer, copy its local folder path, and set the constant near the top of the module:

~~~vb
Private Const BRIDGE_ONEDRIVE_ROOT_OVERRIDE As String = "C:\Users\<your-profile>\OneDrive - <organisation>"
~~~

Use the actual local path from Citrix, not a https:// OneDrive web URL. Then re-import the edited module or update the constant in the temporary test module and run the check again.

If creating the folder/file returns **Access denied**, stop and report the exact error. Do not change Citrix security, proxy settings, folder permissions or macro trust settings to bypass a policy.

## What this smoke test writes

The JSON contains only:
- a generated probe ID;
- the probe schema version and type;
- a fixed source label;
- Citrix Windows local time, explicitly labelled as local time;
- record_count: 0;
- contains_operational_data: false;
- a fixed smoke-test marker.

It contains no workbook rows, ticket IDs, email IDs, message subjects/bodies, customer details, Order Numbers, VINs, colleague names, Outlook categories, assignments or credentials.

The module writes to a temporary .partial file, closes it, and renames it to .json. Any future OneDrive consumer must ignore .partial files and only process completed .json files.

## Planned bridge stages (not implemented by this smoke test)

### Stage 1 — prove Citrix → OneDrive
Confirm the file is created locally and reaches the OneDrive cloud location. Record the verified sync-root path and the actual Citrix sync behaviour.

### Stage 2 — define the operational event contract
Only after Stage 1 succeeds, implement a separate exporter that reads approved tracker columns and produces immutable, versioned event batches. It must use stable idempotency IDs, a durable export cursor, retry-safe writes and a strict field allow-list. It must not change assignment, fairness, recovery or Outlook category behaviour.

Initial event payload candidates are pseudonymous ticket reference, approved event type, inbox code, event instant, pseudonymous actor reference, outcome and validated brand code. Human-readable colleague names, email subjects/bodies, raw message/email keys, customer addresses, attachment contents and credentials are excluded. Order Numbers and VINs require a separately approved private-data path; they are not part of the first operational event batch.

The export mapping must be checked against the actual workbook headers before it reads any operational rows. The smoke-test module does not assume a workbook schema.

### Stage 3 — dashboard ingestion
There are two different options:
- **Local file hand-off:** a dashboard import control reads completed files selected from the OneDrive-synchronised folder. This avoids Reporting Studio workbook sanitisation, but a user still selects files and the data is only as persistent/shared as the browser design permits.
- **Automatic OneDrive ingestion:** a protected service reads the designated OneDrive folder through Microsoft Graph using an approved identity and least-privilege permissions. This requires organisation-approved app registration/consent, secure server-side secrets, access controls, retention rules and a protected backend. Do not put Graph tokens or client secrets in GitHub Pages, JavaScript, a workbook or a VBA module.

The implementation must state clearly which mode is active. A local file picker must never be described as automatic background sync.

### Safety invariants

- This module is a connectivity probe only. Do not import it into the live signed Outlook dispatcher yet.
- Do not change the existing VWG_Dispatch_Tracker_V5.xlsx workbook, dispatcher timer, assignment fairness, shift eligibility or mailbox categories.
- Do not upload smoke-test files containing operational data; they contain none.
- Do not make the public GitHub Pages dashboard a store for customer-level records.
- Do not enable any dispatch write actions as part of OneDrive Bridge 1.0.
