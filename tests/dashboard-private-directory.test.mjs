import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const dashboard = fs.readFileSync(new URL("../dashboard.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../reporting-studio.js", import.meta.url), "utf8");
const dashboardHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const start = dashboard.indexOf("const PRIVATE_AGENT_DIRECTORY_KEY=");
const end = dashboard.indexOf("\nfunction restorePrivateAgentDirectoryForSnapshot", start);
assert.ok(start >= 0 && end > start, "private directory helpers must be present");
const helperSource = dashboard.slice(start, end);

function loadDirectory(seed = null, storageAvailable = true) {
  const values = new Map();
  if (seed !== null) values.set("vwg-dispatcher.private-agent-directory.v1", JSON.stringify(seed));
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const context = {
    Map,
    JSON,
    localStorage: storageAvailable ? storage : undefined
  };
  vm.createContext(context);
  vm.runInContext(helperSource + `
    globalThis.__directoryHooks = {
      readSavedPrivateAgentDirectory,
      savePrivateAgentDirectory,
      key: PRIVATE_AGENT_DIRECTORY_KEY,
      emailLookup:()=>privateEmailLookup.slice(),
      emailLookupSnapshotId:()=>privateEmailLookupSnapshotId
    };
  `, context);
  return { hooks: context.__directoryHooks, values };
}

test("private colleague directory accepts only valid pseudonymous references and nonblank names", () => {
  const { hooks } = loadDirectory([
    { agent_ref: "Agent-AAAAAAAAAA", display_name: "Belal" },
    { agent_ref: "Agent-BBBBBBBBBB", display_name: "Mariam" },
    { agent_ref: "Ref-CCCCCCCCCC", display_name: "Must be ignored" },
    { agent_ref: "Agent-DDDDDDDDDD", display_name: "" },
    { agent_ref: "Agent-EEEEEEEEEE", display_name: "   " }
  ]);
  const directory = hooks.readSavedPrivateAgentDirectory();
  assert.equal(directory.size, 2);
  assert.equal(directory.get("Agent-AAAAAAAAAA"), "Belal");
  assert.equal(directory.get("Agent-BBBBBBBBBB"), "Mariam");
});

test("private directory is bounded to 250 validated colleague records", () => {
  const rows = Array.from({ length: 260 }, (_, index) => ({
    agent_ref: "Agent-" + index.toString(16).toUpperCase().padStart(10, "0"),
    display_name: "Colleague " + index
  }));
  const { hooks } = loadDirectory(rows);
  assert.equal(hooks.readSavedPrivateAgentDirectory().size, 250);
});

test("private directory writes only pseudonymous reference and display-name pairs", () => {
  const { hooks, values } = loadDirectory();
  const directory = new Map([
    ["Agent-AAAAAAAAAA", "Belal"],
    ["Agent-BBBBBBBBBB", "Mariam"]
  ]);
  assert.equal(hooks.savePrivateAgentDirectory(directory), true);
  const stored = JSON.parse(values.get(hooks.key));
  assert.deepEqual(stored.agents, [
    { agent_ref: "Agent-AAAAAAAAAA", display_name: "Belal" },
    { agent_ref: "Agent-BBBBBBBBBB", display_name: "Mariam" }
  ]);
  assert.equal(stored.email_lookup, null);
  assert.equal(JSON.stringify(stored).includes("ticket"), false);
  assert.equal(JSON.stringify(stored).includes("subject"), false);
});

test("private Order Number and VIN lookup is restored only for the matching snapshot",()=>{
  const seed={
    agents:[{agent_ref:"Agent-AAAAAAAAAA",display_name:"Belal"}],
    email_lookup:{
      snapshot_generated_at_utc:"2026-11-26T12:00:00.000Z",
      rows:[{
        ticket_ref:"Ref-BBBBBBBBBB",order_number:"ORD-123456",vin:"WAUZZZ1JZXW000001",
        brand_code:"audi",inbox_code:"detags",received_date:"2026-11-24",completion_date:"2026-11-24",
        status:"completed",original_agent_ref:"Agent-AAAAAAAAAA",current_agent_ref:"Agent-AAAAAAAAAA"
      }]
    }
  };
  const {hooks}=loadDirectory(seed);
  assert.equal(hooks.readSavedPrivateAgentDirectory().get("Agent-AAAAAAAAAA"),"Belal");
  assert.equal(hooks.emailLookupSnapshotId(),"2026-11-26T12:00:00.000Z");
  assert.equal(hooks.emailLookup().length,1);
  assert.equal(hooks.emailLookup()[0].order_number,"ORD-123456");
  assert.equal(hooks.emailLookup()[0].vin,"WAUZZZ1JZXW000001");
});

