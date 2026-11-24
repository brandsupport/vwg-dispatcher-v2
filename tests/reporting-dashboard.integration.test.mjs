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

async function createStudioSnapshot(){
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
      }
    };
  `;
  vm.runInContext(source+expose,context,{filename:"reporting-studio.js"});
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  return context.__reportingTestHooks.process({
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
  const studio=JSON.parse(JSON.stringify(await createStudioSnapshot()));

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
