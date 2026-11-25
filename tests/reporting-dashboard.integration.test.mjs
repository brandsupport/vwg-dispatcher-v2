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

async function createStudioSnapshot(csvInputs=null,workbookProbe=null){
  const nodes=new Map();
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);},
    addEventListener(){},
    createElement(){return makeNode();}
  };
  const alerts=[];
  const context={document,crypto:webcrypto,TextEncoder,Uint8Array,Blob,URL,XLSX:{utils:{sheet_to_json(worksheet){return worksheet.rows;}}},alert(message){alerts.push(String(message));},console,setTimeout,clearTimeout};
  context.alerts=alerts;
  vm.createContext(context);
  const source=fs.readFileSync(new URL("../reporting-studio.js",import.meta.url),"utf8");
  const expose=`
    const mapHeaders=(kind,headers)=>Object.fromEntries(
      SOURCE_CONFIG[kind].fields.map(field=>[field.id,autoMap(headers,field.aliases)])
    );
    globalThis.__reportingTestHooks = {
      parseCSV,
      isSupportedWorkbookFilename,
      mapHeaders,
      suggestEmailDetailsSheet(sheetNames,sheets){return suggestWorkbookSheet("emailDetails",sheetNames,sheets);},
      async process(csvs,workbookProbe) {
        const ticketData=parseCSV(csvs.tickets);
        const assignmentData=parseCSV(csvs.assignments);
        const workflowData=parseCSV(csvs.workflow);
        const rosterData=csvs.roster?parseCSV(csvs.roster):null;
        const emailDetailsData=csvs.emailDetails?parseCSV(csvs.emailDetails):null;
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...assignmentData,rowCount:assignmentData.records.length};
        files.workflow={...workflowData,rowCount:workflowData.records.length};
        files.roster=rosterData?{...rosterData,rowCount:rosterData.records.length}:null;
        files.emailDetails=emailDetailsData?{...emailDetailsData,rowCount:emailDetailsData.records.length}:null;
        mappings.tickets=mapHeaders("tickets",ticketData.headers);
        mappings.assignments=mapHeaders("assignments",assignmentData.headers);
        mappings.workflow=mapHeaders("workflow",workflowData.headers);
        mappings.roster=rosterData?mapHeaders("roster",rosterData.headers):{};
        mappings.emailDetails=emailDetailsData?mapHeaders("emailDetails",emailDetailsData.headers):{};
        const usedMappings=JSON.parse(JSON.stringify(mappings));
        document.getElementById("workspaceKey").value="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        await sanitise();
        return {snapshot:currentSnapshot,mappings:usedMappings,alerts,privateAgentLookup:privateAgentLookup.slice(),emailDetailsSheetSuggestion:workbookProbe?suggestWorkbookSheet("emailDetails",workbookProbe.sheetNames,workbookProbe.sheets):null};
      }
    };
  `;
  vm.runInContext(source+expose,context,{filename:"reporting-studio.js"});
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  return context.__reportingTestHooks.process(csvInputs||{
    tickets:read("examples/synthetic-ticket-snapshot.csv"),
    assignments:read("examples/synthetic-assignment-history.csv"),
    workflow:read("examples/synthetic-workflow-history.csv"),
    emailDetails:read("examples/synthetic-email-details.csv")
  },workbookProbe);
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
    "function displayAgentName(reference){return reference;}",
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