test("private directory fails safely when browser storage is unavailable or full", () => {
  const unavailable = loadDirectory(null, false);
  assert.equal(unavailable.hooks.readSavedPrivateAgentDirectory().size, 0);
  assert.equal(unavailable.hooks.savePrivateAgentDirectory(new Map([["Agent-AAAAAAAAAA", "Belal"]])), false);

  const { hooks } = loadDirectory();
  const throwingContext = {
    Map,
    JSON,
    localStorage: {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("quota"); }
    }
  };
  vm.createContext(throwingContext);
  vm.runInContext(helperSource + `
    globalThis.__directoryHooks = {
      readSavedPrivateAgentDirectory,
      savePrivateAgentDirectory
    };
  `, throwingContext);
  assert.equal(throwingContext.__directoryHooks.readSavedPrivateAgentDirectory().size, 0);
  assert.equal(throwingContext.__directoryHooks.savePrivateAgentDirectory(new Map([["Agent-AAAAAAAAAA", "Belal"]])), false);
});


test("Studio automatically saves private colleague names for the normal JSON import workflow", () => {
  assert.ok(studio.includes("function persistPrivateAgentDirectoryForDashboard(rows,emailRows,snapshotGeneratedAtUtc)"));
  assert.ok(studio.includes("localStorage.setItem(PRIVATE_AGENT_DIRECTORY_KEY,JSON.stringify(payload))"));
  assert.ok(studio.includes("privateDirectorySaved=persistPrivateAgentDirectoryForDashboard(privateAgentLookup,privateEmailLookupForDashboard,generatedAtUtc)"));
  assert.ok(studio.includes("privateEmailLookupForDashboard.push({"));
  assert.ok(studio.includes("snapshot_generated_at_utc:String(snapshotGeneratedAtUtc||\"\")"));
  assert.ok(dashboard.includes("function restorePrivateAgentDirectoryForSnapshot()"));
  assert.ok(dashboard.includes("restorePrivateAgentDirectoryForSnapshot();"));
  assert.ok(dashboard.includes("applyPrivateAgentLookupRows(message.privateAgentLookup,false)"));
  assert.ok(dashboard.includes("function displayAgentName(reference)"));
  assert.ok(dashboard.includes("function clearSavedPrivateAgentDirectory()"));
  assert.ok(dashboard.includes("localStorage.removeItem(PRIVATE_AGENT_DIRECTORY_KEY)"));
  for(const marker of ["loadPrivateAgentLookup","load-agent-names","agentLookupFileInput","importAgentLookupButton"])
    assert.equal(dashboard.includes(marker),false,"manual CSV importer should be removed: "+marker);
  assert.doesNotMatch(dashboardHtml,/importAgentLookupButton|agentLookupFileInput|Import names once/);
});

test("Studio maps both Outlook category and Colleague label to the same agent reference",()=>{
  assert.ok(studio.includes("const rosterAgentRefByAlias=new Map()"));
  assert.ok(studio.includes("rosterAgentRefByAlias.set(aliasKey,agentRef)"));
  assert.ok(studio.includes("rosterDisplayByRef.set(agentRef,canonicalDisplay)"));
});

test("imported snapshot itself is never written to browser storage", () => {
  const applyStart = dashboard.indexOf("function applyLocalSnapshotObject(parsed,announce=true){");
  const applyEnd = dashboard.indexOf("\nasync function loadLocalSnapshot", applyStart);
  assert.ok(applyStart >= 0 && applyEnd > applyStart);
  const snapshotImport = dashboard.slice(applyStart, applyEnd);
  assert.doesNotMatch(snapshotImport, /localStorage\s*\.\s*setItem/);
  assert.match(snapshotImport, /restorePrivateAgentDirectoryForSnapshot\(\)/);
});
