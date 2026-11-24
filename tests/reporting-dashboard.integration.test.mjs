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

  assert.equal(studio.schema_version,"dispatcher-reporting-snapshot-1");
  assert.equal(studio.tickets.total,5);
  assert.deepEqual(JSON.parse(JSON.stringify(studio.tickets.overall)),{
    ticket_records:5,initially_assigned:4,resolved:0,outstanding:0,unassigned:0,no_current_owner:1
  });
  assert.equal(studio.tickets.lifecycle_available,false);
  assert.equal(studio.tickets.brand_available,false);
  assert.deepEqual(studio.tickets.by_inbox.map(row=>[
    row.inbox_code,row.ticket_records,row.initially_assigned,row.resolved,row.outstanding,row.unassigned,row.no_current_owner
  ]),[
    ["agency",1,1,0,0,0,0],
    ["detags",2,2,0,0,0,0],
    ["transfers",1,1,0,0,0,0],
    ["unadopts",1,0,0,0,0,1]
  ]);
  assert.equal(studio.workflow.reduce((sum,row)=>sum+row.event_count,0),5);

  const imported=validateWithDashboard(studio);
  assert.deepEqual(imported.tickets.overall,studio.tickets.overall);
  assert.deepEqual(imported.tickets.by_inbox,studio.tickets.by_inbox);
  assert.deepEqual(imported.tickets.by_brand,studio.tickets.by_brand);
  assert.deepEqual(imported.workflow,studio.workflow);

  const overall=calculateDashboardViews(imported);
  assert.deepEqual(overall.totals,{
    received:5,assigned:4,resolved:null,open:null,unassigned:null,noOwner:1,lifecycleAvailable:false
  });
  assert.deepEqual(overall.folders.map(row=>[
    row.id,row.received,row.assigned,row.resolved,row.open,row.unassigned
  ]),[
    ["agency",1,1,null,null,null,0],
    ["detags",2,2,null,null,null,0],
    ["transfers",1,1,null,null,null,0],
    ["unadopts",1,0,null,null,null,1]
  ]);

  assert.ok(overall.brands.every(row=>row.value===null),"brand totals are unavailable without an explicit Brand field");

  assert.equal(overall.agents.reduce((sum,agent)=>sum+agent.assigned,0),4);
  assert.equal(overall.agents.reduce((sum,agent)=>sum+agent.open,0),0);
  assert.equal(overall.agents.reduce((sum,agent)=>sum+agent.ownerRecords,0),3);
  assert.ok(overall.agents.every(agent=>/^Agent-[A-F0-9]{10}$/.test(agent.name)));
  assert.ok(overall.agents.every(agent=>agent.shift==="Shift data not included"));

  const eventCounts=Object.fromEntries(overall.workflow.map(row=>[row.id,row.events]));
  assert.deepEqual(eventCounts,{handover:1,flag:1,manual:0,recovery:1,reassignment:0});

  const detags=calculateDashboardViews(imported,"detags");
  assert.deepEqual(detags.totals,{
    received:2,assigned:2,resolved:null,open:null,unassigned:null,lifecycleAvailable:false
  });
  assert.deepEqual(detags.workflow.map(row=>[row.id,row.events]),[
    ["handover",1],["flag",0],["manual",0],["recovery",1],["reassignment",0]
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


test("the full five-tab workbook selects the correct source sheets and reuses Activity Log twice",()=>{
  const hooks=createWorkbookTestHooks();
  const sheets={
    "Assignments":[
      ["Tracker workbook export"],
      ["Email Key / ID","Received At (UK)","Source Inbox","Status","Current Owner"],
      ["SYN-WB-01","2026-11-22T09:00:00+00:00","Agency Detags","In progress","Synthetic Agent A"]
    ],
    "Activity Log":[
      ["Activity history export"],
      ["Event Time (Egypt)","Event Type","Email Key / ID","Source Inbox","Original Assignee","Current Owner","Assignment Flag"],
      ["2026-11-22T11:00:00+02:00","true","SYN-WB-01","Agency Detags","Synthetic Agent A","Synthetic Agent A","auto assigned"]
    ],
    "Team & Shifts":[
      ["Colleague","Outlook Category (exact)","Shift Group","Shift Start (Egypt)","Shift End (Egypt)","Active This Fortnight"],
      ["Synthetic Agent A","Synthetic Agent A","Early","09:00","17:00","Yes"]
    ],
    "Dashboard Summary":[["Report title"],["Synthetic summary"]],
    "Archive":[["Archive note"],["Not used by reporting"]]
  };
  const names=Object.keys(sheets);

  assert.equal(hooks.suggestWorkbookSheet("tickets",names,sheets),"Assignments");
  assert.equal(hooks.suggestWorkbookSheet("assignments",names,sheets),"Activity Log");
  assert.equal(hooks.suggestWorkbookSheet("workflow",names,sheets),"Activity Log");
  assert.equal(hooks.suggestWorkbookSheet("roster",names,sheets),"Team & Shifts");

  const assignmentHistory=hooks.worksheetToTable(sheets["Activity Log"],"assignments");
  const workflowHistory=hooks.worksheetToTable(sheets["Activity Log"],"workflow");
  const roster=hooks.worksheetToTable(sheets["Team & Shifts"],"roster");

  assert.equal(assignmentHistory.headers[0],"Event Time (Egypt)");
  assert.equal(assignmentHistory.records.length,1);
  assert.equal(workflowHistory.records.length,1);
  assert.equal(assignmentHistory.records[0]["Assignment Flag"],"auto assigned");
  assert.equal(workflowHistory.records[0]["Assignment Flag"],"auto assigned");
  assert.equal(roster.headers.includes("Outlook Category (exact)"),true);
  assert.equal(roster.records[0]["Shift Group"],"Early");
  assert.equal(names.length,5,"the workbook can retain all five tabs");
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


test("real five-tab tracker fields map correctly: Event Type is the event, Assignment Flag is Boolean",async()=>{
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
  const rosterHeaders=["Colleague","Outlook Category (exact)","Shift Group","Shift Start (Egypt)","Shift End (Egypt)","Active This Fortnight"];
  const quote=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
  const makeCsv=(headers,rows)=>[
    headers.map(quote).join(","),
    ...rows.map(row=>headers.map(header=>quote(row[header]??"")).join(","))
  ].join("\n");

  const assignments=makeCsv(assignmentsHeaders,[
    {"Email Key / ID":"SYN-101","Received At (UK)":"23/Nov/2026 09:12:00","Source Inbox":"Agency Detags","Email Subject":"SYNTHETIC SUBJECT - DO NOT EXPORT","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"TRUE","Status":"Assigned","Handover Notes":"SYNTHETIC PRIVATE NOTE","LoginUserEmail (optional)":"agent-a@example.invalid","Outlook Entry ID":"SYNTHETIC-ENTRY-A","Outlook Store ID":"SYNTHETIC-STORE-A"},
    {"Email Key / ID":"SYN-102","Received At (UK)":"23/Nov/2026 09:40:00","Source Inbox":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"TRUE","Status":"Queued","LoginUserEmail (optional)":"agent-c@example.invalid"},
    {"Email Key / ID":"SYN-103","Received At (UK)":"23/Nov/2026 10:05:00","Source Inbox":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"TRUE","Status":"Recovered"},
    {"Email Key / ID":"SYN-104","Received At (UK)":"23/Nov/2026 10:20:00","Source Inbox":"Unadopts","Assignment Flag":"FALSE","Status":"Queued"}
  ]);
  const activity=makeCsv(activityHeaders,[
    {"Event Time (Egypt)":"23/Nov/2026 11:14:00","Event Type":"AUTO_ASSIGNMENT","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent A","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"23/Nov/2026 11:30:00","Event Type":"HANDOVER","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"23/Nov/2026 11:40:00","Event Type":"CATEGORY_REMOVAL_DETECTED","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"23/Nov/2026 11:45:00","Event Type":"CATEGORY_RESTORED","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"23/Nov/2026 12:00:00","Event Type":"MANUAL_ASSIGNMENT_CAPTURED","Email Key / ID":"SYN-102","Source Inbox":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"23/Nov/2026 12:05:00","Event Type":"PENDING_ITEM_NOT_FOUND","Email Key / ID":"SYN-102","Source Inbox":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"23/Nov/2026 12:20:00","Event Type":"AUTO_ASSIGNMENT","Email Key / ID":"SYN-103","Source Inbox":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"23/Nov/2026 12:25:00","Event Type":"MULTIPLE_CATEGORIES_PENDING","Email Key / ID":"SYN-103","Source Inbox":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"23/Nov/2026 12:30:00","Event Type":"BASELINE_REGISTERED","Email Key / ID":"SYN-104","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"23/Nov/2026 12:35:00","Event Type":"NEW_MAIL_QUEUED","Email Key / ID":"SYN-104","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE"}
  ]);
  const roster=makeCsv(rosterHeaders,[
    {"Colleague":"Synthetic Agent A","Outlook Category (exact)":"Synthetic Agent A","Shift Group":"Early","Shift Start (Egypt)":"10:00","Shift End (Egypt)":"19:00","Active This Fortnight":"Yes"},
    {"Colleague":"Synthetic Agent B","Outlook Category (exact)":"Synthetic Agent B","Shift Group":"Late","Shift Start (Egypt)":"11:00","Shift End (Egypt)":"20:00","Active This Fortnight":"Yes"},
    {"Colleague":"Synthetic Agent C","Outlook Category (exact)":"Synthetic Agent C","Shift Group":"Early","Shift Start (Egypt)":"10:00","Shift End (Egypt)":"19:00","Active This Fortnight":"Yes"},
    {"Colleague":"Synthetic Agent D","Outlook Category (exact)":"Synthetic Agent D","Shift Group":"Late","Shift Start (Egypt)":"11:00","Shift End (Egypt)":"20:00","Active This Fortnight":"No"}
  ]);

  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:assignments,assignments:activity,workflow:activity,roster
  })));
  const snapshot=run.snapshot;

  assert.deepEqual(run.mappings.tickets,{
    ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"",
    received_at:"Received At (UK)",current_owner:"Current Owner",lifecycle_status:"",
    resolved_at:"",resolved_by:""
  });
  assert.deepEqual(run.mappings.assignments,{
    ticket_ref:"Email Key / ID",agent:"Original Assignee",kind:"Event Type",
    first_assignment_flag:"Assignment Flag",inbox:"Source Inbox",occurred_at:"Event Time (Egypt)"
  });
  assert.deepEqual(run.mappings.workflow,{
    ticket_ref:"Email Key / ID",event_type:"Event Type",
    original_assignee:"Original Assignee",current_owner:"Current Owner",
    first_assignment_flag:"Assignment Flag",inbox:"Source Inbox",occurred_at:"Event Time (Egypt)"
  });

  assert.equal(snapshot.tickets.total,4);
  assert.deepEqual(snapshot.tickets.overall,{
    ticket_records:4,initially_assigned:3,resolved:0,outstanding:0,unassigned:0,no_current_owner:1
  });
  assert.equal(snapshot.tickets.lifecycle_available,false);
  assert.equal(snapshot.tickets.brand_available,false);
  assert.equal(snapshot.team_roster.length,4);
  assert.equal(snapshot.team_roster.find(row=>row.agent_name==="Synthetic Agent A").shift_group,"Early");
  assert.equal(snapshot.tickets.daily_volume[0].date_local,"2026-11-23");
  assert.equal(snapshot.tickets.daily_volume[0].time_zone,"Europe/London");

  const methods=Object.fromEntries(snapshot.assignment_methods.map(row=>[row.inbox_code,{automatic:row.automatic,manual:row.manual,total:row.total}]));
  assert.deepEqual(methods.agency,{automatic:1,manual:0,total:1});
  assert.deepEqual(methods.detags,{automatic:0,manual:1,total:1});
  assert.deepEqual(methods.transfers,{automatic:1,manual:0,total:1});
  assert.deepEqual(methods.unadopts,{automatic:0,manual:0,total:0});

  const events=Object.fromEntries(snapshot.workflow.map(row=>[row.event_type,snapshot.workflow.filter(item=>item.event_type===row.event_type).reduce((n,item)=>n+item.event_count,0)]));
  assert.deepEqual(events,{
    assigned:2,handover:1,flagged:1,recovery_restored:1,
    manual_assignment:1,exception:2,baseline_registered:1,received:1
  });
  assert.ok(snapshot.activity_summary.some(row=>row.agent_name==="Synthetic Agent B"&&row.event_type==="handover"));
  assert.ok(snapshot.activity_summary.every(row=>row.time_zone==="Africa/Cairo"));
  assert.equal(snapshot.activity_rows.length,10);
  assert.ok(snapshot.activity_rows.every(row=>/^Ref-[A-F0-9]{10}$/.test(row.ticket_ref)));
  assert.equal(snapshot.activity_rows[0].event_time_egypt,"23/Nov/2026 11:14:00");
  assert.equal(snapshot.activity_rows[0].event_type,"assigned");
  assert.equal(snapshot.activity_rows[0].first_assignment_flag,true);
  assert.equal(snapshot.activity_rows[0].original_assignee_name,"Synthetic Agent A");
  assert.ok(snapshot.activity_rows.every(row=>row.time_zone==="Africa/Cairo"));

  const imported=validateWithDashboard(snapshot);
  const views=calculateDashboardViews(imported);
  const visibleEvents=Object.fromEntries(views.workflow.map(row=>[row.id,row.events]));
  assert.deepEqual(visibleEvents,{handover:1,flag:1,manual:1,recovery:1,reassignment:0});
  assert.equal(views.agents.length,4);
  assert.ok(views.agents.some(row=>row.name==="Synthetic Agent A"));
  assert.equal(imported.activity_rows.length,10);
  assert.ok(imported.activity_rows.every(row=>/^Ref-[A-F0-9]{10}$/.test(row.ticket_ref)));

  const serialised=JSON.stringify(imported);
  for(const prohibited of [
    "SYN-101","SYN-102","SYN-103","SYN-104",
    "SYNTHETIC SUBJECT - DO NOT EXPORT","SYNTHETIC PRIVATE NOTE",
    "agent-a@example.invalid","agent-c@example.invalid",
    "SYNTHETIC-ENTRY-A","SYNTHETIC-STORE-A"
  ]) assert.equal(serialised.includes(prohibited),false,"unmapped sensitive value leaked: "+prohibited);
  for(const allowedName of ["Synthetic Agent A","Synthetic Agent B","Synthetic Agent C","Synthetic Agent D"]){
    assert.ok(serialised.includes(allowedName),"approved roster display name should remain available locally: "+allowedName);
  }
});


test("the Team & Shifts roster is pseudonymised and drives actual imported shift groups",async()=>{
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:read("examples/synthetic-ticket-snapshot.csv"),
    assignments:read("examples/synthetic-assignment-history.csv"),
    workflow:read("examples/synthetic-workflow-history.csv"),
    roster:read("examples/synthetic-team-roster.csv")
  })));
  const snapshot=run.snapshot;
  assert.equal(snapshot.team_roster.length,8);
  assert.equal(snapshot.team_roster.filter(row=>row.shift_group==="Early"&&row.active_this_fortnight).length,2);
  assert.equal(snapshot.team_roster.filter(row=>row.shift_group==="Late"&&row.active_this_fortnight).length,4);
  assert.equal(snapshot.team_roster.filter(row=>!row.active_this_fortnight).length,2);
  assert.ok(snapshot.team_roster.every(row=>/^Agent-[A-F0-9]{10}$/.test(row.agent_ref)));
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
  assert.ok(serialised.includes("Sample Agent A"),"colleague display name should be retained for the local manager view");
  assert.ok(imported.team_roster.every(row=>/^Agent-[A-F0-9]{10}$/.test(row.agent_ref)));
  assert.ok(imported.team_roster.every(row=>row.agent_name&&row.agent_name.startsWith("Sample Agent ")));
});
