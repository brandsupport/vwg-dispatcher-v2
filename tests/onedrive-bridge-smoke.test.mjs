import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const modulePath = path.join(
  process.cwd(),
  "integrations",
  "onedrive",
  "modVWGOneDriveBridgeSmoke.bas"
);
const readmePath = path.join(process.cwd(), "integrations", "onedrive", "README.md");
const source = fs.readFileSync(modulePath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");

// VBA comments are excluded when checking executable code for prohibited I/O.
const executableSource = source
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("'"))
  .join("\n");

test("OneDrive smoke module exposes only the two documented test macros", () => {
  assert.match(source, /Option Explicit/);
  assert.match(source, /Public Sub VWG_Bridge_CheckOneDriveRoot\(\)/);
  assert.match(source, /Public Sub VWG_Bridge_WriteSmokeTest\(\)/);
  assert.match(readme, /VWG_Bridge_CheckOneDriveRoot/);
  assert.match(readme, /VWG_Bridge_WriteSmokeTest/);
});

test("OneDrive root detection uses environment variables and an optional local-path override", () => {
  for (const name of ["OneDriveCommercial", "OneDrive", "OneDriveConsumer"]) {
    assert.ok(source.includes(name), `Missing OneDrive root candidate: ${name}`);
  }
  assert.match(source, /BRIDGE_ONEDRIVE_ROOT_OVERRIDE/);
  assert.match(source, /GetAttr\(folderPath\)/);
});

test("smoke test publishes only a closed, complete JSON marker file", () => {
  assert.match(source, /\.partial/);
  assert.match(source, /Name temporaryPath As finalPath/);
  assert.match(source, /\.json/);
  assert.match(source, /"record_count"": 0/);
  assert.match(source, /"contains_operational_data"": false/);
  assert.match(source, /"probe_type"": ""bridge_smoke_test""/);
  assert.match(source, /"test_marker""/);
});

test("smoke module does not invoke shell, command, network or external automation APIs", () => {
  for (const forbidden of [
    /\bCreateObject\s*\(/i,
    /\bGetObject\s*\(/i,
    /\bWScript\b/i,
    /\bWinHttp/i,
    /\bXMLHTTP\b/i,
    /\bShell\s*\(/i,
    /\bShellExecute\b/i,
    /\bURLDownloadToFile\b/i,
    /\bInternetOpen\b/i,
    /\bcmd\.exe\b/i,
    /\bPowerShell\b/i
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("smoke module does not inspect Outlook, workbook or ticket data", () => {
  for (const forbidden of [
    /\bMailItem\b/i,
    /\bGetNamespace\s*\(/i,
    /\bWorkbooks\b/i,
    /\bWorksheets\b/i,
    /\bActiveWorkbook\b/i,
    /\bRange\s*\(/i,
    /\bOrderNumber\b/i,
    /\bVIN\b/i
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
  assert.match(readme, /no workbook rows/);
  assert.match(readme, /Order Numbers, VINs/);
});

test("documentation does not misrepresent the smoke test as automatic dashboard ingestion", () => {
  assert.match(readme, /does not yet connect the dashboard to OneDrive/);
  assert.match(readme, /Automatic OneDrive ingestion/);
  assert.match(readme, /Microsoft Graph/);
  assert.match(readme, /local file hand-off/i);
});
