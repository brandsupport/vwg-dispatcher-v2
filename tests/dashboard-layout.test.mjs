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
  assert.match(dashboard,/resolution_tracking!=="source_status_present"\?"Not tracked"/);
  assert.match(dashboard,/AVERAGE ELAPSED RESOLUTION/);
  assert.match(dashboard,/Resolution rate/);
});
