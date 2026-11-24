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
      {id:"status",label:"Tracker assignment status",required:true,aliases:["status","tracker status","assignment status","current state","state","work status"]},
      {id:"brand",label:"Explicit brand field",aliases:["brand","brand name","make","marque"]},
      {id:"received_at",label:"Received timestamp (UK local)",aliases:["received at uk","received at","received date","date received","created at","created date","received timestamp"]},
      {id:"current_owner",label:"Current owner",required:true,aliases:["current owner","owner","assigned to","assignee","colleague","agent","allocated to","owner name"]},
      {id:"lifecycle_status",label:"Ticket lifecycle status (not tracker status)",aliases:["lifecycle status","ticket lifecycle","resolution status","closure status"]},
      {id:"resolved_at",label:"Resolved timestamp",aliases:["resolved at","closed at","completed at","resolution timestamp"]},
      {id:"resolved_by",label:"Resolved by",aliases:["resolved by","closed by","completed by"]}
    ]
  },
  assignments:{
    title:"Assignment history export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["email key / id","ticket id","ticket reference","ticket ref","case id","reference","ticketid"]},
      {id:"agent",label:"Original assignee / first owner",required:true,aliases:["original assignee","first assignee","initial owner","current owner","new owner","assigned to","assignee","agent","colleague","owner","allocated to"]},
      {id:"kind",label:"Actual event name",required:true,aliases:["event type","event name","activity type","workflow event","activity","action","assignment type","assignment kind","type"]},
      {id:"first_assignment_flag",label:"First-assignment flag (TRUE/FALSE)",aliases:["assignment flag","first assignment flag","initial assignment flag"]},
      {id:"inbox",label:"Inbox / folder",aliases:["source inbox","inbox","folder","queue","folder name"]},
      {id:"occurred_at",label:"Event timestamp (Egypt local)",aliases:["event time egypt","occurred at","assigned at","timestamp","event time","created at","date"]}
    ]
  },
  workflow:{
    title:"Workflow / activity export",
    fields:[
      {id:"ticket_ref",label:"Ticket reference",required:true,aliases:["email key / id","ticket id","ticket reference","ticket ref","case id","reference","ticketid"]},
      {id:"event_type",label:"Actual event name",required:true,aliases:["event type","event name","activity type","workflow event","activity","action","type"]},
      {id:"original_assignee",label:"Original assignee",aliases:["original assignee","first assignee","initial owner"]},
      {id:"current_owner",label:"Current owner recorded at event",aliases:["current owner","owner","assigned to","assignee","agent","colleague"]},
      {id:"first_assignment_flag",label:"First-assignment flag (TRUE/FALSE)",aliases:["assignment flag","first assignment flag","initial assignment flag"]},
      {id:"inbox",label:"Inbox / folder",aliases:["source inbox","inbox","folder","queue","folder name"]},
      {id:"occurred_at",label:"Event timestamp (Egypt local)",aliases:["event time egypt","occurred at","timestamp","event time","created at","date"]}
    ]
  },
  roster:{
    title:"Team & shifts roster",
    fields:[
      {id:"identity",label:"Exact Outlook category / colleague key",required:true,aliases:["outlook category exact","outlook category","category"]},
      {id:"display_name",label:"Colleague display name",aliases:["colleague","display name","agent name","name"]},
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
function firstAssignmentMethod(value){
  const key=norm(value);
  if(["auto assignment","auto assigned","automatic assignment","initial automatic assignment","first automatic assignment","initial","first","first assignment","initial assignment","initial allocation","first allocation"].includes(key))return "automatic";
  if(["manual assignment captured","manual assignment","manually assigned","manual allocation","initial manual assignment","first manual assignment"].includes(key))return "manual";
  return null;
}
function isInitialKind(value){return Boolean(firstAssignmentMethod(value));}
function normaliseTrueFalse(value){
  const key=norm(value);
  if(["true","yes","y","1"].includes(key))return true;
  if(["false","no","n","0"].includes(key))return false;
  return null;
}
function normaliseTrackerStatus(value){
  const key=norm(value);
  const known={
    unassigned:"Unassigned",queued:"Queued",assigning:"Assigning",assigned:"Assigned",
    recovered:"Recovered","recovered review":"Recovered","needs review":"Needs Review",
    "handover pending":"Handover Pending","handed over":"Handed Over",
    "recovery failed":"Recovery Failed","dry run recovery pending":"Dry Run - Recovery Pending",
    "recovery pending":"Recovery Pending"
  };
  return known[key]||"Other / review";
}
function normaliseWorkflowEvent(value){
  const key=norm(value).replace(/\s+/g," ");
  const aliases={
    received:["received","ticket received","created","new mail queued"],
    handover:["handover","handed over","handed off","shift handover"],
    assigned:["assigned","auto assigned","auto assignment","initial assignment","initial allocation","first assignment","first allocation"],
    assignment_pending:["auto assignment pending verification","assignment pending verification","initial assignment pending verification"],
    baseline_registered:["baseline registered","backlog discovery complete","baseline state registered"],
    manual_assignment:["manual assignment","manual assignment captured","manually assigned","manual allocation"],
    reassigned:["reassigned","reassignment","reassigned owner"],
    flagged:["flagged","flag","flag raised","flagged for review","category removal detected","category removal pending","category removal verify pending"],
    recovery_requested:["recovery requested","recovery request","recovery review opened"],
    recovery_held:["recovery held","held for recovery","recovery hold","recovery requires review"],
    recovery_restored:["recovery restored","restored","assignment restored","category restored","restoration marker removed"],
    resolved:["resolved","closed","completed","ticket resolved"],
    reopened:["reopened","re-opened"],
    exception:["exception","write failed","assignment failed","assignment confirmation failed","recovery failed","pending item not found","multiple categories pending","ambiguous assignment","queued item not found"]
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
function parseSourceCalendarDate(value,zone){
  const raw=String(value??"").trim();
  if(!raw)return null;
  const dateMatch=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(dateMatch){
    const date=new Date(Date.UTC(Number(dateMatch[1]),Number(dateMatch[2])-1,Number(dateMatch[3])));
    if(date.getUTCFullYear()!==Number(dateMatch[1])||date.getUTCMonth()+1!==Number(dateMatch[2])||date.getUTCDate()!==Number(dateMatch[3]))return null;
    if(/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)){
      const parsed=new Date(raw);if(Number.isNaN(parsed.getTime()))return null;
      const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(parsed).map(part=>[part.type,part.value]));
      return parts.year+"-"+parts.month+"-"+parts.day;
    }
    return date.toISOString().slice(0,10);
  }
  const uk=raw.match(/^(\d{1,2})[\/-]([A-Za-z]{3}|\d{1,2})[\/-](\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if(uk){
    const monthNames=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const month=/^\d+$/.test(uk[2])?Number(uk[2]):monthNames.indexOf(uk[2].toLowerCase())+1;
    const day=Number(uk[1]),year=Number(uk[3]);
    const date=new Date(Date.UTC(year,month-1,day));
    if(month<1||month>12||date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day)return null;
    return date.toISOString().slice(0,10);
  }
  if(/^\d+(?:\.\d+)?$/.test(raw)){
    const serial=Number(raw);
    if(serial<20000||serial>80000)return null;
    const date=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000);
    return date.toISOString().slice(0,10);
  }
  return null;
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
  $("resultScope").textContent="Snapshot generated "+snapshot.generated_at_utc+" · "+snapshot.tickets.total+" ticket records · pseudonymised references and colleague names included in local snapshot";
  $("kpiResults").innerHTML=[
    ["Ticket records",overall.ticket_records],
    ["Initially assigned",overall.initially_assigned],
    ["Resolved / closed",snapshot.tickets.lifecycle_available?overall.resolved:"Not recorded"],
    ["Outstanding",snapshot.tickets.lifecycle_available?overall.outstanding:"Not recorded"],
    ["Unassigned open",snapshot.tickets.lifecycle_available?overall.unassigned:"Not recorded"]
  ].map(([label,value])=>'<div class="result-kpi"><span>'+label+'</span><strong>'+(typeof value==="number"?value.toLocaleString("en-GB"):escapeHtml(value))+'</strong></div>').join("");
  $("inboxResults").innerHTML=buildTable(["Inbox","Ticket records","First assigned","Resolved","Open","Unassigned"],snapshot.tickets.by_inbox.map(row=>[INBOX_LABELS[row.inbox_code],row.ticket_records,row.initially_assigned,row.resolved,row.outstanding,row.unassigned]));
  $("brandResults").innerHTML=snapshot.tickets.brand_available?buildTable(["Brand","Tickets","Share"],snapshot.tickets.by_brand.map(row=>[BRAND_LABELS[row.brand_code],row.count,(snapshot.tickets.total?row.count/snapshot.tickets.total*100:0).toFixed(1)+"%"])):'<p class="muted-cell">Brand is not a field in the current tracker export. Add an explicit Brand field before reporting brand volumes.</p>';
  $("dailyResults").innerHTML=buildTable(["Received date · UK local","Inbox","Ticket records"],snapshot.tickets.daily_volume.map(row=>[row.date_local||row.date_utc,INBOX_LABELS[row.inbox_code],row.ticket_records]));
  $("agentResults").innerHTML=buildTable(["Colleague","Agent reference","Inbox","First assignments","Share","Current owner records"],snapshot.allocations.map(row=>[row.agent_name||"Name not matched",row.agent_ref,INBOX_LABELS[row.inbox_code],row.initial_assignments,row.allocation_share_pct.toFixed(1)+"%",row.current_owner_records??row.current_open_workload]));
  $("rosterResults").innerHTML=buildTable(["Colleague","Agent reference","Shift group","Shift start (Egypt)","Shift end (Egypt)","Active this fortnight"],(snapshot.team_roster||[]).map(row=>[row.agent_name||"Name not matched",row.agent_ref,row.shift_group,row.shift_start_egypt,row.shift_end_egypt,row.active_this_fortnight?"Yes":"No"]));
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

    // Roster names are used only in this browser session and the explicitly requested
    // local JSON export. Agent references remain the stable join key.
    const rosterMap=new Map(),rosterAliases=new Map(),teamRoster=[];
    if(files.roster){
      for(const row of files.roster.records){
        const identity=selectedValue(row,"roster","identity");
        const displayName=selectedValue(row,"roster","display_name");
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
        const agentRef=await pseudonym(key,"agent",identity);
        const entry={
          agent_ref:agentRef,agent_name:displayName,shift_group:shiftGroup,
          shift_start_egypt:shiftStart,shift_end_egypt:shiftEnd,
          active_this_fortnight:active
        };
        rosterMap.set(norm(identity),entry);
        rosterAliases.set(norm(identity),{identity,displayName,agentRef});
        if(displayName)rosterAliases.set(norm(displayName),{identity,displayName,agentRef});
        teamRoster.push(entry);
        quality.roster.rows_accepted++;
      }
    }
    const agentInfo=async value=>{
      const raw=String(value??"").trim();
      if(isUnassigned(raw))return null;
      const roster=rosterAliases.get(norm(raw));
      const identity=roster?.identity||raw;
      return {
        agent_ref:roster?.agentRef||await pseudonym(key,"agent",identity),
        agent_name:roster?.displayName||null
      };
    };

    const ticketMap=new Map(),dateSet=new Set(),ticketRows=[];
    let anyBrandValue=false,brandValuesComplete=true,anyLifecycleValue=false,lifecycleValuesComplete=true;
    const lifecycleMapped=Boolean(mappings.tickets.lifecycle_status||mappings.tickets.resolved_at);
    for(const row of files.tickets.records){
      const ref=selectedValue(row,"tickets","ticket_ref");
      const inboxRaw=selectedValue(row,"tickets","inbox");
      const inbox=normaliseInbox(inboxRaw);
      if(!ref||!inbox){quality.tickets.rows_skipped++;if(ref&&!inbox)quality.tickets.unknown_inbox++;continue;}
      const id=norm(ref);
      if(ticketMap.has(id)){quality.tickets.rows_skipped++;quality.tickets.duplicate_rows++;continue;}

      const trackerStatusRaw=selectedValue(row,"tickets","status");
      const trackerStatus=normaliseTrackerStatus(trackerStatusRaw);
      if(trackerStatus==="Other / review"&&trackerStatusRaw)quality.tickets.unknown_status++;

      const brandRaw=selectedValue(row,"tickets","brand");
      const brand=normaliseBrand(brandRaw);
      if(norm(brandRaw))anyBrandValue=true;
      else brandValuesComplete=false;
      if(brand==="unclassified"&&mappings.tickets.brand)quality.tickets.unknown_brand++;

      const receivedRaw=selectedValue(row,"tickets","received_at");
      const receivedDate=parseSourceCalendarDate(receivedRaw,"Europe/London");
      if(receivedRaw&&!receivedDate)quality.tickets.ambiguous_time++;
      if(receivedDate)dateSet.add(receivedDate);

      const lifecycleRaw=selectedValue(row,"tickets","lifecycle_status");
      const resolvedAtRaw=selectedValue(row,"tickets","resolved_at");
      const resolvedByRaw=selectedValue(row,"tickets","resolved_by");
      const resolvedDate=resolvedAtRaw?parseSourceCalendarDate(resolvedAtRaw,"Europe/London"):null;
      const lifecycleValue=norm(lifecycleRaw);
      if(lifecycleRaw||resolvedAtRaw)anyLifecycleValue=true;
      else lifecycleValuesComplete=false;
      const resolved=lifecycleMapped&&(isResolved(lifecycleRaw)||Boolean(resolvedAtRaw));
      const owner=selectedValue(row,"tickets","current_owner");
      const ownerInfo=await agentInfo(owner);
      const ticketRef=await pseudonym(key,"ticket",ref);
      const status=resolved?"Resolved":trackerStatus;
      const resolvedByInfo=resolvedByRaw?await agentInfo(resolvedByRaw):null;
      const record={
        inbox,brand,resolved:resolved,ownerRef:ownerInfo?.agent_ref||null,
        ownerName:ownerInfo?.agent_name||null,unassigned:isUnassigned(owner),
        receivedDate,resolvedDate,trackerStatus,lifecycleValue,
        resolvedByRef:resolvedByInfo?.agent_ref||null,resolvedByName:resolvedByInfo?.agent_name||null
      };
      ticketMap.set(id,{...record,ticketRef,rawRef:id});
      ticketRows.push({
        ticket_ref:ticketRef,inbox_code:inbox,tracker_status:status,
        brand_code:brand,owner_ref:ownerInfo?.agent_ref||null,
        owner_name:ownerInfo?.agent_name||null,
        received_date_uk:receivedDate,
        resolved_date_uk:resolvedDate,
        resolved_by_ref:resolvedByInfo?.agent_ref||null,
        resolved_by_name:resolvedByInfo?.agent_name||null,
        lifecycle_status:lifecycleValue||null
      });
      quality.tickets.rows_accepted++;
    }
    const lifecycleAvailable=Boolean(lifecycleMapped)&&anyLifecycleValue&&lifecycleValuesComplete;
    const brandAvailable=Boolean(mappings.tickets.brand)&&anyBrandValue&&brandValuesComplete;
    if(!brandAvailable&&mappings.tickets.brand)quality.tickets.unknown_brand+=ticketRows.length;

    // Event Type is the actual event name in the tracker. Assignment Flag is a
    // Boolean field and must never be interpreted as the event category.
    const initialRows=new Map();
    if(files.assignments){
      const q=quality.assignments;
      for(const row of files.assignments.records){
        const ref=selectedValue(row,"assignments","ticket_ref");
        const agent=selectedValue(row,"assignments","agent");
        const eventName=selectedValue(row,"assignments","kind");
        const flagHeader=mappings.assignments.first_assignment_flag;
        const firstFlag=flagHeader?normaliseTrueFalse(selectedValue(row,"assignments","first_assignment_flag")):null;
        const method=firstAssignmentMethod(eventName);
        const inboxRaw=selectedValue(row,"assignments","inbox");
        const inbox=inboxRaw?normaliseInbox(inboxRaw):"";
        if(!ref||!eventName){q.rows_skipped++;continue;}
        const ticketKey=norm(ref),ticket=ticketMap.get(ticketKey);
        if(!ticket){q.rows_skipped++;continue;}
        if(inboxRaw&&!inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        if(inbox&&inbox!==ticket.inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        q.rows_accepted++;
        if(!method)continue;
        if(!agent||isUnassigned(agent)||(flagHeader&&firstFlag!==true))continue;
        const resolvedInbox=inbox||ticket.inbox;
        if(!resolvedInbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        const info=await agentInfo(agent);
        if(!info){q.rows_skipped++;continue;}
        const list=initialRows.get(ticketKey)||[];
        list.push({agentRef:info.agent_ref,agentName:info.agent_name,inbox:resolvedInbox,method});
        initialRows.set(ticketKey,list);
      }
    }
    const validInitial=new Map();let ambiguousInitial=0;
    for(const [ticketKey,items] of initialRows.entries()){
      const distinct=new Map(items.map(item=>[item.method+"|"+item.agentRef,item]));
      const unique=[...distinct.values()];
      if(unique.length!==1){
        ambiguousInitial++;quality.assignments.rows_skipped+=unique.length;
        quality.assignments.rows_accepted=Math.max(0,quality.assignments.rows_accepted-(unique.length-1));
        continue;
      }
      const ticket=ticketMap.get(ticketKey),item=unique[0];
      if(ticket&&item.inbox===ticket.inbox)validInitial.set(ticketKey,item);
      else if(ticket){quality.assignments.rows_skipped++;quality.assignments.unknown_inbox++;}
    }

    const inboxStats=Object.fromEntries(Object.keys(INBOXES).map(code=>[code,{
      ticket_records:0,initially_assigned:0,resolved:0,outstanding:0,unassigned:0,no_current_owner:0
    }]));
    const brandStats=Object.fromEntries(Object.keys(BRAND_LABELS).map(code=>[code,0]));
    const agentCounts=new Map(),workload=new Map(),ownerRecordsByAgent=new Map(),dailyMap=new Map();
    const methodStats=Object.fromEntries(Object.keys(INBOXES).map(code=>[code,{automatic:0,manual:0}]));
    for(const [ticketKey,ticket] of ticketMap.entries()){
      const stats=inboxStats[ticket.inbox];stats.ticket_records++;
      if(ticket.unassigned)stats.no_current_owner++;
      if(ticket.receivedDate){
        const dailyKey=ticket.receivedDate+"|"+ticket.inbox;
        const daily=dailyMap.get(dailyKey)||{date_local:ticket.receivedDate,time_zone:"Europe/London",inbox_code:ticket.inbox,ticket_records:0};
        daily.ticket_records++;dailyMap.set(dailyKey,daily);
      }
      if(lifecycleAvailable){
        if(ticket.resolved)stats.resolved++;
        else {stats.outstanding++;if(ticket.unassigned)stats.unassigned++;}
      }
      brandStats[ticket.brand]=(brandStats[ticket.brand]||0)+1;
      if(ticket.ownerRef){
        const workloadKey=ticket.ownerRef+"|"+ticket.inbox;
        ownerRecordsByAgent.set(workloadKey,(ownerRecordsByAgent.get(workloadKey)||0)+1);
        if(lifecycleAvailable&&!ticket.resolved)workload.set(workloadKey,(workload.get(workloadKey)||0)+1);
      }
      const initial=validInitial.get(ticketKey);
      if(initial){
        stats.initially_assigned++;
        methodStats[initial.inbox][initial.method]++;
        const group=initial.agentRef+"|"+initial.inbox;
        agentCounts.set(group,(agentCounts.get(group)||0)+1);
      }
    }
    const allocations=[];
    const allocationGroups=new Set([...agentCounts.keys(),...workload.keys(),...ownerRecordsByAgent.keys()]);
    for(const group of allocationGroups){
      const [agent_ref,inbox_code]=group.split("|");
      const count=agentCounts.get(group)||0;
      const total=inboxStats[inbox_code].initially_assigned;
      const roster=[...teamRoster].find(row=>row.agent_ref===agent_ref);
      allocations.push({
        agent_ref,agent_name:roster?.agent_name||null,inbox_code,
        initial_assignments:count,
        allocation_share_pct:total?count/total*100:0,
        current_open_workload:lifecycleAvailable?(workload.get(group)||0):0,
        current_owner_records:ownerRecordsByAgent.get(group)||0
      });
    }
    allocations.sort((a,b)=>a.inbox_code.localeCompare(b.inbox_code)||a.agent_ref.localeCompare(b.agent_ref));

    const workflowMap=new Map(),activityMap=new Map(),activityRows=[];
    if(files.workflow){
      const q=quality.workflow;
      for(const row of files.workflow.records){
        const ref=selectedValue(row,"workflow","ticket_ref");
        const eventRaw=selectedValue(row,"workflow","event_type");
        const inboxRaw=selectedValue(row,"workflow","inbox");
        if(!ref||!eventRaw){q.rows_skipped++;continue;}
        const ticketKey=norm(ref),ticket=ticketMap.get(ticketKey);
        if(!ticket){q.rows_skipped++;continue;}
        const inbox=inboxRaw?normaliseInbox(inboxRaw):ticket.inbox;
        if(!inbox){q.rows_skipped++;q.unknown_inbox++;continue;}
        const event=normaliseWorkflowEvent(eventRaw);
        if(!event){q.rows_skipped++;continue;}
        q.rows_accepted++;
        const keyName=event+"|"+inbox;
        const record=workflowMap.get(keyName)||{event_type:event,inbox_code:inbox,event_count:0,tickets:new Set()};
        record.event_count++;record.tickets.add(ticketKey);workflowMap.set(keyName,record);

        const originalAssignee=selectedValue(row,"workflow","original_assignee");
        const currentOwner=selectedValue(row,"workflow","current_owner");
        const originalInfo=originalAssignee?await agentInfo(originalAssignee):null;
        const currentInfo=currentOwner?await agentInfo(currentOwner):null;
        const timeRaw=selectedValue(row,"workflow","occurred_at");
        const eventDate=timeRaw?parseSourceCalendarDate(timeRaw,"Africa/Cairo"):null;
        if(timeRaw&&!eventDate)q.ambiguous_time++;
        const firstFlag=selectedValue(row,"workflow","first_assignment_flag");
        const firstAssignmentFlag=mappings.workflow.first_assignment_flag?normaliseTrueFalse(firstFlag):null;
        const activityKey=[event,inbox,currentInfo?.agent_ref||"unattributed",eventDate||"undated"].join("|");
        const activity=activityMap.get(activityKey)||{
          event_type:event,inbox_code:inbox,agent_ref:currentInfo?.agent_ref||null,
          agent_name:currentInfo?.agent_name||null,event_date_egypt:eventDate,
          time_zone:"Africa/Cairo",event_count:0,tickets:new Set()
        };
        activity.event_count++;activity.tickets.add(ticketKey);activityMap.set(activityKey,activity);
        activityRows.push({
          ticket_ref:ticket.ticketRef,event_time_egypt:timeRaw||null,
          event_date_egypt:eventDate,event_type:event,inbox_code:inbox,
          original_assignee_ref:originalInfo?.agent_ref||null,
          original_assignee_name:originalInfo?.agent_name||null,
          current_owner_ref:currentInfo?.agent_ref||null,
          current_owner_name:currentInfo?.agent_name||null,
          first_assignment_flag:firstAssignmentFlag,time_zone:"Africa/Cairo"
        });
      }
    }
    const workflow=[...workflowMap.values()].map(row=>({
      event_type:row.event_type,inbox_code:row.inbox_code,
      event_count:row.event_count,distinct_tickets:row.tickets.size
    })).sort((a,b)=>a.inbox_code.localeCompare(b.inbox_code)||a.event_type.localeCompare(b.event_type));
    const activitySummary=[...activityMap.values()].map(row=>({
      event_type:row.event_type,inbox_code:row.inbox_code,agent_ref:row.agent_ref,
      agent_name:row.agent_name,event_date_egypt:row.event_date_egypt,
      time_zone:row.time_zone,event_count:row.event_count,distinct_tickets:row.tickets.size
    })).sort((a,b)=>(a.event_date_egypt||"").localeCompare(b.event_date_egypt||"")||
      a.inbox_code.localeCompare(b.inbox_code)||a.event_type.localeCompare(b.event_type));

    const byInbox=Object.keys(INBOXES).map(inbox_code=>({inbox_code,...inboxStats[inbox_code]}));
    const dailyVolume=[...dailyMap.values()].sort((a,b)=>a.date_local.localeCompare(b.date_local)||a.inbox_code.localeCompare(b.inbox_code));
    const overall={
      ticket_records:ticketMap.size,
      initially_assigned:validInitial.size,
      resolved:lifecycleAvailable?byInbox.reduce((sum,row)=>sum+row.resolved,0):0,
      outstanding:lifecycleAvailable?byInbox.reduce((sum,row)=>sum+row.outstanding,0):0,
      unassigned:lifecycleAvailable?byInbox.reduce((sum,row)=>sum+row.unassigned,0):0,
      no_current_owner:byInbox.reduce((sum,row)=>sum+row.no_current_owner,0)
    };
    const byBrand=Object.keys(BRAND_LABELS).map(brand_code=>({
      brand_code,count:brandStats[brand_code]||0
    })).filter(row=>row.count||row.brand_code==="unclassified");
    const methods=Object.keys(INBOXES).map(inbox_code=>({
      inbox_code,...methodStats[inbox_code],
      total:methodStats[inbox_code].automatic+methodStats[inbox_code].manual
    }));
    const warnings=[];
    if(quality.tickets.duplicate_rows)warnings.push(quality.tickets.duplicate_rows+" duplicate ticket row(s) were skipped; only the first occurrence per ticket reference was retained.");
    if(quality.tickets.unknown_inbox)warnings.push(quality.tickets.unknown_inbox+" ticket row(s) had an unmapped inbox and were excluded.");
    if(!brandAvailable)warnings.push("Brand is not recorded in the current Assignments worksheet. Brand totals are unavailable; no inference is made from email subjects or folder names.");
    if(!lifecycleAvailable)warnings.push("Resolved date/status is not recorded in the current Assignments worksheet. Resolution rate and solve time are unavailable; tracker assignment states are not treated as open/closed lifecycle states.");
    if(quality.tickets.unknown_status)warnings.push(quality.tickets.unknown_status+" tracker-status value(s) were not in the known assignment-status list and were grouped as Other / review.");
    if(quality.tickets.ambiguous_time)warnings.push(quality.tickets.ambiguous_time+" received timestamp(s) could not be read as UK-local calendar dates.");
    if(ambiguousInitial)warnings.push(ambiguousInitial+" ticket(s) had more than one distinct first-assignment record; those allocation records were excluded as ambiguous.");
    if(quality.assignments?.unknown_inbox)warnings.push(quality.assignments.unknown_inbox+" assignment row(s) had an inbox mismatch or unknown inbox and were excluded.");
    if(quality.workflow?.unknown_inbox)warnings.push(quality.workflow.unknown_inbox+" workflow row(s) had an unknown inbox and were excluded.");
    if(quality.roster?.duplicate_rows)warnings.push(quality.roster.duplicate_rows+" duplicate roster identity row(s) were skipped.");
    if(quality.roster?.rows_skipped)warnings.push(quality.roster.rows_skipped+" invalid or incomplete roster row(s) were skipped.");
    if(!files.roster)warnings.push("No Team & Shifts roster was supplied. Colleague names and shift metadata are unavailable.");
    if(files.roster){
      const usedAgentRefs=new Set();
      for(const ticket of ticketMap.values())if(ticket.ownerRef)usedAgentRefs.add(ticket.ownerRef);
      for(const row of validInitial.values())usedAgentRefs.add(row.agentRef);
      const rosterRefs=new Set(teamRoster.map(row=>row.agent_ref));
      const unmatched=[...usedAgentRefs].filter(ref=>!rosterRefs.has(ref));
      if(unmatched.length)warnings.push(unmatched.length+" agent reference(s) used in ticket or event data were not matched to the supplied roster.");
    }
    if(!files.assignments)warnings.push("No assignment-history worksheet was supplied. First-assignment totals and shares are unavailable.");
    else if(validInitial.size===0)warnings.push("No validated AUTO_ASSIGNMENT or MANUAL_ASSIGNMENT_CAPTURED first-allocation events were found. Check that Event Type (not Assignment Flag) is mapped.");
    if(!files.workflow)warnings.push("No Activity Log worksheet was supplied. Workflow and Activity Log metrics are unavailable.");

    const dateList=[...dateSet].sort();
    const ticketRowsWithInitial=ticketRows;
    const snapshot={
      schema_version:"dispatcher-reporting-snapshot-1",
      generated_at_utc:new Date().toISOString(),
      source_mode:"offline_sanitised_aggregate",
      reporting_period:dateList.length?{
        first_received_date_local:dateList[0],last_received_date_local:dateList[dateList.length-1],
        time_zone:"Europe/London"
      }:null,
      tickets:{
        total:ticketMap.size,overall,by_inbox:byInbox,by_brand:byBrand,daily_volume:dailyVolume,
        brand_available:brandAvailable,lifecycle_available:lifecycleAvailable,
        ticket_rows:ticketRowsWithInitial
      },
      allocations,assignment_methods:methods,
      team_roster:teamRoster.sort((a,b)=>a.shift_group.localeCompare(b.shift_group)||String(a.agent_name||"").localeCompare(String(b.agent_name||""))),
      workflow,activity_summary:activitySummary,activity_rows:activityRows,
      data_quality:{
        sources:[quality.tickets,quality.assignments,quality.workflow,quality.roster].filter(Boolean),
        ambiguous_initial_assignment_tickets:ambiguousInitial,warnings
      }
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
function downloadCSVs(){
  if(!currentSnapshot)return;
  const snapshot=currentSnapshot;
  const lifecycle=snapshot.tickets.lifecycle_available===true;
  const brandAvailable=snapshot.tickets.brand_available===true;
  const filesToDownload=[
    ["dispatcher-daily-volume.csv",["received_date_uk","time_zone","inbox_code","ticket_records"],snapshot.tickets.daily_volume.map(row=>[row.date_local||row.date_utc,row.time_zone||"UTC",row.inbox_code,row.ticket_records])],
    ["dispatcher-inbox-summary.csv",["inbox_code","inbox_name","ticket_records","first_assignments","resolved","outstanding","unassigned_open","current_owner_records_without_owner"],snapshot.tickets.by_inbox.map(row=>[
      row.inbox_code,INBOX_LABELS[row.inbox_code],row.ticket_records,row.initially_assigned,
      lifecycle?row.resolved:"Not recorded",lifecycle?row.outstanding:"Not recorded",
      lifecycle?row.unassigned:"Not recorded",row.no_current_owner||0
    ])],
    ["dispatcher-brand-summary.csv",brandAvailable?["brand_code","brand_name","ticket_count","share_pct"]:["availability","message"],
      brandAvailable?snapshot.tickets.by_brand.map(row=>[row.brand_code,BRAND_LABELS[row.brand_code],row.count,snapshot.tickets.total?(row.count/snapshot.tickets.total*100).toFixed(2):"0.00"]):
      [["NOT RECORDED","The current Assignments worksheet does not contain an explicit Brand field."]]],
    ["dispatcher-agent-allocation.csv",["colleague","agent_ref","inbox_code","initial_assignments","allocation_share_pct","current_owner_records","current_open_workload"],
      snapshot.allocations.map(row=>[row.agent_name||"Name not matched",row.agent_ref,row.inbox_code,row.initial_assignments,row.allocation_share_pct.toFixed(2),row.current_owner_records??0,lifecycle?row.current_open_workload:"Not recorded"])],
    ["dispatcher-assignment-methods.csv",["inbox_code","automatic_first_assignments","manual_first_assignments","total_first_assignments"],
      snapshot.assignment_methods.map(row=>[row.inbox_code,row.automatic,row.manual,row.total])],
    ["dispatcher-team-roster.csv",["colleague","agent_ref","shift_group","shift_start_egypt","shift_end_egypt","active_this_fortnight"],
      (snapshot.team_roster||[]).map(row=>[row.agent_name||"Name not supplied",row.agent_ref,row.shift_group,row.shift_start_egypt,row.shift_end_egypt,row.active_this_fortnight?"Yes":"No"])],
    ["dispatcher-workflow-summary.csv",["event_type","inbox_code","event_count","distinct_tickets"],
      snapshot.workflow.map(row=>[row.event_type,row.inbox_code,row.event_count,row.distinct_tickets])],
    ["dispatcher-activity-log.csv",["event_time_egypt","event_date_egypt","event_type","inbox_code","original_assignee","current_owner","first_assignment_flag","ticket_ref_hmac"],
      (snapshot.activity_rows||[]).map(row=>[row.event_time_egypt||"Not recorded",row.event_date_egypt||"Not recorded",row.event_type,row.inbox_code,row.original_assignee_name||"Not recorded",row.current_owner_name||"Not recorded",row.first_assignment_flag===null?"Not recorded":row.first_assignment_flag?"TRUE":"FALSE",row.ticket_ref])],
    ["dispatcher-ticket-queue.csv",["ticket_ref_hmac","inbox_code","tracker_status","brand","current_owner","received_date_uk","lifecycle_status","resolved_date_uk","resolved_by"],
      (snapshot.tickets.ticket_rows||[]).map(row=>[row.ticket_ref,row.inbox_code,row.tracker_status,
        brandAvailable?BRAND_LABELS[row.brand_code]:"Not recorded",
        row.owner_name||"Unassigned",row.received_date_uk||"Not recorded",
        lifecycle?(row.lifecycle_status||"Resolved"): "Not recorded",
        lifecycle?(row.resolved_date_uk||"Not recorded"):"Not recorded",
        lifecycle?(row.resolved_by_name||"Not recorded"):"Not recorded"])],
    ["dispatcher-data-quality.csv",["source","rows_read","rows_accepted","rows_skipped","duplicate_rows","unknown_inbox","unknown_brand","unknown_status","ambiguous_time"],
      snapshot.data_quality.sources.map(row=>[row.source,row.rows_read,row.rows_accepted,row.rows_skipped,row.duplicate_rows,row.unknown_inbox,row.unknown_brand,row.unknown_status,row.ambiguous_time])]
  ];
  filesToDownload.forEach(([name,headers,rows],index)=>
    setTimeout(()=>downloadBlob(name,makeCSV(headers,rows),"text/csv;charset=utf-8"),index*180)
  );
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
$("downloadAllCsv").addEventListener("click",downloadCSVs);
updateReadyState();
