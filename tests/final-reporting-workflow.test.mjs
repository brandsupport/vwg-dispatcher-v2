import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const dashboardHtml = read("index.html");
const dashboardJs = read("dashboard.js");
const dashboardCss = read("dashboard.css");
const studioHtml = read("reporting-studio.html");
const studioCss = read("reporting-studio.css");
const readme = read("README.md");
const userGuide = read("docs/USER_GUIDE.md");
const scope = read("docs/FINAL_RELEASE_SCOPE.md");
const releaseNotes = read("docs/RELEASE_NOTES_v2.0.0.md");
const checklist = read("docs/FINAL_RELEASE_CHECKLIST.md");

test("Dashboard has a useful first-run path and working JSON import action", () => {
  assert.match(dashboardJs, /reporting-start-panel/);
  assert.match(dashboardJs, /Open Reporting Studio/);
  assert.match(dashboardJs, /Import sanitised JSON/);
  assert.match(dashboardJs, /data-action="open-snapshot-picker"/);
  assert.match(dashboardJs, /action==="open-snapshot-picker".*snapshotFileInput/s);
  assert.match(dashboardCss, /\\.reporting-start-panel/);
  assert.match(dashboardHtml, /Demo dataset · Sample figures only · No live Outlook or Excel connection/);
});

test("Dashboard labels demo and imported state without claiming a live connection", () => {
  assert.match(dashboardJs, /Demo dataset · Sample figures only · No live Outlook or Excel connection/);
  assert.match(dashboardJs, /Sanitised snapshot · Held in this tab · No live mailbox connection/);
  assert.match(dashboardJs, /In memory only · refresh clears import/);
});

test("Reporting Studio explains the reporting cycle and preserves both hand-off routes", () => {
  assert.match(studioHtml, /workflow-roadmap/);
  for (const step of ["Select","Map","Review","Publish"]) assert.ok(studioHtml.includes("<strong>"+step+"</strong>"), "Missing workflow step "+step);
  assert.match(studioHtml, /openDashboardWithDataButton/);
  assert.match(studioHtml, /downloadSnapshot/);
  assert.match(studioCss, /\\.workflow-roadmap/);
});

test("Release documents agree on the supported workflow", () => {
  for (const doc of [readme,userGuide,scope,releaseNotes,checklist]) {
    assert.match(doc, /Reporting Studio/);
    assert.match(doc, /sanitised JSON|sanitised snapshot|sanitised aggregate/i);
    assert.match(doc, /snapshot/i);
  }
  assert.match(userGuide, /Activity Log.*assignment history/s);
  assert.match(userGuide, /same browser profile on the same device/);
  assert.match(userGuide, /Order Number \/ VIN/);
  assert.match(userGuide, /Current Operations.*demonstration workbench/s);
  assert.match(checklist, /Manual acceptance with the approved tracker workbook/);
});

test("Final release scope explicitly excludes unsupported live integrations and dispatch actions", () => {
  for (const token of [
    "OneDrive or SharePoint sync",
    "Microsoft Graph",
    "live Outlook",
    "Assignment",
    "unauthenticated"
  ]) assert.ok(scope.toLowerCase().includes(token.toLowerCase()), "Missing release boundary: "+token);
  assert.match(releaseNotes, /No OneDrive, Microsoft Graph, Outlook relay, automatic sync/);
});

test("The five deferred view implementations remain retained and unexposed", () => {
  const hidden = ['folders','my','rules','reliability','admin'];
  assert.match(dashboardJs, /const HIDDEN_VIEWS = new Set\(\["folders","my","rules","reliability","admin"\]\)/);
  for (const view of hidden) assert.ok(!dashboardHtml.includes('data-view="'+view+'"'), "Dormant view exposed: "+view);
});
