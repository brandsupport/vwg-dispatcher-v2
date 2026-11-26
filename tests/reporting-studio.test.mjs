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
function loadStudio(extraContext={}){
  const nodes=new Map();
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);},
    addEventListener(){},
    createElement(){return makeNode();}
  };
  const context={document,crypto:webcrypto,TextEncoder,Uint8Array,Blob,URL,alert(){},console,setTimeout,clearTimeout,...extraContext};
  vm.createContext(context);
  const source=fs.readFileSync(new URL("../reporting-studio.js",import.meta.url),"utf8");
  const expose=`
    globalThis.__reportingTestHooks = {
      parseCSV,
      readFileArrayBuffer,
      openWorkbookPicker,
      normaliseInbox,
      normaliseWorkflowEvent,
      normaliseBrand,
      normaliseBrandFromSubject,
      isResolved,
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
      async processVwg(ticketCsv,activityCsv,rosterCsv="",emailDetailsCsv="") {
        const ticketData=parseCSV(ticketCsv);
        const activityData=parseCSV(activityCsv);
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...activityData,rowCount:activityData.records.length};
        files.workflow={...activityData,rowCount:activityData.records.length};
        mappings.tickets={ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"Brand",subject:ticketData.headers.includes("Subject")?"Subject":"",received_at:"Received At (UK)",current_owner:"Current Owner",resolution_status:ticketData.headers.includes("Resolution Status")?"Resolution Status":"",resolved_at:ticketData.headers.includes("Resolved At (UK)")?"Resolved At (UK)":"",resolved_by:ticketData.headers.includes("Resolved By")?"Resolved By":""};
        mappings.assignments={ticket_ref:"Email Key / ID",agent:"Original Assignee",kind:"Event Type",inbox:"Source Inbox",occurred_at:"Event Time (Egypt)"};
        mappings.workflow={ticket_ref:"Email Key / ID",event_type:"Event Type",inbox:"Source Inbox",occurred_at:"Event Time (Egypt)",original_assignee:"Original Assignee",current_owner:"Current Owner",assignment_flag:"Assignment Flag",incident_count:"Incident Count"};
        const rosterData=rosterCsv?parseCSV(rosterCsv):null;
        files.roster=rosterData?{...rosterData,rowCount:rosterData.records.length}:null;
        mappings.roster=rosterData?{identity:"Outlook Category (exact)",display_name:"Colleague",shift_group:"Shift Group",shift_start:"Shift Start (Egypt)",shift_end:"Shift End (Egypt)",active:"Active This Fortnight"}:{};
        const emailData=emailDetailsCsv?parseCSV(emailDetailsCsv):null;
        files.emailDetails=emailData?{...emailData,rowCount:emailData.records.length}:null;
        mappings.emailDetails=emailData?{email_key:"Email Key / ID",brand:"Brand",subject:emailData.headers.includes("Subject")?"Subject":"",order_number:"Order Number",vin:"VIN",received_at:"Received At (UK)",first_inbox:"First Source Inbox",original_assignee:"Original Assignee",current_owner:"Current Owner",completion_status:"Completion Status",first_missing_at:"First Missing At (UK)",completion_at:"Completion Time (UK)",handling_minutes:"Handling Time (Minutes)"}:{};
        document.getElementById("workspaceKey").value="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        await sanitise();
        return {snapshot:currentSnapshot,privateLookup:privateAgentLookup,privateEmailLookup:privateEmailLookupForDashboard,privateDirectorySaved};
      }
    };
  `;
  vm.runInContext(source+expose,context,{filename:"reporting-studio.js"});
  return context.__reportingTestHooks;
}


