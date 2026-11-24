/* Local-only VWG Dispatcher reporting sanitiser.
 * No network requests, storage writes, analytics, or API calls.
 * Raw CSV rows remain in memory in this browser tab and are discarded after processing.
 */
"use strict";

const INBOXES = {
  agency: ["agency","agency detags","agencydetags","agency detag","agency de-tags"],
  detags: ["detags","de-tags","de tags","de tag"],
  transfers: ["transfers","transfer"],
  unadopts: ["unadopts","unadopt"]
};
const BRANDS = {
  volkswagen:["volkswagen","vw","volkswagen passenger cars","vw passenger cars"],
  audi:["audi"],
  skoda:["skoda","škoda"],
  seat:["seat"],
  cupra:["cupra"],
  vwcv:["vwcv","vw commercial vehicles","volkswagen commercial vehicles","commercial vehicles"],
  other:["other"],
  unclassified:["unclassified","unknown","not known",""]
};
const BRAND_LABELS={volkswagen:"Volkswagen",audi:"Audi",skoda:"Škoda",seat:"SEAT",cupra:"CUPRA",vwcv:"Volkswagen Commercial Vehicles",other:"Other",unclassified:"Other / unclassified"};
const INBOX_LABELS={agency:"Agency Detags",detags:"Detags",transfers:"Transfers",unadopts:"Unadopts"};
const SOURCE_CONFIG={
  tickets:{
    title:"Ticket / current-state export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["ticket id","ticket reference","ticket ref","case id","item id","reference","ticketid"]},
      {id:"inbox",label:"Inbox / folder",required:true,aliases:["inbox","folder","mailbox folder","queue","folder name"]},
      {id:"status",label:"Current status",required:true,aliases:["status","ticket status","current state","state","work status"]},
      {id:"brand",label:"Brand",aliases:["brand","brand name","make","marque"]},
      {id:"received_at",label:"Received timestamp",aliases:["received at","received date","received","date received","created at","created date","received timestamp"]},
      {id:"current_owner",label:"Current owner",required:true,aliases:["current owner","owner","assigned to","assignee","colleague","agent","allocated to","owner name"]}
    ]
  },
  assignments:{
    title:"Assignment history export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["ticket id","ticket reference","ticket ref","case id","reference","ticketid"]},
      {id:"agent",label:"New owner / assigned agent",required:true,aliases:["new owner","assigned to","assignee","agent","colleague","owner","allocated to"]},
      {id:"kind",label:"Assignment type",required:true,aliases:["assignment kind","assignment type","event type","type","action","allocation type"]},
      {id:"inbox",label:"Inbox / folder",aliases:["inbox","folder","queue","folder name"]},
      {id:"occurred_at",label:"Assignment timestamp",aliases:["occurred at","assigned at","timestamp","event time","created at","date"]}
    ]
  },
  workflow:{
    title:"Workflow / activity export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["ticket id","ticket reference","ticket ref","case id","reference","ticketid"]},
      {id:"event_type",label:"Workflow event type",required:true,aliases:["event type","workflow event","event","activity","action","type"]},
      {id:"inbox",label:"Inbox / folder",aliases:["inbox","folder","queue","folder name"]},
      {id:"occurred_at",label:"Event timestamp",aliases:["occurred at","timestamp","event time","created at","date"]}
    ]
  }
};
const files={tickets:null,assignments:null,workflow:null};
const mappings={tickets:{},assignments:{},workflow:{}};
let currentSnapshot=null;
let savedWorkspaceKey="";
const $=id=>document.getElementById(id);

