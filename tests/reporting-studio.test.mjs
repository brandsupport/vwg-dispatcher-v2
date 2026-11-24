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
      renderSnapshot,
      getNode:id=>document.getElementById(id),
      sourceConfig:SOURCE_CONFIG,
      async process(csvs) {
        const ticketData=parseCSV(csvs.tickets);
        const assignmentData=parseCSV(csvs.assignments);
        const workflowData=parseCSV(csvs.workflow);
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...assignmentData,rowCount:assignmentData.records.length};
        files.workflow={...workflowData,rowCount:workflowData.records.length};
        mappings.tickets={ticket_ref:"ticket_ref",inbox:"inbox",status:"status",brand:"brand",received_at:"received_at",current_owner:"current_owner",resolution_status:"resolution_status",resolved_at:"resolved_at",resolved_by:"resolved_by"};
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
        mappings.tickets={ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"Brand",received_at:"Received At (UK)",current_owner:"Current Owner",resolution_status:ticketData.headers.includes("Resolution Status")?"Resolution Status":"",resolved_at:ticketData.headers.includes("Resolved At (UK)")?"Resolved At (UK)":"",resolved_by:ticketData.headers.includes("Resolved By")?"Resolved By":""};
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
  assert.equal(hooks.normaliseWorkflowEvent("AUTO_ASSIGNMENT_LOG_FAILED"),"exception");
  assert.equal(hooks.normaliseWorkflowEvent("RECOVERED"),"recovery_restored");
  assert.equal(hooks.normaliseWorkflowEvent("free text with an email address example@example.invalid"),null);
});

test("only explicit timezone dates are accepted for daily grouping",()=>{
  const hooks=loadStudio();
  assert.equal(hooks.parseExplicitDate("2026-11-22"),"2026-11-22");
  assert.equal(hooks.parseExplicitDate("2026-11-22T23:30:00-02:00"),"2026-11-23");
  assert.equal(hooks.parseExplicitDate("2026-11-22 23:30:00 UK"),null);
});

test("parses the actual Excel dd/Mon/yyyy timestamp display in UK and Egypt zones",()=>{
  const hooks=loadStudio();
  assert.equal(hooks.parseExplicitTimestamp("23/Nov/2026 10:50:00","Europe/London"),"2026-11-23T10:50:00.000Z");
  assert.equal(hooks.parseExplicitTimestamp("23-Nov-2026 10:50:00","Africa/Cairo"),"2026-11-23T08:50:00.000Z");
  assert.equal(hooks.parseExplicitDate("23/Nov/2026 10:50:00","Europe/London"),"2026-11-23");
  assert.equal(hooks.parseExplicitTimestamp("29/Mar/2026 01:30:00","Europe/London"),null,
    "non-existent UK daylight-saving wall times must not be guessed");
  assert.equal(hooks.parseExplicitTimestamp("25/Oct/2026 01:30:00","Europe/London"),null,
    "ambiguous repeated UK daylight-saving wall times must not be guessed");
});

