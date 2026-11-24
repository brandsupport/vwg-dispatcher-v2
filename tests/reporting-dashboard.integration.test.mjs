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
        files.tickets={...ticketData,rowCount:ticketData.records.length};
        files.assignments={...assignmentData,rowCount:assignmentData.records.length};
        files.workflow={...workflowData,rowCount:workflowData.records.length};
        mappings.tickets=mapHeaders("tickets",ticketData.headers);
        mappings.assignments=mapHeaders("assignments",assignmentData.headers);
        mappings.workflow=mapHeaders("workflow",workflowData.headers);
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
    extractFunction("brandRows"),
    extractFunction("totals"),
    extractFunction("workflowSummaryRows"),
    "globalThis.result={totals:totals(),folders:folderAssignedRows().filter(row=>state.folder==='all'||row.id===state.folder),agents:allocationMatrix(),brands:brandRows(),workflow:workflowSummaryRows()};"
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
  assert.deepEqual(eventCounts,{handover:1,flag:1,manual:0,recovery:1,reassignment:0});

  const detags=calculateDashboardViews(imported,"detags");
  assert.deepEqual(detags.totals,{
    received:2,assigned:2,resolved:0,open:2,unassigned:0
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

test("the committed synthetic inputs are the three documented sample files",()=>{
  for(const path of [
    "examples/synthetic-ticket-snapshot.csv",
    "examples/synthetic-assignment-history.csv",
    "examples/synthetic-workflow-history.csv"
  ]){
    assert.ok(read(path).trim().length>0,"Missing synthetic input: "+path);
  }
});


test("real tracker sheet headers map safely and Assignment Flag drives activity categorisation",async()=>{
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
    {"Event Time (Egypt)":"2026-11-22T11:14:00+02:00","Event Type":"true","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent A","Assignment Flag":"auto assigned"},
    {"Event Time (Egypt)":"2026-11-22T11:30:00+02:00","Event Type":"false","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"handover"},
    {"Event Time (Egypt)":"2026-11-22T11:40:00+02:00","Event Type":"true","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"category removal detected"},
    {"Event Time (Egypt)":"2026-11-22T11:45:00+02:00","Event Type":"false","Email Key / ID":"SYN-101","Source Inbox":"Agency Detags","Original Assignee":"Synthetic Agent A","Current Owner":"Synthetic Agent B","Assignment Flag":"category restored"},
    {"Event Time (Egypt)":"2026-11-22T12:00:00+02:00","Event Type":"true","Email Key / ID":"SYN-102","Source Inbox":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"manual assignment captured"},
    {"Event Time (Egypt)":"2026-11-22T12:05:00+02:00","Event Type":"false","Email Key / ID":"SYN-102","Source Inbox":"Detags","Original Assignee":"Synthetic Agent C","Current Owner":"Synthetic Agent C","Assignment Flag":"pending item not found"},
    {"Event Time (Egypt)":"2026-11-22T12:20:00+02:00","Event Type":"true","Email Key / ID":"SYN-103","Source Inbox":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"auto assigned"},
    {"Event Time (Egypt)":"2026-11-22T12:25:00+02:00","Event Type":"false","Email Key / ID":"SYN-103","Source Inbox":"Transfers","Original Assignee":"Synthetic Agent D","Current Owner":"Synthetic Agent D","Assignment Flag":"MULTIPLE_CATEGORIES_PENDING"},
    {"Event Time (Egypt)":"2026-11-22T12:30:00+02:00","Event Type":"false","Email Key / ID":"SYN-104","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"baseline registered"},
    {"Event Time (Egypt)":"2026-11-22T12:35:00+02:00","Event Type":"false","Email Key / ID":"SYN-104","Source Inbox":"Unadopts","Original Assignee":"","Current Owner":"","Assignment Flag":"queued"}
  ]);

  const run=JSON.parse(JSON.stringify(await createStudioSnapshot({
    tickets:assignments,assignments:activity,workflow:activity
  })));
  const snapshot=run.snapshot;

  assert.deepEqual(run.mappings.tickets,{
    ticket_ref:"Email Key / ID",inbox:"Source Inbox",status:"Status",brand:"",
    received_at:"Received At (UK)",current_owner:"Current Owner"
  });
  assert.deepEqual(run.mappings.assignments,{
    ticket_ref:"Email Key / ID",agent:"Original Assignee",kind:"Assignment Flag",
    inbox:"Source Inbox",occurred_at:"Event Time (Egypt)"
  });
  assert.deepEqual(run.mappings.workflow,{
    ticket_ref:"Email Key / ID",event_type:"Assignment Flag",
    inbox:"Source Inbox",occurred_at:"Event Time (Egypt)"
  });

  assert.equal(snapshot.tickets.total,4);
  assert.deepEqual(snapshot.tickets.overall,{
    ticket_records:4,initially_assigned:2,resolved:1,outstanding:3,unassigned:1
  });
  const events=Object.fromEntries(snapshot.workflow.map(row=>[row.event_type,(snapshot.workflow.filter(item=>item.event_type===row.event_type).reduce((n,item)=>n+item.event_count,0))]));
  assert.deepEqual(events,{
    assigned:2,handover:1,flagged:1,recovery_restored:1,
    manual_assignment:1,exception:2
  });
  assert.equal(snapshot.workflow.some(row=>row.event_type==="baseline_registered"),false);
  assert.equal(snapshot.workflow.some(row=>row.event_type==="queued"),false);

  const imported=validateWithDashboard(snapshot);
  const views=calculateDashboardViews(imported);
  const visibleEvents=Object.fromEntries(views.workflow.map(row=>[row.id,row.events]));
  assert.deepEqual(visibleEvents,{handover:1,flag:1,manual:1,recovery:1,reassignment:0});

  const serialised=JSON.stringify(imported);
  for(const prohibited of [
    "SYN-101","SYN-102","SYN-103","SYN-104",
    "SYNTHETIC SUBJECT - DO NOT EXPORT","SYNTHETIC PRIVATE NOTE",
    "agent-a@example.invalid","agent-c@example.invalid",
    "SYNTHETIC-ENTRY-A","SYNTHETIC-STORE-A",
    "Synthetic Agent A","Synthetic Agent B","Synthetic Agent C","Synthetic Agent D"
  ]) assert.equal(serialised.includes(prohibited),false,"unmapped sensitive value leaked: "+prohibited);
});
