/* Browser-local VWG Dispatcher reporting sanitiser.
 * No application API calls, telemetry or storage writes. SheetJS parser code is loaded from its pinned static CDN URL.
 * Raw workbook and CSV rows remain in this browser tab and are discarded after processing.
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
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["email key / id","ticket id","ticket reference","ticket ref","case id","item id","reference","ticketid"]},
      {id:"inbox",label:"Inbox / folder",required:true,aliases:["source inbox","inbox","folder","mailbox folder","queue","folder name"]},
      {id:"status",label:"Current status",required:true,aliases:["status","ticket status","current state","state","work status"]},
      {id:"brand",label:"Brand",aliases:["brand","brand name","make","marque"]},
      {id:"received_at",label:"Received timestamp",aliases:["received at uk","received at","received date","received","date received","created at","created date","received timestamp"]},
      {id:"current_owner",label:"Current owner",required:true,aliases:["current owner","owner","assigned to","assignee","colleague","agent","allocated to","owner name"]},
      {id:"resolution_status",label:"Resolution status (future tracker field)",aliases:["resolution status","resolution state","closure status"]},
      {id:"resolved_at",label:"Resolved timestamp (future tracker field)",aliases:["resolved at uk","resolved at","closed at uk","closed at","resolution timestamp"]},
      {id:"resolved_by",label:"Resolved by (future tracker field; exact Outlook category)",aliases:["resolved by exact","resolved by","resolver","closed by"]}
    ]
  },
  assignments:{
    title:"Assignment history export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["email key / id","ticket id","ticket reference","ticket ref","case id","reference","ticketid"]},
      {id:"agent",label:"New owner / assigned agent",required:true,aliases:["original assignee","new owner","assigned to","assignee","agent","colleague","owner","allocated to"]},
      {id:"kind",label:"Assignment event type",required:true,aliases:["event type","assignment event","assignment kind","assignment type","event","action","type","allocation type"]},
      {id:"inbox",label:"Inbox / folder",aliases:["source inbox","inbox","folder","queue","folder name"]},
      {id:"occurred_at",label:"Assignment timestamp",aliases:["event time egypt","occurred at","assigned at","timestamp","event time","created at","date"]}
    ]
  },
  workflow:{
    title:"Workflow / activity export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["email key / id","ticket id","ticket reference","ticket ref","case id","reference","ticketid"]},
      {id:"event_type",label:"Workflow event type",required:true,aliases:["event type","workflow event","event","activity","action","type"]},
      {id:"inbox",label:"Inbox / folder",aliases:["source inbox","inbox","folder","queue","folder name"]},
      {id:"occurred_at",label:"Event timestamp",aliases:["event time egypt","occurred at","timestamp","event time","created at","date"]},
      {id:"original_assignee",label:"Original assignee (optional)",aliases:["original assignee"]},
      {id:"current_owner",label:"Current owner (optional)",aliases:["current owner"]},
      {id:"assignment_flag",label:"Assignment flag (optional)",aliases:["assignment flag"]},
      {id:"incident_count",label:"Incident count (optional)",aliases:["incident count"]}
    ]
  },
  roster:{
    title:"Team & shifts roster",
    fields:[
      {id:"identity",label:"Exact Outlook category / colleague key",required:true,aliases:["outlook category exact","outlook category","colleague"]},
      {id:"display_name",label:"Colleague display name (private lookup only)",aliases:["colleague","display name","agent name","name"]},
      {id:"shift_group",label:"Shift group",required:true,aliases:["shift group"]},
      {id:"shift_start",label:"Shift start (Egypt)",required:true,aliases:["shift start egypt","shift start"]},
      {id:"shift_end",label:"Shift end (Egypt)",required:true,aliases:["shift end egypt","shift end"]},
      {id:"active",label:"Active this fortnight",required:true,aliases:["active this fortnight","active"] }
    ]
  }
};
const files={tickets:null,assignments:null,workflow:null,roster:null};
const mappings={tickets:{},assignments:{},workflow:{},roster:{}};
const workbookSelections={tickets:"",assignments:"",workflow:"",roster:""};
let workbookData=null;
let sourceMode="";
let currentSnapshot=null;
let privateAgentLookup=[];
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
const WORKBOOK_SHEET_HINTS={
  tickets:["assignments","ticket current state","current state","ticket snapshot"],
  assignments:["activity log","assignment history","assignment log"],
  workflow:["activity log","workflow history","workflow log","activity"],
  roster:["team & shifts","team and shifts","team shifts","roster"]
};
function worksheetRows(worksheet){
  if(typeof XLSX==="undefined"||!XLSX.utils||typeof XLSX.utils.sheet_to_json!=="function")throw new Error("The Excel workbook parser did not load. Refresh the page while connected to the internet, or use the CSV alternative.");
  return XLSX.utils.sheet_to_json(worksheet,{header:1,defval:"",raw:false,blankrows:false,dateNF:"yyyy-mm-dd hh:mm:ss"});
}
function headerMatchScore(row,kind){
  const headers=(row||[]).map((value,index)=>cleanHeader(value)||("Column "+(index+1)));
  return SOURCE_CONFIG[kind].fields.filter(field=>autoMap(headers,field.aliases)).length;
}
function worksheetToTable(worksheet,kind){
  const rows=worksheetRows(worksheet);
  let headerIndex=-1,bestScore=-1;
  for(let index=0;index<Math.min(rows.length,30);index++){
    const row=rows[index];
    if(!Array.isArray(row)||!row.some(value=>String(value??"").trim()!==""))continue;
    const score=headerMatchScore(row,kind);
    if(score>bestScore){bestScore=score;headerIndex=index;}
    if(score===SOURCE_CONFIG[kind].fields.length)break;
  }
  if(headerIndex<0)throw new Error("The selected worksheet is empty.");
  const headers=rows[headerIndex].map((value,index)=>cleanHeader(value)||("Column "+(index+1)));
  const records=rows.slice(headerIndex+1).filter(row=>Array.isArray(row)&&row.some(value=>String(value??"").trim()!=="")).map(values=>{
    const record={};headers.forEach((header,index)=>record[header]=String(values[index]??"").trim());return record;
  });
  return {headers,records};
}
function suggestWorkbookSheet(kind,sheetNames,sheets){
  const hints=(WORKBOOK_SHEET_HINTS[kind]||[]).map(norm);
  for(const hint of hints){const exact=sheetNames.find(name=>norm(name)===hint);if(exact)return exact;}
  let bestName="",bestScore=0;
  for(const name of sheetNames){
    try{
      const rows=worksheetRows(sheets[name]);
      let score=0;
      for(const row of rows.slice(0,30))score=Math.max(score,headerMatchScore(row,kind));
      if(score>bestScore){bestScore=score;bestName=name;}
    }catch(error){/* An unrelated or unsupported worksheet is simply not a candidate. */}
  }
  return bestName;
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
  const panels=["tickets","assignments","workflow","roster"].filter(kind=>files[kind]);
  $("mappingPanels").innerHTML=panels.length?panels.map(mappingMarkup).join(""):'<div class="empty-mapping">Upload the complete tracker workbook above, or select CSVs in the alternative section, to inspect column headings.</div>';
  updateReadyState();
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function selectedValue(record,kind,field){const header=mappings[kind][field];return header?String(record[header]??"").trim():"";}
function mappingErrors(){
  const errors=[];
  for(const kind of ["tickets","assignments","workflow","roster"]){
    if(!files[kind]){if(kind==="tickets")errors.push("Select the ticket/current-state worksheet in the workbook, or choose a ticket/current-state CSV.");continue;}
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
function clearWorkbookForCsv(keepKind=""){
  workbookData=null;
  for(const kind of Object.keys(files)){files[kind]=null;mappings[kind]={};workbookSelections[kind]="";if(kind!==keepKind)$(kind+"File").value="";$(kind+"FileMeta").textContent="No file selected";}
  $("workbookFile").value="";$("workbookFileMeta").textContent="No workbook selected";
  $("workbookSheetSelectors").hidden=true;$("workbookSheetSelectors").innerHTML="";
  sourceMode="csv";
}
async function readSource(kind,file){
  if(sourceMode!=="csv")clearWorkbookForCsv(kind);
  const text=await file.text();
  const parsed=parseCSV(text);
  files[kind]={...parsed,rowCount:parsed.records.length};
  mappings[kind]={};
  $(kind+"FileMeta").textContent=parsed.records.length+" data rows · "+parsed.headers.length+" columns detected · file name not retained";
  renderMappings();
}
function loadWorkbookSheet(kind,sheetName,showError=true,rerender=true){
  workbookSelections[kind]=sheetName||"";
  mappings[kind]={};
  if(!sheetName){files[kind]=null;$(kind+"FileMeta").textContent="Not selected";if(rerender)renderMappings();return;}
  try{
    const parsed=worksheetToTable(workbookData.workbook.Sheets[sheetName],kind);
    files[kind]={...parsed,rowCount:parsed.records.length,sourceSheet:sheetName};
    $(kind+"FileMeta").textContent=sheetName+" · "+parsed.records.length+" data rows · "+parsed.headers.length+" columns";
  }catch(error){
    files[kind]=null;
    $(kind+"FileMeta").textContent=sheetName+" · could not read worksheet";
    if(showError)alert("Could not read the "+SOURCE_CONFIG[kind].title+" worksheet: "+error.message);
  }
  if(rerender)renderMappings();
}
function renderWorkbookSelectors(){
  const panel=$("workbookSheetSelectors");
  if(!workbookData){panel.hidden=true;panel.innerHTML="";return;}
  const labels={tickets:"Ticket / current-state data",assignments:"Assignment history",workflow:"Workflow / activity history",roster:"Team & Shifts roster"};
  const descriptions={tickets:"Required · normally the Assignments tab",assignments:"Optional · normally the Activity Log tab",workflow:"Optional · use the same Activity Log tab again",roster:"Optional · normally the Team & Shifts tab"};
  panel.hidden=false;
  panel.innerHTML='<section class="mapping-group"><h3>Choose the worksheets inside your workbook</h3><p class="field-note">The same Activity Log worksheet is selected twice by design: once for assignment history and once for workflow events. Any other workbook tabs are ignored.</p>'+
    Object.keys(labels).map(kind=>{
      const suggested=suggestWorkbookSheet(kind,workbookData.sheetNames,workbookData.workbook.Sheets);
      workbookSelections[kind]=suggested;
      return '<div class="mapping-field"><label for="sheet-'+kind+'">'+labels[kind]+' <small>'+descriptions[kind]+'</small></label><select id="sheet-'+kind+'" data-sheet-kind="'+kind+'"><option value="">— Not selected —</option>'+workbookData.sheetNames.map(name=>'<option value="'+escapeHtml(name)+'" '+(suggested===name?'selected':'')+'>'+escapeHtml(name)+'</option>').join("")+'</select></div>';
    }).join("")+'</section>';
  for(const kind of Object.keys(labels))loadWorkbookSheet(kind,workbookSelections[kind],false,false);
  renderMappings();
}
async function readWorkbook(file){
  if(!/\.(?:xlsx|xls)$/i.test(file.name||""))throw new Error("Select the original Excel workbook (.xlsx or .xls).");
  if(typeof XLSX==="undefined"||typeof XLSX.read!=="function")throw new Error("The Excel workbook parser did not load. Refresh the page while connected to the internet, or use the CSV alternative.");
  const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
  if(!Array.isArray(workbook.SheetNames)||!workbook.SheetNames.length)throw new Error("No worksheets were found in the selected workbook.");
  sourceMode="workbook";
  workbookData={workbook,sheetNames:workbook.SheetNames.slice()};
  $("workbookFileMeta").textContent=workbookData.sheetNames.length+" worksheets found · workbook name not retained";
  renderWorkbookSelectors();
}
function normaliseInbox(value){
  const key=norm(value);
  if(key.includes("agencydetags")||key.includes("agency detags"))return "agency";
  if(key.includes("unadopts"))return "unadopts";
  if(key.includes("transfers"))return "transfers";
  if(key.includes("detags"))return "detags";
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
function validShiftClock(value){
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value??"").trim());
}
function normaliseShiftGroup(value){
  const key=norm(value);
  return key==="early"?"Early":key==="late"?"Late":"";
}
function normaliseActiveFlag(value){
  const key=norm(value);
  if(["yes","y","true","1","active"].includes(key))return true;
  if(["no","n","false","0","inactive"].includes(key))return false;
  return null;
}
function isInitialKind(value){
  const key=norm(value);
  return ["initial","first","first assignment","initial assignment","initial allocation","first allocation","auto assigned","auto assignment","automatic assignment","manual assignment","manual assignment captured","manual allocation"].includes(key);
}
function initialAssignmentMethod(value){
  const key=norm(value);
  if(["auto assigned","auto assignment","automatic assignment"].includes(key))return "automatic";
  if(["manual assignment","manual assignment captured","manual allocation"].includes(key))return "manual";
  return "other";
}
function normaliseWorkflowEvent(value){
  const key=norm(value).replace(/\s+/g," ");
  const aliases={
    received:["received","ticket received","created","queued"],
    handover:["handover","handed over","handed off","shift handover"],
    assigned:["assigned","auto assigned","auto assignment","initial assignment","initial allocation","first assignment","first allocation"],
    manual_assignment:["manual assignment","manual assignment captured","manually assigned","manual allocation"],
    reassigned:["reassigned","reassignment","reassigned owner"],
    flagged:["flagged","flag","flag raised","flagged for review","category removal detected","category removal pending","category removal verify pending","existing assignment needs review","new mail needs review","backlog needs review","ambiguous assignment","ambiguous categories review"],
    recovery_requested:["recovery requested","recovery request","recovery review opened"],
    recovery_held:["recovery held","held for recovery","recovery hold","recovery blocked","recovery requires review"],
    recovery_restored:["recovery restored","restored","assignment restored","category restored","restoration marker removed","recovery state reconciled","assignment state reconciled"],
    resolved:["resolved","closed","completed"],
    reopened:["reopened","re-opened"],
    exception:["exception","write failed","assignment failed","recovery failed","assignment confirmation failed","auto assignment pending verification","queued item not found","queued item not mail","pending item not found","pending change cancelled","multiple categories pending","multiple categories review","error"]
  };
  for(const [code,values] of Object.entries(aliases))if(values.includes(key))return code;
  return null;
}
function zonedLocalTimestamp(parts,timeZone){
  try{
    const wall=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
    const formatter=new Intl.DateTimeFormat("en-GB",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
    const partsAt=instant=>{
      const values=Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
      return {year:+values.year,month:+values.month,day:+values.day,hour:+values.hour,minute:+values.minute,second:+values.second};
    };
    const same=value=>value.year===parts.year&&value.month===parts.month&&value.day===parts.day&&value.hour===parts.hour&&value.minute===parts.minute&&value.second===parts.second;
    let candidate=wall;
    for(let attempt=0;attempt<6;attempt++){
      const actual=partsAt(candidate);
      const actualWall=Date.UTC(actual.year,actual.month-1,actual.day,actual.hour,actual.minute,actual.second);
      const delta=wall-actualWall;
      candidate+=delta;
      if(delta===0)break;
    }
    if(!same(partsAt(candidate)))return null;
    if(same(partsAt(candidate-3600000))||same(partsAt(candidate+3600000)))return null;
    return new Date(candidate).toISOString();
  }catch(error){return null;}
}
function parseExplicitTimestamp(value,timeZone="Europe/London"){
  const raw=String(value??"").trim();if(!raw)return null;
  if(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)){
    const date=new Date(raw);return Number.isNaN(date.getTime())?null:date.toISOString();
  }
  let match=raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(match)return zonedLocalTimestamp({year:+match[1],month:+match[2],day:+match[3],hour:+match[4],minute:+match[5],second:+(match[6]||0)},timeZone);
  match=raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(match)return zonedLocalTimestamp({year:+match[3],month:+match[2],day:+match[1],hour:+match[4],minute:+match[5],second:+(match[6]||0)},timeZone);
  return null;
}
function parseExplicitDate(value,timeZone="Europe/London"){
  const raw=String(value??"").trim();if(!raw)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){const date=new Date(raw+"T00:00:00Z");return Number.isNaN(date.getTime())?null:date.toISOString().slice(0,10);}
  const ukDate=raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if(ukDate){const day=+ukDate[1],month=+ukDate[2],year=+ukDate[3],date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.toISOString().slice(0,10):null;}
  const instant=parseExplicitTimestamp(raw,timeZone);
  return instant?instant.slice(0,10):null;
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
  $("dailyResults").innerHTML=buildTable(["UTC date","Inbox","Ticket records"],snapshot.tickets.daily_volume.map(row=>[row.date_utc,INBOX_LABELS[row.inbox_code],row.ticket_records]));
  $("agentResults").innerHTML=buildTable(["Agent reference","Inbox","First assignments","Share","Open workload"],snapshot.allocations.map(row=>[row.agent_ref,INBOX_LABELS[row.inbox_code],row.initial_assignments,row.allocation_share_pct.toFixed(1)+"%",row.current_open_workload]));
  $("rosterResults").innerHTML=buildTable(["Agent reference","Shift group","Shift start (Egypt)","Shift end (Egypt)","Active this fortnight"],(snapshot.team_roster||[]).map(row=>[row.agent_ref,row.shift_group,row.shift_start_egypt,row.shift_end_egypt,row.active_this_fortnight?"Yes":"No"]));
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
    const quality={
      tickets:newQuality("Ticket snapshot",files.tickets.rowCount),
      assignments:files.assignments?newQuality("Assignment history",files.assignments.rowCount):null,
      workflow:files.workflow?newQuality("Workflow history",files.workflow.rowCount):null,
      roster:files.roster?newQuality("Team & Shifts roster",files.roster.rowCount):null
    };
    const rosterMap=new Map();const teamRoster=[];const privateNames=new Map();
    const rememberAgent=async(rawName,preferredName="")=>{
      const name=String(rawName??"").trim();
      if(!name||isUnassigned(name))return null;
      const ref=await pseudonym(key,"agent",name);
      if(preferredName||!privateNames.has(ref))privateNames.set(ref,String(preferredName||name).trim());
      return ref;
    };
    if(files.roster){
      for(const row of files.roster.records){
        const identity=selectedValue(row,"roster","identity");
        const displayName=selectedValue(row,"roster","display_name")||identity;
        const shiftGroup=normaliseShiftGroup(selectedValue(row,"roster","shift_group"));
        const shiftStart=selectedValue(row,"roster","shift_start");
        const shiftEnd=selectedValue(row,"roster","shift_end");
        const active=normaliseActiveFlag(selectedValue(row,"roster","active"));
        if(!identity||!shiftGroup||!validShiftClock(shiftStart)||!validShiftClock(shiftEnd)||active===null){
          quality.roster.rows_skipped++;continue;
        }
        if(rosterMap.has(norm(identity))){
          quality.roster.rows_skipped++;quality.roster.duplicate_rows++;continue;
        }
        const agentRef=await rememberAgent(identity,displayName);
        const entry={
          agent_ref:agentRef,shift_group:shiftGroup,
          shift_start_egypt:shiftStart,shift_end_egypt:shiftEnd,
          active_this_fortnight:active
        };
        rosterMap.set(norm(identity),entry);teamRoster.push(entry);
        quality.roster.rows_accepted++;
      }
    }
    const ticketMap=new Map();const dateSet=new Set();
    for(const row of files.tickets.records){
      const ref=selectedValue(row,"tickets","ticket_ref");const inboxRaw=selectedValue(row,"tickets","inbox");const inbox=normaliseInbox(inboxRaw);
      if(!ref||!inbox){quality.tickets.rows_skipped++;if(ref&&!inbox)quality.tickets.unknown_inbox++;continue;}
      const id=norm(ref);
      if(ticketMap.has(id)){quality.tickets.rows_skipped++;quality.tickets.duplicate_rows++;continue;}
      const status=selectedValue(row,"tickets","status");const statusKey=norm(status);const knownStatuses=["resolved","closed","complete","completed","received","queued","assigned","in progress","waiting","pending","flagged","reassigned","unassigned","exception","open","in review","on hold"];if(!knownStatuses.includes(statusKey))quality.tickets.unknown_status++;const brandRaw=selectedValue(row,"tickets","brand");const brand=normaliseBrand(brandRaw);
      if(mappings.tickets.brand&&(!norm(brandRaw)||!BRANDS.unclassified.some(value=>norm(value)===norm(brandRaw))&&brand==="unclassified"))quality.tickets.unknown_brand++;
      const receivedRaw=selectedValue(row,"tickets","received_at");
      const receivedDate=parseExplicitDate(receivedRaw,"Europe/London");
      const receivedAtUtc=parseExplicitTimestamp(receivedRaw,"Europe/London");
      if(receivedRaw&&!receivedDate)quality.tickets.ambiguous_time++;
      if(receivedDate)dateSet.add(receivedDate);
      const owner=selectedValue(row,"tickets","current_owner");
      const ownerRef=isUnassigned(owner)?null:await rememberAgent(owner);
      const resolutionStatusRaw=selectedValue(row,"tickets","resolution_status");
      const resolutionStatus=norm(resolutionStatusRaw);
      const resolvedRaw=selectedValue(row,"tickets","resolved_at");
      const resolvedAtUtc=parseExplicitTimestamp(resolvedRaw,"Europe/London");
      if(resolvedRaw&&!resolvedAtUtc)quality.tickets.ambiguous_time++;
      const resolvedByRaw=selectedValue(row,"tickets","resolved_by");
      const resolvedByRef=resolvedByRaw&&!isUnassigned(resolvedByRaw)?await rememberAgent(resolvedByRaw):null;
      const resolved=resolutionStatusRaw?isResolved(resolutionStatus):Boolean(resolvedAtUtc);
      const ticketRef=await pseudonym(key,"ticket",ref);
      ticketMap.set(id,{ticketRef,inbox,brand,status,resolved,ownerRef,unassigned:isUnassigned(owner),receivedDate,receivedAtUtc,resolutionStatus:resolutionStatusRaw||"",resolvedAtUtc,resolvedByRef});
      quality.tickets.rows_accepted++;
    }
    const initialRows=new Map();
    if(files.assignments){
      const q=quality.assignments;
      for(const row of files.assignments.records){
        const ref=selectedValue(row,"assignments","ticket_ref");const agent=selectedValue(row,"assignments","agent");const kind=selectedValue(row,"assignments","kind");
        const inboxRaw=selectedValue(row,"assignments","inbox");const inbox=inboxRaw?normaliseInbox(inboxRaw):"";
        if(!ref||!agent||isUnassigned(agent)||!kind){q.rows_skipped++;continue;}
        const ticketKey=norm(ref);const ticket=ticketMap.get(ticketKey);
        if(!ticket){q.rows_skipped++;continue;}
        if(inboxRaw&&!inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        if(inbox&&inbox!==ticket.inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        if(!isInitialKind(kind)){q.rows_accepted++;continue;}
        const resolvedInbox=inbox||ticket.inbox;
        if(!resolvedInbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        q.rows_accepted++;
        const list=initialRows.get(ticketKey)||[];
        await rememberAgent(agent);
        list.push({agent,inbox:resolvedInbox,method:initialAssignmentMethod(kind)});initialRows.set(ticketKey,list);
      }
    }
    const validInitial=new Map();let ambiguousInitial=0;
    for(const [ticketKey,items] of initialRows.entries()){
      const uniqueItems=[...new Map(items.map(item=>[norm(item.agent)+"|"+item.inbox+"|"+item.method,item])).values()];
      const duplicateCount=items.length-uniqueItems.length;
      if(duplicateCount>0){
        quality.assignments.duplicate_rows+=duplicateCount;
        quality.assignments.rows_accepted-=duplicateCount;
        quality.assignments.rows_skipped+=duplicateCount;
      }
      if(uniqueItems.length!==1){ambiguousInitial++;quality.assignments.rows_accepted-=uniqueItems.length;quality.assignments.rows_skipped+=uniqueItems.length;continue;}
      const ticket=ticketMap.get(ticketKey);
      if(ticket&&uniqueItems[0].inbox===ticket.inbox)validInitial.set(ticketKey,{agentRef:await rememberAgent(uniqueItems[0].agent),inbox_code:uniqueItems[0].inbox,method:uniqueItems[0].method});
      else if(ticket){quality.assignments.rows_accepted--;quality.assignments.rows_skipped++;quality.assignments.unknown_inbox++;}
    }
    const inboxStats=Object.fromEntries(Object.keys(INBOXES).map(code=>[code,{ticket_records:0,initially_assigned:0,resolved:0,outstanding:0,unassigned:0}]));
    const brandStats=Object.fromEntries(Object.keys(BRAND_LABELS).map(code=>[code,0]));
    const agentCounts=new Map();const workload=new Map();const dailyMap=new Map();
    const assignmentMethods={automatic:0,manual:0,other:0};
    for(const entry of validInitial.values())assignmentMethods[entry.method]=(assignmentMethods[entry.method]||0)+1;
    for(const [ticketKey,ticket] of ticketMap.entries()){
      const stats=inboxStats[ticket.inbox];stats.ticket_records++;
      if(ticket.receivedDate){const dailyKey=ticket.receivedDate+"|"+ticket.inbox;const daily=dailyMap.get(dailyKey)||{date_utc:ticket.receivedDate,inbox_code:ticket.inbox,ticket_records:0};daily.ticket_records++;dailyMap.set(dailyKey,daily);}
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
    const workflowMap=new Map();const activityLog=[];
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
        const timeRaw=selectedValue(row,"workflow","occurred_at");
        const eventTime=parseExplicitTimestamp(timeRaw,"Africa/Cairo");
        if(timeRaw&&!eventTime)q.ambiguous_time++;
        const originalName=selectedValue(row,"workflow","original_assignee");
        const currentName=selectedValue(row,"workflow","current_owner");
        const flagRaw=norm(selectedValue(row,"workflow","assignment_flag"));
        const incidentRaw=selectedValue(row,"workflow","incident_count");
        activityLog.push({
          event_time_egypt:timeRaw||"",event_time_utc:eventTime,
          event_type:event,inbox_code:inbox,ticket_ref:ticket.ticketRef,
          original_agent_ref:originalName&&!isUnassigned(originalName)?await rememberAgent(originalName):null,
          current_agent_ref:currentName&&!isUnassigned(currentName)?await rememberAgent(currentName):null,
          assignment_flag:flagRaw==="true"||flagRaw==="yes"||flagRaw==="1",
          incident_count:/^\d+$/.test(incidentRaw)?Number(incidentRaw):0
        });
      }
    }
    const workflow=[...workflowMap.values()].map(row=>({event_type:row.event_type,inbox_code:row.inbox_code,event_count:row.event_count,distinct_tickets:row.tickets.size})).sort((a,b)=>a.inbox_code.localeCompare(b.inbox_code)||a.event_type.localeCompare(b.event_type));
    const byInbox=Object.keys(INBOXES).map(inbox_code=>({inbox_code,...inboxStats[inbox_code]}));
    const dailyVolume=[...dailyMap.values()].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.inbox_code.localeCompare(b.inbox_code));
    const overall={ticket_records:ticketMap.size,initially_assigned:validInitial.size,resolved:byInbox.reduce((sum,row)=>sum+row.resolved,0),outstanding:byInbox.reduce((sum,row)=>sum+row.outstanding,0),unassigned:byInbox.reduce((sum,row)=>sum+row.unassigned,0)};
    const resolutionRows=[];
    const resolutionAgentMap=new Map();
    for(const ticket of ticketMap.values()){
      if(!ticket.resolved)continue;
      let durationMinutes=null;
      if(ticket.receivedAtUtc&&ticket.resolvedAtUtc){
        const elapsed=(Date.parse(ticket.resolvedAtUtc)-Date.parse(ticket.receivedAtUtc))/60000;
        if(Number.isFinite(elapsed)&&elapsed>=0)durationMinutes=elapsed;
      }
      if(durationMinutes!==null)resolutionRows.push({inbox_code:ticket.inbox,minutes:durationMinutes});
      if(ticket.resolvedByRef){
        const entry=resolutionAgentMap.get(ticket.resolvedByRef)||{agent_ref:ticket.resolvedByRef,resolved_tickets:0,timed_tickets:0,total_resolution_minutes:0};
        entry.resolved_tickets++;
        if(durationMinutes!==null){entry.timed_tickets++;entry.total_resolution_minutes+=durationMinutes;}
        resolutionAgentMap.set(ticket.resolvedByRef,entry);
      }
    }
    const summariseDurations=values=>{
      const sorted=values.slice().sort((a,b)=>a-b);
      const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]:null;
      return {
        timed_tickets:sorted.length,
        average_minutes:sorted.length?Math.round(sorted.reduce((sum,value)=>sum+value,0)/sorted.length):null,
        median_minutes:sorted.length?Math.round((sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.ceil((sorted.length-1)/2)])/2):null,
        p90_minutes:percentile(.9)===null?null:Math.round(percentile(.9))
      };
    };
    const resolutionMetrics={
      status_field_mapped:Boolean(mappings.tickets.resolution_status),
      resolved_at_field_mapped:Boolean(mappings.tickets.resolved_at),
      resolved_by_field_mapped:Boolean(mappings.tickets.resolved_by),
      overall:summariseDurations(resolutionRows.map(row=>row.minutes)),
      by_inbox:INBOXES&&Object.keys(INBOXES).map(inbox_code=>({
        inbox_code,...summariseDurations(resolutionRows.filter(row=>row.inbox_code===inbox_code).map(row=>row.minutes))
      }))
    };
    const resolutionByAgent=[...resolutionAgentMap.values()].sort((a,b)=>a.agent_ref.localeCompare(b.agent_ref));
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
    if(quality.roster?.duplicate_rows)warnings.push(quality.roster.duplicate_rows+" duplicate roster identity row(s) were skipped.");
    if(quality.roster?.rows_skipped)warnings.push(quality.roster.rows_skipped+" invalid or incomplete roster row(s) were skipped.");
    if(!mappings.tickets.brand)warnings.push("No Brand field exists in the mapped ticket source. Brand totals are therefore unclassified; the dashboard will not guess a brand from the email subject.");
    if(!files.roster)warnings.push("No Team & Shifts roster was supplied. Imported agents will not have shift-group or active-fortnight metadata.");
    if(files.roster){
      const usedAgentRefs=new Set();
      for(const ticket of ticketMap.values())if(ticket.ownerRef)usedAgentRefs.add(ticket.ownerRef);
      for(const row of validInitial.values())usedAgentRefs.add(row.agentRef);
      const rosterRefs=new Set(teamRoster.map(row=>row.agent_ref));
      const unmatched=[...usedAgentRefs].filter(ref=>!rosterRefs.has(ref));
      if(unmatched.length)warnings.push(unmatched.length+" pseudonymised agent reference(s) used in ticket or assignment data were not matched to the supplied roster.");
    }
    if(!files.assignments)warnings.push("No assignment-history file was supplied. First-assignment totals and allocation shares are incomplete and shown as zero.");
    else if(validInitial.size===0)warnings.push("No validated first-assignment events were found. Allocation shares cannot be interpreted as complete.");
    if(!files.workflow)warnings.push("No workflow-history file was supplied. Workflow event metrics are unavailable.");
    privateAgentLookup=[...privateNames.entries()].map(([agent_ref,display_name])=>({agent_ref,display_name})).sort((a,b)=>a.display_name.localeCompare(b.display_name));
    const snapshot={
      schema_version:"dispatcher-reporting-snapshot-1",
      generated_at_utc:new Date().toISOString(),
      source_mode:"offline_sanitised_aggregate",
      reporting_period:dateSet.size?{first_received_date_utc:[...dateSet].sort()[0],last_received_date_utc:[...dateSet].sort().at(-1)}:null,
      tickets:{total:ticketMap.size,overall,by_inbox:byInbox,by_brand:byBrand,daily_volume:dailyVolume,
        resolution_tracking:(mappings.tickets.resolution_status||mappings.tickets.resolved_at)?"source_status_present":"not_captured",
        resolution_metrics:resolutionMetrics,
        resolution_by_agent:resolutionByAgent,
        brand_field_mapped:Boolean(mappings.tickets.brand)},
      allocations,assignment_methods:assignmentMethods,
      team_roster:teamRoster.sort((a,b)=>a.shift_group.localeCompare(b.shift_group)||a.agent_ref.localeCompare(b.agent_ref)),
      workflow,activity_log:activityLog.sort((a,b)=>(a.event_time_utc||"").localeCompare(b.event_time_utc||"")),
      data_quality:{sources:[quality.tickets,quality.assignments,quality.workflow,quality.roster].filter(Boolean),ambiguous_initial_assignment_tickets:ambiguousInitial,warnings}
    };
    currentSnapshot=snapshot;
    renderSnapshot(snapshot);
    files.tickets.records.length=0;if(files.assignments)files.assignments.records.length=0;if(files.workflow)files.workflow.records.length=0;if(files.roster)files.roster.records.length=0;
    for(const kind of Object.keys(files)){
      $(kind+"File").value="";
      $(kind+"FileMeta").textContent=files[kind]?"Processed; raw rows cleared from this tab":"No file selected";
    }
    $("workbookFile").value="";$("workbookFileMeta").textContent="Processed; raw workbook data cleared from this tab";
    $("workbookSheetSelectors").hidden=true;$("workbookSheetSelectors").innerHTML="";
    files.tickets=null;files.assignments=null;files.workflow=null;files.roster=null;
    mappings.tickets={};mappings.assignments={};mappings.workflow={};mappings.roster={};
    for(const kind of Object.keys(workbookSelections))workbookSelections[kind]="";
    workbookData=null;sourceMode="";renderMappings();
    button.textContent="Sanitise locally →";
  }catch(error){
    alert("The local sanitiser could not complete: "+error.message);
    button.textContent="Sanitise locally →";
  }finally{updateReadyState();}
}
function downloadSnapshot(){if(!currentSnapshot)return;downloadBlob("dispatcher-reporting-snapshot.json",JSON.stringify(currentSnapshot,null,2),"application/json");}
function downloadPrivateAgentLookup(){
  if(!privateAgentLookup.length){alert("No colleague display names were available for a private lookup.");return;}
  const csv=makeCSV(["agent_ref","display_name"],privateAgentLookup.map(row=>[row.agent_ref,row.display_name]));
  downloadBlob("dispatcher-private-agent-name-lookup.csv","\\uFEFF"+csv,"text/csv;charset=utf-8");
}
function downloadCSVs(){
  if(!currentSnapshot)return;
  const s=currentSnapshot;
  const filesToDownload=[
    ["dispatcher-daily-volume.csv",["date_utc","inbox_code","ticket_records"],s.tickets.daily_volume.map(r=>[r.date_utc,r.inbox_code,r.ticket_records])],
    ["dispatcher-inbox-summary.csv",["inbox_code","inbox_name","ticket_records","initially_assigned","resolved","outstanding","unassigned"],s.tickets.by_inbox.map(r=>[r.inbox_code,INBOX_LABELS[r.inbox_code],r.ticket_records,r.initially_assigned,r.resolved,r.outstanding,r.unassigned])],
    ["dispatcher-brand-summary.csv",["brand_code","brand_name","ticket_count","share_pct"],s.tickets.by_brand.map(r=>[r.brand_code,BRAND_LABELS[r.brand_code],r.count,s.tickets.total?(r.count/s.tickets.total*100).toFixed(2):"0.00"])],
    ["dispatcher-agent-allocation.csv",["agent_ref","inbox_code","initial_assignments","allocation_share_pct","current_open_workload"],s.allocations.map(r=>[r.agent_ref,r.inbox_code,r.initial_assignments,r.allocation_share_pct.toFixed(2),r.current_open_workload])],
    ["dispatcher-team-roster.csv",["agent_ref","shift_group","shift_start_egypt","shift_end_egypt","active_this_fortnight"],(s.team_roster||[]).map(r=>[r.agent_ref,r.shift_group,r.shift_start_egypt,r.shift_end_egypt,r.active_this_fortnight?"Yes":"No"])],
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
function bindWorkbook(){
  $("workbookFile").addEventListener("change",async event=>{
    const file=event.target.files?.[0];
    if(!file){workbookData=null;sourceMode="";for(const kind of Object.keys(files)){files[kind]=null;mappings[kind]={};workbookSelections[kind]="";}renderWorkbookSelectors();renderMappings();return;}
    try{
      for(const kind of Object.keys(files)){
        files[kind]=null;mappings[kind]={};$(kind+"File").value="";$(kind+"FileMeta").textContent="No CSV selected";
      }
      await readWorkbook(file);
    }catch(error){
      workbookData=null;sourceMode="";for(const kind of Object.keys(files)){files[kind]=null;mappings[kind]={};}
      $("workbookFile").value="";$("workbookFileMeta").textContent="Could not read workbook";
      $("workbookSheetSelectors").hidden=true;$("workbookSheetSelectors").innerHTML="";
      alert("Could not read the selected Excel workbook: "+error.message);renderMappings();
    }
  });
}
bindWorkbook();
bindFile("tickets");bindFile("assignments");bindFile("workflow");bindFile("roster");
$("workbookSheetSelectors").addEventListener("change",event=>{
  const select=event.target.closest("[data-sheet-kind]");if(!select||!workbookData)return;
  loadWorkbookSheet(select.dataset.sheetKind,select.value,true,true);
});
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
$("downloadPrivateLookup").addEventListener("click",downloadPrivateAgentLookup);
$("downloadAllCsv").addEventListener("click",downloadCSVs);
updateReadyState();
