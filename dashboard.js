/* VWG Dispatch Intelligence — complete UI foundation.
 * All records are synthetic. This prototype has no live data or operational integration.
 */
const FOLDERS = [
  { id: "agency", name: "Agency Detags", short: "Agency", received: 230, assigned: 218, resolved: 165, open: 50, color: "#d49a68" },
  { id: "detags", name: "Detags", short: "Detags", received: 470, assigned: 445, resolved: 318, open: 180, color: "#8fb39a" },
  { id: "transfers", name: "Transfers", short: "Transfers", received: 300, assigned: 280, resolved: 205, open: 94, color: "#a88bb8" },
  { id: "unadopts", name: "Unadopts", short: "Unadopts", received: 194, assigned: 176, resolved: 124, open: 58, color: "#dda66c" }
];
const BRANDS = [
  { id: "vw", name: "Volkswagen", count: 362, color: "#d49a68", short: "VW" },
  { id: "audi", name: "Audi", count: 286, color: "#a88bb8", short: "AUDI" },
  { id: "skoda", name: "Škoda", count: 196, color: "#8fb39a", short: "ŠKODA" },
  { id: "seat", name: "SEAT", count: 118, color: "#dda66c", short: "SEAT" },
  { id: "cupra", name: "CUPRA", count: 101, color: "#b77b66", short: "CUPRA" },
  { id: "vwcv", name: "Volkswagen Commercial Vehicles", count: 91, color: "#9aa4a8", short: "VWCV" },
  { id: "other", name: "Other / unclassified", count: 40, color: "#b6bdc8", short: "OTHER" }
];
const BRAND_MIX = {
  agency: [36, 24, 16, 8, 7, 6, 3],
  detags: [29, 24, 18, 10, 8, 7, 4],
  transfers: [29, 23, 18, 11, 9, 6, 4],
  unadopts: [31, 22, 19, 10, 8, 6, 4]
};
const AGENT_NAMES = Array.from({length:14}, (_,i) => "Agent " + String(i+1).padStart(2,"0"));
const AGENT_WEIGHTS = [12,11,10,9,10,12,10,9,11,10,9,10,8,9];
const SHIFT_GROUPS = ["Early","Late","Early","Late","Early","Late","Early","Late","Early","Late","Early","Late","Early","Late"];
const AGENTS = AGENT_NAMES.map((name,index) => ({
  id: "agent-" + String(index+1).padStart(2,"0"),
  name,
  shift: SHIFT_GROUPS[index],
  start: SHIFT_GROUPS[index] === "Early" ? "08:00" : "10:00",
  end: SHIFT_GROUPS[index] === "Early" ? "18:00" : "20:00",
  availability: index === 12 ? "Break" : "Available",
  assigned: 0,
  open: [11,15,13,16,12,14,10,15,12,13,11,16,9,14][index],
  response: [22,28,26,31,24,29,21,34,25,27,30,23,32,26][index],
  resolution: [178,205,192,224,181,213,169,231,190,198,219,184,226,195][index],
  handovers: [5,8,6,9,4,7,5,10,6,7,8,5,9,6][index],
  flags: [3,4,5,6,2,4,3,5,4,3,6,2,4,3][index]
}));
const MATRIX_WEIGHTS = [
  [12,30,18,10],[11,28,17,9],[10,32,20,9],[9,26,16,8],[10,29,18,9],[12,31,19,10],[10,27,16,8],
  [9,25,15,7],[11,30,18,9],[10,28,17,8],[9,26,16,7],[10,27,17,8],[8,24,15,7],[9,27,18,9]
];
const PERIODS = {
  today:{label:"Today",factor:.055,days:1},
  week:{label:"Last 7 days",factor:.235,days:7},
  month:{label:"Last 30 days",factor:1,days:30},
  quarter:{label:"Last 90 days",factor:2.72,days:90}
};
const TICKETS = [
  {ref:"DSP-10482",brand:"Audi",folder:"Detags",member:"Agent 02",subject:"Vehicle de-tag request — retail handover",age:"18m",status:"Assigned",received:"09:42",last:"Initial allocation"},
  {ref:"DSP-10481",brand:"Škoda",folder:"Agency Detags",member:"Agent 05",subject:"Agency PCP approval follow-up",age:"42m",status:"In progress",received:"09:18",last:"First response"},
  {ref:"DSP-10480",brand:"Volkswagen",folder:"Transfers",member:"Agent 08",subject:"Transfer request — vehicle record check",age:"1h 12m",status:"Waiting",received:"08:48",last:"Awaiting information"},
  {ref:"DSP-10479",brand:"CUPRA",folder:"Detags",member:"Agent 04",subject:"Retailer tag and status clarification",age:"2h 06m",status:"Flagged",received:"07:54",last:"Flag raised"},
  {ref:"DSP-10478",brand:"SEAT",folder:"Unadopts",member:"Agent 11",subject:"Unadopt request validation",age:"3h 14m",status:"In progress",received:"06:46",last:"Customer contacted"},
  {ref:"DSP-10477",brand:"Volkswagen Commercial Vehicles",folder:"Transfers",member:"Agent 01",subject:"Commercial vehicle transfer query",age:"4h 32m",status:"Reassigned",received:"05:28",last:"Manual reassignment"},
  {ref:"DSP-10476",brand:"Audi",folder:"Agency Detags",member:"Agent 07",subject:"Agency de-tag confirmation",age:"7h 08m",status:"Overdue",received:"02:52",last:"No recent activity"},
  {ref:"DSP-10475",brand:"Other / unclassified",folder:"Detags",member:"Unassigned",subject:"Brand requires confirmation",age:"9h 21m",status:"Unassigned",received:"00:39",last:"Awaiting allocation"},
  {ref:"DSP-10474",brand:"Audi",folder:"Detags",member:"Agent 06",subject:"Vehicle status 70 — retailer tag blocked",age:"15m",status:"Assigned",received:"10:05",last:"Retailer follow-up"},
  {ref:"DSP-10473",brand:"Volkswagen",folder:"Agency Detags",member:"Agent 03",subject:"PCP approval evidence check",age:"57m",status:"In progress",received:"09:23",last:"Finance record being checked"},
  {ref:"DSP-10472",brand:"Škoda",folder:"Unadopts",member:"Unassigned",subject:"Unadopt request — missing vehicle reference",age:"1h 36m",status:"Unassigned",received:"08:44",last:"Awaiting initial allocation"},
  {ref:"DSP-10471",brand:"Audi",folder:"Detags",member:"Agent 09",subject:"Transport-order investigation",age:"2h 14m",status:"Waiting",received:"08:06",last:"Awaiting transport update"},
  {ref:"DSP-10470",brand:"CUPRA",folder:"Transfers",member:"Agent 12",subject:"Transfer handover review",age:"3h 02m",status:"In progress",received:"07:18",last:"Record validation"},
  {ref:"DSP-10469",brand:"Volkswagen Commercial Vehicles",folder:"Agency Detags",member:"Agent 10",subject:"Retailer address confirmation",age:"4h 19m",status:"Flagged",received:"06:01",last:"Supervisor attention requested"},
  {ref:"DSP-10468",brand:"Volkswagen",folder:"Transfers",member:"Agent 05",subject:"Customer record duplicate check",age:"5h 42m",status:"Overdue",received:"04:38",last:"No recent activity"},
  {ref:"DSP-10467",brand:"SEAT",folder:"Unadopts",member:"Agent 14",subject:"Unadopt confirmation and audit check",age:"1h 15m",status:"Reassigned",received:"09:05",last:"Ownership updated"},
  {ref:"DSP-10466",brand:"Audi",folder:"Detags",member:"Unassigned",subject:"Brand identification requires confirmation",age:"22m",status:"Unassigned",received:"10:01",last:"Awaiting initial allocation"},
  {ref:"DSP-10465",brand:"Volkswagen",folder:"Detags",member:"Agent 02",subject:"Retailer confirmation received",age:"36m",status:"Resolved",received:"09:47",last:"Resolution recorded"}
];
const AUDIT_EVENTS = [
  ["10:42:18","Assignment restored","Agent 03","Detags","Recovery"],
  ["10:36:04","Manual assignment","Agent 08","Transfers","Manual"],
  ["10:21:55","Flag raised","Agent 04","Detags","Flag"],
  ["10:12:31","Ticket assigned","Agent 02","Agency Detags","Automatic"],
  ["09:58:07","Handover recorded","Agent 11 → Agent 06","Unadopts","Handover"],
  ["09:41:22","Ticket received","System","Transfers","Received"],
  ["09:22:10","Assignment exception","System","Detags","Exception"],
  ["09:08:45","Ticket resolved","Agent 01","Agency Detags","Resolved"]
];
const state = {
  view:"overview", period:"month", folder:"all", search:"", memberSearch:"",
  selectedAgent:null, paused:false, pausedFolders:{}, modal:null,
  liveStatus:"all", liveOwner:"all", liveBrand:"all", liveSort:"oldest", liveSearch:""
};
const pageContent = document.getElementById("pageContent");
const toast = document.getElementById("toast");
const modalRoot = document.getElementById("modalRoot");
const VIEW_TITLES = {
  overview:"Overview",live:"Live operations",tickets:"Ticket analytics",brands:"Brand insights",
  workflow:"Workflow analytics",folders:"Folder share",team:"Team performance",my:"My performance",
  roster:"Roster & coverage",rules:"Dispatch configuration",reliability:"Reliability centre",
  audit:"Audit history",reports:"Reports & exports",admin:"Administration"
};