function cleanHeader(value){return String(value??"").replace(/^\uFEFF/,"").trim();}
function norm(value){return String(value??"").normalize("NFKC").trim().toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim();}
function detectDelimiter(text){
  const first=(String(text).split(/\r?\n/,1)[0]||"");
  const candidates=[",",";","\t"];
  const counts=candidates.map(delimiter=>{
    let quote=false,count=0;
    for(let i=0;i<first.length;i++){const c=first[i];if(c==='"'){if(quote&&first[i+1]==='"'){i++;continue;}quote=!quote;}else if(c===delimiter&&!quote)count++;}
    return count;
  });
  const max=Math.max(...counts);
  return max===0?",":candidates[counts.indexOf(max)];
}
function parseCSV(text){
  const input=String(text??"").replace(/^\uFEFF/,"");
  const delimiter=detectDelimiter(input);
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){
      if(c==='"'&&input[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quoted=false;
      else field+=c;
    }else if(c==='"'){quoted=true;}
    else if(c===delimiter){row.push(field);field="";}
    else if(c==="\n"){row.push(field.replace(/\r$/,""));if(row.some(v=>String(v).trim()!==""))rows.push(row);row=[];field="";}
    else field+=c;
  }
  row.push(field.replace(/\r$/,""));if(row.some(v=>String(v).trim()!==""))rows.push(row);
  if(quoted)throw new Error("CSV contains an unterminated quoted field.");
  if(!rows.length)throw new Error("The selected CSV is empty.");
  const headers=rows.shift().map((value,index)=>cleanHeader(value)||("Column "+(index+1)));
  const records=rows.map(values=>{
    const record={};headers.forEach((header,index)=>record[header]=String(values[index]??"").trim());return record;
  });
  return {headers,records};
}
function autoMap(headers,aliases){
  const indexed=headers.map(header=>({header,key:norm(header)}));
  for(const alias of aliases){const target=norm(alias);const exact=indexed.find(item=>item.key===target);if(exact)return exact.header;}
  for(const alias of aliases){const target=norm(alias);const partial=indexed.find(item=>item.key&&target&&(item.key.includes(target)||target.includes(item.key)));if(partial)return partial.header;}
  return "";
}
function mappingMarkup(kind){
  const file=files[kind];if(!file)return "";
  const config=SOURCE_CONFIG[kind];
  return '<section class="mapping-group"><h3>'+config.title+'</h3>'+
    config.fields.map(field=>{
      const selected=mappings[kind][field.id]??autoMap(file.headers,field.aliases);
      mappings[kind][field.id]=selected;
      return '<div class="mapping-field"><label for="map-'+kind+'-'+field.id+'">'+field.label+(field.required?' <span class="required">Required</span>':'')+'</label>'+
        '<select id="map-'+kind+'-'+field.id+'" data-map-kind="'+kind+'" data-map-field="'+field.id+'">'+
        '<option value="">— Not mapped —</option>'+file.headers.map(header=>'<option value="'+escapeHtml(header)+'" '+(selected===header?'selected':'')+'>'+escapeHtml(header)+'</option>').join("")+
        '</select></div>';
    }).join("")+'</section>';
}
function renderMappings(){
  const panels=["tickets","assignments","workflow"].filter(kind=>files[kind]);
  $("mappingPanels").innerHTML=panels.length?panels.map(mappingMarkup).join(""):'<div class="empty-mapping">Select a CSV above to inspect its column headings.</div>';
  updateReadyState();
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function selectedValue(record,kind,field){const header=mappings[kind][field];return header?String(record[header]??"").trim():"";}
function mappingErrors(){
  const errors=[];
  for(const kind of ["tickets","assignments","workflow"]){
    if(!files[kind]){if(kind==="tickets")errors.push("Select a ticket/current-state CSV.");continue;}
    for(const field of SOURCE_CONFIG[kind].fields.filter(item=>item.required)){
      if(!mappings[kind][field.id])errors.push(SOURCE_CONFIG[kind].title+": map "+field.label+".");
    }
  }
  if(!$("workspaceKey").value.trim())errors.push("Enter or generate a local workspace key.");
  else if($("workspaceKey").value.trim().length<32)errors.push("The local workspace key must contain at least 32 characters.");
  if(!crypto?.subtle)errors.push("This browser does not provide Web Crypto. Open the tool in a supported modern browser.");
  return errors;
}
function updateReadyState(){
  const errors=mappingErrors();
  $("downloadKey").disabled=$("workspaceKey").value.trim().length<32;
  $("sanitiseButton").disabled=errors.length>0;
  $("sanitiseButton").title=errors.join(" ");
}
async function readSource(kind,file){
  const text=await file.text();
  const parsed=parseCSV(text);
  files[kind]={...parsed,rowCount:parsed.records.length};
  mappings[kind]={};
  $(kind+"FileMeta").textContent=parsed.records.length+" data rows · "+parsed.headers.length+" columns detected · file name not retained";
  renderMappings();
}
function normaliseInbox(value){
  const key=norm(value);
  for(const [code,aliases] of Object.entries(INBOXES))if(aliases.some(alias=>norm(alias)===key))return code;
  return "";
}
function normaliseBrand(value){
  const key=norm(value);
  for(const [code,aliases] of Object.entries(BRANDS))if(aliases.some(alias=>norm(alias)===key))return code;
  return "unclassified";
}
function isUnassigned(value){
  const key=norm(value);
  return !key||["unassigned","unallocated","queue","none","null","n a","na","not assigned"].includes(key);
}
function isResolved(value){
  const key=norm(value);
  return ["resolved","closed","complete","completed"].includes(key);
}
function isInitialKind(value){
  const key=norm(value);
  return key==="initial"||key==="first"||key==="first assignment"||key==="initial assignment"||key==="initial allocation"||key==="first allocation";
}
function normaliseWorkflowEvent(value){
  const key=norm(value).replace(/\s+/g," ");
  const aliases={
    received:["received","ticket received","created"],
    flagged:["flagged","flag","flag raised","flagged for review"],
    handover:["handover","handed over","handed off","shift handover"],
    assigned:["assigned","initial assignment","initial allocation","first assignment","first allocation"],
    manual_assignment:["manual assignment","manually assigned","manual allocation"],
    reassigned:["reassigned","reassignment","reassigned owner"],
    recovery_requested:["recovery requested","recovery request","recovery review opened"],
    recovery_held:["recovery held","held for recovery","recovery hold"],
    recovery_restored:["recovery restored","restored","assignment restored"],
    resolved:["resolved","closed","completed"],
    reopened:["reopened","re-opened"],
    exception:["exception","write failed","assignment failed","error"]
  };
  for(const [code,values] of Object.entries(aliases))if(values.includes(key))return code;
  return null;
}
function parseExplicitDate(value){
  const raw=String(value??"").trim();
  if(!raw)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
    const parsed=new Date(raw+"T00:00:00Z");
    return Number.isNaN(parsed.getTime())?null:parsed.toISOString().slice(0,10);
  }
  if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw))return null;
  const parsed=new Date(raw);
  return Number.isNaN(parsed.getTime())?null:parsed.toISOString().slice(0,10);
}
function makeHmacKey(secret){
  return crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
}
async function pseudonym(key,prefix,value){
  const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(prefix+":"+norm(value)));
  const hex=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
  return (prefix==="agent"?"Agent-":"Ref-")+hex.slice(0,10).toUpperCase();
}
function newQuality(kind,rows){
  return {source:kind,rows_read:rows,rows_accepted:0,rows_skipped:0,duplicate_rows:0,unknown_inbox:0,unknown_brand:0,unknown_status:0,ambiguous_time:0};
}
function buildTable(headers,rows){
  if(!rows.length)return '<p class="muted-cell">No validated records available.</p>';
  return '<table><thead><tr>'+headers.map((header,index)=>'<th class="'+(index>0?'num':'')+'">'+escapeHtml(header)+'</th>').join("")+'</tr></thead><tbody>'+
    rows.map(row=>'<tr>'+row.map((value,index)=>'<td class="'+(index>0?'num':'')+'">'+escapeHtml(value)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
}
function metricRows(object,order){return order.map(code=>object[code]||0);}
function makeCSV(headers,rows){
  const q=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
  return [headers.map(q).join(","),...rows.map(row=>row.map(q).join(","))].join("\r\n");
}
function downloadBlob(name,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
  anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function renderSnapshot(snapshot){
  $("resultsSection").hidden=false;
  const overall=snapshot.tickets.overall;
  $("resultScope").textContent="Snapshot generated "+snapshot.generated_at_utc+" · "+snapshot.tickets.total+" unique ticket records · aggregate output only";
  $("kpiResults").innerHTML=[
    ["Ticket records",overall.ticket_records],
    ["Initially assigned",overall.initially_assigned],
    ["Resolved / closed",overall.resolved],
    ["Outstanding",overall.outstanding],
    ["Unassigned open",overall.unassigned]
  ].map(([label,value])=>'<div class="result-kpi"><span>'+label+'</span><strong>'+Number(value).toLocaleString("en-GB")+'</strong></div>').join("");
  $("inboxResults").innerHTML=buildTable(["Inbox","Ticket records","First assigned","Resolved","Open","Unassigned"],snapshot.tickets.by_inbox.map(row=>[INBOX_LABELS[row.inbox_code],row.ticket_records,row.initially_assigned,row.resolved,row.outstanding,row.unassigned]));
  $("brandResults").innerHTML=buildTable(["Brand","Tickets","Share"],snapshot.tickets.by_brand.map(row=>[BRAND_LABELS[row.brand_code],row.count,(snapshot.tickets.total?row.count/snapshot.tickets.total*100:0).toFixed(1)+"%"]));
  $("agentResults").innerHTML=buildTable(["Agent reference","Inbox","First assignments","Share","Open workload"],snapshot.allocations.map(row=>[row.agent_ref,INBOX_LABELS[row.inbox_code],row.initial_assignments,row.allocation_share_pct.toFixed(1)+"%",row.current_open_workload]));
  $("workflowResults").innerHTML=buildTable(["Event type","Inbox","Events","Tickets affected"],snapshot.workflow.map(row=>[row.event_type,INBOX_LABELS[row.inbox_code],row.event_count,row.distinct_tickets]));
  $("qualityResults").innerHTML=buildTable(["Source","Rows read","Accepted","Skipped","Duplicates","Unknown inbox","Unmapped brand","Unknown status","Ambiguous time"],snapshot.data_quality.sources.map(row=>[row.source,row.rows_read,row.rows_accepted,row.rows_skipped,row.duplicate_rows,row.unknown_inbox,row.unknown_brand,row.unknown_status,row.ambiguous_time]));
  const warnings=snapshot.data_quality.warnings;
  $("qualityWarnings").hidden=!warnings.length;
  $("qualityWarnings").innerHTML=warnings.length?"Review these data-quality notes before using the report:<br>"+warnings.map(escapeHtml).join("<br>"):"";
  $("snapshotPreview").textContent=JSON.stringify(snapshot,null,2);
  $("resultsSection").scrollIntoView({behavior:"smooth",block:"start"});
}
async function sanitise(){
  const errors=mappingErrors();
  if(errors.length){alert(errors.join("\n"));return;}
  const button=$("sanitiseButton");button.disabled=true;button.textContent="Processing locally…";
  try{
    const key=await makeHmacKey($("workspaceKey").value.trim());
    const quality={tickets:newQuality("Ticket snapshot",files.tickets.rowCount),assignments:files.assignments?newQuality("Assignment history",files.assignments.rowCount):null,workflow:files.workflow?newQuality("Workflow history",files.workflow.rowCount):null};
    const ticketMap=new Map();const dateSet=new Set();
    for(const row of files.tickets.records){
      const ref=selectedValue(row,"tickets","ticket_ref");const inboxRaw=selectedValue(row,"tickets","inbox");const inbox=normaliseInbox(inboxRaw);
      if(!ref||!inbox){quality.tickets.rows_skipped++;if(ref&&!inbox)quality.tickets.unknown_inbox++;continue;}
      const id=norm(ref);
      if(ticketMap.has(id)){quality.tickets.rows_skipped++;quality.tickets.duplicate_rows++;continue;}
      const status=selectedValue(row,"tickets","status");const statusKey=norm(status);const knownStatuses=["resolved","closed","complete","completed","received","queued","assigned","in progress","waiting","pending","flagged","reassigned","unassigned","exception","open","in review","on hold"];if(!knownStatuses.includes(statusKey))quality.tickets.unknown_status++;const brandRaw=selectedValue(row,"tickets","brand");const brand=normaliseBrand(brandRaw);
      if(brand==="unclassified"&&norm(brandRaw)&&!BRANDS.unclassified.some(value=>norm(value)===norm(brandRaw)))quality.tickets.unknown_brand++;
      const receivedRaw=selectedValue(row,"tickets","received_at");const receivedDate=parseExplicitDate(receivedRaw);
      if(receivedRaw&&!receivedDate)quality.tickets.ambiguous_time++;
      if(receivedDate)dateSet.add(receivedDate);
      const owner=selectedValue(row,"tickets","current_owner");
      const ownerRef=isUnassigned(owner)?null:await pseudonym(key,"agent",owner);
      ticketMap.set(id,{inbox,brand,resolved:isResolved(status),ownerRef,unassigned:isUnassigned(owner)});
      quality.tickets.rows_accepted++;
    }
    const initialRows=new Map();
    if(files.assignments){
      const q=quality.assignments;
      for(const row of files.assignments.records){
        const ref=selectedValue(row,"assignments","ticket_ref");const agent=selectedValue(row,"assignments","agent");const kind=selectedValue(row,"assignments","kind");
        const inboxRaw=selectedValue(row,"assignments","inbox");const inbox=inboxRaw?normaliseInbox(inboxRaw):"";
        if(!ref||!agent||isUnassigned(agent)||!kind){q.rows_skipped++;continue;}
        if(!isInitialKind(kind)){q.rows_accepted++;continue;}
        const ticketKey=norm(ref);const ticket=ticketMap.get(ticketKey);
        if(!ticket){q.rows_skipped++;continue;}
        if(inboxRaw&&!inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        const resolvedInbox=inbox||ticket.inbox;
        if(!resolvedInbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        q.rows_accepted++;
        const list=initialRows.get(ticketKey)||[];
        list.push({agent,inbox:resolvedInbox});initialRows.set(ticketKey,list);
      }
    }
    const validInitial=new Map();let ambiguousInitial=0;
    for(const [ticketKey,items] of initialRows.entries()){
      if(items.length!==1){ambiguousInitial++;quality.assignments.rows_accepted-=items.length;quality.assignments.rows_skipped+=items.length;continue;}
      const ticket=ticketMap.get(ticketKey);
      if(ticket&&items[0].inbox===ticket.inbox)validInitial.set(ticketKey,{agentRef:await pseudonym(key,"agent",items[0].agent),inbox_code:items[0].inbox});
      else if(ticket){quality.assignments.rows_accepted--;quality.assignments.rows_skipped++;quality.assignments.unknown_inbox++;}
    }
    const inboxStats=Object.fromEntries(Object.keys(INBOXES).map(code=>[code,{ticket_records:0,initially_assigned:0,resolved:0,outstanding:0,unassigned:0}]));
    const brandStats=Object.fromEntries(Object.keys(BRAND_LABELS).map(code=>[code,0]));
    const agentCounts=new Map();const workload=new Map();
    for(const [ticketKey,ticket] of ticketMap.entries()){
      const stats=inboxStats[ticket.inbox];stats.ticket_records++;
      if(ticket.resolved)stats.resolved++;else{stats.outstanding++;if(ticket.unassigned)stats.unassigned++;}
      brandStats[ticket.brand]=(brandStats[ticket.brand]||0)+1;
      if(ticket.ownerRef&&!ticket.resolved){const workloadKey=ticket.ownerRef+"|"+ticket.inbox;workload.set(workloadKey,(workload.get(workloadKey)||0)+1);}
      const initial=validInitial.get(ticketKey);
      if(initial){
        stats.initially_assigned++;
        const group=initial.agentRef+"|"+initial.inbox_code;
        agentCounts.set(group,(agentCounts.get(group)||0)+1);
      }
    }
    const allocations=[];
    const allocationGroups=new Set([...agentCounts.keys(),...workload.keys()]);
    for(const group of allocationGroups){
      const [agent_ref,inbox_code]=group.split("|");const count=agentCounts.get(group)||0;const total=inboxStats[inbox_code].initially_assigned;
      allocations.push({agent_ref,inbox_code,initial_assignments:count,allocation_share_pct:total?count/total*100:0,current_open_workload:workload.get(group)||0});
    }
    allocations.sort((a,b)=>a.inbox_code.localeCompare(b.inbox_code)||a.agent_ref.localeCompare(b.agent_ref));
    const workflowMap=new Map();
    if(files.workflow){
      const q=quality.workflow;
      for(const row of files.workflow.records){
        const ref=selectedValue(row,"workflow","ticket_ref");const eventRaw=selectedValue(row,"workflow","event_type");const inboxRaw=selectedValue(row,"workflow","inbox");
        if(!ref||!eventRaw){q.rows_skipped++;continue;}
        const ticket=ticketMap.get(norm(ref));if(!ticket){q.rows_skipped++;continue;}
        const inbox=inboxRaw?normaliseInbox(inboxRaw):ticket.inbox;
        if(!inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        const event=normaliseWorkflowEvent(eventRaw);
        if(!event){q.rows_skipped++;continue;}
        q.rows_accepted++;
        const keyName=event+"|"+inbox;const record=workflowMap.get(keyName)||{event_type:event,inbox_code:inbox,event_count:0,tickets:new Set()};
        record.event_count++;record.tickets.add(norm(ref));workflowMap.set(keyName,record);
        const timeRaw=selectedValue(row,"workflow","occurred_at");if(timeRaw&&!parseExplicitDate(timeRaw))q.ambiguous_time++;
      }
    }
    const workflow=[...workflowMap.values()].map(row=>({event_type:row.event_type,inbox_code:row.inbox_code,event_count:row.event_count,distinct_tickets:row.tickets.size})).sort((a,b)=>a.inbox_code.localeCompare(b.inbox_code)||a.event_type.localeCompare(b.event_type));
    const byInbox=Object.keys(INBOXES).map(inbox_code=>({inbox_code,...inboxStats[inbox_code]}));
    const overall={ticket_records:ticketMap.size,initially_assigned:validInitial.size,resolved:byInbox.reduce((sum,row)=>sum+row.resolved,0),outstanding:byInbox.reduce((sum,row)=>sum+row.outstanding,0),unassigned:byInbox.reduce((sum,row)=>sum+row.unassigned,0)};
    const byBrand=Object.keys(BRAND_LABELS).map(brand_code=>({brand_code,count:brandStats[brand_code]||0})).filter(row=>row.count||row.brand_code==="unclassified");
    const warnings=[];
    if(quality.tickets.duplicate_rows)warnings.push(quality.tickets.duplicate_rows+" duplicate ticket row(s) were skipped; only the first occurrence per ticket reference was retained.");
    if(quality.tickets.unknown_inbox)warnings.push(quality.tickets.unknown_inbox+" ticket row(s) had an unmapped inbox and were excluded.");
    if(quality.tickets.unknown_brand)warnings.push(quality.tickets.unknown_brand+" ticket row(s) had an unrecognised brand and were classified as Other / unclassified.");
    if(quality.tickets.unknown_status)warnings.push(quality.tickets.unknown_status+" ticket row(s) had an unmapped or blank status; those rows were conservatively treated as open.");
    if(quality.tickets.ambiguous_time)warnings.push(quality.tickets.ambiguous_time+" ticket timestamp(s) were not ISO dates or timezone-explicit timestamps; no date grouping was inferred.");
    if(ambiguousInitial)warnings.push(ambiguousInitial+" ticket(s) had multiple initial-assignment records; those allocation records were excluded as ambiguous.");
    if(quality.assignments?.unknown_inbox)warnings.push(quality.assignments.unknown_inbox+" assignment row(s) had an inbox mismatch or unknown inbox and were excluded.");
    if(quality.workflow?.unknown_inbox)warnings.push(quality.workflow.unknown_inbox+" workflow row(s) had an unknown inbox and were excluded.");
    if(!files.assignments)warnings.push("No assignment-history file was supplied. First-assignment totals and allocation shares are incomplete and shown as zero.");
    else if(validInitial.size===0)warnings.push("No validated first-assignment events were found. Allocation shares cannot be interpreted as complete.");
    if(!files.workflow)warnings.push("No workflow-history file was supplied. Workflow event metrics are unavailable.");
    const snapshot={
      schema_version:"dispatcher-reporting-snapshot-1",
      generated_at_utc:new Date().toISOString(),
      source_mode:"offline_sanitised_aggregate",
      reporting_period:dateSet.size?{first_received_date_utc:[...dateSet].sort()[0],last_received_date_utc:[...dateSet].sort().at(-1)}:null,
      tickets:{total:ticketMap.size,overall,by_inbox:byInbox,by_brand:byBrand},
      allocations,
      workflow,
      data_quality:{sources:[quality.tickets,quality.assignments,quality.workflow].filter(Boolean),ambiguous_initial_assignment_tickets:ambiguousInitial,warnings}
    };
    currentSnapshot=snapshot;
    renderSnapshot(snapshot);
    files.tickets.records.length=0;if(files.assignments)files.assignments.records.length=0;if(files.workflow)files.workflow.records.length=0;
    $("ticketsFile").value="";$("assignmentsFile").value="";$("workflowFile").value="";
    $("ticketsFileMeta").textContent="Processed; raw rows cleared from this tab";
    $("assignmentsFileMeta").textContent=files.assignments?"Processed; raw rows cleared from this tab":"No file selected";
    $("workflowFileMeta").textContent=files.workflow?"Processed; raw rows cleared from this tab":"No file selected";
    files.tickets=null;files.assignments=null;files.workflow=null;mappings.tickets={};mappings.assignments={};mappings.workflow={};renderMappings();
    button.textContent="Sanitise locally →";
  }catch(error){
    alert("The local sanitiser could not complete: "+error.message);
    button.textContent="Sanitise locally →";
  }finally{updateReadyState();}
}
function downloadSnapshot(){if(!currentSnapshot)return;downloadBlob("dispatcher-reporting-snapshot.json",JSON.stringify(currentSnapshot,null,2),"application/json");}
function downloadCSVs(){
  if(!currentSnapshot)return;
  const s=currentSnapshot;
  const filesToDownload=[
    ["dispatcher-inbox-summary.csv",["inbox_code","inbox_name","ticket_records","initially_assigned","resolved","outstanding","unassigned"],s.tickets.by_inbox.map(r=>[r.inbox_code,INBOX_LABELS[r.inbox_code],r.ticket_records,r.initially_assigned,r.resolved,r.outstanding,r.unassigned])],
    ["dispatcher-brand-summary.csv",["brand_code","brand_name","ticket_count","share_pct"],s.tickets.by_brand.map(r=>[r.brand_code,BRAND_LABELS[r.brand_code],r.count,s.tickets.total?(r.count/s.tickets.total*100).toFixed(2):"0.00"])],
    ["dispatcher-agent-allocation.csv",["agent_ref","inbox_code","initial_assignments","allocation_share_pct","current_open_workload"],s.allocations.map(r=>[r.agent_ref,r.inbox_code,r.initial_assignments,r.allocation_share_pct.toFixed(2),r.current_open_workload])],
    ["dispatcher-workflow-summary.csv",["event_type","inbox_code","event_count","distinct_tickets"],s.workflow.map(r=>[r.event_type,r.inbox_code,r.event_count,r.distinct_tickets])],
    ["dispatcher-data-quality.csv",["source","rows_read","rows_accepted","rows_skipped","duplicate_rows","unknown_inbox","unknown_brand","unknown_status","ambiguous_time"],s.data_quality.sources.map(r=>[r.source,r.rows_read,r.rows_accepted,r.rows_skipped,r.duplicate_rows,r.unknown_inbox,r.unknown_brand,r.unknown_status,r.ambiguous_time])]
  ];
  filesToDownload.forEach(([name,headers,rows],index)=>setTimeout(()=>downloadBlob(name,makeCSV(headers,rows),"text/csv;charset=utf-8"),index*180));
}
function generateKey(){
  if(!crypto?.getRandomValues){alert("Secure random key generation is not available in this browser.");return;}
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  savedWorkspaceKey=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  $("workspaceKey").value=savedWorkspaceKey;$("downloadKey").disabled=false;updateReadyState();
}
function saveKey(){const value=$("workspaceKey").value.trim();if(value.length<32){alert("Enter a key with at least 32 characters first.");return;}downloadBlob("dispatcher-local-pseudonym-key.txt",value+"\n","text/plain;charset=utf-8");}
function bindFile(kind){
  $(kind+"File").addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file){files[kind]=null;renderMappings();return;}
    try{await readSource(kind,file);}catch(error){files[kind]=null;alert("Could not read the selected CSV: "+error.message);event.target.value="";renderMappings();}
  });
}
bindFile("tickets");bindFile("assignments");bindFile("workflow");
$("mappingPanels").addEventListener("change",event=>{
  const select=event.target.closest("[data-map-kind]");if(!select)return;
  mappings[select.dataset.mapKind][select.dataset.mapField]=select.value;updateReadyState();
});
$("workspaceKey").addEventListener("input",updateReadyState);
$("generateKey").addEventListener("click",generateKey);
$("downloadKey").addEventListener("click",saveKey);
$("toggleKey").addEventListener("click",()=>{const field=$("workspaceKey");field.type=field.type==="password"?"text":"password";$("toggleKey").textContent=field.type==="password"?"Show":"Hide";});
$("sanitiseButton").addEventListener("click",sanitise);
$("downloadSnapshot").addEventListener("click",downloadSnapshot);
$("downloadAllCsv").addEventListener("click",downloadCSVs);
updateReadyState();