test("synthetic tracker exports and Email Details pass through Studio and Dashboard validation without raw identifiers",async()=>{
  const run=JSON.parse(JSON.stringify(await createStudioSnapshot()));
  const studio=run.snapshot;
  assert.ok(studio,"Studio sanitisation failed: "+(run.alerts||[]).join(" | "));

  assert.equal(studio.schema_version,"dispatcher-reporting-snapshot-1");
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
  assert.deepEqual(studio.email_metrics.overall,{
    email_records:6,open:2,missing_confirmation_pending:1,completed:3,unknown_status:0,
    missing_brand:1,missing_order_vin:1,timed_completed:3,
    average_handling_minutes:155,median_handling_minutes:120,p90_handling_minutes:300
  });
  assert.deepEqual(studio.email_metrics.by_inbox.map(row=>[
    row.inbox_code,row.email_records,row.open,row.missing_confirmation_pending,row.completed
  ]),[
    ["agency",1,0,0,1],
    ["detags",2,0,0,2],
    ["transfers",1,0,1,0],
    ["unadopts",2,2,0,0]
  ]);
  assert.equal(studio.email_metrics.by_brand.reduce((sum,row)=>sum+row.email_records,0),6);
  assert.equal(studio.email_metrics.daily_received.reduce((sum,row)=>sum+row.email_records,0),6);
  assert.equal(studio.email_metrics.daily_completed.reduce((sum,row)=>sum+row.completed,0),3);
  assert.ok(studio.email_metrics.by_current_owner.every(row=>/^Agent-[A-F0-9]{10}$/.test(row.agent_ref)));

  const imported=validateWithDashboard(studio);
  assert.deepEqual(imported.email_metrics,studio.email_metrics);
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
  assert.deepEqual(eventCounts,{
    handover:1,flag:1,automatic:0,manual:0,recovery:1,
    reassignment:0,exceptions:0,email_lifecycle:0,baseline:1
  });

  const detags=calculateDashboardViews(imported,"detags");
  assert.deepEqual(detags.totals,{
    received:2,assigned:2,resolved:0,open:2,unassigned:0
  });
  assert.deepEqual(detags.workflow.map(row=>[row.id,row.events]),[
    ["handover",1],["flag",0],["automatic",0],["manual",0],["recovery",1],
    ["reassignment",0],["exceptions",0],["email_lifecycle",0],["baseline",0]
  ]);

  const rawValues=[
    "SAMPLE-001","SAMPLE-002","SAMPLE-003","SAMPLE-004","SAMPLE-005",
    "Sample Agent A","Sample Agent B","Sample Agent C","Sample Agent D",
    "DEMO-EMAIL-001","DEMO-EMAIL-002","DEMO-EMAIL-003","DEMO-EMAIL-004","DEMO-EMAIL-005","DEMO-EMAIL-006",
    "<demo-message-001@example.invalid>","DEMO-ORDER-001","DEMO-ORDER-002","SYNTH-VIN-001","SYNTH-VIN-002",
    "Synthetic Agent A","Synthetic Agent B","Synthetic Agent C","Synthetic Agent D","Synthetic Agent E","Synthetic Agent F"
  ];
  const serialised=JSON.stringify(imported);
  for(const value of rawValues)assert.equal(serialised.includes(value),false,"raw value leaked into Dashboard import: "+value);
  assert.equal(studio.data_quality.sources.find(row=>row.source==="Ticket snapshot").rows_accepted,5);
  assert.equal(studio.data_quality.sources.find(row=>row.source==="Assignment history").rows_accepted,5);
  assert.equal(studio.data_quality.sources.find(row=>row.source==="Workflow history").rows_accepted,5);
  const emailQuality=studio.data_quality.sources.find(row=>row.source==="Email Details");
  assert.equal(emailQuality.rows_read,7);
  assert.equal(emailQuality.rows_accepted,6);
  assert.equal(emailQuality.rows_skipped,1);
  assert.equal(emailQuality.duplicate_rows,1);
  assert.equal(emailQuality.unknown_brand,1);
});


