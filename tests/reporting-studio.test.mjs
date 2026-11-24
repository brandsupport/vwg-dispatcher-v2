import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

function makeNode(){
  return {
    value:"",disabled:false,title:"",innerHTML:"",textContent:"",hidden:false,
    files:[],addEventListener(){},scrollIntoView(){},click(){},
    classList:{add(){},remove(){},toggle(){}}
  };
}
function loadStudio(){
  const nodes=new Map();
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);},
    addEventListener(){},
    createElement(){return makeNode();}
  };
  const context={document,crypto:webcrypto,TextEncoder,Uint8Array,Blob,URL,alert(){},console,setTimeout,clearTimeout};
  vm.createContext(context);
  const source=fs.readFileSync(new URL("../reporting-studio.js",import.meta.url),"utf8");
  const expose=`
    globalThis.__reportingTestHooks = {
      parseCSV,
      normaliseInbox,
      normaliseWorkflowEvent,
      parseExplicitDate,
      parseExplicitTimestamp,
      autoMap,
      sourceConfig:SOURCE_CONFIG,
      async process(csvs) {
        const ticketData=parseCSV(csvs.tickets);
        const assignmentData=parseCSV(csvs.assignments);
        const workflowData=parseCSV(csvs.workflow);
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...assignmentData,rowCount:assignmentData.records.length};
        files.workflow={...workflowData,rowCount:workflowData.records.length};
        mappings.tickets={ticket_ref:"ticket_ref",inbox:"inbox",status:"status",brand:"brand",received_at:"received_at",current_owner:"current_owner"};
        mappings.assignments={ticket_ref:"ticket_ref",agent:"agent",kind:"assignment_kind",inbox:"inbox",occurred_at:"occurred_at"};
        mappings.workflow={ticket_ref:"ticket_ref",event_type:"event_type",inbox:"inbox",occurred_at:"occurred_at"};
        document.getElementById("workspaceKey").value="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        await sanitise();
        return currentSnapshot;
      },
      async processVwg(ticketCsv,activityCsv) {
        const ticketData=parseCSV(ticketCsv);
        const activityData=parseCSV(activityCsv);
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...activityData,rowCount:activityData.records.length};
        files.workflow={...activityData,rowCount:activityData.records.length};
        mappings.tickets={ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"Brand",received_at:"Received At (UK)",current_owner:"Current Owner"};
        mappings.assignments={ticket_ref:"Email Key / ID",agent:"Original Assignee",kind:"Event Type",inbox:"Source Inbox",occurred_at:"Event Time (Egypt)"};
        mappings.workflow={ticket_ref:"Email Key / ID",event_type:"Event Type",inbox:"Source Inbox",occurred_at:"Event Time (Egypt)",original_assignee:"Original Assignee",current_owner:"Current Owner",assignment_flag:"Assignment Flag",incident_count:"Incident Count"};
        document.getElementById("workspaceKey").value="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        await sanitise();
        return {snapshot:currentSnapshot,privateLookup:privateAgentLookup};
      }
    };
  `;
  vm.runInContext(source+expose,context,{filename:"reporting-studio.js"});
  return context.__reportingTestHooks;
}

test("CSV parser handles quoted commas, escaped quotes and embedded newlines",()=>{
  const hooks=loadStudio();
  const parsed=hooks.parseCSV('name,note\r\nAgent A,"reviewed, then said ""done"""\r\nAgent B,"line one\nline two"\r\n');
  assert.equal(parsed.records.length,2);
  assert.equal(parsed.records[0].note,'reviewed, then said "done"');
  assert.equal(parsed.records[1].note,"line one\nline two");
});

test("normalises Outlook folder paths and allow-lists workflow labels",()=>{
  const hooks=loadStudio();
  assert.equal(hooks.normaliseInbox("\\\\VWGUK R: Milton Keynes, AgencyDetags\\Inbox"),"agency");
  assert.equal(hooks.normaliseInbox("\\\\VWGUK R: Milton Keynes, Detags\\Inbox"),"detags");
  assert.equal(hooks.normaliseWorkflowEvent("Recovery requested"),"recovery_requested");
  assert.equal(hooks.normaliseWorkflowEvent("free text with an email address example@example.invalid"),null);
});

test("only explicit timezone dates are accepted for daily grouping",()=>{
  const hooks=loadStudio();
  assert.equal(hooks.parseExplicitDate("2026-11-22"),"2026-11-22");
  assert.equal(hooks.parseExplicitDate("2026-11-22T23:30:00-02:00"),"2026-11-23");
  assert.equal(hooks.parseExplicitDate("2026-11-22 23:30:00 UK"),null);
});