function fmt(value){return Math.round(value).toLocaleString("en-GB");}
function scaled(value){return Math.max(0,Math.round(value*PERIODS[state.period].factor));}
function esc(value){return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function scopeFolders(){return state.folder==="all"?FOLDERS:FOLDERS.filter(f=>f.id===state.folder);}
function scopeName(){const folder=FOLDERS.find(f=>f.id===state.folder);return folder?folder.name:"All inboxes";}
function distribute(total,weights){
  const sum=weights.reduce((a,b)=>a+b,0)||1;
  const values=weights.map(w=>Math.floor(total*w/sum));
  let remaining=total-values.reduce((a,b)=>a+b,0);
  const fractions=weights.map((w,i)=>({i,frac:total*w/sum-values[i]})).sort((a,b)=>b.frac-a.frac);
  for(let n=0;n<remaining;n++)values[fractions[n%fractions.length].i]++;
  return values;
}
function folderAssignedRows(){
  return FOLDERS.map((folder,fi)=>({...folder,assigned:scaled(folder.assigned),received:scaled(folder.received),resolved:scaled(folder.resolved),open:scaled(folder.open)}));
}
function allocationMatrix(){
  return AGENTS.map((agent,ai)=>{
    const cells=FOLDERS.map((folder,fi)=>distribute(scaled(folder.assigned),MATRIX_WEIGHTS.map(row=>row[fi]))[ai]);
    return {...agent,cells,total:cells.reduce((a,b)=>a+b,0)};
  });
}
function brandRows(){
  const folders=scopeFolders();
  const total=folders.reduce((sum,f)=>sum+scaled(f.received),0);
  const weights=BRANDS.map((brand,bi)=>{
    if(state.folder==="all")return brand.count;
    return BRAND_MIX[state.folder][bi];
  });
  const values=distribute(total,weights);
  return BRANDS.map((brand,i)=>({...brand,value:values[i]}));
}
function totals(){
  const folders=folderAssignedRows().filter(f=>state.folder==="all"||f.id===state.folder);
  const received=folders.reduce((a,f)=>a+f.received,0);
  const assigned=folders.reduce((a,f)=>a+f.assigned,0);
  const resolved=folders.reduce((a,f)=>a+f.resolved,0);
  const open=folders.reduce((a,f)=>a+f.open,0);
  return {received,assigned,resolved,open,unassigned:Math.max(0,received-assigned)};
}
function activeSearch(text){return !state.search||String(text).toLowerCase().includes(state.search.toLowerCase());}
function heading(eyebrow,title,copy,actions){
  return '<div class="page-heading"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p class="heading-copy">'+copy+'</p></div><div class="heading-actions">'+(actions||'')+'<span class="period-pill">'+PERIODS[state.period].label+'</span></div></div>';
}
function panel(title,subtitle,body,action){
  return '<section class="panel"><div class="panel-heading"><div><h2 class="panel-title">'+title+'</h2><p class="panel-subtitle">'+subtitle+'</p></div>'+(action||'')+'</div>'+body+'</section>';
}
function kpi(label,value,note,symbol,trend,tone){
  return '<article class="kpi-card"><div class="kpi-top"><span>'+label+'</span><span class="kpi-icon">'+symbol+'</span></div><div class="kpi-value">'+value+'</div><div class="kpi-foot">'+(trend?'<strong class="'+(tone||"positive")+'">'+trend+'</strong> · ':'')+note+'</div></article>';
}
function kpiGrid(items){return '<div class="kpi-grid">'+items.join("")+'</div>';}
function barRows(rows,options){
  const max=Math.max(1,...rows.map(r=>r.value));
  return '<div class="bar-list">'+rows.map(r=>'<div class="bar-row"><div class="bar-label">'+(r.color?'<span class="legend-dot" style="background:'+r.color+'"></span>':'')+esc(r.label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.max(1,r.value/max*100)+'%;background:'+(r.color||"#d49a68")+'"></div></div><div class="bar-value">'+fmt(r.value)+(options&&options.percent?'<small>'+r.share+'%</small>':'')+'</div></div>').join("")+'</div>';
}
function brandBarList(list){
  const total=list.reduce((a,b)=>a+b.value,0);
  return barRows(list.slice().sort((a,b)=>b.value-a.value).map(r=>({...r,label:r.name,share:total?((r.value/total)*100).toFixed(1):"0.0"})),{percent:true});
}
function folderCards(){
  return '<div class="folder-card-grid">'+folderAssignedRows().filter(f=>state.folder==="all"||f.id===state.folder).map(f=>'<article class="folder-card"><div class="folder-card-top"><span class="folder-icon" style="--folder-color:'+f.color+'">▤</span><span class="status-pill '+(state.pausedFolders[f.id]?"warning":"good")+'">'+(state.pausedFolders[f.id]?"Paused":"Active")+'</span></div><h3>'+f.name+'</h3><div class="folder-card-value">'+fmt(f.open)+'</div><div class="folder-card-caption">Outstanding tickets</div><div class="folder-card-meta"><span>'+fmt(f.received)+' received</span><span>'+fmt(f.assigned)+' assigned</span></div></article>').join("")+'</div>';
}
function shareMatrix(rows,full){
  const folders=scopeFolders();
  const totalsByFolder=folders.map(f=>{
    const fi=FOLDERS.findIndex(x=>x.id===f.id);
    return rows.reduce((sum,r)=>sum+r.cells[fi],0);
  });
  const totalVisible=totalsByFolder.reduce((a,b)=>a+b,0);
  const visibleRows=rows.filter(r=>activeSearch(r.name)&&(!state.memberSearch||r.name.toLowerCase().includes(state.memberSearch.toLowerCase())));
  if(!visibleRows.length)return '<div class="empty-state">No members match this search.</div>';
  const header='<thead><tr><th>Team member</th>'+folders.map(f=>'<th>'+f.short+' · count / share</th>').join("")+'<th>Total allocated</th>'+(full?'<th>Overall share</th><th>Open work</th>':'')+'</tr></thead>';
  const body='<tbody>'+visibleRows.map(r=>{
    const cells=folders.map((f,idx)=>{
      const fi=FOLDERS.findIndex(x=>x.id===f.id),count=r.cells[fi],share=totalsByFolder[idx]?count/totalsByFolder[idx]*100:0;
      return '<td class="matrix-cell"><span class="matrix-count">'+fmt(count)+'</span><span class="matrix-share"><span class="share-mini-track"><span class="share-mini-fill" style="width:'+share+'%"></span></span>'+share.toFixed(1)+'%</span></td>';
    }).join("");
    const visibleTotal=folders.reduce((sum,f)=>sum+r.cells[FOLDERS.findIndex(x=>x.id===f.id)],0);
    const overall=totalVisible?visibleTotal/totalVisible*100:0;
    return '<tr><td>'+memberCell(r.name,r.shift)+'</td>'+cells+'<td class="total-cell">'+fmt(visibleTotal)+'</td>'+(full?'<td class="total-cell">'+overall.toFixed(1)+'%</td><td>'+fmt(r.open)+'</td>':'')+'</tr>';
  }).join("")+'</tbody>';
  return '<div class="table-wrap"><table class="data-table matrix-table">'+header+body+'</table></div>';
}
function memberCell(name,shift){
  return '<div class="member-cell"><span class="member-avatar">'+esc(name.replace("Agent ","A"))+'</span><span><span class="member-name">'+esc(name)+'</span><span class="member-role">'+(shift||"Team member")+'</span></span></div>';
}
function dataTable(headers,rows,empty){
  if(!rows.length)return '<div class="empty-state">'+(empty||"No records match the current filters.")+'</div>';
  return '<div class="table-wrap"><table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
}
function statusPill(status){
  const key=String(status).toLowerCase();
  let type="neutral";
  if(["assigned","available","resolved","automatic","healthy","active","in progress"].includes(key))type="good";
  if(["flagged","waiting","break","paused","pending","reassigned"].includes(key))type="warning";
  if(["overdue","unassigned","exception","failed","critical"].includes(key))type="danger";
  return '<span class="status-pill '+type+'">'+esc(status)+'</span>';
}
function smallChart(values,labels,color){
  const w=640,h=190,pad=20,max=Math.max(...values)*1.18;
  const points=values.map((v,i)=>{
    const x=pad+i*(w-pad*2)/Math.max(1,values.length-1);
    const y=h-pad-(v/max)*(h-pad*2);
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  const area="M "+points.replaceAll(" ", " L ")+" L "+(w-pad)+","+(h-pad)+" L "+pad+","+(h-pad)+" Z";
  return '<div class="chart-wrap"><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Trend chart"><defs><linearGradient id="chartFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity=".22"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs><path d="'+area+'" fill="url(#chartFade)"></path><polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>'+points.split(" ").map(point=>{const xy=point.split(",");return '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="4" fill="#fff" stroke="'+color+'" stroke-width="2"></circle>';}).join("")+'</svg><div class="chart-labels">'+labels.map(l=>'<span>'+l+'</span>').join("")+'</div></div>';
}
function horizontalLegend(items){
  return '<div class="horizontal-legend">'+items.map(i=>'<span><i style="background:'+i.color+'"></i>'+i.label+'</span>').join("")+'</div>';
}
function ticketRows(){
  return TICKETS.filter(t=>(state.folder==="all"||FOLDERS.find(f=>f.id===state.folder)?.name===t.folder)&&activeSearch([t.ref,t.brand,t.folder,t.member,t.subject].join(" "))).map(t=>
    '<tr><td><button class="link-button" type="button" data-ticket="'+t.ref+'">'+t.ref+'</button></td><td>'+esc(t.brand)+'</td><td>'+esc(t.folder)+'</td><td>'+esc(t.member)+'</td><td>'+t.received+'</td><td>'+t.age+'</td><td>'+statusPill(t.status)+'</td><td>'+esc(t.last)+'</td></tr>'
  );
}
function insightCard(icon,title,copy,kind){
  return '<article class="insight-card '+(kind||"")+'"><span class="insight-icon">'+icon+'</span><div><strong>'+title+'</strong><p>'+copy+'</p></div></article>';
}
function renderOverview(){
  const t=totals(),brands=brandRows(),brandTotal=brands.reduce((a,b)=>a+b.value,0),rows=allocationMatrix();
  pageContent.innerHTML=heading("MANAGEMENT OVERVIEW","Good morning. Here’s your operation.","A live-style snapshot of ticket flow, brand mix, team allocation and operational health — populated with demonstration data.",'<button class="btn btn-secondary" data-action="refresh">↻ Refresh preview</button>')+
    kpiGrid([
      kpi("Tickets received",fmt(t.received),"Distinct tickets in selected scope","▤","+8.4%","positive"),
      kpi("Initially assigned",fmt(t.assigned),t.received?((t.assigned/t.received)*100).toFixed(1)+"% of received volume":"—","↗","+5.2%","positive"),
      kpi("Tickets resolved",fmt(t.resolved),"Recorded completed tickets","✓","+11.6%","positive"),
      kpi("Outstanding workload",fmt(t.open),"Open at reporting snapshot","◷","42 aged over 24h","warning")
    ])+
    '<div class="grid-two">'+
      panel("Ticket activity","Received and resolved · daily trend",smallChart([64,82,76,94,88,108,96,115,102,120,111,129],["1","3","5","7","9","11","13","15","17","19","21","23"],"#f1846f"),'<span class="subtle-tag">LAST 30 DAYS</span>')+
      panel("Brand mix","Unique tickets by identified brand",brandBarList(brands.slice(0,6)),'<button class="panel-action" data-go="brands">Explore brands ↗</button>')+
    '</div>'+
    '<div class="grid-two">'+
      panel("Inbox distribution","Volume and open workload by folder",folderCards(),'<button class="panel-action" data-go="live">Open live operations ↗</button>')+
      panel("Operational health","Illustrative system status",'<div class="health-list">'+
        healthRow("Dispatcher engine","Running","good","Last heartbeat 10:42:18")+
        healthRow("Assignment tracker","Connected","good","Sample status only")+
        healthRow("Recovery queue","2 pending","warning","Awaiting review")+
        healthRow("Failed assignment writes","0 today","good","No simulated failures")+
      '</div>','<button class="panel-action" data-go="reliability">Reliability centre ↗</button>')+
    '</div>'+
    panel("Member share by folder","Initial allocation count and share within each folder",shareMatrix(rows,false),'<button class="panel-action" data-go="folders">Open full matrix ↗</button>')+
    '<div class="insight-grid">'+
      insightCard("↗","Brand demand insight","Audi and Volkswagen account for the largest share of the sample ticket volume.","blue")+
      insightCard("◷","Ageing work","42 sample tickets are in the over-24-hour ageing band.","amber")+
      insightCard("♧","Allocation coverage","All four inboxes have an initial-allocation share recorded in the sample matrix.","")+
    '</div>';
}
function healthRow(label,value,type,note){
  return '<div class="health-row"><span class="health-indicator '+type+'"></span><div class="health-copy"><strong>'+label+'</strong><small>'+note+'</small></div><div>'+statusPill(value)+'</div></div>';
}
function liveBaseTickets(){
  return TICKETS.filter(ticket=>{
    const folder=FOLDERS.find(item=>item.id===state.folder)?.name;
    return (!folder||ticket.folder===folder) &&
      activeSearch([ticket.ref,ticket.brand,ticket.folder,ticket.member,ticket.subject,ticket.status].join(" "));
  });
}
function liveAgeMinutes(ticket){
  if(Number.isFinite(ticket.ageMinutes))return ticket.ageMinutes;
  const age=String(ticket.age||"").toLowerCase();
  const hourPart=age.includes("h")?age.slice(0,age.indexOf("h")).trim():"0";
  const minutePart=age.includes("h")?age.slice(age.indexOf("h")+1).replace("m","").trim():age.replace("m","").trim();
  const hours=parseInt(hourPart,10)||0;
  const minutes=parseInt(minutePart,10)||0;
  return hours*60+minutes;
}
function liveSlaTarget(ticket){
  if(Number.isFinite(ticket.slaMinutes))return ticket.slaMinutes;
  if(ticket.status==="Unassigned")return 60;
  if(ticket.status==="Flagged")return 120;
  if(ticket.status==="Overdue")return 180;
  return 240;
}
function liveSla(ticket){
  if(["Resolved","Closed"].includes(ticket.status))return {label:"Complete",tone:"good",remaining:null};
  const remaining=liveSlaTarget(ticket)-liveAgeMinutes(ticket);
  if(remaining<=0)return {label:"Overdue",tone:"danger",remaining};
  if(remaining<=30)return {label:"Due in "+remaining+"m",tone:"warning",remaining};
  return {label:"On track",tone:"good",remaining};
}
function liveStatusMatches(ticket,filter){
  const status=ticket.status;
  if(filter==="all")return true;
  if(filter==="unassigned")return status==="Unassigned";
  if(filter==="active")return ["Assigned","In progress","Reassigned"].includes(status);
  if(filter==="waiting")return status==="Waiting";
  if(filter==="attention")return ["Flagged","Overdue","Unassigned"].includes(status)||liveSla(ticket).tone==="warning";
  if(filter==="resolved")return ["Resolved","Closed"].includes(status);
  return true;
}
function liveFilteredTickets(){
  const q=state.liveSearch.trim().toLowerCase();
  return liveBaseTickets().filter(ticket=>
    liveStatusMatches(ticket,state.liveStatus) &&
    (state.liveOwner==="all"||ticket.member===state.liveOwner) &&
    (state.liveBrand==="all"||ticket.brand===state.liveBrand) &&
    (!q||[ticket.ref,ticket.brand,ticket.folder,ticket.member,ticket.subject,ticket.status].join(" ").toLowerCase().includes(q))
  ).sort((a,b)=>{
    if(state.liveSort==="newest")return liveAgeMinutes(a)-liveAgeMinutes(b);
    if(state.liveSort==="priority"){
      const rank=t=>t.status==="Flagged"||t.status==="Overdue"||t.status==="Unassigned"?0:1;
      return rank(a)-rank(b)||liveAgeMinutes(b)-liveAgeMinutes(a);
    }
    return liveAgeMinutes(b)-liveAgeMinutes(a);
  });
}
function liveQueueRows(){
  const rows=liveFilteredTickets().map(ticket=>{
    const sla=liveSla(ticket);
    const priority=["Flagged","Overdue","Unassigned"].includes(ticket.status)?"High":(ticket.status==="Waiting"?"Medium":"Normal");
    return '<tr>'+
      '<td><button class="link-button live-ticket-ref" type="button" data-ticket="'+esc(ticket.ref)+'">'+esc(ticket.ref)+'</button><span class="live-ticket-subject">'+esc(ticket.subject)+'</span></td>'+
      '<td><span class="live-brand-cell">'+esc(ticket.brand)+'</span></td>'+
      '<td>'+esc(ticket.folder)+'</td>'+
      '<td>'+esc(ticket.member)+'</td>'+
      '<td><strong class="live-age">'+esc(ticket.age)+'</strong><span class="live-priority '+priority.toLowerCase()+'">'+priority+'</span></td>'+
      '<td><span class="sla-pill '+sla.tone+'">'+sla.label+'</span></td>'+
      '<td>'+statusPill(ticket.status)+'</td>'+
    '</tr>';
  });
  return dataTable(["Ticket / subject","Brand","Inbox","Owner","Age / priority","SLA","Status"],rows,"No tickets match these filters. Try another inbox, status or search.");
}
function liveStatusTabs(base){
  const counts={
    all:base.length,
    unassigned:base.filter(t=>t.status==="Unassigned").length,
    active:base.filter(t=>["Assigned","In progress","Reassigned"].includes(t.status)).length,
    waiting:base.filter(t=>t.status==="Waiting").length,
    attention:base.filter(t=>["Flagged","Overdue","Unassigned"].includes(t.status)||liveSla(t).tone==="warning").length,
    resolved:base.filter(t=>["Resolved","Closed"].includes(t.status)).length
  };
  const labels=[["all","All work"],["unassigned","Unassigned"],["active","Active"],["waiting","Waiting"],["attention","Needs attention"],["resolved","Resolved"]];
  return '<div class="live-status-tabs" role="group" aria-label="Filter ticket status">'+labels.map(([key,label])=>
    '<button type="button" class="live-status-tab '+(state.liveStatus===key?"active":"")+'" data-live-status="'+key+'" aria-pressed="'+(state.liveStatus===key)+'">'+label+' <b>'+counts[key]+'</b></button>'
  ).join("")+'</div>';
}
function liveInboxCards(base){
  return '<div class="live-inbox-grid">'+FOLDERS.map(folder=>{
    const tickets=base.filter(t=>t.folder===folder.name);
    const open=tickets.filter(t=>!["Resolved","Closed"].includes(t.status));
    const unassigned=tickets.filter(t=>t.status==="Unassigned").length;
    const attention=tickets.filter(t=>["Flagged","Overdue"].includes(t.status)||liveSla(t).tone==="warning").length;
    const active=state.folder===folder.id;
    return '<button type="button" class="live-inbox-card '+(active?"selected":"")+'" data-live-folder="'+folder.id+'" aria-pressed="'+active+'">'+
      '<span class="live-inbox-top"><span class="live-inbox-name">'+esc(folder.name)+'</span><i style="--inbox-accent:'+folder.color+'"></i></span>'+
      '<strong class="live-inbox-open">'+open.length+'</strong><span class="live-inbox-caption">open sample tickets</span>'+
      '<span class="live-inbox-foot"><span>'+unassigned+' unassigned</span><span>'+attention+' attention</span></span>'+
    '</button>';
  }).join("")+'</div>';
}
function liveCoveragePanel(){
  const available=AGENTS.filter(a=>a.availability==="Available").length;
  const onBreak=AGENTS.filter(a=>a.availability==="Break").length;
  const other=AGENTS.length-available-onBreak;
  const roster=AGENTS.slice(0,5).map(agent=>
    '<div class="live-coverage-row">'+memberCell(agent.name,agent.shift+" shift")+'<span class="live-shift-time">'+agent.start+'–'+agent.end+'</span>'+statusPill(agent.availability)+'</div>'
  ).join("");
  return '<div class="live-coverage-summary"><div><strong>'+available+'</strong><span>Available</span></div><div><strong>'+onBreak+'</strong><span>On break</span></div><div><strong>'+other+'</strong><span>Other</span></div></div>'+
    '<div class="live-coverage-track"><span style="width:'+(available/Math.max(1,AGENTS.length)*100)+'%"></span></div>'+
    roster+
    '<button type="button" class="panel-action live-panel-link" data-go="roster">Open roster & coverage ↗</button>';
}
function liveAttentionPanel(base){
  const attention=base.filter(ticket=>["Flagged","Overdue","Unassigned"].includes(ticket.status)||liveSla(ticket).tone==="warning")
    .sort((a,b)=>liveAgeMinutes(b)-liveAgeMinutes(a)).slice(0,5);
  if(!attention.length)return '<div class="empty-state">No sample tickets currently require attention.</div>';
  return '<div class="live-attention-list">'+attention.map(ticket=>
    '<button class="live-attention-item" type="button" data-ticket="'+esc(ticket.ref)+'"><span class="live-attention-mark '+(ticket.status==="Overdue"?"danger":"warning")+'"></span><span class="live-attention-copy"><strong>'+esc(ticket.ref)+' · '+esc(ticket.status)+'</strong><small>'+esc(ticket.subject)+'</small></span><span class="live-attention-age">'+esc(ticket.age)+'</span></button>'
  ).join("")+'</div>';
}
function renderLive(){
  const base=liveBaseTickets();
  const open=base.filter(t=>!["Resolved","Closed"].includes(t.status));
  const unassigned=base.filter(t=>t.status==="Unassigned").length;
  const atRisk=open.filter(t=>liveSla(t).tone!=="good").length;
  const available=AGENTS.filter(a=>a.availability==="Available").length;
  const owners=[...new Set(TICKETS.map(t=>t.member).filter(name=>name!=="Unassigned"))].sort();
  const brands=[...new Set(TICKETS.map(t=>t.brand))].sort();
  pageContent.innerHTML=heading("LIVE OPERATIONS","Operations control room","A focused view of inbox demand, the working queue, SLA exposure and current team coverage.",'<button class="btn btn-secondary" data-action="export-live-queue">↓ Export visible queue</button>')+
    '<div class="live-environment-strip"><span class="live-env-tag"><i class="demo-dot"></i> DEMONSTRATION DATA</span><span><b>Mailbox sync</b> Not connected</span><span><b>Dispatch engine</b> Preview only</span><span><b>Last sample refresh</b> Static dataset</span></div>'+
    kpiGrid([
      kpi("Open tickets",fmt(open.length),"In the current inbox scope","◷"),
      kpi("Unassigned",fmt(unassigned),"Awaiting an initial owner","＋",null,unassigned?"warning":"positive"),
      kpi("SLA at risk",fmt(atRisk),"Overdue or nearing target","!",null,atRisk?"warning":"positive"),
      kpi("Available agents",fmt(available),fmt(AGENTS.length)+" in sample roster","♧")
    ])+
    '<div class="section-heading"><div><h2>Inbox queues</h2><p>Select an inbox to scope the whole control room. Counts are based on sample ticket records.</p></div><button class="panel-action" type="button" data-live-folder="all">Show all inboxes ↗</button></div>'+
    liveInboxCards(base)+
    '<div class="live-queue-layout">'+
      '<section class="panel live-queue-panel">'+
        '<div class="panel-heading"><div><h2 class="panel-title">Working queue</h2><p class="panel-subtitle">Search, filter and inspect individual sample tickets.</p></div><span class="subtle-tag">READ ONLY</span></div>'+
        liveStatusTabs(base)+
        '<div class="live-filter-toolbar">'+
          '<label class="live-queue-search"><span>⌕</span><input type="search" data-live-search value="'+esc(state.liveSearch)+'" placeholder="Search reference, subject or owner…" autocomplete="off" aria-label="Search live queue"></label>'+
          '<label><span class="live-filter-label">OWNER</span><select class="live-select" data-live-filter="liveOwner"><option value="all">All owners</option>'+owners.map(name=>'<option value="'+esc(name)+'" '+(state.liveOwner===name?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label>'+
          '<label><span class="live-filter-label">BRAND</span><select class="live-select" data-live-filter="liveBrand"><option value="all">All brands</option>'+brands.map(name=>'<option value="'+esc(name)+'" '+(state.liveBrand===name?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label>'+
          '<label><span class="live-filter-label">SORT</span><select class="live-select" data-live-filter="liveSort"><option value="oldest" '+(state.liveSort==="oldest"?"selected":"")+'>Oldest first</option><option value="newest" '+(state.liveSort==="newest"?"selected":"")+'>Newest first</option><option value="priority" '+(state.liveSort==="priority"?"selected":"")+'>Priority first</option></select></label>'+
        '</div>'+
        '<div class="live-queue-meta"><span id="liveQueueCount">Showing '+liveFilteredTickets().length+' of '+base.length+' sample tickets</span><button type="button" class="text-action" data-action="reset-live-filters">Reset filters</button></div>'+
        '<div id="liveQueueRows">'+liveQueueRows()+'</div>'+
      '</section>'+
      '<div class="live-side-stack">'+
        panel("Needs attention","Oldest unresolved exceptions in this inbox scope",liveAttentionPanel(base),'<span class="subtle-tag">'+atRisk+' SLA risks</span>')+
        panel("Team coverage","Illustrative availability and shift snapshot",liveCoveragePanel(),'<button class="panel-action" data-go="roster">Manage coverage ↗</button>')+
      '</div>'+
    '</div>'+
    '<div class="grid-two live-bottom-grid">'+
      panel("Recent operational events","Latest entries in the sample event stream",auditTable(AUDIT_EVENTS.slice(0,5)),'<button class="panel-action" data-go="audit">View audit history ↗</button>')+
      panel("Operational connection state","Integration indicators are informational only",'<div class="live-connection-list">'+
        healthRow("Outlook mailbox","Not connected","warning","No mailbox messages are being read")+
        healthRow("Excel tracker","Not connected","warning","No assignment records are being written")+
        healthRow("Dispatcher service","Preview only","neutral","No allocation or recovery actions are enabled")+
        healthRow("Event history","Sample records","neutral","Synthetic timeline for interface testing")+
      '</div>','<button class="panel-action" data-go="reliability">Open reliability centre ↗</button>')
    '</div>';
}
function renderTickets(){
  const t=totals();
  const rows=ticketRows();
  pageContent.innerHTML=heading("TICKET ANALYTICS","Ticket flow, end to end","Understand what arrived, what was allocated, what was resolved and where work is accumulating.",'<button class="btn btn-secondary" data-action="export-tickets">↓ Export tickets</button>')+
    kpiGrid([
      kpi("Received",fmt(t.received),"Unique tickets in period","▤"),
      kpi("Initially assigned",fmt(t.assigned),"First allocation events","↗"),
      kpi("Resolved",fmt(t.resolved),"Unique resolved tickets","✓"),
      kpi("Still outstanding",fmt(t.open),"Open at snapshot time","◷")
    ])+
    '<div class="grid-two">'+
      panel("Ticket volume trend","Received vs resolved · sample daily series",'<div class="dual-bars">'+chartPair([76,88,94,83,108,102,121,115,96,130,118,125],[61,78,82,91,94,99,106,110,94,116,120,127],["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri"])+'</div>',horizontalLegend([{label:"Received",color:"#f1846f"},{label:"Resolved",color:"#8fb39a"}]))+
      panel("Resolution time distribution","Elapsed time from receipt to resolution",barRows([{label:"Under 1 hour",value:18,color:"#8fb39a"},{label:"1–4 hours",value:42,color:"#a88bb8"},{label:"4–8 hours",value:22,color:"#d49a68"},{label:"8–24 hours",value:13,color:"#dda66c"},{label:"Over 24 hours",value:5,color:"#ef8887"}],{percent:true}),'<span class="subtle-tag">SAMPLE PROFILE</span>')+
    '</div>'+
    '<div class="grid-equal">'+
      metricPanel("Assignment delay","12m","Average receipt-to-first-assignment","Median 7m")+
      metricPanel("First response","28m","Average receipt-to-first-response","Median 19m")+
      metricPanel("Elapsed resolution","3h 42m","Average total elapsed time","Median 2h 18m")+
      metricPanel("Active handling","46m","Illustrative recorded active time","Requires activity events")+
    '</div>'+
    panel("Ticket explorer","Search across reference, brand, folder, owner and subject",dataTable(["Reference","Brand","Inbox","Assigned to","Received","Age","Status","Last event"],rows),'<span class="subtle-tag">'+rows.length+' SAMPLE RECORDS</span>');
}
function chartPair(a,b,labels){
  const max=Math.max(...a,...b),h=115;
  return '<div class="paired-chart">'+a.map((v,i)=>'<div class="paired-col"><div class="paired-bars"><span class="paired-bar received" style="height:'+v/max*100+'%"></span><span class="paired-bar resolved" style="height:'+b[i]/max*100+'%"></span></div><small>'+labels[i]+'</small></div>').join("")+'</div>';
}
function metricPanel(title,value,copy,note){
  return '<article class="metric-panel"><span>'+title+'</span><strong>'+value+'</strong><p>'+copy+'</p><small>'+note+'</small></article>';
}
function renderBrands(){
  const rows=brandRows(),total=rows.reduce((a,b)=>a+b.value,0),known=total-rows.find(b=>b.id==="other").value;
  pageContent.innerHTML=heading("BRAND INTELLIGENCE","Know the brands behind the workload","See how many tickets relate to each VW Group brand and compare brand demand across inboxes.",'<button class="btn btn-secondary" data-action="export-brands">↓ Export brand mix</button>')+
    kpiGrid([
      kpi("Total tickets",fmt(total),"Distinct received tickets","▤"),
      kpi("Identified brand",fmt(known),total?(known/total*100).toFixed(1)+"% classified":"—","◈"),
      kpi("Audi tickets",fmt(rows.find(b=>b.id==="audi").value),"Share "+(total?rows.find(b=>b.id==="audi").value/total*100:0).toFixed(1)+"%","A"),
      kpi("Škoda tickets",fmt(rows.find(b=>b.id==="skoda").value),"Share "+(total?rows.find(b=>b.id==="skoda").value/total*100:0).toFixed(1)+"%","Š")
    ])+
    '<div class="grid-two">'+
      panel("Brand distribution","Share of unique tickets in the current scope",brandBarList(rows),'<span class="subtle-tag">7 CATEGORIES</span>')+
      panel("Brand mix by inbox","The selected folder filter applies to all views",brandFolderTable(),'<span class="subtle-tag">SAMPLE COMPARISON</span>')+
    '</div>'+
    panel("Brand register","Classification coverage and handling rules",dataTable(["Brand","Tickets","Share","Classification","Treatment"],rows.map(b=>{
      const share=total?b.value/total*100:0;
      return '<tr><td><span class="brand-register-name"><i style="background:'+b.color+'"></i>'+b.name+'</span></td><td class="total-cell">'+fmt(b.value)+'</td><td>'+share.toFixed(1)+'%</td><td>'+statusPill(b.id==="other"?"Review required":"Identified")+'</td><td>'+(b.id==="other"?"Retain until confirmed":"Explicit / validated mapping")+'</td></tr>';
    })),'<span class="subtle-tag">DISTINCT TICKETS</span>')+
    '<div class="prototype-warning"><strong>Classification safeguard.</strong> In the live system, brand identity must come from an explicit field or validated reference mapping. Ambiguous records stay in Other / unclassified rather than being guessed from a subject line.</div>';
}
function brandFolderTable(){
  const rows=FOLDERS.filter(f=>state.folder==="all"||f.id===state.folder);
  return dataTable(["Inbox","VW","Audi","Škoda","Other"],rows.map(f=>{
    const total=scaled(f.received),mix=BRAND_MIX[f.id],v=distribute(total,mix);
    return '<tr><td>'+f.name+'</td><td>'+fmt(v[0])+'</td><td>'+fmt(v[1])+'</td><td>'+fmt(v[2])+'</td><td>'+fmt(v[6])+'</td></tr>';
  }));
}
function renderWorkflow(){
  pageContent.innerHTML=heading("WORKFLOW ANALYTICS","Understand how work moves","Separate ticket-level ratios from event counts so handovers, flags, manual interventions and recoveries are not double-counted.")+
    kpiGrid([
      kpi("Automatic allocation","1,064","89.5% of assigned tickets","↗"),
      kpi("Manual allocation","55","4.6% of assigned tickets","✎"),
      kpi("Handover events","128","96 unique tickets affected","⇄"),
      kpi("Recovery events","27","25 unique tickets affected","↺")
    ])+
    '<div class="grid-two">'+
      panel("Assignment method mix","Share of distinct assigned tickets",donutChart([{label:"Automatic",value:89.5,color:"#d49a68"},{label:"Manual",value:4.6,color:"#dda66c"},{label:"Other / pending",value:5.9,color:"#a7a3a0"}]),'<span class="subtle-tag">INITIAL ASSIGNMENT</span>')+
      panel("Workflow events","Recorded event volume in the sample",barRows([{label:"Handover",value:128,color:"#d49a68"},{label:"Flag",value:88,color:"#dda66c"},{label:"Manual assignment",value:55,color:"#a88bb8"},{label:"Recovery",value:27,color:"#8fb39a"},{label:"Reassignment",value:42,color:"#f1846f"}]),'')+
    '</div>'+
    panel("Metric definitions","What each ratio means",dataTable(["Metric","Unique tickets affected","Events recorded","Rate / interpretation"],[
      '<tr><td>Handover</td><td>96</td><td>128</td><td>8.6% of assigned tickets</td></tr>',
      '<tr><td>Flagged</td><td>72</td><td>88</td><td>6.4% of handled tickets</td></tr>',
      '<tr><td>Manual assignment</td><td>49</td><td>55</td><td>4.6% of assigned tickets</td></tr>',
      '<tr><td>Recovery</td><td>25</td><td>27</td><td>2.2% of assigned tickets</td></tr>',
      '<tr><td>Reassignment</td><td>34</td><td>42</td><td>3.0% of assigned tickets</td></tr>'
    ]))+
    '<div class="prototype-warning"><strong>Counting rule.</strong> A ticket with three handovers counts once in the unique-ticket rate and three times in the event count. These measures must stay separate.</div>';
}
function donutChart(items){
  let offset=0;
  const circles=items.map(item=>{
    const length=item.value*2.45;
    const circle='<circle cx="64" cy="64" r="39" fill="none" stroke="'+item.color+'" stroke-width="16" stroke-dasharray="'+length+' '+(245-length)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 64 64)"></circle>';
    offset+=length;return circle;
  }).join("");
  return '<div class="donut-layout"><svg viewBox="0 0 128 128" role="img" aria-label="Allocation method distribution">'+circles+'<text x="64" y="61" text-anchor="middle" class="donut-center">1,119</text><text x="64" y="76" text-anchor="middle" class="donut-sub">ASSIGNED</text></svg><div class="donut-legend">'+items.map(i=>'<div><span><i style="background:'+i.color+'"></i>'+i.label+'</span><strong>'+i.value+'%</strong></div>').join("")+'</div></div>';
}
function renderFolders(){
  const rows=allocationMatrix(),scope=scopeFolders(),assigned=scope.reduce((sum,f)=>sum+scaled(f.assigned),0);
  const folderCount=scope.length;
  pageContent.innerHTML=heading("WORKLOAD DISTRIBUTION","Every member. Every folder.","See each member’s share of initial ticket allocations in each inbox. Current open workload is measured separately.",'<button class="btn btn-secondary" data-action="export-folders">↓ Export matrix</button>')+
    kpiGrid([
      kpi("Team members",String(AGENTS.length),"Illustrative team roster","♧"),
      kpi("Initial allocations",fmt(assigned),"Distinct tickets first assigned","↗"),
      kpi("Folders in scope",String(folderCount),"Four monitored workstreams","▤"),
      kpi("Open workload",fmt(scope.reduce((a,f)=>a+scaled(f.open),0)),"Current-state sample snapshot","◷")
    ])+
    '<div class="prototype-warning"><strong>Share definition.</strong> Each percentage is the member’s distinct tickets first assigned in that folder divided by all first-assigned tickets in that folder. Handovers, recoveries and reassignments do not inflate original allocation share.</div>'+
    panel("Member allocation matrix","Counts and percentage share are shown for every visible folder",'<div class="table-toolbar"><input class="search-control" id="memberSearch" type="search" placeholder="Search members…" value="'+esc(state.memberSearch)+'"></div>'+shareMatrix(rows,true),'<span class="subtle-tag">14 SAMPLE MEMBERS</span>')+
    '<div class="grid-two">'+
      panel("Folder allocation share","How the selected team shares initial allocations",barRows(scope.map(f=>({label:f.name,value:scaled(f.assigned),color:f.color}))),"")+
      panel("Current open workload","Snapshot of open tickets by folder",barRows(scope.map(f=>({label:f.name,value:scaled(f.open),color:f.color}))),"")+
    '</div>';
  const search=document.getElementById("memberSearch");
  if(search)search.addEventListener("input",e=>{state.memberSearch=e.target.value;const pos=e.target.selectionStart;renderFolders();const el=document.getElementById("memberSearch");el.focus();el.setSelectionRange(pos,pos);});
}
function renderTeam(){
  const rows=allocationMatrix().filter(r=>!state.search||activeSearch(r.name));
  const totalsByMember=rows.map(r=>({...r,scopeTotal:scopeFolders().reduce((s,f)=>s+r.cells[FOLDERS.findIndex(x=>x.id===f.id)],0)}));
  const total=totalsByMember.reduce((s,r)=>s+r.scopeTotal,0);
  const average=total/Math.max(1,totalsByMember.length);
  pageContent.innerHTML=heading("TEAM PERFORMANCE","Performance with the right context","Review allocation, workload, responsiveness, resolution and workflow activity without reducing performance to ticket volume alone.")+
    kpiGrid([
      kpi("Team members",String(totalsByMember.length),"Sample roster","♧"),
      kpi("Allocated tickets",fmt(total),"Current reporting scope","↗"),
      kpi("Average per member",fmt(average),"Allocation volume only","◷"),
      kpi("Current open work",fmt(totalsByMember.reduce((s,r)=>s+r.open,0)),"Live-work sample snapshot","▤")
    ])+
    '<div class="agent-grid">'+totalsByMember.map(a=>'<button class="agent-card agent-card-button" data-agent="'+a.id+'" type="button"><div class="agent-card-head">'+memberCell(a.name,a.shift)+'</div><div class="agent-card-total">'+fmt(a.scopeTotal)+'</div><div class="agent-card-caption">Initial allocations · selected scope</div><div class="agent-progress"><span style="width:'+Math.min(100,a.scopeTotal/Math.max(1,average*1.7)*100)+'%"></span></div><div class="agent-card-foot"><span>'+fmt(a.open)+' open</span><span>'+a.handovers+' handovers</span></div></button>').join("")+'</div>'+
    (state.selectedAgent?agentDetail(state.selectedAgent):'<div class="empty-state">Select a team member to open their sample performance profile.</div>');
}
function agentDetail(id){
  const a=AGENTS.find(x=>x.id===id);if(!a)return "";
  const row=allocationMatrix().find(x=>x.id===id);
  return '<section class="panel agent-detail"><div class="panel-heading"><div><div class="eyebrow">MEMBER PROFILE</div><h2 class="panel-title">'+a.name+' · '+a.shift+' shift</h2><p class="panel-subtitle">Illustrative metrics only — not an assessment of a real colleague.</p></div><button class="panel-action" data-action="close-agent">Close profile</button></div>'+
    '<div class="metric-row">'+metricPanel("Initial allocations",fmt(row.total),"First-assignment volume","Current filter")+metricPanel("Open tickets",fmt(a.open),"Current outstanding sample","Snapshot")+metricPanel("First response","'+a.response+'m","Average sample response","Illustrative")+metricPanel("Elapsed resolution",duration(a.resolution),"Average sample elapsed","Illustrative")+'</div>'+
    '<div class="grid-two"><div><h3 class="mini-heading">Allocation by folder</h3>'+barRows(FOLDERS.map((f,i)=>({label:f.name,value:row.cells[i],color:f.color})))+'</div><div><h3 class="mini-heading">Workflow activity</h3>'+barRows([{label:"Handovers",value:a.handovers,color:"#d49a68"},{label:"Flags",value:a.flags,color:"#dda66c"}])+'</div></div></section>';
}
function duration(minutes){return Math.floor(minutes/60)+"h "+String(minutes%60).padStart(2,"0")+"m";}
function renderMy(){
  const a=AGENTS[3],r=allocationMatrix().find(x=>x.id===a.id),sum=scopeFolders().reduce((s,f)=>s+r.cells[FOLDERS.findIndex(x=>x.id===f.id)],0);
  pageContent.innerHTML=heading("PERSONAL WORKSPACE","Your performance overview","A private agent experience. This prototype uses a placeholder identity; personal access will be enforced by server-side permissions.")+
    '<div class="personal-banner"><div class="personal-avatar">A04</div><div><span class="eyebrow">SAMPLE PROFILE</span><h2>Agent 04</h2><p>Late shift · 10:00–20:00 · Demonstration identity</p></div><span class="status-pill good">Sample profile</span></div>'+
    kpiGrid([
      kpi("Tickets initially assigned",fmt(sum),"Selected reporting scope","↗"),
      kpi("Open tickets",fmt(a.open),"Current workload snapshot","◷"),
      kpi("First response","'+a.response+'m","Average sample time","⌁"),
      kpi("Elapsed resolution",duration(a.resolution),"Average sample time","✓")
    ])+
    '<div class="grid-two">'+
      panel("Your allocation mix","Initial allocation count by folder",barRows(FOLDERS.map((f,i)=>({label:f.name,value:r.cells[i],color:f.color}))),"")+
      panel("Your workflow activity","Events recorded in the sample period",barRows([{label:"Handovers",value:a.handovers,color:"#d49a68"},{label:"Flags",value:a.flags,color:"#dda66c"}]),"")+
    '</div>'+
    panel("Personal performance guidance","What a future personal profile will show",'<div class="feature-list"><div><strong>Resolution quality</strong><span>Elapsed time, active handling time and reopen rates.</span></div><div><strong>Workload context</strong><span>Open tickets, folder mix, scheduled hours and shift comparisons.</span></div><div><strong>Workflow history</strong><span>Your handovers, flags, manual allocations and completed work.</span></div><div><strong>Targets</strong><span>Clear progress against agreed team service targets.</span></div></div>');
}
function renderRoster(){
  pageContent.innerHTML=heading("WORKFORCE MANAGEMENT","Roster & coverage","Review shift coverage, scheduled hours, availability and the agent eligibility structure.",'<button class="btn btn-secondary" data-action="roster-preview">＋ Preview roster change</button>')+
    kpiGrid([
      kpi("Rostered agents","14","Illustrative team","♧"),
      kpi("Early shift","7","Sample coverage group","☼"),
      kpi("Late shift","7","Sample coverage group","☾"),
      kpi("Coverage windows","4","Inbox workstreams","▤")
    ])+
    '<div class="prototype-warning"><strong>Illustrative roster.</strong> The shift times below are placeholders and must be confirmed against the approved fortnightly roster before live integration.</div>'+
    panel("Team roster","Shift group, indicative coverage and availability",dataTable(["Member","Shift","Start (Egypt)","End (Egypt)","Availability","Agency","Detags","Transfers","Unadopts"],AGENTS.map((a,i)=>'<tr><td>'+memberCell(a.name)+'</td><td>'+statusPill(a.shift)+'</td><td>'+a.start+'</td><td>'+a.end+'</td><td>'+statusPill(a.availability)+'</td>'+[0,1,2,3].map(()=>'<td>'+statusPill("Eligible")+'</td>').join("")+'</tr>')),'<span class="subtle-tag">SAMPLE ROSTER</span>')+
    '<div class="grid-two">'+
      panel("Coverage by shift","Illustrative team distribution",'<div class="shift-card-grid"><div class="shift-card"><span>EARLY SHIFT</span><strong>7 agents</strong><small>08:00–18:00 sample window</small></div><div class="shift-card"><span>LATE SHIFT</span><strong>7 agents</strong><small>10:00–20:00 sample window</small></div></div>',"")+
      panel("Eligibility policy","How future assignment eligibility will be managed",'<div class="feature-list"><div><strong>Inbox-specific access</strong><span>Agents can be eligible for any combination of folders.</span></div><div><strong>Temporary exclusion</strong><span>Availability changes must preserve roster and assignment history.</span></div><div><strong>Fortnightly schedule</strong><span>Preview coverage before applying an updated rotation.</span></div></div>',"")+
    '</div>';
}
function renderRules(){
  pageContent.innerHTML=heading("DISPATCH CONFIGURATION","Configure how work is allocated","Review fairness, eligibility and routing rules. Changes are preview-only in this prototype.",'<button class="btn btn-secondary" data-action="rules-preview">Review configuration</button>')+
    '<div class="prototype-warning"><strong>No live controls.</strong> These settings are visual examples only. They do not change the current Outlook dispatcher or Excel tracker.</div>'+
    '<div class="control-grid">'+
      configCard("Global allocation","Balance work across all eligible agents and all four inboxes.","Fairness model","Global workload weighting","Enabled")+
      configCard("Workload weighting","Use current open workload to avoid repeatedly assigning to a heavily loaded agent.","Weighting","Current open tickets","Enabled")+
      configCard("Shift eligibility","Only allocate to agents in the active scheduled window.","Eligibility","Roster and local shift time","Required")+
      configCard("Inbox routing","Respect folder-specific eligibility and monitored inbox boundaries.","Routing","Four configured inboxes","Enabled")+
      configCard("Recovery behaviour","Restore a valid original assignment when an interrupted workflow is detected.","Recovery","Preserve original assignee","Review")+
      configCard("Assignment safeguards","Prevent duplicates, stale writes and concurrent conflicting actions.","Protection","Idempotency and audit","Required")+
    '</div>'+
    panel("Configuration governance","Proposed review and activation lifecycle",'<div class="lifecycle"><div><b>01</b><strong>Draft</strong><small>Manager prepares a change.</small></div><i>→</i><div><b>02</b><strong>Validate</strong><small>Coverage and conflicts checked.</small></div><i>→</i><div><b>03</b><strong>Approve</strong><small>Higher authorisation if required.</small></div><i>→</i><div><b>04</b><strong>Apply</strong><small>Execution result verified.</small></div><i>→</i><div><b>05</b><strong>Audit</strong><small>Previous version retained.</small></div></div>');
}
function configCard(title,copy,label,value,status){
  return '<article class="control-card"><div class="control-card-top"><span class="control-symbol">⌘</span>'+statusPill(status)+'</div><h3>'+title+'</h3><p>'+copy+'</p><div class="config-setting"><span>'+label+'</span><strong>'+value+'</strong></div><button class="panel-action" data-action="config-preview">Preview setting</button></article>';
}
function renderReliability(){
  pageContent.innerHTML=heading("SYSTEM HEALTH","Reliability centre","A dedicated place for dispatcher health, failed writes, duplicate prevention, recovery queues and integration status.",'<button class="btn btn-secondary" data-action="refresh">↻ Refresh preview</button>')+
    kpiGrid([
      kpi("Assignment engine","Healthy","Illustrative status","◇"),
      kpi("Failed writes","0","Sample events today","×"),
      kpi("Pending recoveries","2","Awaiting review","↺","Needs attention","warning"),
      kpi("Sync latency","4.2s","Illustrative connector delay","⌁")
    ])+
    '<div class="grid-two">'+
      panel("Component status","Illustrative service health",'<div class="health-list">'+healthRow("Dispatch service","Healthy","good","Last check 10:42:18")+healthRow("Tracker connector","Connected","good","Prototype state")+healthRow("Event processor","Healthy","good","Queue depth 0")+healthRow("Recovery worker","Attention","warning","2 pending sample events")+healthRow("Audit persistence","Healthy","good","Sample storage only")+'</div>',"")+
      panel("Reliability trend","Simulated exceptions over the last 12 intervals",smallChart([3,2,4,1,2,1,3,2,1,0,1,0],["01","02","03","04","05","06","07","08","09","10","11","12"],"#dda66c"),'<span class="subtle-tag">SAMPLE EVENTS</span>')+
    '</div>'+
    panel("Recent exceptions","Sample reliability and recovery events",dataTable(["Time","Event","Component","Impact","Status"],[
      '<tr><td>10:38:12</td><td>Assignment recovery queued</td><td>Recovery worker</td><td>One ticket held for review</td><td>'+statusPill("Pending")+'</td></tr>',
      '<tr><td>10:17:49</td><td>Tracker write retry</td><td>Tracker connector</td><td>Retry succeeded</td><td>'+statusPill("Resolved")+'</td></tr>',
      '<tr><td>09:51:05</td><td>Duplicate event suppressed</td><td>Event processor</td><td>No duplicate assignment</td><td>'+statusPill("Healthy")+'</td></tr>'
    ]))+
    '<div class="prototype-warning"><strong>Reliability principle.</strong> A successful button click is not proof that an operation completed. Production status must be confirmed by the backend and independently recorded.</div>';
}
function auditTable(events){
  return dataTable(["Time","Event","Actor","Inbox","Type"],events.map(e=>'<tr><td class="mono">'+e[0]+'</td><td>'+e[1]+'</td><td>'+e[2]+'</td><td>'+e[3]+'</td><td>'+statusPill(e[4])+'</td></tr>'));
}
function renderAudit(){
  pageContent.innerHTML=heading("AUDIT & GOVERNANCE","A complete operational record","Searchable history for ticket events, manager actions, configuration changes and exceptions.",'<button class="btn btn-secondary" data-action="export-audit">↓ Export audit</button>')+
    kpiGrid([
      kpi("Events recorded","8,426","Synthetic historical events","◷"),
      kpi("Manager actions","146","Sample configuration and overrides","⚙"),
      kpi("Exceptions","23","Sample exceptions logged","!"),
      kpi("Audit completeness","100%","Demonstration record set","✓")
    ])+
    panel("Activity timeline","Latest system and ticket activity",auditTable(AUDIT_EVENTS),'<span class="subtle-tag">LATEST 8 EVENTS</span>')+
    panel("Audit principles","What the production audit record must preserve",'<div class="feature-list"><div><strong>Actor identity</strong><span>Who performed or initiated the action.</span></div><div><strong>Before and after values</strong><span>For every configuration and assignment change.</span></div><div><strong>Reason and approval</strong><span>Mandatory reason for critical and manual operations.</span></div><div><strong>Execution outcome</strong><span>Requested, approved, executed, verified or failed.</span></div><div><strong>Immutable history</strong><span>Corrections are appended, never silently overwritten.</span></div></div>');
}
function renderReports(){
  pageContent.innerHTML=heading("REPORTING","Make the operation measurable","Prepare consistent daily, weekly and monthly snapshots for managers.",'<button class="btn btn-primary" data-action="export-summary">↓ Export current summary</button>')+
    '<div class="report-grid">'+
      reportCard("Daily operations report","Tickets received, assigned, resolved, open backlog and inbox distribution.","Daily","CSV export ready")+
      reportCard("Weekly performance report","Team allocation, shift comparison, handovers, flags and resolution trends.","Weekly","CSV export ready")+
      reportCard("Monthly management report","Brand volumes, folder share, service performance and exception trends.","Monthly","CSV export ready")+
      reportCard("Individual performance report","Private per-agent workload and resolution summary with scheduled-hour context.","Individual","Permission required")+
      reportCard("Brand volume report","Distinct ticket counts and brand share across all inboxes.","By brand","CSV export ready")+
      reportCard("Reliability report","Assignment failures, recoveries, retries and service health.","System","CSV export ready")+
    '</div>'+
    panel("Current report scope","The selected global period and inbox filters apply",'<div class="report-scope"><div><span>Period</span><strong>'+PERIODS[state.period].label+'</strong></div><div><span>Inbox</span><strong>'+scopeName()+'</strong></div><div><span>Data status</span><strong>Demonstration only</strong></div></div>',"");
}
function reportCard(title,copy,tag,foot){
  return '<article class="report-card"><div class="report-card-icon">▤</div><span class="subtle-tag">'+tag+'</span><h3>'+title+'</h3><p>'+copy+'</p><div class="report-card-foot"><span>'+foot+'</span><button class="panel-action" data-action="export-summary">Export ↗</button></div></article>';
}
function renderAdmin(){
  pageContent.innerHTML=heading("PLATFORM ADMINISTRATION","Manage the platform foundation","Accounts, role permissions, security, application settings and future integrations.")+
    '<div class="prototype-warning"><strong>Administration is not active.</strong> User accounts and access controls have not yet been implemented. Do not use this prototype to store real colleague or ticket information.</div>'+
    '<div class="control-grid">'+
      configCard("Users & roles","Create administrator, manager and agent identities and apply least-privilege access.","Role model","Admin · Manager · Agent","Not configured")+
      configCard("Access security","Session management, secure cookies, rate limits and server-enforced permissions.","Protection","Authentication required","Not configured")+
      configCard("Data retention","Define audit retention, event immutability and backup policy.","Retention","Policy to be agreed","Draft")+
      configCard("Integration settings","Configure Excel, Outlook and approved service connections using protected secrets.","Connectors","Not connected","Disabled")+
      configCard("Notifications","Configure operational alerts, manager notifications and service warnings.","Channels","To be designed","Disabled")+
      configCard("Application preferences","Timezones, reporting cutoffs, working calendars and display defaults.","Timezone","UK inbox · Egypt shifts","Draft")+
    '</div>'+
    panel("Environment information","Current standalone prototype state",'<div class="environment-grid"><div><span>Application</span><strong>VWG Dispatch Intelligence</strong></div><div><span>Version</span><strong>UI Foundation 0.2</strong></div><div><span>Data source</span><strong>Synthetic sample records</strong></div><div><span>Database</span><strong>Not configured</strong></div><div><span>Authentication</span><strong>Not configured</strong></div><div><span>Excel / Outlook</span><strong>Not connected</strong></div></div>');
}
function render(){
  document.getElementById("topbarPage").textContent=VIEW_TITLES[state.view]||"Overview";
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===state.view));
  if(state.view==="overview")renderOverview();
  else if(state.view==="live")renderLive();
  else if(state.view==="tickets")renderTickets();
  else if(state.view==="brands")renderBrands();
  else if(state.view==="workflow")renderWorkflow();
  else if(state.view==="folders")renderFolders();
  else if(state.view==="team")renderTeam();
  else if(state.view==="my")renderMy();
  else if(state.view==="roster")renderRoster();
  else if(state.view==="rules")renderRules();
  else if(state.view==="reliability")renderReliability();
  else if(state.view==="audit")renderAudit();
  else if(state.view==="reports")renderReports();
  else if(state.view==="admin")renderAdmin();
  pageContent.focus({preventScroll:true});
}
function showToast(message){
  toast.textContent=message;toast.classList.add("show");
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),2600);
}
function navigate(view){
  if(!VIEW_TITLES[view])return;
  state.view=view;state.memberSearch="";render();
  if(window.innerWidth<820)pageContent.scrollIntoView({behavior:"smooth",block:"start"});
}
function csvDownload(filename,rows){
  const csv=rows.map(row=>row.map(value=>'"'+String(value??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  showToast("Sample CSV exported. It contains demonstration data only.");
}
function exportLiveQueue(){
  const rows=liveFilteredTickets();
  csvDownload("dispatcher-live-operations-sample-queue.csv",[
    ["Reference","Subject","Brand","Inbox","Owner","Age","Status","SLA"],
    ...rows.map(t=>[t.ref,t.subject,t.brand,t.folder,t.member,t.age,t.status,liveSla(t).label])
  ]);
}
function exportTickets(){
  csvDownload("dispatcher-sample-tickets.csv",[["Reference","Brand","Folder","Member","Subject","Age","Status"],...TICKETS.map(t=>[t.ref,t.brand,t.folder,t.member,t.subject,t.age,t.status])]);
}
function exportBrands(){
  csvDownload("dispatcher-sample-brand-mix.csv",[["Brand","Tickets"],...brandRows().map(b=>[b.name,scaled(b.value)])]);
}
function exportFolders(){
  const rows=allocationMatrix(),folders=scopeFolders();
  csvDownload("dispatcher-sample-folder-share.csv",[["Member",...folders.flatMap(f=>[f.name+" assigned",f.name+" share"]), "Total"],...rows.map(r=>[r.name,...folders.flatMap(f=>{const fi=FOLDERS.findIndex(x=>x.id===f.id);const total=rows.reduce((s,x)=>s+x.cells[fi],0);return [r.cells[fi],(r.cells[fi]/Math.max(1,total)*100).toFixed(1)+"%"]; }),r.total])]);
}
function exportAudit(){
  csvDownload("dispatcher-sample-audit.csv",[["Time","Event","Actor","Inbox","Type"],...AUDIT_EVENTS]);
}
function exportSummary(){
  const t=totals();
  csvDownload("dispatcher-sample-management-summary.csv",[["Metric","Value"],["Period",PERIODS[state.period].label],["Inbox",scopeName()],["Received",t.received],["Initially assigned",t.assigned],["Resolved",t.resolved],["Outstanding",t.open],["Unassigned",t.unassigned]]);
}
function openTicket(ref){
  const ticket=TICKETS.find(t=>t.ref===ref);if(!ticket)return;
  const sla=liveSla(ticket);
  const timeline=[
    ["Ticket received",ticket.received+" · "+ticket.folder],
    ...(ticket.member!=="Unassigned"?[["Initial assignment",ticket.member+" · Sample event"]]:[]),
    [ticket.last,"Most recent recorded sample event"]
  ];
  modalRoot.innerHTML='<div class="modal-backdrop" data-modal-close><section class="modal-card live-ticket-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">'+
    '<div class="modal-head"><div><span class="eyebrow">SAMPLE TICKET · READ ONLY</span><h2 id="modalTitle">'+esc(ticket.ref)+'</h2></div><button class="icon-button" data-modal-close aria-label="Close">×</button></div>'+
    '<p class="modal-copy">'+esc(ticket.subject)+'</p>'+
    '<div class="live-detail-status">'+statusPill(ticket.status)+'<span class="sla-pill '+sla.tone+'">SLA · '+sla.label+'</span></div>'+
    '<div class="ticket-detail-grid"><div><span>Brand</span><strong>'+esc(ticket.brand)+'</strong></div><div><span>Inbox</span><strong>'+esc(ticket.folder)+'</strong></div><div><span>Assigned to</span><strong>'+esc(ticket.member)+'</strong></div><div><span>Priority</span><strong>'+(["Flagged","Overdue","Unassigned"].includes(ticket.status)?"High":ticket.status==="Waiting"?"Medium":"Normal")+'</strong></div><div><span>Received</span><strong>'+esc(ticket.received)+'</strong></div><div><span>Current age</span><strong>'+esc(ticket.age)+'</strong></div></div>'+
    '<div class="live-detail-section"><h3>Event timeline</h3><div class="modal-timeline">'+timeline.map(item=>'<div><i></i><strong>'+esc(item[0])+'</strong><small>'+esc(item[1])+'</small></div>').join("")+'</div></div>'+
    '<div class="prototype-warning"><strong>Read-only sample.</strong> This ticket is synthetic. Outlook, Excel and dispatch actions are not connected, so no assignment or status changes can be made.</div>'+
    '</section></div>';
}
function closeModal(){modalRoot.innerHTML="";}
function handleAction(action){
  if(action==="refresh"){showToast("Preview refreshed. Sample data remains unchanged.");return;}
  if(action==="export-live-queue"){exportLiveQueue();return;}
  if(action==="reset-live-filters"){state.liveStatus="all";state.liveOwner="all";state.liveBrand="all";state.liveSort="oldest";state.liveSearch="";render();return;}
  if(action==="toggle-dispatch"){state.paused=!state.paused;showToast(state.paused?"Demo dispatch state set to paused. No live system affected.":"Demo dispatch state resumed. No live system affected.");render();return;}
  if(action==="export-tickets"){exportTickets();return;}
  if(action==="export-brands"){exportBrands();return;}
  if(action==="export-folders"){exportFolders();return;}
  if(action==="export-audit"){exportAudit();return;}
  if(action==="export-summary"){exportSummary();return;}
  if(action==="close-agent"){state.selectedAgent=null;render();return;}
  if(action==="roster-preview"){showToast("Roster preview is a design placeholder. No roster has changed.");return;}
  if(action==="rules-preview"||action==="config-preview"){showToast("Configuration preview only. No dispatch rules have changed.");return;}
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.view)));
document.getElementById("periodSelect").addEventListener("change",e=>{state.period=e.target.value;render();});
document.getElementById("folderSelect").addEventListener("change",e=>{state.folder=e.target.value;render();});
document.getElementById("globalSearch").addEventListener("input",e=>{state.search=e.target.value;render();});
document.getElementById("profileButton").addEventListener("click",()=>showToast("Profile and sign-in will be added with the authentication stage."));
document.addEventListener("change",event=>{
  const filter=event.target.closest("[data-live-filter]");
  if(filter){
    const key=filter.dataset.liveFilter;
    if(["liveOwner","liveBrand","liveSort"].includes(key)){state[key]=filter.value;render();}
  }
});
document.addEventListener("input",event=>{
  const search=event.target.closest("[data-live-search]");
  if(search){
    state.liveSearch=search.value;
    const rows=document.getElementById("liveQueueRows");
    const count=document.getElementById("liveQueueCount");
    if(rows)rows.innerHTML=liveQueueRows();
    if(count)count.textContent="Showing "+liveFilteredTickets().length+" of "+liveBaseTickets().length+" sample tickets";
  }
});
document.addEventListener("click",event=>{
  const action=event.target.closest("[data-action]");
  const go=event.target.closest("[data-go]");
  const ticket=event.target.closest("[data-ticket]");
  const agent=event.target.closest("[data-agent]");
  const liveStatus=event.target.closest("[data-live-status]");
  const liveFolder=event.target.closest("[data-live-folder]");
  if(action)handleAction(action.dataset.action);
  if(go)navigate(go.dataset.go);
  if(ticket)openTicket(ticket.dataset.ticket);
  if(liveStatus){state.liveStatus=liveStatus.dataset.liveStatus;render();}
  if(liveFolder){state.folder=liveFolder.dataset.liveFolder;document.getElementById("folderSelect").value=state.folder;render();}
  if(agent){state.selectedAgent=agent.dataset.agent;render();}
  if(event.target.closest("[data-modal-close]"))closeModal();
});
document.addEventListener("keydown",event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();document.getElementById("globalSearch").focus();
  }
  if(event.key==="Escape")closeModal();
});
render();