test("real Activity Log schema retains moved allocations, system events, email source Inbox and private names",async()=>{
  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:[
      "ticket_ref,inbox,status,resolution_status,brand,received_at,current_owner",
      "SAMPLE-MOVED-01,Transfers,Assigned,Open,Audi,2026-11-22T09:00:00Z,agent-a"
    ].join("\n"),
    assignments:[
      "Event Time (Egypt),Event Type,Email Key / ID,Folder Path,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details",
      "2026-11-22T11:00:00+02:00,AUTO_ASSIGNMENT,SAMPLE-MOVED-01,VWGUK R: Milton Keynes\\\\AgencyDetags\\\\Inbox,agent-a,agent-a,TRUE,0,PRIVATE TEST NOTE"
    ].join("\n"),
    workflow:[
      "Event Time (Egypt),Event Type,Email Key / ID,Folder Path,Original Assignee,Current Owner,Assignment Flag,Incident Count,Details",
      "2026-11-22T11:00:00+02:00,HANDOVER,SAMPLE-MOVED-01,VWGUK R: Milton Keynes\\\\AgencyDetags\\\\Inbox,agent-a,agent-b,FALSE,0,PRIVATE HANDOVER NOTE",
      "2026-11-22T12:00:00+02:00,EMAIL_COMPLETED,SAMPLE-MOVED-01,Email Details,agent-a,agent-b,FALSE,0,PRIVATE EMAIL NOTE",
      "2026-11-22T12:30:00+02:00,BASELINE_COMPLETE,,Four Inboxes,,,FALSE,0,PRIVATE SYSTEM NOTE"
    ].join("\n"),
    roster:[
      "Colleague,Outlook Category (exact),Shift Group,Shift Start (Egypt),Shift End (Egypt),Active This Fortnight",
      "Alice Adams,agent-a,Early,10:00,18:45,Yes",
      "Bob Baker,agent-b,Late,11:00,19:45,Yes"
    ].join("\n"),
    emailDetails:[
      "Email Key / ID,Internet Message ID,Brand,Order Number,VIN,Received At (UK),First Source Inbox,Last Monitored Inbox,Original Assignee,Current Owner,Completion Status,First Missing At (UK),Completion Time (UK),Handling Time (Minutes),Metadata Captured At (UK)",
      "SAMPLE-MOVED-01,<sample-moved@example.invalid>,Audi,ORDER-PRIVATE,VIN-PRIVATE,2026-11-22T09:00:00+00:00,Agency Detags,Transfers,agent-a,agent-b,Completed,2026-11-22T10:00:00+00:00,2026-11-22T10:00:00+00:00,60,2026-11-22T09:00:01+00:00"
    ].join("\n")
  })));
  const snapshot=run.snapshot;
  assert.ok(snapshot,"Studio sanitisation failed: "+(run.alerts||[]).join(" | "));
  const imported=validateWithDashboard(snapshot);
  assert.equal(imported.tickets.total,1);
  assert.equal(imported.tickets.by_inbox.find(row=>row.inbox_code==="agency").initially_assigned,1,
    "Dashboard validation must retain original-Inbox first-allocation history even when current ticket volume is zero there.");
  assert.ok(imported.workflow.some(row=>row.event_type==="baseline_complete"&&row.inbox_code==="system"));
  assert.equal(imported.activity_log.find(row=>row.event_type==="baseline_complete").system_event,true);
  assert.equal(snapshot.tickets.total,1);
  assert.equal(snapshot.tickets.by_inbox.find(row=>row.inbox_code==="transfers").ticket_records,1);
  assert.equal(snapshot.tickets.by_inbox.find(row=>row.inbox_code==="agency").initially_assigned,1,
    "The original Agency Detags allocation must remain in its source Inbox after the ticket moves to Transfers.");
  assert.equal(snapshot.tickets.by_inbox.reduce((sum,row)=>sum+row.initially_assigned,0),1);
  assert.equal(snapshot.assignment_methods.automatic,1);
  assert.equal(snapshot.allocations.reduce((sum,row)=>sum+row.initial_assignments,0),1);
  assert.ok(snapshot.workflow.some(row=>row.event_type==="handover"&&row.inbox_code==="agency"&&row.event_count===1));
  assert.ok(snapshot.workflow.some(row=>row.event_type==="email_completed"&&row.inbox_code==="agency"&&row.event_count===1));
  assert.ok(snapshot.workflow.some(row=>row.event_type==="baseline_complete"&&row.inbox_code==="system"&&row.event_count===1));
  const systemEvent=snapshot.activity_log.find(row=>row.event_type==="baseline_complete");
  assert.equal(systemEvent.system_event,true);
  assert.equal(snapshot.activity_log.filter(row=>row.event_type==="handover")[0].system_event,false);
  assert.equal(snapshot.data_quality.sources.find(row=>row.source==="Workflow history").rows_accepted,3);
  assert.ok(run.privateAgentLookup.some(row=>row.display_name==="Alice Adams"));
  assert.ok(run.privateAgentLookup.some(row=>row.display_name==="Bob Baker"));
  const serialised=JSON.stringify(snapshot);
  for(const raw of ["agent-a","agent-b","Alice Adams","Bob Baker","PRIVATE TEST NOTE","PRIVATE HANDOVER NOTE","PRIVATE EMAIL NOTE","PRIVATE SYSTEM NOTE","ORDER-PRIVATE","VIN-PRIVATE","<sample-moved@example.invalid>"]){
    assert.equal(serialised.includes(raw),false,"Private source value leaked to aggregate snapshot: "+raw);
  }
});