test("saves a device-local Order Number and VIN index without putting identifiers in the shared snapshot",async()=>{
  const saved=new Map();
  const localStorage={setItem(key,value){saved.set(key,String(value));}};
  const hooks=loadStudio({localStorage});
  const tickets=[
    "Email Key / ID,Source Inbox,Status,Brand,Received At (UK),Current Owner,Resolution Status,Resolved At (UK),Resolved By",
    "MAIL-LOOKUP-101,Detags,Resolved,Audi,2026-11-24 08:30:00,Belal,Resolved,2026-11-24 10:30:00,Belal"
  ].join("\r\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    "2026-11-24 12:30:00,RESOLVED,MAIL-LOOKUP-101,Detags,Belal,Belal,TRUE,0,"
  ].join("\r\n");
  const emailDetails=[
    "Email Key / ID,Brand,Order Number,VIN,Received At (UK),First Source Inbox,Original Assignee,Current Owner,Completion Status,First Missing At (UK),Completion Time (UK),Handling Time (Minutes)",
    "MAIL-LOOKUP-101,Audi,ORD-123456,WAUZZZ1JZXW000001,2026-11-24 08:30:00,Detags,Belal,Belal,Completed,2026-11-24 10:30:00,2026-11-24 10:30:00,45"
  ].join("\r\n");
  const {snapshot,privateEmailLookup,privateDirectorySaved}=await hooks.processVwg(tickets,activity,"",emailDetails);
  assert.equal(privateDirectorySaved,true);
  assert.equal(privateEmailLookup.length,1);
  assert.match(privateEmailLookup[0].ticket_ref,/^Ref-[A-F0-9]{10}$/);
  assert.equal(privateEmailLookup[0].order_number,"ORD-123456");
  assert.equal(privateEmailLookup[0].vin,"WAUZZZ1JZXW000001");
  assert.equal(privateEmailLookup[0].brand_code,"audi");
  assert.equal(privateEmailLookup[0].inbox_code,"detags");
  assert.equal("email_lookup" in snapshot,false);
  const snapshotJson=JSON.stringify(snapshot);
  for(const raw of ["ORD-123456","WAUZZZ1JZXW000001","MAIL-LOOKUP-101","Belal"]){
    assert.equal(snapshotJson.includes(raw),false,"private email lookup value leaked into shared snapshot: "+raw);
  }
  const savedPayload=JSON.parse(saved.get("vwg-dispatcher.private-agent-directory.v1"));
  assert.ok(Array.isArray(savedPayload.agents));
  assert.equal(savedPayload.email_lookup.snapshot_generated_at_utc,snapshot.generated_at_utc);
  assert.equal(savedPayload.email_lookup.rows.length,1);
  assert.equal(savedPayload.email_lookup.rows[0].order_number,"ORD-123456");
  assert.equal(savedPayload.email_lookup.rows[0].vin,"WAUZZZ1JZXW000001");
  assert.equal(JSON.stringify(savedPayload).includes("MAIL-LOOKUP-101"),false,"raw Email Key / ID must never be stored in the private lookup");
  const owner=snapshot.email_metrics.by_current_owner[0];
  assert.equal(owner.timed_completed,1);
  assert.equal(owner.average_handling_minutes,45);
});

test("reads workbook bytes from the Blob stream before using fallback readers",async()=>{
  const hooks=loadStudio();
  let arrayBufferCalled=false;
  let streamRead=false;
  const file={
    name:"stream-test.xlsx",size:3,
    stream(){
      let emitted=false;
      return {getReader(){return {
        async read(){
          if(emitted)return {done:true};
          emitted=true;streamRead=true;
          return {done:false,value:new Uint8Array([1,2,3])};
        },
        releaseLock(){}
      };}};
    },
    async arrayBuffer(){arrayBufferCalled=true;return new Uint8Array([9]).buffer;}
  };
  const buffer=await hooks.readFileArrayBuffer(file);
  assert.deepEqual([...new Uint8Array(buffer)],[1,2,3]);
  assert.equal(streamRead,true);
  assert.equal(arrayBufferCalled,false);
});

test("falls back to File.arrayBuffer when the stream reader fails",async()=>{
  const hooks=loadStudio();
  const expected=new Uint8Array([4,5,6]).buffer;
  const file={
    name:"fallback-test.xlsx",size:3,
    stream(){return {getReader(){return {async read(){throw new Error("stream interrupted");},releaseLock(){}};}};},
    async arrayBuffer(){return expected;}
  };
  const buffer=await hooks.readFileArrayBuffer(file);
  assert.deepEqual([...new Uint8Array(buffer)],[4,5,6]);
});

