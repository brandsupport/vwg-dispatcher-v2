/* VWG Dispatch Intelligence — complete UI foundation.
 * All records are synthetic. This prototype has no live data or operational integration.
 */
const FOLDERS = [
  { id: "agency", name: "Agency Detags", short: "Agency", received: 230, assigned: 218, resolved: 165, open: 50, color: "#ff5c91" },
  { id: "detags", name: "Detags", short: "Detags", received: 470, assigned: 445, resolved: 318, open: 180, color: "#76e7ce" },
  { id: "transfers", name: "Transfers", short: "Transfers", received: 300, assigned: 280, resolved: 205, open: 94, color: "#c2a0ff" },
  { id: "unadopts", name: "Unadopts", short: "Unadopts", received: 194, assigned: 176, resolved: 124, open: 58, color: "#ffbd68" }
];
const BRANDS = [
  { id: "vw", name: "Volkswagen", count: 362, color: "#ff5c91", short: "VW" },
  { id: "audi", name: "Audi", count: 286, color: "#c2a0ff", short: "AUDI" },
  { id: "skoda", name: "Škoda", count: 196, color: "#76e7ce", short: "ŠKODA" },
  { id: "seat", name: "SEAT", count: 118, color: "#ffbd68", short: "SEAT" },
  { id: "cupra", name: "CUPRA", count: 101, color: "#ff7698", short: "CUPRA" },
  { id: "vwcv", name: "Volkswagen Commercial Vehicles", count: 91, color: "#a9a1b8", short: "VWCV" },
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
  eligibleFolders: ["agency","detags","transfers","unadopts"],
  assigned: 0,
  open: [11,15,13,16,12,14,10,15,12,13,11,16,9,14][index],
}));
const MATRIX_WEIGHTS = [
  [12,30,18,10],[11,28,17,9],[10,32,20,9],[9,26,16,8],[10,29,18,9],[12,31,19,10],[10,27,16,8],
  [9,25,15,7],[11,30,18,9],[10,28,17,8],[9,26,16,7],[10,27,17,8],[8,24,15,7],[9,27,18,9]
];
const WORKFLOW_EVENT_SUMMARY = [
  { id:"handover", label:"Handover", events:128, uniqueTickets:96, rate:"8.6%", color:"#ff5c91" },
  { id:"flag", label:"Flagged", events:88, uniqueTickets:72, rate:"6.4%", color:"#ffbd68" },
  { id:"manual", label:"Manual assignment", events:55, uniqueTickets:49, rate:"4.6%", color:"#c2a0ff" },
  { id:"recovery", label:"Recovery", events:27, uniqueTickets:25, rate:"2.2%", color:"#76e7ce" },
  { id:"reassignment", label:"Reassignment", events:42, uniqueTickets:34, rate:"3.0%", color:"#f1846f" }
];
function workflowEvent(id){
  return WORKFLOW_EVENT_SUMMARY.find(event=>event.id===id)||{events:0,uniqueTickets:0};
}
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
  liveStatus:"all", liveOwner:"all", liveBrand:"all", liveSort:"oldest", liveSearch:"",
  ticketStatus:"all", ticketBrand:"all", ticketOwner:"all", ticketSort:"oldest", ticketSearch:"",
  rosterSearch:"", rosterShift:"all", rosterAvailability:"all", selectedRosterAgent:null,
  configPreviewFolder:"agency", configPreviewWeight:50
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
  return '<div class="bar-list">'+rows.map(r=>'<div class="bar-row"><div class="bar-label">'+(r.color?'<span class="legend-dot" style="background:'+r.color+'"></span>':'')+esc(r.label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.max(1,r.value/max*100)+'%;background:'+(r.color||"#ff5c91")+'"></div></div><div class="bar-value">'+fmt(r.value)+(options&&options.percent?'<small>'+r.share+'%</small>':'')+'</div></div>').join("")+'</div>';
}
function brandBarList(list){
  const total=list.reduce((a,b)=>a+b.value,0);
  return barRows(list.slice().sort((a,b)=>b.value-a.value).map(r=>({...r,label:r.name,share:total?((r.value/total)*100).toFixed(1):"0.0"})),{percent:true});
}
function folderCards(){
  return '<div class="folder-card-grid">'+folderAssignedRows().filter(f=>state.folder==="all"||f.id===state.folder).map(f=>'<article class="folder-card"><div class="folder-card-top"><span class="folder-icon" style="--folder-color:'+f.color+'">▤</span><span class="status-pill '+(state.pausedFolders[f.id]?"warning":"good")+'">'+(state.pausedFolders[f.id]?"Paused":"Active")+'</span></div><h3>'+f.name+'</h3><div class="folder-card-value">'+fmt(f.open)+'</div><div class="folder-card-caption">Outstanding tickets</div><div class="folder-card-meta"><span>'+fmt(f.received)+' received</span><span>'+fmt(f.assigned)+' assigned</span></div></article>').join("")+'</div>';
}
function allocationShareData(rows,folderIndex){
  const total=rows.reduce((sum,row)=>sum+(row.cells[folderIndex]||0),0);
  return {
    total,
    rows:rows.map(row=>{
      const count=row.cells[folderIndex]||0;
      return {id:row.id,name:row.name,count,share:total?count/total*100:0};
    })
  };
}
function shareMatrix(rows,full,denominatorRows){
  const folders=scopeFolders();
  const denominator=denominatorRows||rows;
  const shareData=folders.map(folder=>allocationShareData(denominator,FOLDERS.findIndex(item=>item.id===folder.id)));
  const totalsByFolder=shareData.map(item=>item.total);
  const totalVisible=totalsByFolder.reduce((sum,value)=>sum+value,0);
  const visibleRows=rows.filter(row=>activeSearch(row.name)&&(!state.memberSearch||row.name.toLowerCase().includes(state.memberSearch.toLowerCase())));
  if(!visibleRows.length)return '<div class="empty-state">No members match this search.</div>';
  const header='<thead><tr><th>Team member</th>'+folders.map(folder=>'<th>'+folder.short+' · count / share</th>').join("")+'<th>Total allocated</th>'+(full?'<th>Scope share</th><th>Open work snapshot</th>':'')+'</tr></thead>';
  const body='<tbody>'+visibleRows.map(row=>{
    const cells=folders.map((folder,index)=>{
      const fi=FOLDERS.findIndex(item=>item.id===folder.id);
      const count=row.cells[fi]||0;
      const allocation=shareData[index].rows.find(item=>item.id===row.id);
      const share=allocation?allocation.share:0;
      return '<td class="matrix-cell"><span class="matrix-count">'+fmt(count)+'</span><span class="matrix-share"><span class="share-mini-track"><span class="share-mini-fill" style="width:'+share+'%"></span></span>'+share.toFixed(1)+'%</span></td>';
    }).join("");
    const visibleTotal=folders.reduce((sum,folder)=>sum+(row.cells[FOLDERS.findIndex(item=>item.id===folder.id)]||0),0);
    const overall=totalVisible?visibleTotal/totalVisible*100:0;
    return '<tr><td>'+memberCell(row.name,row.shift)+'</td>'+cells+'<td class="total-cell">'+fmt(visibleTotal)+'</td>'+(full?'<td class="total-cell">'+overall.toFixed(1)+'%</td><td>'+fmt(row.open)+'</td>':'')+'</tr>';
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
  if(["flagged","waiting","break","paused","pending","reassigned","not connected","not configured"].includes(key))type="warning";
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
function overviewTrendData(received,resolved){
  const receivedWeights=[64,82,76,94,88,108,96,115,102,120,111,129];
  const resolvedWeights=[61,78,82,91,94,99,106,110,94,116,120,127];
  return {
    labels:Array.from({length:12},(_,index)=>String(index+1).padStart(2,"0")),
    received:distribute(Math.max(0,received),receivedWeights),
    resolved:distribute(Math.max(0,resolved),resolvedWeights)
  };
}
function overviewRiskSummary(tickets){
  const open=tickets.filter(ticket=>!["Resolved","Closed"].includes(ticket.status));
  const attention=open.filter(ticket=>
    ["Unassigned","Flagged","Overdue"].includes(ticket.status)||liveSla(ticket).tone!=="good"
  ).sort((a,b)=>liveAgeMinutes(b)-liveAgeMinutes(a));
  return {
    open:open.length,
    attention,
    unassigned:open.filter(ticket=>ticket.status==="Unassigned").length,
    overdue:open.filter(ticket=>ticket.status==="Overdue").length,
    flagged:open.filter(ticket=>ticket.status==="Flagged").length,
    agedFourPlus:open.filter(ticket=>liveAgeMinutes(ticket)>=240).length,
    oldest:open.slice().sort((a,b)=>liveAgeMinutes(b)-liveAgeMinutes(a))[0]||null
  };
}
function overviewInboxSnapshot(inboxes){
  if(!inboxes.length)return '<div class="empty-state">No inboxes match the selected scope.</div>';
  return '<div class="overview-inbox-grid">'+inboxes.map(folder=>{
    const allocationRate=folder.received?folder.assigned/folder.received*100:0;
    const outstandingRate=folder.received?folder.open/folder.received*100:0;
    return '<article class="overview-inbox-card">'+
      '<div class="overview-inbox-head"><strong>'+esc(folder.name)+'</strong><span>'+esc(folder.short)+'</span></div>'+
      '<div class="overview-inbox-open"><strong>'+fmt(folder.open)+'</strong><span>outstanding</span></div>'+
      '<div class="overview-inbox-metrics"><span><small>RECEIVED</small><b>'+fmt(folder.received)+'</b></span><span><small>FIRST ASSIGNED</small><b>'+fmt(folder.assigned)+'</b></span><span><small>RESOLVED</small><b>'+fmt(folder.resolved)+'</b></span></div>'+
      '<div class="overview-inbox-track" role="img" aria-label="'+esc(folder.name)+' outstanding volume as a share of received volume"><span style="width:'+Math.min(100,outstandingRate).toFixed(1)+'%;background:'+folder.color+'"></span></div>'+
      '<div class="overview-inbox-foot"><span>'+allocationRate.toFixed(1)+'% initially allocated</span><span>'+outstandingRate.toFixed(1)+'% open / received</span></div>'+
    '</article>';
  }).join("")+'</div>';
}
function overviewRiskPanel(summary,tickets){
  const rows=(summary.attention.length?summary.attention: tickets.filter(ticket=>!["Resolved","Closed"].includes(ticket.status)).sort((a,b)=>liveAgeMinutes(b)-liveAgeMinutes(a))).slice(0,4);
  const ticketRows=rows.length?'<div class="overview-risk-list">'+rows.map(ticket=>{
    const sla=liveSla(ticket);
    return '<button class="overview-risk-ticket" type="button" data-ticket="'+esc(ticket.ref)+'">'+
      '<span class="overview-risk-ref">'+esc(ticket.ref)+'<small>'+esc(ticket.folder)+' · '+esc(ticket.brand)+'</small></span>'+
      '<span class="overview-risk-age">'+esc(ticket.age)+'</span>'+
      '<span class="sla-pill '+sla.tone+'">'+esc(sla.label)+'</span>'+
    '</button>';
  }).join("")+'</div>':'<div class="empty-state">No unresolved sample tickets in this scope.</div>';
  return '<div class="overview-risk-stats">'+
    '<div><strong>'+summary.attention.length+'</strong><span>Needs attention</span></div>'+
    '<div><strong>'+summary.unassigned+'</strong><span>Unassigned</span></div>'+
    '<div><strong>'+summary.agedFourPlus+'</strong><span>Aged 4h+</span></div>'+
  '</div>'+
  '<div class="overview-risk-caption">Static sample queue, not scaled by the reporting period. Age bands and status flags are illustrative indicators, not approved SLA thresholds. '+tickets.length+' records in selected inbox scope.</div>'+
  ticketRows;
}
function overviewTeamPanel(){
  const available=AGENTS.filter(agent=>agent.availability==="Available").length;
  const onBreak=AGENTS.filter(agent=>agent.availability==="Break").length;
  const other=AGENTS.length-available-onBreak;
  const totalOpen=AGENTS.reduce((sum,agent)=>sum+agent.open,0);
  const maxOpen=Math.max(1,...AGENTS.map(agent=>agent.open));
  const busiest=AGENTS.slice().sort((a,b)=>b.open-a.open).slice(0,5);
  return '<div class="overview-team-summary">'+
    '<div><strong>'+available+'</strong><span>Available</span></div>'+
    '<div><strong>'+onBreak+'</strong><span>On break</span></div>'+
    '<div><strong>'+fmt(totalOpen)+'</strong><span>Sample open workload</span></div>'+
  '</div>'+
  '<div class="overview-team-list">'+busiest.map(agent=>
    '<div class="overview-team-row">'+
      '<div class="overview-team-person">'+memberCell(agent.name,agent.shift+" sample shift")+'</div>'+
      '<div class="overview-team-bar"><span style="width:'+(agent.open/maxOpen*100).toFixed(1)+'%"></span></div>'+
      '<strong>'+fmt(agent.open)+'</strong>'+
    '</div>'
  ).join("")+'</div>'+
  '<p class="overview-panel-foot">'+AGENTS.length+' anonymised sample profiles · '+other+' other status · Roster figures are independent of period and inbox filters; capacity and scheduled hours are not connected.</p>';
}
function overviewAllocationSummary(rows){
  const folders=scopeFolders();
  const totalsByFolder=folders.map(folder=>{
    const fi=FOLDERS.findIndex(item=>item.id===folder.id);
    return {name:folder.name,count:rows.reduce((sum,row)=>sum+row.cells[fi],0)};
  });
  const total=totalsByFolder.reduce((sum,item)=>sum+item.count,0);
  const values=rows.map(row=>folders.reduce((sum,folder)=>sum+row.cells[FOLDERS.findIndex(item=>item.id===folder.id)],0)).filter(Number.isFinite);
  const low=values.length?Math.min(...values):0;
  const high=values.length?Math.max(...values):0;
  return '<div class="overview-allocation-summary">'+
    '<div><strong>'+fmt(total)+'</strong><span>Initial allocations in sample matrix</span></div>'+
    '<div><strong>'+fmt(low)+'–'+fmt(high)+'</strong><span>Member allocation range</span></div>'+
    '<div><strong>'+folders.length+'</strong><span>Inboxes in selected scope</span></div>'+
  '</div>'+
  '<div class="overview-allocation-bars">'+totalsByFolder.map(item=>{
    const share=total?item.count/total*100:0;
    return '<div><span>'+esc(item.name)+'</span><b>'+fmt(item.count)+'</b><i><em style="width:'+share.toFixed(1)+'%"></em></i></div>';
  }).join("")+'</div>'+
  '<p class="overview-panel-foot">Initial allocation is separate from handovers, reassignments and recoveries. Sample matrix only; no conclusion about fairness is possible without verified hours, eligibility and workload complexity.</p>';
}
function overviewIntegrationPanel(){
  return '<div class="overview-integration-list">'+
    healthRow("Outlook shared mailboxes","Not connected","warning","No mailbox messages are being read")+
    healthRow("Excel dispatch tracker","Not connected","warning","No assignment records are being read or written")+
    healthRow("Production data service","Not configured","warning","No live ticket database is connected")+
    healthRow("Authentication and roles","Not configured","warning","This public preview is not a protected production application")+
    healthRow("Demonstration dataset","Loaded","neutral","Synthetic records only · no operational side effects")+
  '</div>';
}
function renderOverview(){
  const t=totals();
  const brands=brandRows();
  const rows=allocationMatrix();
  const inboxes=folderAssignedRows().filter(folder=>state.folder==="all"||folder.id===state.folder);
  const tickets=liveBaseTickets();
  const risk=overviewRiskSummary(tickets);
  const trend=overviewTrendData(t.received,t.resolved);
  const allocationRate=t.received?t.assigned/t.received*100:0;
  const resolutionRate=t.received?t.resolved/t.received*100:0;
    pageContent.innerHTML=
    heading("MANAGEMENT COMMAND CENTRE","One operation. Four inboxes. Full visibility.","A decision-focused view of ticket flow, inbox pressure, team workload and platform readiness.",'<button class="btn btn-secondary" data-go="live">Open live operations ↗</button>')+
    '<div class="overview-demo-strip"><span class="overview-demo-label"><i></i> DEMONSTRATION DATA · READ ONLY</span><span>All figures are synthetic and illustrative</span><span>Outlook <b>Not connected</b></span><span>Excel <b>Not connected</b></span></div>'+
    kpiGrid([
      kpi("Tickets received",fmt(t.received),"Distinct tickets in selected reporting scope","▤"),
      kpi("Initially assigned",fmt(t.assigned),"Distinct tickets with a first allocation","↗"),
      kpi("Tickets resolved",fmt(t.resolved),"Recorded completed tickets in sample totals","✓"),
      kpi("Outstanding workload",fmt(t.open),"Illustrative open snapshot for selected scope","◷",null,"warning")
    ])+
    '<div class="overview-metric-strip">'+
      '<div class="overview-metric-tile"><span>INITIAL ALLOCATION RATE</span><strong>'+allocationRate.toFixed(1)+'%</strong><small>First-assigned ÷ received</small></div>'+
      '<div class="overview-metric-tile"><span>RESOLUTION RATIO</span><strong>'+resolutionRate.toFixed(1)+'%</strong><small>Resolved ÷ received · not a cohort closure rate</small></div>'+
      '<div class="overview-metric-tile"><span>NOT INITIALLY ALLOCATED</span><strong>'+fmt(t.unassigned)+'</strong><small>Received less first-assigned total</small></div>'+
      '<div class="overview-metric-tile overview-metric-na"><span>REOPENED TICKETS</span><strong>Not available</strong><small>No validated reopened field or event feed</small></div>'+
    '</div>'+
    '<div class="grid-two overview-primary-grid">'+
      panel("Ticket flow pattern","12 illustrative intervals · distributed from the selected totals",'<div class="dual-bars">'+chartPair(trend.received,trend.resolved,trend.labels)+'</div><div class="overview-chart-note">The intervals are a generated distribution of the sample totals, not timestamped daily source records.</div>',horizontalLegend([{label:"Received",color:"#ff174f"},{label:"Resolved",color:"#ff85aa"}]))+
      panel("Risk radar","A quick view of unresolved sample records",overviewRiskPanel(risk,tickets),'<button class="panel-action" data-go="live">Inspect working queue ↗</button>')+
    '</div>'+
    '<div class="section-heading overview-section-heading"><div><h2>Inbox pressure</h2><p>Received, first-assigned, resolved and outstanding sample totals. Select an inbox using the global filter above.</p></div><span class="subtle-tag">'+inboxes.length+' INBOXES IN SCOPE</span></div>'+
    overviewInboxSnapshot(inboxes)+
    '<div class="grid-two overview-secondary-grid">'+
      panel("Team coverage & workload","Anonymised roster snapshot · illustrative availability",overviewTeamPanel(),'<button class="panel-action" data-go="team">Team performance ↗</button>')+
      panel("Brand demand","Unique ticket mix by identified brand, including unclassified",brandBarList(brands),'<button class="panel-action" data-go="brands">Explore brand insights ↗</button>')+
    '</div>'+
    '<div class="grid-two overview-secondary-grid">'+
      panel("Initial allocation distribution","First assignment only · separate from handovers and recoveries",overviewAllocationSummary(rows),'<button class="panel-action" data-go="folders">Open folder share matrix ↗</button>')+
      panel("Source & platform readiness","What this preview is — and is not — connected to",overviewIntegrationPanel(),'<button class="panel-action" data-go="reliability">Reliability centre ↗</button>')+
    '</div>'+
    '<div class="overview-final-note"><strong>Management interpretation:</strong> volume and allocation ratios are synthetic sample aggregates. Reopened tickets, active handling time, approved SLA performance, live coverage and production system health require validated event data before they can be reported.</div>';
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
function ticketQueueBase(){
  const folderName=FOLDERS.find(folder=>folder.id===state.folder)?.name;
  return TICKETS.filter(ticket=>
    (!folderName||ticket.folder===folderName) &&
    activeSearch([ticket.ref,ticket.brand,ticket.folder,ticket.member,ticket.subject,ticket.status].join(" "))
  );
}
function ticketStatusMatches(ticket,filter){
  if(filter==="all")return true;
  if(filter==="unassigned")return ticket.status==="Unassigned";
  if(filter==="active")return ["Assigned","In progress","Reassigned"].includes(ticket.status);
  if(filter==="waiting")return ticket.status==="Waiting";
  if(filter==="attention")return ["Flagged","Overdue","Unassigned"].includes(ticket.status)||liveSla(ticket).tone==="warning";
  if(filter==="resolved")return ["Resolved","Closed"].includes(ticket.status);
  return true;
}
function ticketPriority(ticket){
  if(["Flagged","Overdue","Unassigned"].includes(ticket.status))return "High";
  if(ticket.status==="Waiting")return "Medium";
  return "Normal";
}
function ticketFilteredRows(){
  const query=String(state.ticketSearch||"").trim().toLowerCase();
  return ticketQueueBase().filter(ticket=>
    ticketStatusMatches(ticket,state.ticketStatus) &&
    (state.ticketBrand==="all"||ticket.brand===state.ticketBrand) &&
    (state.ticketOwner==="all"||ticket.member===state.ticketOwner) &&
    (!query||[ticket.ref,ticket.brand,ticket.folder,ticket.member,ticket.subject,ticket.status,ticket.last].join(" ").toLowerCase().includes(query))
  ).sort((a,b)=>{
    if(state.ticketSort==="newest")return liveAgeMinutes(a)-liveAgeMinutes(b);
    if(state.ticketSort==="priority"){
      const rank={High:0,Medium:1,Normal:2};
      return rank[ticketPriority(a)]-rank[ticketPriority(b)]||liveAgeMinutes(b)-liveAgeMinutes(a);
    }
    return liveAgeMinutes(b)-liveAgeMinutes(a);
  });
}
function ticketStatusCounts(base){
  const filters=["all","unassigned","active","waiting","attention","resolved"];
  return Object.fromEntries(filters.map(filter=>[filter,base.filter(ticket=>ticketStatusMatches(ticket,filter)).length]));
}
function ticketAgeingSummary(tickets){
  const open=tickets.filter(ticket=>!["Resolved","Closed"].includes(ticket.status));
  const summary={under1h:0,oneToFour:0,fourToEight:0,overEight:0,total:open.length};
  open.forEach(ticket=>{
    const minutes=liveAgeMinutes(ticket);
    if(minutes<60)summary.under1h++;
    else if(minutes<240)summary.oneToFour++;
    else if(minutes<480)summary.fourToEight++;
    else summary.overEight++;
  });
  return summary;
}
function ticketStatusSummary(tickets){
  return [
    {key:"Unassigned",label:"Unassigned",value:tickets.filter(ticket=>ticket.status==="Unassigned").length,color:"#ff174f"},
    {key:"Active",label:"Active",value:tickets.filter(ticket=>["Assigned","In progress","Reassigned"].includes(ticket.status)).length,color:"#ff5c91"},
    {key:"Waiting",label:"Waiting",value:tickets.filter(ticket=>ticket.status==="Waiting").length,color:"#ffbd68"},
    {key:"Flagged / overdue",label:"Flagged / overdue",value:tickets.filter(ticket=>["Flagged","Overdue"].includes(ticket.status)).length,color:"#c2a0ff"},
    {key:"Resolved",label:"Resolved",value:tickets.filter(ticket=>["Resolved","Closed"].includes(ticket.status)).length,color:"#76e7ce"}
  ].map(row=>({...row,share:tickets.length?row.value/tickets.length*100:0}));
}
function ticketRows(){
  return ticketFilteredRows().map(ticket=>{
    const sla=liveSla(ticket);
    return '<tr>'+
      '<td><button class="link-button ticket-ref" type="button" data-ticket="'+esc(ticket.ref)+'">'+esc(ticket.ref)+'</button><span class="ticket-subject">'+esc(ticket.subject)+'</span></td>'+
      '<td>'+esc(ticket.brand)+'</td>'+
      '<td>'+esc(ticket.folder)+'</td>'+
      '<td>'+esc(ticket.member)+'</td>'+
      '<td><strong class="ticket-age">'+esc(ticket.age)+'</strong></td>'+
      '<td><span class="ticket-priority '+ticketPriority(ticket).toLowerCase()+'">'+ticketPriority(ticket)+'</span></td>'+
      '<td>'+statusPill(ticket.status)+'</td>'+
      '<td><span class="sla-pill '+sla.tone+'">'+esc(sla.label)+'</span></td>'+
      '<td>'+esc(ticket.last)+'</td>'+
    '</tr>';
  });
}
function ticketStatusTabs(base){
  const counts=ticketStatusCounts(base);
  const labels=[["all","All records"],["unassigned","Unassigned"],["active","Active"],["waiting","Waiting"],["attention","Needs attention"],["resolved","Resolved"]];
  return '<div class="ticket-status-tabs" role="group" aria-label="Filter ticket status">'+labels.map(([key,label])=>
    '<button type="button" class="live-status-tab '+(state.ticketStatus===key?"active":"")+'" data-ticket-status="'+key+'" aria-pressed="'+(state.ticketStatus===key)+'">'+label+' <b>'+counts[key]+'</b></button>'
  ).join("")+'</div>';
}
function ticketAgeingPanel(summary){
  const rows=[
    {label:"Under 1 hour",value:summary.under1h,color:"#76e7ce"},
    {label:"1–4 hours",value:summary.oneToFour,color:"#ffbd68"},
    {label:"4–8 hours",value:summary.fourToEight,color:"#ff5c91"},
    {label:"Over 8 hours",value:summary.overEight,color:"#c2a0ff"}
  ];
  return '<div class="ticket-ageing-summary"><strong>'+summary.total+'</strong><span>unresolved records in the visible sample queue</span></div>'+
    barRows(rows)+
    '<p class="ticket-panel-foot">Bands are calculated from the sample age strings. They are not a contractual SLA measure and are not extrapolated to the aggregate ticket totals.</p>';
}
function ticketLifecycleLedger(t){
  const rate=t.received?t.assigned/t.received*100:0;
  const resolution=t.received?t.resolved/t.received*100:0;
  const rows=[
    ["Received",t.received,"Distinct tickets in selected aggregate scope","100%"],
    ["First assigned",t.assigned,"Distinct tickets with an initial allocation",rate.toFixed(1)+"% of received"],
    ["Resolved",t.resolved,"Recorded completed tickets in sample aggregates",resolution.toFixed(1)+"% of received"],
    ["Outstanding",t.open,"Current open-work snapshot; not a remaining cohort count","Snapshot"],
    ["Not initially assigned",t.unassigned,"Received less initially assigned aggregate","Derived gap"]
  ];
  return '<div class="ticket-ledger">'+rows.map((row,index)=>
    '<div class="ticket-ledger-row '+(index===0?"primary":"")+'"><div><strong>'+row[0]+'</strong><small>'+row[2]+'</small></div><b>'+fmt(row[1])+'</b><span>'+row[3]+'</span></div>'
  ).join("")+'</div>'+
  '<p class="ticket-panel-foot">The open-work snapshot and historical flow totals are separate measures. Do not subtract the snapshot from received volume to infer cohort closure.</p>';
}
function ticketTelemetryCard(title,reason){
  return '<article class="metric-panel ticket-metric-unavailable"><span>'+title+'</span><strong>Not available</strong><p>'+reason+'</p><small>Requires validated event-level timestamps</small></article>';
}
function renderTickets(){
  const t=totals();
  const base=ticketQueueBase();
  const rows=ticketRows();
  const brands=brandRows();
  const ageing=ticketAgeingSummary(base);
  const statuses=ticketStatusSummary(base);
  const owners=[...new Set(TICKETS.map(ticket=>ticket.member))].sort();
  const brandOptions=[...new Set(TICKETS.map(ticket=>ticket.brand))].sort();
  const trend=overviewTrendData(t.received,t.resolved);
  pageContent.innerHTML=
    heading("TICKET FLOW INTELLIGENCE","Investigate ticket movement, not just totals.","Explore aggregate ticket flow, analyse the demonstration queue and identify where validated lifecycle evidence is still missing.",'<button class="btn btn-secondary" data-action="export-tickets">↓ Export visible records</button>')+
    '<div class="ticket-demo-strip"><span><i></i> DEMONSTRATION DATA · READ ONLY</span><span>Aggregate totals are synthetic</span><span>Explorer contains '+base.length+' static sample records in the selected inbox/global search scope</span><span>Outlook / Excel <b>Not connected</b></span></div>'+
    kpiGrid([
      kpi("Tickets received",fmt(t.received),"Distinct tickets in the selected reporting scope","▤"),
      kpi("Initially assigned",fmt(t.assigned),"Distinct tickets with a first allocation","↗"),
      kpi("Tickets resolved",fmt(t.resolved),"Recorded completed tickets in sample aggregates","✓"),
      kpi("Outstanding workload",fmt(t.open),"Current aggregate open-work snapshot","◷",null,"warning")
    ])+
    '<div class="ticket-rate-strip">'+
      '<div><span>INITIAL ALLOCATION RATE</span><strong>'+(t.received?(t.assigned/t.received*100).toFixed(1):"0.0")+'%</strong><small>First-assigned ÷ received</small></div>'+
      '<div><span>RESOLUTION RATIO</span><strong>'+(t.received?(t.resolved/t.received*100).toFixed(1):"0.0")+'%</strong><small>Resolved ÷ received · not a cohort closure rate</small></div>'+
      '<div><span>NOT INITIALLY ASSIGNED</span><strong>'+fmt(t.unassigned)+'</strong><small>Received less first-assigned total</small></div>'+
      '<div><span>REOPENED</span><strong>Not available</strong><small>No validated reopened field or event feed</small></div>'+
    '</div>'+
    '<div class="grid-two ticket-analytics-primary">'+
      panel("Received versus resolved","12 illustrative intervals distributed from selected aggregate totals",'<div class="dual-bars">'+chartPair(trend.received,trend.resolved,trend.labels)+'</div><div class="ticket-chart-note">This is a generated distribution of synthetic totals, not a timestamped daily or weekly source trend.</div>',horizontalLegend([{label:"Received",color:"#ff174f"},{label:"Resolved",color:"#ff85aa"}]))+
      panel("Lifecycle ledger","Distinct ticket counts and current-state snapshot",ticketLifecycleLedger(t),'<span class="subtle-tag">AGGREGATE VIEW</span>')+
    '</div>'+
    '<div class="grid-two ticket-analytics-secondary">'+
      panel("Queue status mix","Status composition of the static demonstration records in this inbox scope",barRows(statuses),'<span class="subtle-tag">'+base.length+' SAMPLE RECORDS</span>')+
      panel("Open-ticket ageing","Age distribution within the unresolved sample queue",ticketAgeingPanel(ageing),'<span class="subtle-tag">SAMPLE QUEUE ONLY</span>')+
    '</div>'+
    '<div class="section-heading ticket-section-heading"><div><h2>Resolution & response telemetry</h2><p>These metrics require explicit event timestamps; the prototype does not estimate them from ticket age.</p></div><span class="subtle-tag">AWAITING EVENT DATA</span></div>'+
    '<div class="ticket-telemetry-grid">'+
      ticketTelemetryCard("Assignment delay","Receipt to first-assignment timestamp is not connected.")+
      ticketTelemetryCard("First response","First agent response timestamp is not available in the sample records.")+
      ticketTelemetryCard("Elapsed resolution","Receipt to resolution timestamps are not available.")+
      ticketTelemetryCard("Active handling time","Requires explicit start, pause, resume and stop events.")+
    '</div>'+
    '<div class="grid-two ticket-analytics-secondary">'+
      panel("Brand demand","Unique tickets by identified brand, including Other / unclassified",brandBarList(brands),'<button class="panel-action" data-go="brands">Explore brand insights ↗</button>')+
      panel("Metric interpretation","Definitions that keep volume and handling measures separate",'<div class="ticket-definition-list">'+
        '<div><strong>Received / resolved</strong><span>Distinct ticket totals, not event counts.</span></div>'+
        '<div><strong>Initial allocation</strong><span>First assignment only; later handovers and recoveries do not add to this count.</span></div>'+
        '<div><strong>Outstanding</strong><span>Current open-work snapshot, not a historical cohort balance.</span></div>'+
        '<div><strong>Ageing</strong><span>Current sample ticket age, not active handling time.</span></div>'+
      '</div>','<span class="subtle-tag">DATA RULES</span>')+
    '</div>'+
    '<section class="panel ticket-explorer-panel">'+
      '<div class="panel-heading"><div><h2 class="panel-title">Ticket explorer</h2><p class="panel-subtitle">Search and inspect individual synthetic records. Selecting a row opens its read-only sample timeline.</p></div><span class="subtle-tag">READ ONLY</span></div>'+
      ticketStatusTabs(base)+
      '<div class="ticket-filter-toolbar">'+
        '<label class="live-queue-search"><span>⌕</span><input type="search" data-ticket-search value="'+esc(state.ticketSearch)+'" placeholder="Search reference, subject, owner…" autocomplete="off" aria-label="Search ticket explorer"></label>'+
        '<label><span class="live-filter-label">BRAND</span><select class="live-select" data-ticket-filter="ticketBrand"><option value="all">All brands</option>'+brandOptions.map(name=>'<option value="'+esc(name)+'" '+(state.ticketBrand===name?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label>'+
        '<label><span class="live-filter-label">OWNER</span><select class="live-select" data-ticket-filter="ticketOwner"><option value="all">All owners</option>'+owners.map(name=>'<option value="'+esc(name)+'" '+(state.ticketOwner===name?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label>'+
        '<label><span class="live-filter-label">SORT</span><select class="live-select" data-ticket-filter="ticketSort"><option value="oldest" '+(state.ticketSort==="oldest"?"selected":"")+'>Oldest first</option><option value="newest" '+(state.ticketSort==="newest"?"selected":"")+'>Newest first</option><option value="priority" '+(state.ticketSort==="priority"?"selected":"")+'>Priority first</option></select></label>'+
      '</div>'+
      '<div class="live-queue-meta"><span id="ticketQueueCount">Showing '+rows.length+' of '+base.length+' sample records</span><button type="button" class="text-action" data-action="reset-ticket-filters">Reset explorer filters</button></div>'+
      '<div id="ticketExplorerRows">'+dataTable(["Reference / subject","Brand","Inbox","Owner","Age","Priority","Status","SLA preview","Last sample event"],rows)+'</div>'+
    '</section>'+
    '<div class="ticket-final-note"><strong>Important:</strong> all figures and ticket records on this screen are synthetic. Sample SLA previews use illustrative age/status rules and are not approved service targets. No live ticket history, event timing, mailbox or workbook data is connected.</div>';
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
  const manual=workflowEvent("manual");
  const handover=workflowEvent("handover");
  const recovery=workflowEvent("recovery");
  pageContent.innerHTML=heading("WORKFLOW ANALYTICS","Understand how work moves","Separate ticket-level ratios from event counts so handovers, flags, manual interventions, recoveries and reassignments are not double-counted.")+
    kpiGrid([
      kpi("Automatic allocation","1,064","89.5% of assigned tickets","↗"),
      kpi("Manual assignment events",fmt(manual.events),fmt(manual.uniqueTickets)+" unique tickets affected","✎"),
      kpi("Handover events",fmt(handover.events),fmt(handover.uniqueTickets)+" unique tickets affected","⇄"),
      kpi("Recovery events",fmt(recovery.events),fmt(recovery.uniqueTickets)+" unique tickets affected","↺")
    ])+
    '<div class="grid-two">'+
      panel("Assignment method mix","Share of distinct assigned tickets",donutChart([{label:"Automatic",value:89.5,color:"#ff5c91"},{label:"Manual",value:4.6,color:"#ffbd68"},{label:"Other / pending",value:5.9,color:"#a7a3a0"}]),'<span class="subtle-tag">INITIAL ASSIGNMENT</span>')+
      panel("Workflow events","Recorded event volume in the sample",barRows(WORKFLOW_EVENT_SUMMARY.map(event=>({label:event.label,value:event.events,color:event.color}))),'<span class="subtle-tag">TEAM-LEVEL AGGREGATES</span>')+
    '</div>'+
    panel("Metric definitions","Unique tickets affected and event volume are separate measures",dataTable(["Metric","Unique tickets affected","Events recorded","Rate / interpretation"],WORKFLOW_EVENT_SUMMARY.map(event=>'<tr><td>'+event.label+'</td><td>'+fmt(event.uniqueTickets)+'</td><td>'+fmt(event.events)+'</td><td>'+event.rate+' of assigned / handled tickets</td></tr>')))+
    '<div class="prototype-warning"><strong>Counting rule.</strong> A ticket with three handovers counts once in the unique-ticket measure and three times in the event count. Events can affect the same ticket more than once; never add event counts to distinct ticket totals.</div>';
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
function teamProfileRows(){
  const matrix=allocationMatrix();
  const folders=scopeFolders();
  return AGENTS.map(agent=>{
    const allocation=matrix.find(row=>row.id===agent.id);
    const firstAssignedByFolder=allocation?allocation.cells.slice():FOLDERS.map(()=>0);
    const firstAssigned=folders.reduce((sum,folder)=>sum+firstAssignedByFolder[FOLDERS.findIndex(item=>item.id===folder.id)],0);
    return {...agent,firstAssignedByFolder,firstAssigned};
  });
}
function teamWorkloadPanel(rows){
  if(!rows.length)return '<div class="empty-state">No anonymised profiles match the current search.</div>';
  const ordered=rows.slice().sort((a,b)=>b.open-a.open||a.name.localeCompare(b.name));
  const maximum=Math.max(1,...ordered.map(agent=>agent.open));
  return '<div class="team-workload-list">'+ordered.map(agent=>
    '<div class="team-workload-row"><div class="team-workload-person">'+memberCell(agent.name,agent.shift+' shift group')+'</div><div class="team-workload-track"><span style="width:'+(agent.open/maximum*100).toFixed(1)+'%"></span></div><strong>'+fmt(agent.open)+'</strong></div>'
  ).join("")+'</div>'+
  '<p class="team-panel-note">Open counts are a static current-workload sample. They are not period-scaled, inbox-scoped or adjusted for scheduled hours, eligibility or ticket complexity.</p>';
}
function teamEventLedger(){
  return '<div class="team-event-ledger">'+
    dataTable(["Event type","Events recorded","Unique tickets affected","Interpretation"],WORKFLOW_EVENT_SUMMARY.map(event=>
      '<tr><td>'+event.label+'</td><td class="total-cell">'+fmt(event.events)+'</td><td>'+fmt(event.uniqueTickets)+'</td><td>'+event.rate+' · sample ratio only</td></tr>'
    ))+
    '<p class="team-panel-note">These are team-level synthetic aggregates, not member-attributed event histories and not time-scoped. One ticket may generate multiple events; event counts must never be added to distinct ticket counts or initial allocations.</p>'+
  '</div>';
}
function teamEvidencePanel(){
  const items=[
    ["First response","Not available","Requires a validated first-response timestamp."],
    ["Elapsed resolution","Not available","Requires received and resolved timestamps."],
    ["Active handling time","Not available","Requires explicit start, pause, resume and stop events."],
    ["Reopened rate","Not available","Requires a validated reopen field or event history."],
    ["Hours-adjusted comparison","Not available","Requires approved scheduled hours, shift coverage and eligibility history."]
  ];
  return '<div class="team-evidence-list">'+items.map(item=>
    '<div><span>'+item[0]+'</span><strong>'+item[1]+'</strong><small>'+item[2]+'</small></div>'
  ).join("")+'</div>';
}
function renderTeam(){
  const matrix=allocationMatrix();
  const profiles=teamProfileRows().filter(agent=>activeSearch(agent.name));
  const folders=scopeFolders();
  const firstAssigned=folders.reduce((sum,folder)=>sum+scaled(folder.assigned),0);
  const openWorkload=AGENTS.reduce((sum,agent)=>sum+agent.open,0);
  pageContent.innerHTML=heading("TEAM PERFORMANCE INTELLIGENCE","See the work clearly. Compare it fairly.","Separate first assignments, current open workload and workflow events — then add performance measures only when their source evidence exists.",'<button class="btn btn-secondary" data-action="export-team">↓ Export team snapshot</button>')+
    '<div class="team-demo-strip"><span><i></i> DEMONSTRATION DATA · READ ONLY</span><span>All 14 profiles are anonymised sample records</span><span>Outlook / Excel <b>Not connected</b></span></div>'+
    kpiGrid([
      kpi("Agent profiles in view",String(profiles.length),"Anonymised sample profiles · global search applies","♧"),
      kpi("First assignments",fmt(firstAssigned),"Distinct tickets first assigned · selected period and inbox","↗"),
      kpi("Current open workload",fmt(openWorkload),"All-profile sample snapshot · not period or inbox scoped","◷"),
      kpi("Workflow event types",String(WORKFLOW_EVENT_SUMMARY.length),"Team-level aggregates shown separately below","⇄")
    ])+
    '<div class="team-scope-note"><strong>How to read this screen:</strong> the period and inbox filters change first-assignment counts. Open workload is a separate current-state sample. Workflow events are team-level aggregate counts with no event dates or per-member attribution. None of these sample figures is a real colleague performance assessment.</div>'+
    '<div class="section-heading team-section-heading"><div><h2>Member snapshot</h2><p>Initial allocations within the selected scope and current open-work sample for each anonymised profile.</p></div><span class="subtle-tag">NO PERFORMANCE RANKING</span></div>'+
    (profiles.length?'<div class="team-profile-grid">'+profiles.map(agent=>
      '<button class="team-profile-card '+(state.selectedAgent===agent.id?'selected':'')+'" data-agent="'+agent.id+'" type="button" aria-pressed="'+(state.selectedAgent===agent.id)+'">'+
        '<div class="team-profile-head">'+memberCell(agent.name,agent.shift+' shift group')+'<span class="team-profile-chevron">↗</span></div>'+
        '<div class="team-profile-metrics"><div><strong>'+fmt(agent.open)+'</strong><span>OPEN WORKLOAD</span></div><div><strong>'+fmt(agent.firstAssigned)+'</strong><span>FIRST ASSIGNED</span></div></div>'+
        '<div class="team-profile-foot">Open profile · sample data only</div>'+
      '</button>'
    ).join("")+'</div>':'<div class="empty-state">No team members match the global search.</div>')+
    (state.selectedAgent?agentDetail(state.selectedAgent):'')+
    '<div class="grid-two team-overview-grid">'+
      panel("Current open-work distribution","Current-state sample by member · independent of period and inbox filters",teamWorkloadPanel(profiles),'<span class="subtle-tag">SNAPSHOT</span>')+
      panel("First assignments by inbox","Distinct tickets first assigned in the selected reporting scope",barRows(folders.map(folder=>({label:folder.name,value:scaled(folder.assigned),color:folder.color}))),'<span class="subtle-tag">FIRST ASSIGNMENTS</span>')+
    '</div>'+
    panel("Member allocation matrix","Count and first-assignment share by inbox",'<p class="team-panel-note">Each share uses all first-assigned tickets in that inbox as its denominator. Searching for members filters visible rows but does not change the denominator. Open work remains a separate snapshot.</p>'+shareMatrix(matrix,true,matrix),'<span class="subtle-tag">INITIAL ASSIGNMENT ONLY</span>')+
    '<div class="grid-two team-secondary-grid">'+
      panel("Team-level workflow event ledger","Events and unique tickets affected · separate from initial allocation",teamEventLedger(),'<span class="subtle-tag">NOT MEMBER-ATTRIBUTED</span>')+
      panel("Performance measures awaiting evidence","Timing, quality and capacity measures are deliberately withheld until validated sources exist",teamEvidencePanel(),'<span class="subtle-tag">NOT AVAILABLE</span>')+
    '</div>';
}
function agentDetail(id){
  const agent=AGENTS.find(item=>item.id===id);
  if(!agent)return "";
  const allocation=allocationMatrix().find(row=>row.id===id);
  if(!allocation)return "";
  const folders=scopeFolders();
  const firstAssigned=folders.reduce((sum,folder)=>sum+allocation.cells[FOLDERS.findIndex(item=>item.id===folder.id)],0);
  return '<section class="panel team-agent-detail"><div class="panel-heading"><div><div class="eyebrow">ANONYMISED MEMBER BREAKDOWN</div><h2 class="panel-title">'+agent.name+' · '+agent.shift+' shift group</h2><p class="panel-subtitle">Synthetic sample only. This is a workload and allocation breakdown, not an individual performance rating.</p></div><button class="panel-action" data-action="close-agent">Close profile</button></div>'+
    '<div class="team-detail-metrics"><div><span>First assignments · selected scope</span><strong>'+fmt(firstAssigned)+'</strong></div><div><span>Current open workload</span><strong>'+fmt(agent.open)+'</strong></div><div><span>Shift group</span><strong>'+agent.shift+'</strong><small>Indicative roster label; scheduled hours are not verified.</small></div></div>'+
    '<div class="grid-two"><div><h3 class="mini-heading">First assignments by inbox</h3>'+barRows(folders.map(folder=>({label:folder.name,value:allocation.cells[FOLDERS.findIndex(item=>item.id===folder.id)],color:folder.color})))+'</div><div class="team-private-state"><strong>Individual workflow events · Not available</strong><p>Handover, reassignment, recovery and flag events are not attributed to individual profiles in this sample. The aggregate event ledger is shown separately and must not be distributed across members.</p></div></div>'+
    '</section>';
}
function duration(minutes){return Math.floor(minutes/60)+"h "+String(minutes%60).padStart(2,"0")+"m";}
function renderMy(){
  pageContent.innerHTML=heading("PRIVATE PERFORMANCE","Your personal view is not enabled yet","Individual reporting will appear only after secure sign-in and server-enforced access permissions are in place.")+
    '<div class="team-private-state my-private-state"><span class="eyebrow">ACCESS NOT CONFIGURED</span><h2>Personal records are protected by design.</h2><p>This public demonstration does not identify the signed-in agent, expose a sample colleague profile or infer whose tickets belong to you.</p><strong>Authentication and individual permissions · Not configured</strong></div>'+
    panel("Personal access readiness","The private workspace remains unavailable until every control is verified",'<div class="health-list">'+
      healthRow("Authentication","Not configured","warning","No user identity or secure session is connected")+
      healthRow("Agent-to-record permissions","Not configured","warning","No server-side ownership checks are available")+
      healthRow("Personal event history","Not connected","warning","No individual ticket or event records are available")+
      healthRow("Approved performance measures","Not available","neutral","No validated response, resolution, handling-time or quality feed exists")+
    '</div>')+
    '<div class="prototype-warning"><strong>Privacy safeguard.</strong> This page will show only the authenticated agent’s own records after server-side authorisation is implemented. Hiding another colleague’s data in the browser is not sufficient protection.</div>';
}
function rosterClockMinutes(value){
  const match=String(value||"").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match?Number(match[1])*60+Number(match[2]):null;
}
function rosterClockLabel(minutes){
  const hours=Math.floor(minutes/60),mins=minutes%60;
  return String(hours).padStart(2,"0")+":"+String(mins).padStart(2,"0");
}
function coverageSegments(agents){
  const scheduled=agents.map(agent=>({
    agent,
    start:rosterClockMinutes(agent.start),
    end:rosterClockMinutes(agent.end)
  })).filter(item=>item.start!==null&&item.end!==null&&item.end>item.start);
  const boundaries=[...new Set(scheduled.flatMap(item=>[item.start,item.end]))].sort((a,b)=>a-b);
  const segments=[];
  for(let index=0;index<boundaries.length-1;index++){
    const start=boundaries[index],end=boundaries[index+1];
    const onShift=scheduled.filter(item=>item.start<=start&&item.end>=end).map(item=>item.agent);
    const early=onShift.filter(agent=>agent.shift==="Early").length;
    const late=onShift.filter(agent=>agent.shift==="Late").length;
    const label=onShift.length===0?"No sample shift coverage":early>0&&late>0?"Cross-shift overlap":early>0?"Early shift only":late>0?"Late shift only":"Other shift coverage";
    segments.push({start,end,early,late,headcount:onShift.length,label,duration:end-start});
  }
  return segments;
}
function rosterShiftSummary(agents){
  return ["Early","Late"].map(shift=>{
    const members=agents.filter(agent=>agent.shift===shift);
    const windows=members.map(agent=>({start:rosterClockMinutes(agent.start),end:rosterClockMinutes(agent.end)}))
      .filter(window=>window.start!==null&&window.end!==null);
    return {
      shift,
      count:members.length,
      start:windows.length?Math.min(...windows.map(window=>window.start)):null,
      end:windows.length?Math.max(...windows.map(window=>window.end)):null
    };
  });
}
function rosterFilteredAgents(){
  const query=String(state.rosterSearch||"").trim().toLowerCase();
  return AGENTS.filter(agent=>
    (!state.search||activeSearch(agent.name))&&
    (!query||[agent.name,agent.shift,agent.start,agent.end,agent.availability].join(" ").toLowerCase().includes(query))&&
    (state.rosterShift==="all"||agent.shift===state.rosterShift)&&
    (state.rosterAvailability==="all"||agent.availability===state.rosterAvailability)
  );
}
function rosterEligibilityCells(agent){
  return FOLDERS.map(folder=>{
    const eligible=(agent.eligibleFolders||[]).includes(folder.id);
    return '<td>'+statusPill(eligible?"Eligible":"Not eligible")+'</td>';
  }).join("");
}
function rosterDirectoryRows(agents){
  return dataTable(["Member","Shift group","Indicative shift window · Egypt local","Availability sample","Agency","Detags","Transfers","Unadopts"],agents.map(agent=>
    '<tr class="'+(state.selectedRosterAgent===agent.id?"selected-roster-row":"")+'">'+
      '<td><button type="button" class="roster-member-button" data-roster-agent="'+agent.id+'" aria-pressed="'+(state.selectedRosterAgent===agent.id)+'">'+memberCell(agent.name,agent.shift+" group")+'</button></td>'+
      '<td>'+statusPill(agent.shift)+'</td>'+
      '<td class="roster-time-cell">'+agent.start+'–'+agent.end+'</td>'+
      '<td>'+statusPill(agent.availability)+'</td>'+
      rosterEligibilityCells(agent)+
    '</tr>'
  ),"No sample profiles match these filters.");
}
function rosterCoveragePanel(){
  const segments=coverageSegments(AGENTS);
  if(!segments.length)return '<div class="empty-state">No valid sample shift windows are configured.</div>';
  const first=segments[0].start,last=segments[segments.length-1].end;
  const totalDuration=Math.max(1,last-first);
  const overlapMinutes=segments.filter(segment=>segment.early>0&&segment.late>0).reduce((sum,segment)=>sum+segment.duration,0);
  const breaks=AGENTS.filter(agent=>agent.availability==="Break").length;
  const gaps=segments.filter(segment=>segment.headcount===0).length;
  return '<div class="roster-coverage-summary">'+
    '<div><span>ILLUSTRATIVE WINDOW</span><strong>'+rosterClockLabel(first)+'–'+rosterClockLabel(last)+'</strong></div>'+
    '<div><span>CROSS-SHIFT OVERLAP</span><strong>'+Math.floor(overlapMinutes/60)+'h '+String(overlapMinutes%60).padStart(2,"0")+'m</strong></div>'+
    '<div><span>UNSTAFFED SAMPLE INTERVALS</span><strong>'+gaps+' intervals</strong></div>'+
  '</div>'+
  '<div class="roster-coverage-track" role="img" aria-label="Illustrative sample shift coverage. '+segments.map(segment=>rosterClockLabel(segment.start)+" to "+rosterClockLabel(segment.end)+": "+segment.headcount+" profiles").join("; ")+'.">'+
    segments.map(segment=>{
      const width=segment.duration/totalDuration*100;
      const kind=segment.headcount===0?"gap":segment.early>0&&segment.late>0?"overlap":segment.early>0?"early":segment.late>0?"late":"other";
      return '<div class="roster-coverage-segment '+kind+'" style="width:'+width.toFixed(2)+'%"><strong>'+segment.headcount+'</strong><small>'+Math.round(width)+'%</small></div>';
    }).join("")+
  '</div>'+
  '<div class="roster-coverage-legend">'+segments.map(segment=>
    '<div><span class="roster-coverage-dot '+(segment.headcount===0?"gap":segment.early>0&&segment.late>0?"overlap":segment.early>0?"early":segment.late>0?"late":"other")+'"></span><strong>'+segment.label+'</strong><span>'+rosterClockLabel(segment.start)+'–'+rosterClockLabel(segment.end)+'</span><b>'+segment.headcount+' profiles</b></div>'
  ).join("")+'</div>'+
  '<p class="roster-panel-note">Headcount is derived from placeholder shift windows only. '+breaks+' break snapshots have no timestamp, so they are not deducted from coverage. Empty intervals are shown as gaps, but no staffing target exists to assess sufficiency.</p>';
}
function rosterReadinessPanel(){
  return '<div class="health-list">'+
    healthRow("Approved fortnightly roster","Not connected","warning","No approved rota source is loaded")+
    healthRow("Minimum staffing targets","Not configured","warning","No required headcount by time or inbox has been approved")+
    healthRow("Inbox eligibility source","Illustrative only","neutral","The sample model marks all profiles eligible for all four inboxes")+
    healthRow("Availability timestamps","Not connected","warning","Break and availability states cannot be placed on a live timeline")+
    healthRow("Shift timezone","Egypt local sample","neutral","UK mailbox timestamps remain a separate timezone")+
  '</div>';
}
function rosterAgentDetail(id){
  const agent=AGENTS.find(item=>item.id===id);
  if(!agent)return "";
  const eligible=FOLDERS.filter(folder=>(agent.eligibleFolders||[]).includes(folder.id));
  return '<section class="panel roster-agent-detail"><div class="panel-heading"><div><div class="eyebrow">ANONYMISED ROSTER PROFILE</div><h2 class="panel-title">'+agent.name+' · '+agent.shift+' group</h2><p class="panel-subtitle">Illustrative roster profile. No real colleague record or approved shift is loaded.</p></div><button type="button" class="panel-action" data-action="close-roster-agent">Close profile</button></div>'+
    '<div class="roster-agent-metrics"><div><span>Indicative shift window</span><strong>'+agent.start+'–'+agent.end+'</strong><small>Egypt local · unapproved sample</small></div><div><span>Availability sample</span><strong>'+agent.availability+'</strong><small>No timestamp or live status feed</small></div><div><span>Inbox eligibility</span><strong>'+eligible.length+' / '+FOLDERS.length+'</strong><small>All four inboxes in the sample policy</small></div></div>'+
    '<div class="roster-agent-eligibility"><strong>Eligible inboxes</strong>'+eligible.map(folder=>'<span>'+folder.name+'</span>').join("")+'</div>'+
    '<p class="roster-panel-note">Changing a shift, break, eligibility or rota requires authenticated permissions, a validated preview and a confirmed write to the source of truth. This preview cannot change roster records.</p>'+
    '</section>';
}
function renderRoster(){
  const profiles=rosterFilteredAgents();
  if(state.selectedRosterAgent&&!profiles.some(agent=>agent.id===state.selectedRosterAgent))state.selectedRosterAgent=null;
  const shifts=rosterShiftSummary(profiles);
  const early=shifts.find(item=>item.shift==="Early");
  const late=shifts.find(item=>item.shift==="Late");
  const eligibilityPairs=profiles.reduce((sum,agent)=>sum+(agent.eligibleFolders||[]).length,0);
  const totalPairs=profiles.length*FOLDERS.length;
  const breaks=profiles.filter(agent=>agent.availability==="Break").length;
  const available=profiles.filter(agent=>agent.availability==="Available").length;
  const overlapMinutes=coverageSegments(AGENTS).filter(segment=>segment.early>0&&segment.late>0).reduce((sum,segment)=>sum+segment.duration,0);
  const overlapLabel=Math.floor(overlapMinutes/60)+"h "+String(overlapMinutes%60).padStart(2,"0")+"m";
  pageContent.innerHTML=
    heading("ROSTER & COVERAGE INTELLIGENCE","Know who is planned — and where shifts overlap.","Explore anonymised shift groups, inbox eligibility and derived sample coverage without presenting placeholder hours as an approved rota.",'<button class="btn btn-secondary" data-action="export-roster">↓ Export roster & coverage</button>')+
    '<div class="roster-demo-strip"><span><i></i> DEMONSTRATION DATA · READ ONLY</span><span>Shift windows are illustrative</span><span>Approved fortnightly rota <b>Not connected</b></span><span>Availability feed <b>Not connected</b></span></div>'+
    kpiGrid([
      kpi("Profiles in view",String(profiles.length),"Anonymised sample profiles · filters apply","♧"),
      kpi("Early shift group",String(early.count),"Indicative window "+(early.start===null?"—":rosterClockLabel(early.start)+"–"+rosterClockLabel(early.end)),"☼"),
      kpi("Late shift group",String(late.count),"Indicative window "+(late.start===null?"—":rosterClockLabel(late.start)+"–"+rosterClockLabel(late.end)),"☾"),
      kpi("Cross-shift overlap",overlapLabel,"Derived from all sample shift windows · not live coverage","⇄")
    ])+
    '<div class="roster-scope-note"><strong>Interpretation:</strong> shift windows are sample Egypt-local placeholders, not confirmed scheduled hours. UK mailbox time is separate. Availability values have no timestamps, so break states are not deducted from the coverage timeline. No minimum staffing requirement or coverage target is configured.</div>'+
    '<div class="grid-two roster-primary-grid">'+
      panel("Shift overlap map","Headcount is calculated from the sample start and end times",rosterCoveragePanel(),'<span class="subtle-tag">ILLUSTRATIVE WINDOWS</span>')+
      panel("Roster data readiness","What still needs a trusted source before operational use",rosterReadinessPanel(),'<span class="subtle-tag">NOT CONNECTED</span>')+
    '</div>'+
    '<div class="section-heading roster-section-heading"><div><h2>Roster directory & inbox eligibility</h2><p>Search and filter anonymised profiles. Select a member to inspect the sample shift and eligible inboxes.</p></div><span class="subtle-tag">NO LIVE EDITING</span></div>'+
    '<section class="panel roster-directory-panel">'+
      '<div class="roster-filter-toolbar">'+
        '<label class="live-queue-search"><span>⌕</span><input type="search" data-roster-search value="'+esc(state.rosterSearch)+'" placeholder="Search member or shift…" autocomplete="off" aria-label="Search roster"></label>'+
        '<label><span class="live-filter-label">SHIFT GROUP</span><select class="live-select" data-roster-filter="rosterShift"><option value="all">All shifts</option><option value="Early" '+(state.rosterShift==="Early"?"selected":"")+'>Early</option><option value="Late" '+(state.rosterShift==="Late"?"selected":"")+'>Late</option></select></label>'+
        '<label><span class="live-filter-label">AVAILABILITY SNAPSHOT</span><select class="live-select" data-roster-filter="rosterAvailability"><option value="all">All states</option><option value="Available" '+(state.rosterAvailability==="Available"?"selected":"")+'>Available</option><option value="Break" '+(state.rosterAvailability==="Break"?"selected":"")+'>Break</option></select></label>'+
      '</div>'+
      '<div class="live-queue-meta"><span id="rosterDirectoryCount">Showing '+profiles.length+' of '+AGENTS.length+' sample profiles · '+available+' available snapshots · '+breaks+' break snapshots</span><button type="button" class="text-action" data-action="reset-roster-filters">Reset filters</button></div>'+
      '<div id="rosterDirectoryRows">'+rosterDirectoryRows(profiles)+'</div>'+
    '</section>'+
    '<div id="rosterAgentDetail">'+(state.selectedRosterAgent?rosterAgentDetail(state.selectedRosterAgent):'')+'</div>'+
    '<div class="grid-two roster-secondary-grid">'+
      panel("Inbox eligibility matrix","Four-inbox sample policy; no per-agent exclusions configured",dataTable(["Inbox","Eligible profiles","Total profiles","Policy state"],FOLDERS.map(folder=>{
        const count=profiles.filter(agent=>(agent.eligibleFolders||[]).includes(folder.id)).length;
        return '<tr><td>'+folder.name+'</td><td class="total-cell">'+count+'</td><td>'+profiles.length+'</td><td>'+statusPill("Illustrative")+'</td></tr>';
      })),'<span class="subtle-tag">'+eligibilityPairs+' / '+totalPairs+' ELIGIBLE PAIRS IN VIEW</span>')+
      panel("Coverage guardrails","Checks that cannot be completed without approved operational rules",'<div class="roster-guardrail-list">'+
        '<div><strong>Scheduled hours</strong>'+statusPill("Unverified")+'<small>Sample windows only</small></div>'+
        '<div><strong>Minimum headcount by interval</strong>'+statusPill("Not configured")+'<small>No target to compare against</small></div>'+
        '<div><strong>Break and absence cover</strong>'+statusPill("Not connected")+'<small>No timestamped availability feed</small></div>'+
        '<div><strong>Fortnightly rotation</strong>'+statusPill("Not connected")+'<small>No approved Week A / Week B source</small></div>'+
      '</div>','<span class="subtle-tag">NO FALSE GAP ALERTS</span>')+
    '</div>'+
    '<div class="roster-final-note"><strong>Before this becomes operational:</strong> load the approved fortnightly rota, define minimum cover by time and inbox, connect timestamped availability, validate inbox eligibility and add authenticated preview/approval/write controls. This screen does not change the Outlook dispatcher or Excel tracker.</div>';
}
function configurationPreviewRows(folderId,weightPct){
  const folder=FOLDERS.find(item=>item.id===folderId);
  if(!folder)return [];
  const eligible=AGENTS.filter(agent=>(agent.eligibleFolders||[]).includes(folderId));
  if(!eligible.length)return [];
  const loads=eligible.map(agent=>Number(agent.open)||0);
  const lowest=Math.min(...loads);
  const highest=Math.max(...loads);
  const spread=highest-lowest;
  const weight=Math.max(0,Math.min(100,Number(weightPct)||0))/100;
  return eligible.map(agent=>({
    id:agent.id,
    name:agent.name,
    shift:agent.shift,
    open:Number(agent.open)||0,
    score:spread===0?100:100-(((Number(agent.open)||0)-lowest)/spread)*weight*100
  })).sort((a,b)=>b.score-a.score||a.open-b.open||a.name.localeCompare(b.name));
}
function configurationPreviewResults(){
  const folder=FOLDERS.find(item=>item.id===state.configPreviewFolder)||FOLDERS[0];
  const rows=configurationPreviewRows(folder.id,state.configPreviewWeight);
  return '<div class="config-preview-summary"><div><span>Inbox scope</span><strong>'+esc(folder.name)+'</strong></div><div><span>Eligible sample profiles</span><strong>'+rows.length+' / '+AGENTS.length+'</strong></div><div><span>Open-work influence</span><strong>'+state.configPreviewWeight+'%</strong></div></div>'+
    '<div class="config-preview-list">'+rows.slice(0,6).map((agent,index)=>'<div class="config-preview-row"><span class="config-preview-rank">'+String(index+1).padStart(2,"0")+'</span><div class="config-preview-member"><strong>'+esc(agent.name)+'</strong><small>'+esc(agent.shift)+' shift · '+agent.open+' open sample tickets</small></div><div class="config-preview-score"><div class="config-score-track"><span style="width:'+agent.score.toFixed(1)+'%"></span></div><strong>'+agent.score.toFixed(0)+' pts</strong></div></div>').join("")+'</div>'+
    '<div class="config-preview-footnote">Priority order only. This uses the global, synthetic open-work snapshot and the sample inbox-eligibility list. It does not inspect timestamped availability, create an assignment, or predict a live dispatch outcome.</div>';
}
function configRuleCard(title,summary,proposal,dependency,scope){
  return '<article class="config-rule-card"><div class="config-rule-top"><span class="config-rule-symbol">⌘</span>'+statusPill("Not configured")+'</div><h3>'+title+'</h3><p>'+summary+'</p><div class="config-rule-detail"><span>Proposed design</span><strong>'+proposal+'</strong></div><div class="config-rule-detail"><span>Required source / control</span><strong>'+dependency+'</strong></div><div class="config-rule-foot"><span>'+scope+'</span><span>DESIGN PROPOSAL</span></div></article>';
}
function renderRules(){
  const eligibility=FOLDERS.map(folder=>{
    const count=AGENTS.filter(agent=>(agent.eligibleFolders||[]).includes(folder.id)).length;
    return '<div class="config-routing-row"><div><strong>'+esc(folder.name)+'</strong><small>'+folder.id.toUpperCase()+'</small></div><strong>'+count+' / '+AGENTS.length+'</strong><span>'+statusPill("Illustrative")+'</span></div>';
  }).join("");
  pageContent.innerHTML=heading("DISPATCH CONFIGURATION 2.0","Design the rules before they go live.","A manager workspace for fairness, workload weighting, inbox eligibility, recovery safeguards and controlled change governance. Everything here is a design proposal, not an active dispatcher setting.",'<button class="btn btn-secondary" data-action="rules-preview">Review scenario</button><button class="btn btn-primary" data-action="export-config">↓ Export rule proposal</button>')+
    '<div class="config-demo-strip"><span><i></i> DESIGN PREVIEW · READ ONLY</span><span>Configuration state <b>Not configured</b></span><span>Outlook / Excel <b>Not connected</b></span><span>Apply permissions <b>Unavailable</b></span></div>'+
    '<div class="config-status-grid">'+
      '<article><span>GLOBAL ALLOCATION MODEL</span><strong>Not configured</strong><small>One cross-inbox policy is proposed</small></article>'+
      '<article><span>APPROVED ROSTER</span><strong>Not connected</strong><small>Egypt-local schedule source required</small></article>'+
      '<article><span>AVAILABILITY GATE</span><strong>Not connected</strong><small>Timestamped break and absence feed required</small></article>'+
      '<article><span>WRITE / AUDIT PATH</span><strong>Unavailable</strong><small>No backend or persistent audit service</small></article>'+
    '</div>'+
    '<div class="config-section-heading"><div><h2>Proposed dispatch policy</h2><p>Six control areas. None is currently enabled or connected.</p></div><span class="subtle-tag">ALL NOT CONFIGURED</span></div>'+
    '<div class="config-rule-grid">'+
      configRuleCard("Global allocation model","Use one fairness view across all four shared inboxes, rather than resetting fairness inside each folder.","Shared eligible-agent pool with a single cross-inbox workload view.","Stable ticket identity and a common allocation ledger.","CROSS-INBOX FAIRNESS")+
      configRuleCard("Workload weighting","Use current open workload as a balancing input, separate from historical first-assignment share.","Configurable open-work influence; proposed starting point 50%.","Trusted current-state snapshot with a defined refresh time.","CURRENT OPEN WORK")+
      configRuleCard("Shift and availability eligibility","Only consider people whose approved Egypt-local shift is active and whose timestamped status permits work.","Approved rota plus timestamped Available / Break / Leave state.","Fortnightly roster, timezone-aware boundaries and availability events.","ELIGIBILITY GATE")+
      configRuleCard("Four-inbox routing matrix","Apply explicit eligibility for Agency Detags, Detags, Transfers and Unadopts before scoring candidates.","Inbox-specific allow-list; no implicit routing across folders.","Manager-approved member-to-inbox mapping and mailbox boundary checks.","ROUTING CONTROL")+
      configRuleCard("Recovery behaviour","Preserve ownership during interrupted workflows and avoid silent reassignment on recovery.","Restore the original owner when still valid; otherwise hold for review.","Durable assignment record, recovery queue and idempotent retry key.","OWNERSHIP SAFETY")+
      configRuleCard("Assignment safeguards","Prevent duplicate allocations, conflicting concurrent writes and unverified success states.","Idempotency key, atomic claim / version check, retry policy and append-only audit.","Server-side dispatcher, transaction-capable store and verified write response.","EXECUTION SAFETY")+
    '</div>'+
    '<div class="grid-two config-mid-grid">'+
      panel("Four-inbox eligibility baseline","The sample directory currently marks every anonymised profile as eligible for each inbox. This is illustrative only.",'<div class="config-routing-list">'+eligibility+'</div><div class="config-inline-note">Do not treat this matrix as approved production access. Eligibility must come from a manager-owned, versioned source and be revalidated when a ticket is dispatched.</div>','<span class="subtle-tag">SAMPLE BASELINE · 14 PROFILES</span>')+
      panel("Time and workload boundaries","Keep unlike measures separate so the fairness model cannot quietly become a performance score.",'<div class="config-principle-list"><div><strong>UK mailbox time</strong><span>Received and event timestamps stay in the UK source timezone.</span></div><div><strong>Egypt-local shifts</strong><span>Roster windows use explicit timezone-aware dates and daylight-saving rules.</span></div><div><strong>Initial allocations</strong><span>Distinct first assignments remain a historical distribution measure.</span></div><div><strong>Open workload</strong><span>A current snapshot is a separate balancing input, never an assignment-history total.</span></div><div><strong>Availability</strong><span>Untimestamped snapshots cannot prove someone is currently available.</span></div></div>','<span class="subtle-tag">METRIC GUARDRAILS</span>')+
    '</div>'+
    panel("Safe scenario preview","Explore how sample open workload would influence candidate priority for one inbox. This is a local calculation, not a routing test.",'<div id="configPreviewPanel" class="config-preview-workspace"><div class="config-preview-controls"><label><span>INBOX SCOPE</span><select class="live-select" data-config-scenario="folder">'+FOLDERS.map(folder=>'<option value="'+folder.id+'" '+(state.configPreviewFolder===folder.id?"selected":"")+'>'+esc(folder.name)+'</option>').join("")+'</select></label><label class="config-weight-control"><span>OPEN-WORK INFLUENCE <strong id="configWeightValue">'+state.configPreviewWeight+'%</strong></span><input type="range" min="0" max="100" step="10" value="'+state.configPreviewWeight+'" data-config-scenario="weight" aria-label="Open-work influence percentage"><small>0% = equal priority · 100% = strongest influence from the sample open-work snapshot</small></label><button class="text-action" data-action="reset-config-preview">Reset scenario</button></div><div id="configPreviewResults">'+configurationPreviewResults()+'</div></div>','<span class="subtle-tag">LOCAL PREVIEW ONLY</span>')+
    '<div class="config-section-heading"><div><h2>Change governance and release gates</h2><p>A configuration change must be reviewed, verified and auditable before it can affect allocation.</p></div><span class="subtle-tag">NO APPLY ACTION</span></div>'+
    '<section class="panel config-governance-panel"><div class="config-lifecycle">'+
      '<div><b>01</b><strong>Draft</strong><small>Proposal can be documented locally</small><em>DESIGN ONLY</em></div><i>→</i>'+
      '<div><b>02</b><strong>Validate</strong><small>Coverage, conflicts and eligibility</small><em>BLOCKED · SOURCES MISSING</em></div><i>→</i>'+
      '<div><b>03</b><strong>Approve</strong><small>Authorised manager and version review</small><em>BLOCKED · AUTH MISSING</em></div><i>→</i>'+
      '<div><b>04</b><strong>Apply</strong><small>Backend-confirmed configuration write</small><em>BLOCKED · NO BACKEND</em></div><i>→</i>'+
      '<div><b>05</b><strong>Audit</strong><small>Immutable before / after record</small><em>NOT CONFIGURED</em></div>'+
    '</div></section>'+
    '<div class="grid-two config-mid-grid">'+
      panel("Production readiness checklist","Required before any proposed rule can be activated.",'<div class="config-gate-list"><div><span>01</span><strong>Approved roster and Week A / Week B rotation</strong>'+statusPill("Not connected")+'</div><div><span>02</span><strong>Timestamped availability and absence feed</strong>'+statusPill("Not connected")+'</div><div><span>03</span><strong>Verified inbox eligibility and manager owner</strong>'+statusPill("Not configured")+'</div><div><span>04</span><strong>Persistent ticket identity and allocation ledger</strong>'+statusPill("Not configured")+'</div><div><span>05</span><strong>Authenticated roles and approval policy</strong>'+statusPill("Not configured")+'</div><div><span>06</span><strong>Atomic writes, idempotency and audit persistence</strong>'+statusPill("Not configured")+'</div></div>')+
      panel("Configuration safety contract","The demo will not claim that a requested operation succeeded.",'<div class="config-principle-list"><div><strong>Preview is not approval</strong><span>A local scenario never saves or changes the proposed rule set.</span></div><div><strong>Approval is not execution</strong><span>Only a backend-confirmed write can move a change to Applied.</span></div><div><strong>Failure stays visible</strong><span>Timeouts and write errors must remain exceptions, never green success states.</span></div><div><strong>History is append-only</strong><span>Every approved change records actor, reason, version, before / after values and outcome.</span></div></div>')+
    '</div>'+
    '<div class="config-final-note"><strong>Operational boundary:</strong> this screen does not update Outlook rules, the existing Excel tracker, live roster eligibility or the current dispatcher. The sample scenario and exported proposal are planning aids only. Production activation requires a private authenticated application, server-enforced permissions, approved source data, a protected write service and persistent audit history.</div>';
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
      panel("Reliability trend","Simulated exceptions over the last 12 intervals",smallChart([3,2,4,1,2,1,3,2,1,0,1,0],["01","02","03","04","05","06","07","08","09","10","11","12"],"#ffbd68"),'<span class="subtle-tag">SAMPLE EVENTS</span>')+
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
  const rows=ticketFilteredRows();
  csvDownload("dispatcher-sample-tickets-filtered.csv",[
    ["Reference","Brand","Folder","Member","Subject","Age","Priority","Status","SLA preview","Last sample event"],
    ...rows.map(ticket=>[ticket.ref,ticket.brand,ticket.folder,ticket.member,ticket.subject,ticket.age,ticketPriority(ticket),ticket.status,liveSla(ticket).label,ticket.last])
  ]);
}
function exportBrands(){
  csvDownload("dispatcher-sample-brand-mix.csv",[["Brand","Tickets"],...brandRows().map(b=>[b.name,scaled(b.value)])]);
}
function exportFolders(){
  const rows=allocationMatrix(),folders=scopeFolders();
  csvDownload("dispatcher-sample-folder-share.csv",[["Member",...folders.flatMap(f=>[f.name+" assigned",f.name+" share"]), "Total"],...rows.map(r=>[r.name,...folders.flatMap(f=>{const fi=FOLDERS.findIndex(x=>x.id===f.id);const total=rows.reduce((s,x)=>s+x.cells[fi],0);return [r.cells[fi],(r.cells[fi]/Math.max(1,total)*100).toFixed(1)+"%"]; }),r.total])]);
}
function exportTeam(){
  const profiles=teamProfileRows().filter(agent=>activeSearch(agent.name));
  const folders=scopeFolders();
  const rows=[
    ["TEAM PERFORMANCE — DEMONSTRATION DATA ONLY"],
    ["Reporting period",PERIODS[state.period].label],
    ["Inbox",scopeName()],
    ["All records are synthetic; event counts are team-level aggregates and are not attributed to members."],
    [],
    ["Member","Shift group (illustrative)",...folders.map(folder=>folder.name+" first assigned"),"First assignments in scope","Current open-work snapshot"],
    ...profiles.map(agent=>[
      agent.name,agent.shift,...folders.map(folder=>agent.firstAssignedByFolder[FOLDERS.findIndex(item=>item.id===folder.id)]),
      agent.firstAssigned,agent.open
    ]),
    [],
    ["TEAM-LEVEL WORKFLOW EVENTS — NOT MEMBER-ATTRIBUTED OR TIME-SCOPED"],
    ["Event type","Events recorded","Unique tickets affected","Sample rate"],
    ...WORKFLOW_EVENT_SUMMARY.map(event=>[event.label,event.events,event.uniqueTickets,event.rate])
  ];
  csvDownload("dispatcher-sample-team-performance.csv",rows);
}
function exportConfiguration(){
  const rows=[
    ["DISPATCH CONFIGURATION 2.0 — DESIGN PROPOSAL ONLY"],
    ["Status","Not configured. No rules are active and no settings are persisted."],
    ["Scope","All four shared inboxes; cross-inbox fairness proposal."],
    ["Scenario inbox",FOLDERS.find(folder=>folder.id===state.configPreviewFolder)?.name||"Agency Detags"],
    ["Scenario open-work influence",state.configPreviewWeight+"%"],
    ["Scenario method","Relative priority score from synthetic global open-work snapshots; no assignments created."],
    [],
    ["Control area","Proposed design","Required source / control","Status"],
    ["Global allocation model","Shared eligible-agent pool across all four inboxes","Stable ticket identity and common allocation ledger","Not configured"],
    ["Workload weighting","Configurable current open-work influence; illustrative default 50%","Timestamped current-state snapshot","Not configured"],
    ["Shift and availability eligibility","Approved Egypt-local rota plus timestamped availability","Fortnightly roster and timezone-aware availability events","Not connected"],
    ["Four-inbox routing","Explicit eligibility allow-list per inbox","Manager-owned versioned eligibility matrix","Not configured"],
    ["Recovery behaviour","Restore original owner if valid; otherwise hold for review","Durable assignment record and idempotent recovery queue","Not configured"],
    ["Assignment safeguards","Idempotency, atomic claim/version checks and append-only audit","Server-side write service and persistent transaction store","Not configured"],
    [],
    ["Release gate","Current state"],
    ["Draft","Design proposal only"],
    ["Validate","Blocked — source data not connected"],
    ["Approve","Blocked — authentication and approval workflow missing"],
    ["Apply","Blocked — no backend write path"],
    ["Audit","Not configured — no persistent audit store"]
  ];
  csvDownload("dispatcher-sample-dispatch-configuration-proposal.csv",rows);
}
function exportRoster(){
  const agents=rosterFilteredAgents();
  const segments=coverageSegments(AGENTS);
  const rows=[
    ["ROSTER & COVERAGE — DEMONSTRATION DATA ONLY"],
    ["Note","Shift windows are illustrative Egypt-local placeholders, not approved scheduled hours."],
    ["Note","Availability snapshots have no timestamps and are not deducted from coverage."],
    [],
    ["Member","Shift group","Indicative start (Egypt local)","Indicative end (Egypt local)","Availability snapshot","Agency Detags eligible","Detags eligible","Transfers eligible","Unadopts eligible"],
    ...agents.map(agent=>[
      agent.name,agent.shift,agent.start,agent.end,agent.availability,
      ...FOLDERS.map(folder=>(agent.eligibleFolders||[]).includes(folder.id)?"Yes":"No")
    ]),
    [],
    ["ILLUSTRATIVE COVERAGE SEGMENTS — DERIVED FROM SAMPLE WINDOWS"],
    ["Start","End","Early profiles","Late profiles","Total sample headcount","Segment"],
    ...segments.map(segment=>[
      rosterClockLabel(segment.start),rosterClockLabel(segment.end),segment.early,segment.late,segment.headcount,segment.label
    ]),
    [],
    ["Unconfigured controls","Approved rota source","Minimum staffing targets","Timestamped availability","Authenticated roster writes"]
  ];
  csvDownload("dispatcher-sample-roster-coverage.csv",rows);
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
  if(action==="reset-ticket-filters"){state.ticketStatus="all";state.ticketBrand="all";state.ticketOwner="all";state.ticketSort="oldest";state.ticketSearch="";render();return;}
  if(action==="toggle-dispatch"){state.paused=!state.paused;showToast(state.paused?"Demo dispatch state set to paused. No live system affected.":"Demo dispatch state resumed. No live system affected.");render();return;}
  if(action==="export-tickets"){exportTickets();return;}
  if(action==="export-brands"){exportBrands();return;}
  if(action==="export-folders"){exportFolders();return;}
  if(action==="export-team"){exportTeam();return;}
  if(action==="export-roster"){exportRoster();return;}
  if(action==="export-audit"){exportAudit();return;}
  if(action==="export-summary"){exportSummary();return;}
  if(action==="close-agent"){state.selectedAgent=null;render();return;}
  if(action==="close-roster-agent"){state.selectedRosterAgent=null;render();return;}
  if(action==="reset-roster-filters"){state.rosterSearch="";state.rosterShift="all";state.rosterAvailability="all";state.selectedRosterAgent=null;render();return;}
  if(action==="rules-preview"){const target=document.getElementById("configPreviewPanel");if(target)target.scrollIntoView({behavior:"smooth",block:"center"});return;}
  if(action==="reset-config-preview"){state.configPreviewFolder="agency";state.configPreviewWeight=50;renderRules();showToast("Local scenario reset. No dispatch settings were changed.");return;}
  if(action==="export-config"){exportConfiguration();return;}
  if(action==="config-preview"){showToast("Administration is not configured. No settings were changed.");return;}
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.view)));
document.getElementById("periodSelect").addEventListener("change",e=>{state.period=e.target.value;render();});
document.getElementById("folderSelect").addEventListener("change",e=>{state.folder=e.target.value;render();});
document.getElementById("globalSearch").addEventListener("input",e=>{state.search=e.target.value;render();});
document.getElementById("profileButton").addEventListener("click",()=>showToast("Profile and sign-in will be added with the authentication stage."));
document.addEventListener("change",event=>{
  const ticketFilter=event.target.closest("[data-ticket-filter]");
  if(ticketFilter){
    const key=ticketFilter.dataset.ticketFilter;
    if(["ticketBrand","ticketOwner","ticketSort"].includes(key)){state[key]=ticketFilter.value;render();}
  }
  const filter=event.target.closest("[data-live-filter]");
  if(filter){
    const key=filter.dataset.liveFilter;
    if(["liveOwner","liveBrand","liveSort"].includes(key)){state[key]=filter.value;render();}
  }
  const rosterFilter=event.target.closest("[data-roster-filter]");
  if(rosterFilter){
    const key=rosterFilter.dataset.rosterFilter;
    if(["rosterShift","rosterAvailability"].includes(key)){state[key]=rosterFilter.value;renderRoster();}
  }
  const configFolder=event.target.closest('[data-config-scenario="folder"]');
  if(configFolder){state.configPreviewFolder=configFolder.value;renderRules();}
});
document.addEventListener("input",event=>{
  const configWeight=event.target.closest('[data-config-scenario="weight"]');
  if(configWeight){
    state.configPreviewWeight=Math.max(0,Math.min(100,Number(configWeight.value)||0));
    const value=document.getElementById("configWeightValue");
    const results=document.getElementById("configPreviewResults");
    if(value)value.textContent=state.configPreviewWeight+"%";
    if(results)results.innerHTML=configurationPreviewResults();
    return;
  }
  const ticketSearch=event.target.closest("[data-ticket-search]");
  if(ticketSearch){
    state.ticketSearch=ticketSearch.value;
    const rows=document.getElementById("ticketExplorerRows");
    const count=document.getElementById("ticketQueueCount");
    const base=ticketQueueBase(),filtered=ticketFilteredRows();
    if(rows)rows.innerHTML=dataTable(["Reference / subject","Brand","Inbox","Owner","Age","Priority","Status","SLA preview","Last sample event"],ticketRows());
    if(count)count.textContent="Showing "+filtered.length+" of "+base.length+" sample records";
  }
  const search=event.target.closest("[data-live-search]");
  if(search){
    state.liveSearch=search.value;
    const rows=document.getElementById("liveQueueRows");
    const count=document.getElementById("liveQueueCount");
    if(rows)rows.innerHTML=liveQueueRows();
    if(count)count.textContent="Showing "+liveFilteredTickets().length+" of "+liveBaseTickets().length+" sample tickets";
  }
  const rosterSearch=event.target.closest("[data-roster-search]");
  if(rosterSearch){
    state.rosterSearch=rosterSearch.value;
    const profiles=rosterFilteredAgents();
    const rows=document.getElementById("rosterDirectoryRows");
    const count=document.getElementById("rosterDirectoryCount");
    if(state.selectedRosterAgent&&!profiles.some(agent=>agent.id===state.selectedRosterAgent))state.selectedRosterAgent=null;
    if(rows)rows.innerHTML=rosterDirectoryRows(profiles);
    if(count)count.textContent="Showing "+profiles.length+" of "+AGENTS.length+" sample profiles";
    const detail=document.getElementById("rosterAgentDetail");
    if(detail)detail.innerHTML=state.selectedRosterAgent?rosterAgentDetail(state.selectedRosterAgent):"";
  }
});
document.addEventListener("click",event=>{
  const action=event.target.closest("[data-action]");
  const go=event.target.closest("[data-go]");
  const ticket=event.target.closest("[data-ticket]");
  const agent=event.target.closest("[data-agent]");
  const rosterAgent=event.target.closest("[data-roster-agent]");
  const liveStatus=event.target.closest("[data-live-status]");
  const ticketStatus=event.target.closest("[data-ticket-status]");
  const liveFolder=event.target.closest("[data-live-folder]");
  if(action)handleAction(action.dataset.action);
  if(go)navigate(go.dataset.go);
  if(ticket)openTicket(ticket.dataset.ticket);
  if(ticketStatus){state.ticketStatus=ticketStatus.dataset.ticketStatus;render();}
  if(liveStatus){state.liveStatus=liveStatus.dataset.liveStatus;render();}
  if(liveFolder){state.folder=liveFolder.dataset.liveFolder;document.getElementById("folderSelect").value=state.folder;render();}
  if(agent){state.selectedAgent=agent.dataset.agent;render();}
  if(rosterAgent){state.selectedRosterAgent=rosterAgent.dataset.rosterAgent;renderRoster();}
  if(event.target.closest("[data-modal-close]"))closeModal();
});
document.addEventListener("keydown",event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();document.getElementById("globalSearch").focus();
  }
  if(event.key==="Escape")closeModal();
});
render();