test("the Reporting Studio workbook picker accepts macro-enabled .xlsm trackers",()=>{
  const hooks=createWorkbookTestHooks();
  assert.equal(hooks.isSupportedWorkbookFilename("VWG_Dispatch_Tracker.xlsx"),true);
  assert.equal(hooks.isSupportedWorkbookFilename("VWG_Dispatch_Tracker.xls"),true);
  assert.equal(hooks.isSupportedWorkbookFilename("VWG_Dispatch_Tracker.xlsm"),true);
  assert.equal(hooks.isSupportedWorkbookFilename("VWG_Dispatch_Tracker.XLSM"),true);
  assert.equal(hooks.isSupportedWorkbookFilename("VWG_Dispatch_Tracker.xlsb"),false);
  assert.equal(hooks.isSupportedWorkbookFilename("VWG_Dispatch_Tracker.csv"),false);
});

test("the full six-tab workbook selects Email Details and reuses Activity Log twice",()=>{
  const hooks=createWorkbookTestHooks();
  const sheets={
    "Assignments":[
      ["Tracker workbook export"],
      ["Email Key / ID","Received At (UK)","Source Inbox","Status","Current Owner"],
      ["SYN-WB-01","2026-11-22T09:00:00+00:00","Agency Detags","In progress","Synthetic Agent A"]
    ],
    "Activity Log":[
      ["Activity history export"],
      ["Event Time (Egypt)","Event Type","Email Key / ID","Folder Path","Original Assignee","Current Owner","Assignment Flag","Incident Count","Details"],
      ["2026-11-22T11:00:00+02:00","AUTO_ASSIGNMENT","SYN-WB-01","VWGUK R: Milton Keynes\\AgencyDetags\\Inbox","Synthetic Agent A","Synthetic Agent A","TRUE","0","SAFE TEST FIXTURE"]
    ],
    "Team & Shifts":[
      ["Colleague","Outlook Category (exact)","Shift Group","Shift Start (Egypt)","Shift End (Egypt)","Active This Fortnight"],
      ["Synthetic Agent A","Synthetic Agent A","Early","09:00","17:00","Yes"]
    ],
    "Email Details":[
      ["Email Key / ID","Internet Message ID","Brand","Order Number","VIN","Received At (UK)","First Source Inbox","Last Monitored Inbox","Original Assignee","Current Owner","Completion Status","First Missing At (UK)","Completion Time (UK)","Handling Time (Minutes)","Metadata Captured At (UK)"],
      ["DEMO-WB-01","<demo-workbook@example.invalid>","Audi","DEMO-ORDER-WB","SYNTH-VIN-WB","2026-11-22T10:00:00+00:00","Agency Detags","Agency Detags","Synthetic Agent A","Synthetic Agent A","Completed","2026-11-22T11:00:00+00:00","2026-11-22T11:00:00+00:00","60","2026-11-22T10:00:01+00:00"]
    ],
    "Dashboard Summary":[["Report title"],["Synthetic summary"]],
    "Archive":[["Archive note"],["Not used by reporting"]]
  };
  const names=Object.keys(sheets);

  assert.equal(hooks.suggestWorkbookSheet("tickets",names,sheets),"Assignments");
  assert.equal(hooks.suggestWorkbookSheet("assignments",names,sheets),"Activity Log");
  assert.equal(hooks.suggestWorkbookSheet("workflow",names,sheets),"Activity Log");
  assert.equal(hooks.suggestWorkbookSheet("roster",names,sheets),"Team & Shifts");
  assert.equal(hooks.suggestWorkbookSheet("emailDetails",names,sheets),"Email Details");

  const assignmentHistory=hooks.worksheetToTable(sheets["Activity Log"],"assignments");
  const emailDetails=hooks.worksheetToTable(sheets["Email Details"],"emailDetails");
  const workflowHistory=hooks.worksheetToTable(sheets["Activity Log"],"workflow");
  const roster=hooks.worksheetToTable(sheets["Team & Shifts"],"roster");

  assert.equal(assignmentHistory.headers[0],"Event Time (Egypt)");
  assert.equal(assignmentHistory.records.length,1);
  assert.equal(workflowHistory.records.length,1);
  assert.equal(assignmentHistory.records[0]["Event Type"],"AUTO_ASSIGNMENT");
  assert.equal(workflowHistory.records[0]["Event Type"],"AUTO_ASSIGNMENT");
  assert.equal(workflowHistory.records[0]["Folder Path"],"VWGUK R: Milton Keynes\\AgencyDetags\\Inbox");
  assert.equal(workflowHistory.records[0]["Assignment Flag"],"TRUE");
  assert.equal(roster.headers.includes("Outlook Category (exact)"),true);
  assert.equal(roster.records[0]["Shift Group"],"Early");
  assert.equal(emailDetails.records.length,1);
  assert.equal(names.length,6,"Dashboard and Settings may remain as unused tabs alongside Email Details");
});