test("uses Chrome's direct file picker and reads the returned file handle locally",async()=>{
  let pickerOptions=null;
  let handleRead=false;
  let streamRead=false;
  const file={
    name:"direct-picker-test.xlsx",size:3,
    stream(){
      let emitted=false;
      return {getReader(){return {
        async read(){
          if(emitted)return {done:true};
          emitted=true;streamRead=true;
          return {done:false,value:new Uint8Array([7,8,9])};
        },
        releaseLock(){}
      };}};
    }
  };
  const fakeXlsx={
    read(buffer){
      assert.deepEqual([...new Uint8Array(buffer)],[7,8,9]);
      return {SheetNames:["Unrelated"],Sheets:{Unrelated:{}}};
    },
    utils:{sheet_to_json(){return [];}}
  };
  const hooks=loadStudio({
    window:{showOpenFilePicker:async options=>{
      pickerOptions=options;
      return [{getFile:async()=>{handleRead=true;return file;}}];
    }},
    XLSX:fakeXlsx
  });
  const opened=await hooks.openWorkbookPicker(hooks.getNode("workbookFile"));
  assert.equal(opened,true);
  assert.equal(handleRead,true);
  assert.equal(streamRead,true);
  assert.equal(pickerOptions.multiple,false);
  assert.ok(pickerOptions.types[0].accept["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(".xlsx"));
  assert.match(hooks.getNode("workbookFileMeta").textContent,/workbook selected and read locally/);
});

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
  assert.equal(snapshot.tickets.resolution_tracking,"source_status_present");
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


test("maps resolved and closed ticket statuses and calculates brand share by current owner",async()=>{
  const hooks=loadStudio();
  const tickets=[
    "Email Key / ID,Source Inbox,Status,Brand,Received At (UK),Current Owner",
    "KEY-CLOSED-01,Detags,Closed,Skoda Auto,2026-11-24 08:30:00,Agent One",
    "KEY-RESOLVED-02,Agency Detags,Resolved,SEAT UK,2026-11-24 09:00:00,Agent Two",
    "KEY-OPEN-03,Detags,Assigned,CUPRA UK,2026-11-24 09:30:00,Agent One",
    "KEY-CLOSED-04,Transfers,Assigned,Volkswagen Commercial Vehicles,2026-11-24 10:00:00,Agent Three"
  ].join("\r\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    "2026-11-24 11:30:00,CLOSED,KEY-CLOSED-01,Detags,Agent One,Agent One,TRUE,0,",
    "2026-11-24 14:00:00,RESOLVED,KEY-CLOSED-04,Transfers,Agent Three,Agent Three,TRUE,0,"
  ].join("\r\n");
  const {snapshot,privateLookup}=await hooks.processVwg(tickets,activity);
  assert.equal(hooks.isResolved("Closed"),true);
  assert.equal(hooks.isResolved("Resolved"),true);
  assert.equal(hooks.isResolved("Closed by agent"),true);
  assert.equal(snapshot.tickets.overall.resolved,3);
  assert.equal(snapshot.tickets.overall.outstanding,1);
  assert.equal(snapshot.tickets.resolution_tracking,"source_status_present");
  assert.equal(snapshot.tickets.resolution_by_agent.length,2);
  const agentOne=snapshot.tickets.resolution_by_current_owner.find(row=>
    privateLookup.find(person=>person.agent_ref===row.agent_ref)?.display_name==="Agent One");
  assert.ok(agentOne);
  assert.equal(agentOne.owned_tickets,2);
  assert.equal(agentOne.resolved_tickets,1);
  assert.equal(agentOne.resolution_rate_pct,50);
  assert.equal(agentOne.timed_tickets,1);
  assert.equal(agentOne.total_resolution_minutes,60);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="skoda").count,1);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="seat").count,1);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="cupra").count,1);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="vwcv").count,1);
  assert.equal(snapshot.brand_by_agent.find(row=>row.brand_code==="skoda").agent_portfolio_share_pct,50);
  assert.equal(snapshot.brand_by_agent.find(row=>row.brand_code==="seat").agent_portfolio_share_pct,100);
  assert.equal(snapshot.brand_by_agent.find(row=>row.brand_code==="cupra").agent_portfolio_share_pct,50);
  assert.equal(snapshot.brand_by_agent.find(row=>row.brand_code==="vwcv").agent_portfolio_share_pct,100);
  const json=JSON.stringify(snapshot);
  for(const raw of ["KEY-CLOSED-01","KEY-RESOLVED-02","KEY-OPEN-03","KEY-CLOSED-04","Agent One","Agent Two","Agent Three"]){
    assert.equal(json.includes(raw),false,"raw identifier or colleague name leaked into aggregate: "+raw);
  }
});

