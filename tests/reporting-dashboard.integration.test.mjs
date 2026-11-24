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

async function createStudioSnapshot(csvInputs=null){
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
    const mapHeaders=(kind,headers)=>Object.fromEntries(
      SOURCE_CONFIG[kind].fields.map(field=>[field.id,autoMap(headers,field.aliases)])
    );
    globalThis.__reportingTestHooks = {
      parseCSV,
      mapHeaders,
      async process(csvs) {
        const ticketData=parseCSV(csvs.tickets);
        const assignmentData=parseCSV(csvs.assignments);
        const workflowData=parseCSV(csvs.workflow);
        const rosterData=csvs.roster?parseCSV(csvs.roster):null;
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...assignmentData,rowCount:assignmentData.records.length};
        files.workflow={...workflowData,rowCount:workflowData.records.length};
        files.roster=rosterData?{...rosterData,rowCount:rosterData.records.length}:null;
        mappings.tickets=mapHeaders("tickets",ticketData.headers);
        mappings.assignments=mapHeaders("assignments",assignmentData.headers);
        mappings.workflow=mapHeaders("workflow",workflowData.headers);
        mappings.roster=rosterData?mapHeaders("roster",rosterData.headers):{};
        const usedMappings=JSON.parse(JSON.stringify(mappings));
        document.getElementById("workspaceKey").value="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        await sanitise();
        return {snapshot:currentSnapshot,mappings:usedMappings};
      }
    };
  `;
  vm.runInContext(source+expose,context,{filename:"reporting-studio.js"});
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  return context.__reportingTestHooks.process(csvInputs||{
    tickets:read("examples/synthetic-ticket-snapshot.csv"),
    assignments:read("examples/synthetic-assignment-history.csv"),
    workflow:read("examples/synthetic-workflow-history.csv")
  });
}


function createWorkbookTestHooks(){
  const nodes=new Map();
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);},
    addEventListener(){},
    createElement(){return makeNode();}
  };
  const context={
    document,crypto:webcrypto,TextEncoder,Uint8Array,Blob,URL,alert(){},console,setTimeout,clearTimeout,
    XLSX:{utils:{sheet_to_json(worksheet){return worksheet;}}}
  };
  vm.createContext(context);
  const source=fs.readFileSync(new URL("../reporting-studio.js",import.meta.url),"utf8");
  vm.runInContext(source+`
    globalThis.__workbookTestHooks={worksheetToTable,suggestWorkbookSheet};
  `,context,{filename:"reporting-studio.js"});
  return context.__workbookTestHooks;
}

function validateWithDashboard(snapshot){
  const source=fs.readFileSync(new URL("../dashboard.js",import.meta.url),"utf8");
  const start=source.indexOf("function validateAndSanitiseSnapshot(raw){");
  const end=source.indexOf("\nfunction importedSourceAvailable(",start);
  assert.ok(start>=0&&end>start,"Dashboard snapshot validator must be present");
  const validate=vm.runInNewContext(source.slice(start,end)+"\nvalidateAndSanitiseSnapshot",{});
  return JSON.parse(JSON.stringify(validate(snapshot)));
}

function calculateDashboardViews(snapshot,folder="all"){
  const dashboard=fs.readFileSync(new URL("../dashboard.js",import.meta.url),"utf8");
  const extractConstant=name=>{
    const start=dashboard.indexOf("const "+name+" = ");
    const end=dashboard.indexOf("\n];",start);
    assert.ok(start>=0&&end>start,"Dashboard "+name+" definition must be present");
    return dashboard.slice(start,end+3);
  };
  const extractFunction=name=>{
    const marker="function "+name+"(";
    const start=dashboard.indexOf(marker);
    const end=dashboard.indexOf("\nfunction ",start+marker.length);
    assert.ok(start>=0&&end>start,"Dashboard "+name+" must be present");
    return dashboard.slice(start,end);
  };
  const context={};
  vm.createContext(context);
  const script=[
    extractConstant("FOLDERS"),
    extractConstant("BRANDS"),
    "const WORKFLOW_EVENT_SUMMARY=[];",
    "const state={importedSnapshot:"+JSON.stringify(snapshot)+",folder:"+JSON.stringify(folder)+",period:'snapshot',search:''};",
    extractFunction("folderAssignedRows"),
    extractFunction("allocationMatrix"),
    extractFunction("rosterClockMinutes"),
    extractFunction("coverageSegments"),
    extractFunction("brandRows"),
    extractFunction("totals"),
    extractFunction("workflowSummaryRows"),
    "const agents=allocationMatrix();",
    "const activeRoster=agents.filter(agent=>agent.activeThisFortnight===true);",
    "globalThis.result={totals:totals(),folders:folderAssignedRows().filter(row=>state.folder==='all'||row.id===state.folder),agents,coverage:coverageSegments(activeRoster),brands:brandRows(),workflow:workflowSummaryRows()};"
  ].join("\n");
  vm.runInContext(script,context);
  return JSON.parse(JSON.stringify(context.result));
}

const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("the three synthetic exports pass through Studio, Dashboard validation and every aggregate adapter",async()=>{
  const run=JSON.parse(JSON.stringify(await createStudioSnapshot()));
  const studio=run.snapshot;

  assert.equal(studio.schema_version,"dispatcher-reporting-snapshot-2");
  assert.equal(studio.tickets.total,5);
  assert.deepEqual(JSON.parse(JSON.stringify(studio.tickets.overall)),{
    ticket_records:5,initially_assigned:4,resolved:1,outstanding:4,unassigned:1
  });
  assert.deepEqual(studio.tickets.by_inbox.map(row=>[
    row.inbox_code,row.ticket_records,row.initially_assigned,row.resolved,row.outstanding,row.unassigned
  ]),[
    ["agency",1,1,0,1,0],
    ["detags",2,2,0,2,0],
    ["transfers",1,1,1,0,0],
    ["unadopts",1,0,0,1,1]
  ]);
  assert.equal(studio.workflow.reduce((sum,row)=>sum+row.event_count,0),5);

  const imported=validateWithDashboard(studio);
  assert.deepEqual(imported.tickets.overall,studio.tickets.overall);
  assert.deepEqual(imported.tickets.by_inbox,studio.tickets.by_inbox);
  assert.deepEqual(imported.tickets.by_brand,studio.tickets.by_brand);
  assert.deepEqual(imported.workflow,studio.workflow);

  const overall=calculateDashboardViews(imported);
  assert.deepEqual(overall.totals,{
    received:5,assigned:4,resolved:1,open:4,unassigned:1
  });
  assert.deepEqual(overall.folders.map(row=>[
    row.id,row.received,row.assigned,row.resolved,row.open,row.unassigned
  ]),[
    ["agency",1,1,0,1,0],
    ["detags",2,2,0,2,0],
    ["transfers",1,1,1,0,0],
    ["unadopts",1,0,0,1,1]
  ]);

  const brandCounts=Object.fromEntries(overall.brands.map(row=>[row.id,row.value]));
  assert.deepEqual(brandCounts,{vw:1,audi:1,skoda:1,seat:0,cupra:1,vwcv:0,other:1});
  assert.equal(Object.values(brandCounts).reduce((sum,value)=>sum+value,0),5);

  assert.equal(overall.agents.reduce((sum,agent)=>sum+agent.assigned,0),4);
  assert.equal(overall.agents.reduce((sum,agent)=>sum+agent.open,0),3);
  assert.ok(overall.agents.every(agent=>/^Agent-[A-F0-9]{10}$/.test(agent.name)));
  assert.ok(overall.agents.every(agent=>agent.shift==="Shift data not included"));

  const eventCounts=Object.fromEntries(overall.workflow.map(row=>[row.id,row.events]));
  assert.deepEqual(eventCounts,{assigned:0,manual:0,handover:1,flag:1,recovery:1,reassignment:0,pending:0,exception:0,dry_run:0});

  const detags=calculateDashboardViews(imported,"detags");
  assert.deepEqual(detags.totals,{
    received:2,assigned:2,resolved:0,open:2,unassigned:0
  });
  assert.deepEqual(detags.workflow.map(row=>[row.id,row.events]),[
    ["assigned",0],["manual",0],["handover",1],["flag",0],["recovery",1],["reassignment",0],["pending",0],["exception",0],["dry_run",0]
  ]);

  const rawValues=[
    "SAMPLE-001","SAMPLE-002","SAMPLE-003","SAMPLE-004","SAMPLE-005",
    "Sample Agent A","Sample Agent B","Sample Agent C","Sample Agent D"
  ];
  const serialised=JSON.stringify(imported);
  for(const value of rawValues)assert.equal(serialised.includes(value),false,"raw value leaked into Dashboard import: "+value);
  assert.equal(studio.data_quality.sources.find(row=>row.source==="Ticket snapshot").rows_accepted,5);
  assert.equal(studio.data_quality.sources.find(row=>row.source==="Assignment history").rows_accepted,5);
  assert.equal(studio.data_quality.sources.find(row=>row.source==="Workflow history").rows_accepted,5);
});


test("the complete workbook selects Assignments for ticket state and first allocation, and Activity Log for events",()=>{
  const hooks=createWorkbookTestHooks();
  const sheets={
    "Assignments":[
      ["Tracker workbook export"],
      ["Email Key / ID","Received At (UK)","Source Inbox","Original Assignee","Current Owner","Assignment Flag","Status","Allocated At (Egypt)"],
      ["SYN-WB-01","2026-11-22T09:00:00+00:00","Agency Detags","AGENT_A","AGENT_A","TRUE","Assigned","2026-11-22 11:00:00"]
    ],
    "Activity Log":[
      ["Activity history export"],
      ["Event Time (Egypt)","Event Type","Email Key / ID","Source Inbox","Original Assignee","Current Owner","Assignment Flag","Incident Count"],
      ["2026-11-22T11:00:00+02:00","AUTO_ASSIGNMENT","SYN-WB-01","Agency Detags","AGENT_A","AGENT_A","TRUE","0"]
    ],
    "Team & Shifts":[
      ["Colleague","Outlook Category (exact)","Shift Group","Shift Start (Egypt)","Shift End (Egypt)","Active This Fortnight"],
      ["Agent Alice","AGENT_A","Early","09:00","17:00","Yes"]
    ],
    "Dashboard Summary":[["Report title"],["Synthetic summary"]],
    "Archive":[["Archive note"],["Not used by reporting"]]
  };
  const names=Object.keys(sheets);
  assert.equal(hooks.suggestWorkbookSheet("tickets",names,sheets),"Assignments");
  assert.equal(hooks.suggestWorkbookSheet("assignments",names,sheets),"Assignments");
  assert.equal(hooks.suggestWorkbookSheet("workflow",names,sheets),"Activity Log");
  assert.equal(hooks.suggestWorkbookSheet("roster",names,sheets),"Team & Shifts");
  const ticketState=hooks.worksheetToTable(sheets["Assignments"],"tickets");
  const assignmentHistory=hooks.worksheetToTable(sheets["Assignments"],"assignments");
  const workflowHistory=hooks.worksheetToTable(sheets["Activity Log"],"workflow");
  const roster=hooks.worksheetToTable(sheets["Team & Shifts"],"roster");
  assert.equal(ticketState.records.length,1);
  assert.equal(assignmentHistory.headers.includes("Allocated At (Egypt)"),true);
  assert.equal(assignmentHistory.records[0]["Assignment Flag"],"TRUE");
  assert.equal(workflowHistory.records[0]["Event Type"],"AUTO_ASSIGNMENT");
  assert.equal(roster.records[0]["Colleague"],"Agent Alice");
  assert.equal(names.length,5,"the other two workbook tabs remain untouched");
});

test("a manually registered TRUE Assignment Flag without Allocated At is not counted as automatic first allocation",async()=>{
  const assignments=[
    "Email Key / ID,Source Inbox,Status,Original Assignee,Current Owner,Assignment Flag,Allocated At (Egypt)",
    "SYN-MANUAL-01,Agency Detags,Assigned,Agent Manual,Agent Manual,TRUE,"
  ].join("\n");
  const activity=[
    "Event Time (Egypt),Event Type,Email Key / ID,Source Inbox,Original Assignee,Current Owner,Assignment Flag,Incident Count",
    "2026-11-22 12:00:00,MANUAL_ASSIGNMENT_CAPTURED,SYN-MANUAL-01,Agency Detags,Agent Manual,Agent Manual,TRUE,0"
  ].join("\n");
  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:assignments,assignments,workflow:activity
  })));
  const snapshot=run.snapshot;
  assert.equal(snapshot.tickets.total,1);
  assert.equal(snapshot.tickets.overall.initially_assigned,0,
    "TRUE alone must not count; manually registered categories have no automatic allocation timestamp");
  assert.equal(snapshot.allocations.reduce((sum,row)=>sum+row.initial_assignments,0),0);
  assert.equal(snapshot.workflow.find(row=>row.event_type==="manual_assignment")?.event_count,1);
  assert.equal(snapshot.data_quality.sources.find(row=>row.source==="Assignment history").rows_skipped,1);
});

test("the committed synthetic inputs are the three documented sample files",()=>{
  for(const path of [
    "examples/synthetic-ticket-snapshot.csv",
    "examples/synthetic-assignment-history.csv",
    "examples/synthetic-workflow-history.csv",
    "examples/synthetic-team-roster.csv"
  ]){
    assert.ok(read(path).trim().length>0,"Missing synthetic input: "+path);
  }
});


test("real tracker sheet headers map Assignments for initial allocation and Activity Log Event Type for workflow",async()=>{
  const assignmentsHeaders=[
    "Email Key / ID","Received At (UK)","Source Inbox","Email Subject","Original Assignee","Current Owner","Assignment Flag",
    "Incident Count","Last Incident At","Status","Handover Notes","Last Verified At","LoginUserEmail (optional)",
    "Record Updated At","Allocated At (Egypt)","Roster Period Start","Outlook Entry ID","Outlook Store ID",
    "Pending Since (Egypt)","Last Category State","Handover Count"
  ];
  const activityHeaders=[
    "Event Time (Egypt)","Event Type","Email Key / ID","Source Inbox","Original Assignee","Current Owner",
    "Assignment Flag","Incident Count","Details / Notes"
  ];
  const rosterHeaders=[
    "Colleague","Outlook Category (exact)","Shift Group","Shift Start (Egypt)","Shift End (Egypt)","Active This Fortnight"
  ];
  const quote=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
  const makeCsv=(headers,rows)=>[
    headers.map(quote).join(","),
    ...rows.map(row=>headers.map(header=>quote(row[header]??"")).join(","))
  ].join("\n");

  const assignments=makeCsv(assignmentsHeaders,[
    {"Email Key / ID":"SYN-101","Received At (UK)":"2026-11-22T09:12:00+00:00","Source Inbox":"Agency Detags","Email Subject":"SYNTHETIC SUBJECT - DO NOT EXPORT","Original Assignee":"AGENT_A","Current Owner":"AGENT_B","Assignment Flag":"TRUE","Incident Count":"1","Status":"Handed Over","Handover Notes":"SYNTHETIC PRIVATE NOTE","LoginUserEmail (optional)":"agent-a@example.invalid","Allocated At (Egypt)":"2026-11-22 11:14:00","Outlook Entry ID":"SYNTHETIC-ENTRY-A","Outlook Store ID":"SYNTHETIC-STORE-A"},
    {"Email Key / ID":"SYN-102","Received At (UK)":"2026-11-22T09:40:00+00:00","Source Inbox":"Detags","Original Assignee":"AGENT_C","Current Owner":"AGENT_C","Assignment Flag":"TRUE","Status":"Assigned","Allocated At (Egypt)":"2026-11-22 12:00:00","LoginUserEmail (optional)":"agent-c@example.invalid"},
    {"Email Key / ID":"SYN-103","Received At (UK)":"2026-11-22T10:05:00+00:00","Source Inbox":"Transfers","Original Assignee":"AGENT_D","Current Owner":"AGENT_D","Assignment Flag":"TRUE","Status":"Recovered","Allocated At (Egypt)":"2026-11-22 12:20:00"},
    {"Email Key / ID":"SYN-104","Received At (UK)":"2026-11-22T10:20:00+00:00","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE","Status":"Queued"}
  ]);
  const activity=makeCsv(activityHeaders,[
    {"Event Time (Egypt)":"2026-11-22T11:14:00+02:00","Event Type":"AUTO_ASSIGNMENT","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"AGENT_A","Current Owner":"AGENT_A","Assignment Flag":"TRUE","Incident Count":"1"},
    {"Event Time (Egypt)":"2026-11-22T11:30:00+02:00","Event Type":"HANDOVER","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"AGENT_A","Current Owner":"AGENT_B","Assignment Flag":"FALSE","Incident Count":"1","Details / Notes":"SYNTHETIC PRIVATE NOTE"},
    {"Event Time (Egypt)":"2026-11-22T11:40:00+02:00","Event Type":"CATEGORY_REMOVAL_DETECTED","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"AGENT_A","Current Owner":"AGENT_B","Assignment Flag":"TRUE","Incident Count":"1"},
    {"Event Time (Egypt)":"2026-11-22T11:45:00+02:00","Event Type":"CATEGORY_RESTORED","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"AGENT_A","Current Owner":"AGENT_B","Assignment Flag":"FALSE","Incident Count":"1"},
    {"Event Time (Egypt)":"2026-11-22T12:00:00+02:00","Event Type":"MANUAL_ASSIGNMENT_CAPTURED","Email Key / ID":"SYN-102","Source Inbox":"Detags","Original Assignee":"AGENT_C","Current Owner":"AGENT_C","Assignment Flag":"TRUE","Incident Count":"0"},
    {"Event Time (Egypt)":"2026-11-22T12:05:00+02:00","Event Type":"PENDING_ITEM_NOT_FOUND","Email Key / ID":"SYN-102","Source Inbox":"Detags","Original Assignee":"AGENT_C","Current Owner":"AGENT_C","Assignment Flag":"FALSE","Incident Count":"0"},
    {"Event Time (Egypt)":"2026-11-22T12:20:00+02:00","Event Type":"AUTO_ASSIGNMENT","Email Key / ID":"SYN-103","Source Inbox":"Transfers","Original Assignee":"AGENT_D","Current Owner":"AGENT_D","Assignment Flag":"TRUE","Incident Count":"0"},
    {"Event Time (Egypt)":"2026-11-22T12:25:00+02:00","Event Type":"MULTIPLE_CATEGORIES_PENDING","Email Key / ID":"SYN-103","Source Inbox":"Transfers","Original Assignee":"AGENT_D","Current Owner":"AGENT_D","Assignment Flag":"FALSE","Incident Count":"0"},
    {"Event Time (Egypt)":"2026-11-22T12:30:00+02:00","Event Type":"BASELINE_REGISTERED","Email Key / ID":"SYN-104","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE","Incident Count":"0"},
    {"Event Time (Egypt)":"2026-11-22T12:35:00+02:00","Event Type":"QUEUED","Email Key / ID":"SYN-104","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE","Incident Count":"0"}
  ]);
  const roster=makeCsv(rosterHeaders,[
    {"Colleague":"Agent Alice","Outlook Category (exact)":"AGENT_A","Shift Group":"Early","Shift Start (Egypt)":"10:00","Shift End (Egypt)":"19:00","Active This Fortnight":"Yes"},
    {"Colleague":"Agent Bella","Outlook Category (exact)":"AGENT_B","Shift Group":"Late","Shift Start (Egypt)":"11:00","Shift End (Egypt)":"20:00","Active This Fortnight":"Yes"},
    {"Colleague":"Agent Charlie","Outlook Category (exact)":"AGENT_C","Shift Group":"Early","Shift Start (Egypt)":"10:00","Shift End (Egypt)":"19:00","Active This Fortnight":"Yes"},
    {"Colleague":"Agent Delta","Outlook Category (exact)":"AGENT_D","Shift Group":"Late","Shift Start (Egypt)":"11:00","Shift End (Egypt)":"20:00","Active This Fortnight":"Yes"}
  ]);

  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({tickets:assignments,assignments,workflow:activity,roster})));
  const snapshot=run.snapshot;
  assert.deepEqual(run.mappings.tickets,{
    ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"",
    received_at:"Received At (UK)",current_owner:"Current Owner"
  });
  assert.deepEqual(run.mappings.assignments,{
    ticket_ref:"Email Key / ID",agent:"Original Assignee",kind:"Assignment Flag",
    inbox:"Source Inbox",occurred_at:"Allocated At (Egypt)",status:"Status"
  });
  assert.deepEqual(run.mappings.workflow,{
    ticket_ref:"Email Key / ID",event_type:"Event Type",inbox:"Source Inbox",
    occurred_at:"Event Time (Egypt)",original_agent:"Original Assignee",
    current_owner:"Current Owner",incident_count:"Incident Count"
  });
  assert.deepEqual(run.mappings.roster,{
    identity:"Outlook Category (exact)",display_name:"Colleague",shift_group:"Shift Group",
    shift_start:"Shift Start (Egypt)",shift_end:"Shift End (Egypt)",active:"Active This Fortnight"
  });
  assert.equal(snapshot.schema_version,"dispatcher-reporting-snapshot-2");
  assert.equal(snapshot.tickets.total,4);
  assert.equal(snapshot.tickets.overall.initially_assigned,3);
  assert.equal(snapshot.tickets.overall.resolved,0);
  assert.equal(snapshot.tickets.overall.outstanding,4);
  assert.equal(snapshot.tickets.overall.unassigned,1);
  assert.equal(snapshot.tickets.brand_field_available,false);
  assert.equal(snapshot.tickets.resolution_data_available,false);
  assert.equal(snapshot.activity_events.length,9);
  assert.ok(snapshot.activity_events.every(event=>/^Ticket-[A-F0-9]{10}$/.test(event.ticket_ref)));
  assert.ok(snapshot.activity_events.every(event=>event.occurred_at_utc&&event.occurred_at_utc.endsWith("Z")));
  const handover=snapshot.activity_events.find(event=>event.event_type==="handover");
  assert.equal(handover.original_agent_name,"Agent Alice");
  assert.equal(handover.current_agent_name,"Agent Bella");

  const eventCounts=Object.fromEntries(snapshot.workflow.map(row=>[row.event_type,row.event_count]));
  assert.deepEqual(eventCounts,{assigned:2,handover:1,flagged:1,recovery_restored:1,manual_assignment:1,exception:2,queued:1});
  assert.equal(snapshot.workflow.some(row=>row.event_type==="baseline_registered"),false);

  const imported=validateWithDashboard(snapshot);
  assert.equal(imported.activity_events.length,9);
  assert.equal(imported.team_roster.find(row=>row.agent_name==="Agent Alice").agent_name,"Agent Alice");
  const views=calculateDashboardViews(imported);
  const visibleEvents=Object.fromEntries(views.workflow.map(row=>[row.id,row.events]));
  assert.equal(visibleEvents.handover,1);
  assert.equal(visibleEvents.flag,1);
  assert.equal(visibleEvents.manual,1);
  assert.equal(visibleEvents.assigned,2);

  const serialised=JSON.stringify(imported);
  for(const prohibited of [
    "SYN-101","SYN-102","SYN-103","SYN-104","AGENT_A","AGENT_B","AGENT_C","AGENT_D",
    "SYNTHETIC SUBJECT - DO NOT EXPORT","SYNTHETIC PRIVATE NOTE",
    "agent-a@example.invalid","agent-c@example.invalid","SYNTHETIC-ENTRY-A","SYNTHETIC-STORE-A"
  ]) assert.equal(serialised.includes(prohibited),false,"unmapped sensitive value leaked: "+prohibited);
  for(const allowedName of ["Agent Alice","Agent Bella","Agent Charlie","Agent Delta"])assert.equal(serialised.includes(allowedName),true,"approved display name missing: "+allowedName);
});

test("the Team & Shifts roster is pseudonymised and drives actual imported shift groups",async()=>{
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const rosterCsv=read("examples/synthetic-team-roster.csv")
    .replaceAll('"Sample Agent A","Sample Agent A"','"Display Alice","Sample Agent A"')
    .replaceAll('"Sample Agent B","Sample Agent B"','"Display Bella","Sample Agent B"')
    .replaceAll('"Sample Agent C","Sample Agent C"','"Display Charlie","Sample Agent C"')
    .replaceAll('"Sample Agent D","Sample Agent D"','"Display Delta","Sample Agent D"');
  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:read("examples/synthetic-ticket-snapshot.csv"),
    assignments:read("examples/synthetic-assignment-history.csv"),
    workflow:read("examples/synthetic-workflow-history.csv"),
    roster:rosterCsv
  })));
  const snapshot=run.snapshot;
  assert.equal(snapshot.team_roster.length,8);
  assert.equal(snapshot.team_roster.filter(row=>row.shift_group==="Early"&&row.active_this_fortnight).length,2);
  assert.equal(snapshot.team_roster.filter(row=>row.shift_group==="Late"&&row.active_this_fortnight).length,4);
  assert.equal(snapshot.team_roster.filter(row=>!row.active_this_fortnight).length,2);
  assert.ok(snapshot.team_roster.every(row=>/^Agent-[A-F0-9]{10}$/.test(row.agent_ref)));
  assert.equal(snapshot.team_roster.find(row=>row.agent_name==="Display Alice").agent_name,"Display Alice");
  assert.equal(snapshot.activity_events.length,5);
  assert.ok(snapshot.team_roster.every(row=>row.shift_start_egypt==="09:00"||row.shift_start_egypt==="12:00"));
  assert.ok(snapshot.team_roster.every(row=>row.shift_end_egypt==="17:00"||row.shift_end_egypt==="20:00"));

  const imported=validateWithDashboard(snapshot);
  assert.equal(imported.team_roster.length,8);
  const rosterRefs=new Set(imported.team_roster.map(row=>row.agent_ref));
  assert.ok(imported.allocations.every(row=>rosterRefs.has(row.agent_ref)),"allocation agents must join to the roster using the same pseudonym key");
  const views=calculateDashboardViews(imported);
  assert.equal(views.agents.length,8);
  assert.equal(views.agents.filter(row=>row.shift==="Early"&&row.activeThisFortnight===true).length,2);
  assert.equal(views.agents.filter(row=>row.shift==="Late"&&row.activeThisFortnight===true).length,4);
  assert.equal(views.agents.filter(row=>row.activeThisFortnight===false).length,2);
  assert.deepEqual(views.coverage.map(row=>[
    row.start,row.end,row.early,row.late,row.headcount
  ]),[
    [540,720,2,0,2],
    [720,1020,2,4,6],
    [1020,1200,0,4,4]
  ]);
  assert.equal(views.coverage.filter(row=>row.early>0&&row.late>0).reduce((sum,row)=>sum+row.duration,0),300);

  const serialised=JSON.stringify(imported);
  for(const category of Array.from({length:8},(_,i)=>"Sample Agent "+String.fromCharCode(65+i))){
    assert.equal(serialised.includes(category),false,"raw Outlook category leaked: "+category);
  }
  for(const name of ["Display Alice","Display Bella","Display Charlie","Display Delta"]){
    assert.equal(serialised.includes(name),true,"approved colleague display name missing: "+name);
  }
});