test("the Studio preview labels missing brand and resolution tracking rather than showing false zeros",()=>{
  const hooks=loadStudio();
  const inboxes=["agency","detags","transfers","unadopts"].map(inbox_code=>({
    inbox_code,ticket_records:1,initially_assigned:0,resolved:0,outstanding:1,unassigned:0
  }));
  const snapshot={
    generated_at_utc:"2026-11-24T10:00:00.000Z",
    tickets:{
      total:4,
      overall:{ticket_records:4,initially_assigned:0,resolved:0,outstanding:4,unassigned:0},
      resolution_tracking:"not_captured",brand_field_mapped:false,
      by_inbox:inboxes,by_brand:[{brand_code:"unclassified",count:4}],daily_volume:[]
    },
    allocations:[],team_roster:[],workflow:[],
    data_quality:{sources:[],warnings:[]}
  };
  hooks.renderSnapshot(snapshot);
  const kpis=hooks.getNode("kpiResults").innerHTML;
  assert.equal((kpis.match(/Not tracked/g)||[]).length,3);
  assert.match(hooks.getNode("brandResults").innerHTML,/Brand field not captured/);
  assert.match(hooks.getNode("inboxResults").innerHTML,/Not tracked/);
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
  for(const raw of ["SAMPLE-001","Sample Agent A","Sample Agent B","Sample Agent C","example@example.invalid","Free text with sample"]) {
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
  ].join("\r\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    "2026-11-24 10:30:00,AUTO_ASSIGNMENT,KEY-001,Detags,Belal,Belal,TRUE,0,",
    "2026-11-24 11:00:00,MANUAL_ASSIGNMENT_CAPTURED,KEY-002,Agency Detags,Balqees,Balqees,TRUE,0,",
    "2026-11-24 11:30:00,HANDOVER,KEY-001,Detags,Belal,Mariam,TRUE,0,",
    "2026-11-24 12:00:00,CATEGORY_REMOVAL_DETECTED,KEY-001,Detags,Belal,Mariam,TRUE,1,",
    "2026-11-24 12:30:00,CATEGORY_RESTORED,KEY-001,Detags,Belal,Mariam,TRUE,1,"
  ].join("\r\n");
  const result=await hooks.processVwg(tickets,activity);
  const snapshot=result.snapshot;
  assert.equal(hooks.autoMap(["Event Type","Assignment Flag"],hooks.sourceConfig.assignments.fields.find(field=>field.id==="kind").aliases),"Event Type");
  assert.equal(hooks.autoMap(["Event Type","Assignment Flag"],hooks.sourceConfig.workflow.fields.find(field=>field.id==="event_type").aliases),"Event Type");
  assert.equal(snapshot.tickets.total,2);
  assert.equal(snapshot.tickets.overall.initially_assigned,2);
  assert.equal(snapshot.assignment_methods.automatic,1);
  assert.equal(snapshot.assignment_methods.manual,1);
  assert.equal(snapshot.assignment_methods.other,0);
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

test("uses the earliest timestamped first-allocation event and de-duplicates repeats",async()=>{
  const hooks=loadStudio();
  const tickets=[
    "Email Key / ID,Source Inbox,Status,Brand,Received At (UK),Current Owner",
    "KEY-EARLIEST,Detags,Assigned,Audi,2026-11-24 08:00:00,Belal"
  ].join("\r\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    "2026-11-24 10:30:00,AUTO_ASSIGNMENT,KEY-EARLIEST,Detags,Belal,Belal,TRUE,0,",
    "2026-11-24 10:31:00,AUTO_ASSIGNMENT,KEY-EARLIEST,Detags,Belal,Belal,TRUE,0,",
    "2026-11-24 11:30:00,MANUAL_ASSIGNMENT_CAPTURED,KEY-EARLIEST,Detags,Mariam,Mariam,TRUE,0,"
  ].join("\r\n");
  const {snapshot}=await hooks.processVwg(tickets,activity);
  assert.equal(snapshot.tickets.overall.initially_assigned,1);
  assert.equal(snapshot.assignment_methods.automatic,1);
  assert.equal(snapshot.assignment_methods.manual,0);
  assert.equal(snapshot.assignment_methods.other,0);
  const agent=snapshot.allocations.find(row=>row.inbox_code==="detags"&&row.initial_assignments===1);
  assert.ok(agent);
  assert.equal(snapshot.data_quality.sources.find(row=>row.source==="Assignment history").duplicate_rows,1);
  assert.equal(snapshot.data_quality.ambiguous_initial_assignment_tickets,0);
});

test("uses explicit resolution status, resolver and timestamps for solve-time metrics",async()=>{
  const hooks=loadStudio();
  const tickets=[
    "Email Key / ID,Source Inbox,Status,Brand,Received At (UK),Current Owner,Resolution Status,Resolved At (UK),Resolved By",
    "KEY-RES-01,Detags,Assigned,Audi,2026-11-24 08:30:00,Belal,Resolved,2026-11-24 10:30:00,Belal",
    "KEY-RES-02,Detags,Assigned,Volkswagen,2026-11-24 09:00:00,Balqees,Open,,"
  ].join("\r\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    "2026-11-24 10:30:00,AUTO_ASSIGNMENT,KEY-RES-01,Detags,Belal,Belal,TRUE,0,",
    "2026-11-24 11:00:00,MANUAL_ASSIGNMENT_CAPTURED,KEY-RES-02,Detags,Balqees,Balqees,TRUE,0,"
  ].join("\r\n");
  const {snapshot,privateLookup}=await hooks.processVwg(tickets,activity);
  assert.equal(snapshot.tickets.resolution_tracking,"source_status_present");
  assert.equal(snapshot.tickets.overall.resolved,1);
  assert.equal(snapshot.tickets.overall.outstanding,1);
  assert.equal(snapshot.tickets.resolution_metrics.overall.timed_tickets,1);
  assert.equal(snapshot.tickets.resolution_metrics.overall.average_minutes,120);
  assert.equal(snapshot.tickets.resolution_by_agent.length,1);
  assert.equal(snapshot.tickets.resolution_by_agent[0].resolved_tickets,1);
  assert.equal(snapshot.tickets.resolution_by_agent[0].timed_tickets,1);
  assert.equal(snapshot.tickets.resolution_by_agent[0].total_resolution_minutes,120);
  assert.ok(privateLookup.some(row=>row.display_name==="Belal"));
  assert.equal(snapshot.tickets.brand_field_mapped,true);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="audi").count,1);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="volkswagen").count,1);
  const json=JSON.stringify(snapshot);
  for(const raw of ["KEY-RES-01","KEY-RES-02","Belal","Balqees"])assert.equal(json.includes(raw),false,"raw value leaked into snapshot: "+raw);
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
