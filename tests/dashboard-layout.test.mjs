import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync(new URL("../dashboard.css",import.meta.url),"utf8");
const dashboard=fs.readFileSync(new URL("../dashboard.js",import.meta.url),"utf8");

test("dense dashboard tables scroll instead of squeezing cells into overlap",()=>{
  const tableRule=css.lastIndexOf(".table-wrap {");
  assert.ok(tableRule>=0);
  const tableCss=css.slice(tableRule,css.indexOf("}",tableRule)+1);
  assert.match(tableCss,/overflow-x:\s*auto/);
  assert.match(css,/\.roster-directory-panel \.data-table\s*\{[^}]*min-width:\s*1080px/s);
  assert.match(css,/\.matrix-table\s*\{[^}]*min-width:\s*920px/s);
});

test("long agent references never render inside fixed-size avatar badges",()=>{
  const avatarRule=css.lastIndexOf(".member-avatar {");
  assert.ok(avatarRule>=0);
  const avatarCss=css.slice(avatarRule,css.indexOf("}",avatarRule)+1);
  assert.match(avatarCss,/overflow:\s*hidden/);
  assert.match(avatarCss,/flex:\s*0\s*0\s*28px/);
  assert.match(css,/\.member-identity\s*\{[^}]*min-width:\s*0/s);
  assert.match(css,/\.member-name,[\s\S]*?overflow-wrap:\s*anywhere/);
});

test("imported Live Operations and Audit History use the aggregate snapshot and real Activity Log",()=>{
  assert.match(dashboard,/function renderImportedLiveOperations\(\)/);
  assert.match(dashboard,/if\(state\.importedSnapshot\)\{renderImportedLiveOperations\(\);return;\}/);
  assert.match(dashboard,/function renderImportedActivityAudit\(\)/);
  assert.match(dashboard,/state\.importedSnapshot\.activity_log/);
  assert.match(dashboard,/data-go="audit"/);
});

test("unsupported brand and resolution metrics are labelled as not captured",()=>{
  assert.match(dashboard,/BRAND FIELD NOT CAPTURED/);
  assert.match(dashboard,/function hasResolutionTracking\(\)/);
  assert.match(dashboard,/resolution_tracking==="source_status_present"/);
  assert.match(dashboard,/Avg solve time · owned cases/);
  assert.match(dashboard,/Resolution rate/);
  assert.match(dashboard,/First response/);
});


test("imported owner counts are not labelled as open workload without resolution tracking",()=>{
  assert.match(dashboard,/function hasResolutionTracking\(\)/);
  assert.match(dashboard,/Records with current owner/);
  assert.match(dashboard,/Current owner records/);
  const start=dashboard.indexOf("function renderImportedLiveOperations(){");
  const end=dashboard.indexOf("\nfunction renderLive()",start);
  const live=dashboard.slice(start,end);
  assert.match(live,/const workloadLabel=resolutionTracked\?"Open workload":"Records with current owner"/);
  assert.match(live,/resolutionTracked\?folder\.open:currentOwnerRecordCount\(folder\)/);
  const foldersStart=dashboard.indexOf("function renderFolders(){");
  const foldersEnd=dashboard.indexOf("\nfunction teamProfileRows()",foldersStart);
  const folderView=dashboard.slice(foldersStart,foldersEnd);
  assert.match(folderView,/const workloadLabel=resolutionTracked\?"Open workload":"Current owner records"/);
  assert.match(folderView,/resolutionTracked\?folder\.open:currentOwnerRecordCount\(folder\)/);
});


test("dashboard exposes a device-local private name directory without placing names in snapshots",()=>{
  assert.match(dashboard,/const PRIVATE_AGENT_DIRECTORY_KEY="vwg-dispatcher\.private-agent-directory\.v1"/);
  assert.match(dashboard,/function readSavedPrivateAgentDirectory\(\)/);
  assert.match(dashboard,/function savePrivateAgentDirectory\(directory\)/);
  assert.match(dashboard,/function restorePrivateAgentDirectoryForSnapshot\(\)/);
  assert.match(dashboard,/function clearSavedPrivateAgentDirectory\(\)/);
  assert.match(dashboard,/applyPrivateAgentLookupRows\(message\.privateAgentLookup,false\)/);
  assert.match(dashboard,/restorePrivateAgentDirectoryForSnapshot\(\);/);
  assert.match(dashboard,/localStorage\.removeItem\(PRIVATE_AGENT_DIRECTORY_KEY\)/);
});


test("imported Activity Log keeps the dark Cherry Glass palette with responsive filters",()=>{
  assert.match(dashboard,/class="audit-demo-strip local-snapshot-strip"/);
  assert.match(dashboard,/class="activity-search-label">SEARCH/);
  assert.match(dashboard,/class="activity-search-input"/);
  assert.match(dashboard,/activity-time-cell/);
  assert.match(dashboard,/activity-event-type/);
  assert.ok(css.includes(".activity-history-panel .audit-filter-toolbar.imported-audit-filters"));
  assert.ok(css.includes(".activity-history-panel .data-table thead th {\n  position: sticky"));
  assert.ok(css.includes("background: linear-gradient(145deg, rgba(30, 12, 21, .96), rgba(17, 10, 17, .98))"));
  assert.ok(css.includes("background: rgba(8, 6, 11, .78)"));
  assert.ok(css.includes("@media (max-width: 560px)"));
});