test("synthetic exports produce reconciled aggregate metrics without raw identifiers",async()=>{
  const hooks=loadStudio();
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const csvs={
    tickets:read("examples/synthetic-ticket-snapshot.csv"),
    assignments:read("examples/synthetic-assignment-history.csv"),
    workflow:read("examples/synthetic-workflow-history.csv").replace(
      "SAMPLE-005,Recovery requested,Detags,2026-11-22T11:20:00Z",
      "SAMPLE-005,Recovery requested,Detags,2026-11-22T11:20:00Z\nSAMPLE-005,Free text with sample@example.invalid,Detags,2026-11-22T11:21:00Z"
    )
  };
  const snapshot=await hooks.process(csvs);
  assert.equal(snapshot.schema_version,"dispatcher-reporting-snapshot-1");
  assert.equal(snapshot.tickets.total,5);
  assert.equal(JSON.stringify(snapshot.tickets.overall),JSON.stringify({ticket_records:5,initially_assigned:4,resolved:1,outstanding:4,unassigned:1}));
  assert.equal(snapshot.tickets.by_inbox.find(row=>row.inbox_code==="detags").initially_assigned,2);
  assert.equal(snapshot.tickets.daily_volume.reduce((sum,row)=>sum+row.ticket_records,0),5);
  assert.equal(snapshot.allocations.reduce((sum,row)=>sum+row.initial_assignments,0),4);
  assert.equal(snapshot.allocations.find(row=>row.inbox_code==="detags").allocation_share_pct,100);
  assert.equal(snapshot.allocations.find(row=>row.inbox_code==="detags").current_open_workload,2);
  assert.equal(snapshot.workflow.reduce((sum,row)=>sum+row.event_count,0),5);
  assert.equal(snapshot.data_quality.sources.find(row=>row.source==="Workflow history").rows_skipped,1);
  const exported=JSON.stringify(snapshot);
  for(const raw of ["SAMPLE-001","Sample Agent A","Sample Agent B","example@example.invalid","Free text with sample"]) {
    assert.equal(exported.includes(raw),false,"raw value leaked into snapshot: "+raw);
  }
  assert.ok(snapshot.allocations.every(row=>/^Agent-[A-F0-9]{10}$/.test(row.agent_ref)));
});

test("VWG Activity Log uses Event Type instead of the Boolean Assignment Flag",async()=>{
  const hooks=loadStudio();
  const tickets=[
    "Email Key / ID,Source Inbox,Status,Brand,Received At (UK),Current Owner",
    "KEY-001,Detags,Assigned,Audi,2026-11-24 08:30:00,Belal",
    "KEY-002,Agency Detags,Assigned,Volkswagen,2026-11-24 09:00:00,Balqees"
  ].join("\\r\\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    "2026-11-24 10:30:00,AUTO_ASSIGNMENT,KEY-001,Detags,Belal,Belal,TRUE,0,",
    "2026-11-24 11:00:00,MANUAL_ASSIGNMENT_CAPTURED,KEY-002,Agency Detags,Balqees,Balqees,TRUE,0,",
    "2026-11-24 11:30:00,HANDOVER,KEY-001,Detags,Belal,Mariam,TRUE,0,",
    "2026-11-24 12:00:00,CATEGORY_REMOVAL_DETECTED,KEY-001,Detags,Belal,Mariam,TRUE,1,",
    "2026-11-24 12:30:00,CATEGORY_RESTORED,KEY-001,Detags,Belal,Mariam,TRUE,1,"
  ].join("\\r\\n");
  const result=await hooks.processVwg(tickets,activity);
  const snapshot=result.snapshot;
  assert.equal(hooks.autoMap(["Event Type","Assignment Flag"],hooks.sourceConfig.assignments.fields.find(field=>field.id==="kind").aliases),"Event Type");
  assert.equal(hooks.autoMap(["Event Type","Assignment Flag"],hooks.sourceConfig.workflow.fields.find(field=>field.id==="event_type").aliases),"Event Type");
  assert.equal(snapshot.tickets.total,2);
  assert.equal(snapshot.tickets.overall.initially_assigned,2);
  assert.deepEqual(snapshot.assignment_methods,{automatic:1,manual:1,other:0});
  assert.equal(snapshot.workflow.find(row=>row.event_type==="handover").event_count,1);
  assert.equal(snapshot.workflow.find(row=>row.event_type==="flagged").event_count,1);
  assert.equal(snapshot.workflow.find(row=>row.event_type==="recovery_restored").event_count,1);
  assert.equal(snapshot.activity_log.length,5);
  assert.ok(snapshot.activity_log.every(row=>row.event_time_utc&&/^Ref-[A-F0-9]{10}$/.test(row.ticket_ref)));
  assert.ok(snapshot.activity_log.every(row=>row.assignment_flag===true));
  const json=JSON.stringify(snapshot);
  for(const raw of ["KEY-001","KEY-002","Belal","Balqees","Mariam","Details / Notes"])assert.equal(json.includes(raw),false,"raw source value leaked: "+raw);
  assert.ok(result.privateLookup.some(row=>row.display_name==="Belal"));
  assert.ok(result.privateLookup.some(row=>row.display_name==="Balqees"));
  assert.equal(snapshot.tickets.resolution_tracking,"not_captured");
});

test("the same local workspace key keeps agent references stable between runs",async()=>{
  const hooks=loadStudio();
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const csvs={
    tickets:read("examples/synthetic-ticket-snapshot.csv"),
    assignments:read("examples/synthetic-assignment-history.csv"),
    workflow:read("examples/synthetic-workflow-history.csv")
  };
  const first=await hooks.process(csvs);
  const firstRefs=first.allocations.map(row=>row.agent_ref).sort();
  const second=await hooks.process(csvs);
  assert.deepEqual(second.allocations.map(row=>row.agent_ref).sort(),firstRefs);
});