test("the committed synthetic inputs are the three documented sample files",()=>{
  for(const path of [
    "examples/synthetic-ticket-snapshot.csv",
    "examples/synthetic-assignment-history.csv",
    "examples/synthetic-workflow-history.csv",
    "examples/synthetic-team-roster.csv",
    "examples/synthetic-email-details.csv"
  ]){
    assert.ok(read(path).trim().length>0,"Missing synthetic input: "+path);
  }
});


test("real tracker sheet headers map safely and Event Type drives Activity Log categorisation",async()=>{
  const assignmentsHeaders=[
    "Email Key / ID","Received At (UK)","Source Inbox","Email Subject","Original Assignee","Current Owner","Assignment Flag",
    "Incident Count","Last Incident At","Status","Handover Notes","Last Verified At","LoginUserEmail (optional)",
    "Record Updated At","Allocated At (Egypt)","Roster Period Start","Outlook Entry ID","Outlook Store ID",
    "Pending Since (Egypt)","Last Category State","Handover Count"
  ];
  const activityHeaders=[
    "Event Time (Egypt)","Event Type","Email Key / ID","Folder Path","Original Assignee","Current Owner",
    "Assignment Flag","Incident Count","Details"
  ];
  const quote=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
  const makeCsv=(headers,rows)=>[
    headers.map(quote).join(","),
    ...rows.map(row=>headers.map(header=>quote(row[header]??"")).join(","))
  ].join("\n");

  const assignments=makeCsv(assignmentsHeaders,[
    {"Email Key / ID":"SYN-101","Received At (UK)":"2026-11-22T09:12:00+00:00","Source Inbox":"Agency Detags","Email Subject":"SYNTHETIC SUBJECT - DO NOT EXPORT","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"handover","Status":"In progress","Handover Notes":"SYNTHETIC PRIVATE NOTE","LoginUserEmail (optional)":"agent-a@example.invalid","Outlook Entry ID":"SYNTHETIC-ENTRY-A","Outlook Store ID":"SYNTHETIC-STORE-A"},
    {"Email Key / ID":"SYN-102","Received At (UK)":"2026-11-22T09:40:00+00:00","Source Inbox":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"manual assignment captured","Status":"Waiting","LoginUserEmail (optional)":"agent-c@example.invalid"},
    {"Email Key / ID":"SYN-103","Received At (UK)":"2026-11-22T10:05:00+00:00","Source Inbox":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"category restored","Status":"Resolved"},
    {"Email Key / ID":"SYN-104","Received At (UK)":"2026-11-22T10:20:00+00:00","Source Inbox":"Unadopts","Assignment Flag":"queued","Status":"Received"}
  ]);
  const activity=makeCsv(activityHeaders,[
    {"Event Time (Egypt)":"2026-11-22T11:14:00+02:00","Event Type":"AUTO_ASSIGNMENT","Email Key / ID":"SYN-101","Folder Path":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent A","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"2026-11-22T11:30:00+02:00","Event Type":"HANDOVER","Email Key / ID":"SYN-101","Folder Path":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"2026-11-22T11:40:00+02:00","Event Type":"CATEGORY_REMOVAL_DETECTED","Email Key / ID":"SYN-101","Folder Path":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"2026-11-22T11:45:00+02:00","Event Type":"CATEGORY_RESTORED","Email Key / ID":"SYN-101","Folder Path":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"2026-11-22T12:00:00+02:00","Event Type":"MANUAL_ASSIGNMENT_CAPTURED","Email Key / ID":"SYN-102","Folder Path":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"2026-11-22T12:05:00+02:00","Event Type":"PENDING_ITEM_NOT_FOUND","Email Key / ID":"SYN-102","Folder Path":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"2026-11-22T12:20:00+02:00","Event Type":"AUTO_ASSIGNMENT","Email Key / ID":"SYN-103","Folder Path":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"TRUE"},
    {"Event Time (Egypt)":"2026-11-22T12:25:00+02:00","Event Type":"MULTIPLE_CATEGORIES_PENDING","Email Key / ID":"SYN-103","Folder Path":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"2026-11-22T12:30:00+02:00","Event Type":"BASELINE_REGISTERED","Email Key / ID":"SYN-104","Folder Path":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE"},
    {"Event Time (Egypt)":"2026-11-22T12:35:00+02:00","Event Type":"QUEUED","Email Key / ID":"SYN-104","Folder Path":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"FALSE"}
  ]);

  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:assignments,assignments:activity,workflow:activity
  })));
  const snapshot=run.snapshot;

  assert.deepEqual(run.mappings.tickets,{
    ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"",
    received_at:"Received At (UK)",current_owner:"Current Owner",
    resolution_status:"",resolved_at:"",resolved_by:""
  });
  assert.deepEqual(run.mappings.assignments,{
    ticket_ref:"Email Key / ID",agent:"Original Assignee",kind:"Event Type",
    inbox:"Folder Path",occurred_at:"Event Time (Egypt)"
  });
  assert.deepEqual(run.mappings.workflow,{
    ticket_ref:"Email Key / ID",event_type:"Event Type",
    inbox:"Folder Path",occurred_at:"Event Time (Egypt)",
    original_assignee:"Original Assignee",current_owner:"Current Owner",
    assignment_flag:"Assignment Flag",incident_count:"Incident Count"
  });

  assert.equal(snapshot.tickets.total,4);
  assert.deepEqual(snapshot.tickets.overall,{
    ticket_records:4,initially_assigned:3,resolved:0,outstanding:4,unassigned:1
  });
  assert.equal(snapshot.tickets.resolution_tracking,"not_captured");
  assert.equal(snapshot.tickets.brand_field_mapped,false);
  const events=Object.fromEntries(snapshot.workflow.map(row=>[row.event_type,(snapshot.workflow.filter(item=>item.event_type===row.event_type).reduce((n,item)=>n+item.event_count,0))]));
  assert.deepEqual(events,{
    assigned:2,handover:1,flagged:2,recovery_restored:1,
    manual_assignment:1,exception:1,received:1
  });
  assert.equal(snapshot.activity_log.length,9);
  assert.ok(snapshot.activity_log.every(row=>row.assignment_flag===true||row.assignment_flag===false));
  assert.equal(snapshot.workflow.some(row=>row.event_type==="baseline_registered"),false);

  const imported=validateWithDashboard(snapshot);
  const views=calculateDashboardViews(imported);
  const visibleEvents=Object.fromEntries(views.workflow.map(row=>[row.id,row.events]));
  assert.deepEqual(visibleEvents,{
    handover:1,flag:2,automatic:2,manual:1,recovery:1,
    reassignment:0,exceptions:1,email_lifecycle:0,baseline:1
  });

  const serialised=JSON.stringify(imported);
  assert.ok(snapshot.activity_log.every(row=>/^Ref-[A-F0-9]{10}$/.test(row.ticket_ref)));
  assert.ok(snapshot.activity_log.every(row=>row.original_agent_ref===null||/^Agent-[A-F0-9]{10}$/.test(row.original_agent_ref)));
  assert.ok(snapshot.activity_log.every(row=>row.current_agent_ref===null||/^Agent-[A-F0-9]{10}$/.test(row.current_agent_ref)));
  for(const prohibited of [
    "SYN-101","SYN-102","SYN-103","SYN-104",
    "SYNTHETIC SUBJECT - DO NOT EXPORT","SYNTHETIC PRIVATE NOTE",
    "agent-a@example.invalid","agent-c@example.invalid",
    "SYNTHETIC-ENTRY-A","SYNTHETIC-STORE-A",
    "Synthetic Agent A","Synthetic Agent B","Synthetic Agent C","Synthetic Agent D"
  ]) assert.equal(serialised.includes(prohibited),false,"unmapped sensitive value leaked: "+prohibited);
});