test("classifies missing Brand values from the standard Hub de-tag email subject",async()=>{
  const hooks=loadStudio();
  const subjects=[
    ["KEY-SUBJECT-AUDI","Form submission from Audi customer de-tag request form on Hub","audi"],
    ["KEY-SUBJECT-VW","Form submission from Volkswagen customer de-tag request form on Hub","volkswagen"],
    ["KEY-SUBJECT-SEAT","Form submission from SEAT customer de-tag request form on Hub","seat"],
    ["KEY-SUBJECT-SKODA","Form submission from Škoda customer de-tag request form on Hub","skoda"],
    ["KEY-SUBJECT-CUPRA","Form submission from CUPRA customer de-tag request form on Hub","cupra"],
    ["KEY-SUBJECT-VWCV","Form submission from Volkswagen Commercial Vehicles customer de-tag request form on Hub","vwcv"]
  ];
  const tickets=[
    "Email Key / ID,Source Inbox,Status,Brand,Subject,Received At (UK),Current Owner",
    ...subjects.map(([key,subject])=>key+",Detags,Assigned,,"+subject+",2026-11-24 08:30:00,Agent "+key.slice(-4))
  ].join("\r\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    ...subjects.map(([key,,],index)=>"2026-11-24 "+String(10+index).padStart(2,"0")+":30:00,AUTO_ASSIGNMENT,"+key+",Detags,Agent "+key.slice(-4)+",Agent "+key.slice(-4)+",TRUE,0,")
  ].join("\r\n");
  const {snapshot}=await hooks.processVwg(tickets,activity);
  const counts=Object.fromEntries(snapshot.tickets.by_brand.map(row=>[row.brand_code,row.count]));
  for(const [,subject,code] of subjects){
    assert.equal(hooks.normaliseBrandFromSubject(subject),code,"subject should classify "+code);
    assert.equal(counts[code],1,"ticket should be counted under "+code);
  }
  assert.equal(snapshot.tickets.total,subjects.length);
  assert.equal(snapshot.tickets.by_brand.find(row=>row.brand_code==="unclassified")?.count||0,0);
  assert.equal(snapshot.tickets.brand_field_mapped,true);
  const serialised=JSON.stringify(snapshot);
  for(const [key,subject] of subjects){
    assert.equal(serialised.includes(key),false,"ticket key must remain private");
    assert.equal(serialised.includes(subject),false,"raw subject must remain private");
  }
  assert.equal(hooks.normaliseBrandFromSubject("Customer asks about an Audi vehicle"),"unclassified",
    "free text must not be treated as a trusted Hub form subject");
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


test("subject brand detection is reused by Email Performance when only Assignments contains the Hub subject",async()=>{
  const storageValues=new Map();
  const localStorage={
    getItem:key=>storageValues.get(key)||null,
    setItem:(key,value)=>storageValues.set(key,String(value)),
    removeItem:key=>storageValues.delete(key)
  };
  const hooks=loadStudio({localStorage});
  const subjects=[
    ["EMAIL-AUDI","Form submission from Audi customer de-tag request form on Hub","audi"],
    ["EMAIL-VW","Form submission from Volkswagen customer de-tag request form on Hub","volkswagen"],
    ["EMAIL-SEAT","Form submission from SEAT customer de-tag request form on Hub","seat"],
    ["EMAIL-SKODA","Form submission from Škoda customer de-tag request form on Hub","skoda"],
    ["EMAIL-CUPRA","Form submission from CUPRA customer de-tag request form on Hub","cupra"],
    ["EMAIL-VWCV","Form submission from Volkswagen Commercial Vehicles customer de-tag request form on Hub","vwcv"]
  ];
  const ticketCsv=[
    "Email Key / ID,Source Inbox,Status,Brand,Subject,Received At (UK),Current Owner",
    ...subjects.map(([key,subject])=>[key,"Detags","Assigned","",subject,"2026-11-24 08:30:00","Belal"].join(","))
  ].join("\r\n");
  const activityCsv=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details / Notes",
    ...subjects.map(([key],index)=>["2026-11-24 "+String(10+index).padStart(2,"0")+":30:00","AUTO_ASSIGNMENT",key,"Detags","Belal Category","Belal","TRUE","0",""].join(","))
  ].join("\r\n");
  const rosterCsv=[
    "Colleague,Outlook Category (exact),Shift Group,Shift Start (Egypt),Shift End (Egypt),Active This Fortnight",
    "Belal,Belal Category,Early,10:00,19:00,Yes"
  ].join("\r\n");
  const emailCsv=[
    "Email Key / ID,Brand,Order Number,VIN,Received At (UK),First Source Inbox,Original Assignee,Current Owner,Completion Status,First Missing At (UK),Completion Time (UK),Handling Time (Minutes)",
    ...subjects.map(([key])=>[key,"","","","2026-11-24 08:30:00","Detags","Belal Category","Belal","Open","","",""].join(","))
  ].join("\r\n");
  const result=await hooks.processVwg(ticketCsv,activityCsv,rosterCsv,emailCsv);
  const emailBrandCounts=Object.fromEntries(result.snapshot.email_metrics.by_brand.map(row=>[row.brand_code,row.email_records]));
  const ticketBrandCounts=Object.fromEntries(result.snapshot.tickets.by_brand.map(row=>[row.brand_code,row.count]));
  for(const [, ,code] of subjects){
    assert.equal(ticketBrandCounts[code],1,"ticket brand should be recognised for "+code);
    assert.equal(emailBrandCounts[code],1,"Email Performance must reuse the matching Assignments subject for "+code);
  }
  assert.equal(result.snapshot.email_metrics.by_brand.find(row=>row.brand_code==="unclassified")?.email_records||0,0);
  const nameRow=result.privateLookup.find(row=>row.display_name==="Belal");
  assert.ok(nameRow,"Team & Shifts Colleague value should be the display name");
  assert.ok(result.snapshot.allocations.some(row=>row.agent_ref===nameRow.agent_ref),
    "Assignment history values matching either roster alias must map to the same colleague reference");
  assert.ok(result.snapshot.team_roster.some(row=>row.agent_ref===nameRow.agent_ref));
  assert.equal(result.privateDirectorySaved,true);
  const stored=JSON.parse(storageValues.get("vwg-dispatcher.private-agent-directory.v1"));
  assert.ok(stored.some(row=>row.agent_ref===nameRow.agent_ref&&row.display_name==="Belal"));
  assert.equal(JSON.stringify(stored).includes("EMAIL-AUDI"),false);
  assert.equal(JSON.stringify(stored).includes("Form submission"),false);
  assert.equal(JSON.stringify(stored).includes("Belal Category"),false);
});

test("private name persistence fails closed when browser storage is unavailable",async()=>{
  const hooks=loadStudio();
  const ticketCsv="Email Key / ID,Source Inbox,Status,Brand,Subject,Received At (UK),Current Owner\r\nK1,Detags,Assigned,,Form submission from Audi customer de-tag request form on Hub,2026-11-24 08:30:00,Belal";
  const activityCsv="Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count\r\n2026-11-24 10:30:00,AUTO_ASSIGNMENT,K1,Detags,Belal,Belal,TRUE,0";
  const result=await hooks.processVwg(ticketCsv,activityCsv);
  assert.equal(result.privateDirectorySaved,false);
  assert.ok(result.snapshot.data_quality.warnings.some(message=>message.toLowerCase().includes("browser could not save the private colleague directory")));
});