test("Email Details workbook selection never falls back to an Assignments-like worksheet",async()=>{
  const assignmentHeaders=[
    "Email Key / ID","Received At (UK)","Source Inbox","Email Subject","Original Assignee",
    "Current Owner","Assignment Flag","Incident Count","Last Incident At","Status",
    "Handover Notes","Last Verified At","LoginUserEmail (optional)","Record Updated At",
    "Allocated At (Egypt)","Roster Period Start","Outlook Entry ID","Outlook Store ID",
    "Pending Since (Egypt)","Last Category State","Handover Count"
  ];
  const emailDetailsHeaders=[
    "Email Key / ID","Internet Message ID","Brand","Order Number","VIN","Received At (UK)",
    "First Source Inbox","Last Monitored Inbox","Original Assignee","Current Owner",
    "Completion Status","First Missing At (UK)","Completion Time (UK)",
    "Handling Time (Minutes)","Metadata Captured At (UK)"
  ];
  const assignmentSheet={rows:[["ASSIGNMENTS"],[],[],[],assignmentHeaders,["KEY-1","","","","","","","","","","","","","","","","","","","",""]]};
  const emailSheet={rows:[["EMAIL DETAILS"],[],[],[],emailDetailsHeaders]};
  const run=await createStudioSnapshot(null,{
    sheetNames:["Assignments","Activity Log","Team & Shifts"],
    sheets:{
      "Assignments":assignmentSheet,
      "Activity Log":{rows:[["ACTIVITY LOG"],[],[],[],["Event Time (Egypt)","Event Type","Email Key / ID","Folder Path"]]},
      "Team & Shifts":{rows:[["TEAM & SHIFTS"],[],[],[],["Colleague","Outlook Category (exact)"]]}
    }
  });
  assert.equal(run.emailDetailsSheetSuggestion,"",
    "The Studio must leave Email Details unselected when only the 21-column Assignments ledger is available; it must never map Brand/Order/VIN to that sheet.");

  const validRun=await createStudioSnapshot(null,{
    sheetNames:["Assignments","Email Metrics Export"],
    sheets:{
      "Assignments":assignmentSheet,
      "Email Metrics Export":emailSheet
    }
  });
  assert.equal(validRun.emailDetailsSheetSuggestion,"Email Metrics Export",
    "A worksheet with the complete 15-column Email Details schema may be selected even if the tab has a different name.");
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
  for(const name of Array.from({length:14},(_,i)=>"Sample Agent "+String.fromCharCode(65+i))){
    assert.equal(serialised.includes(name),false,"raw roster identity leaked: "+name);
  }
});
