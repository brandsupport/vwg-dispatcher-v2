/* VWG Dispatch Intelligence — complete UI foundation.
 * All records are synthetic. This prototype has no live data or operational integration.
 * Dispatch Configuration 2.0 remains a local planning surface with no operational write path.
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
function workflowSummaryRows(){
  if(!state.importedSnapshot)return WORKFLOW_EVENT_SUMMARY;
  const definitions=[
    {id:"handover",label:"Handover",codes:["handover"],color:"#ff5c91"},
    {id:"flag",label:"Flagged",codes:["flagged"],color:"#ffbd68"},
    {id:"manual",label:"Manual assignment",codes:["manual_assignment"],color:"#c2a0ff"},
    {id:"recovery",label:"Recovery",codes:["recovery_requested","recovery_held","recovery_restored"],color:"#76e7ce"},
    {id:"reassignment",label:"Reassignment",codes:["reassigned"],color:"#f1846f"}
  ];
  return definitions.map(definition=>{
    const matches=state.importedSnapshot.workflow.filter(row=>
      definition.codes.includes(row.event_type)&&(state.folder==="all"||row.inbox_code===state.folder)
    );
    return {...definition,events:matches.reduce((sum,row)=>sum+row.event_count,0),
      uniqueTickets:matches.reduce((sum,row)=>sum+row.distinct_tickets,0),rate:"Not available"};
  });
}
function workflowEvent(id){
  return workflowSummaryRows().find(event=>event.id===id)||{events:0,uniqueTickets:0};
}
const PERIODS = {
  today:{label:"Today",factor:.055,days:1},
  week:{label:"Last 7 days",factor:.235,days:7},
  month:{label:"Last 30 days",factor:1,days:30},
  quarter:{label:"Last 90 days",factor:2.72,days:90},
  snapshot:{label:"Snapshot",factor:1,days:null}
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
const AUDIT_LEDGER = [
  {
    id:"AUD-20261123-020",occurredAt:"2026-11-23 10:42:18 UK",category:"Recovery",event:"Recovery review opened",
    actor:"Agent 03",role:"Operations manager",entity:"Ticket DSP-10482",folder:"detags",ticket:"DSP-10482",correlation:"CORR-DSP-10482",
    outcome:"Held for review",reason:"The interrupted workflow needs a fresh comparison of the mailbox category and tracker row before ownership can be confirmed.",
    approver:"Not recorded",approval:"Pending review — sample",before:{owner:"Agent 02",assignmentState:"Assigned"},after:{owner:"Agent 02",assignmentState:"Hold for reconciliation"},
    source:"Sample recovery review queue",evidence:"Original owner is retained in the example. Current mailbox and tracker state are not available in this prototype."
  },
  {
    id:"AUD-20261123-019",occurredAt:"2026-11-23 10:40:52 UK",category:"Recovery",event:"Recovery request submitted",
    actor:"Agent 03",role:"Operations manager",entity:"Ticket DSP-10482",folder:"detags",ticket:"DSP-10482",correlation:"CORR-DSP-10482",
    outcome:"Submitted (sample)",reason:"A review was requested after an interrupted assignment workflow was identified.",
    approver:"Not recorded",approval:"Awaiting review — sample",before:{recoveryState:"Not requested",originalOwner:"Agent 02"},after:{recoveryState:"Review requested",originalOwner:"Agent 02"},
    source:"Sample recovery queue",evidence:"Illustrative request reference REC-SAMPLE-10482-02. No live recovery request was created."
  },
  {
    id:"AUD-20261123-018",occurredAt:"2026-11-23 10:38:12 UK",category:"Exception",event:"Tracker write outcome unknown",
    actor:"Sample tracker adapter",role:"Service identity (sample)",entity:"Ticket DSP-10482",folder:"detags",ticket:"DSP-10482",correlation:"CORR-DSP-10482",
    outcome:"Unknown outcome",reason:"The illustrative write attempt timed out without a confirmed acknowledgement. A timeout does not prove that the underlying write failed.",
    approver:"Not applicable",approval:"Not applicable",before:{trackerWrite:"Pending",acknowledgement:"Awaiting response"},after:{trackerWrite:"Outcome unknown",acknowledgement:"Not received"},
    source:"Synthetic exception record",evidence:"Sample response: timeout · acknowledgement unavailable · reconcile canonical mailbox and tracker state before another attempt."
  },
  {
    id:"AUD-20261123-017",occurredAt:"2026-11-23 10:36:04 UK",category:"Assignment",event:"Initial assignment recorded",
    actor:"Sample dispatcher",role:"Automation (sample)",entity:"Ticket DSP-10482",folder:"detags",ticket:"DSP-10482",correlation:"CORR-DSP-10482",
    outcome:"Recorded (sample)",reason:"Illustrative first allocation using the sample eligibility and workload snapshot.",
    approver:"Not applicable",approval:"Not required in this example",before:{owner:"Unassigned",assignmentState:"Received"},after:{owner:"Agent 02",assignmentState:"Assigned"},
    source:"Synthetic dispatch event",evidence:"Assignment reference ASSIGN-SAMPLE-10482-01. No Outlook category or Excel row was written."
  },
  {
    id:"AUD-20261123-016",occurredAt:"2026-11-23 10:31:42 UK",category:"Ticket lifecycle",event:"Ticket received",
    actor:"Sample mailbox adapter",role:"Service identity (sample)",entity:"Ticket DSP-10482",folder:"detags",ticket:"DSP-10482",correlation:"CORR-DSP-10482",
    outcome:"Recorded (sample)",reason:"A synthetic inbound ticket was added to the demonstration lifecycle.",
    approver:"Not applicable",approval:"Not applicable",before:{ticketState:"Not present"},after:{ticketState:"Received",inbox:"Detags"},
    source:"Synthetic ticket event",evidence:"Generated reference only. No live shared mailbox was read."
  },
  {
    id:"AUD-20261123-015",occurredAt:"2026-11-23 10:21:55 UK",category:"Governance",event:"Ticket flagged for supervisor attention",
    actor:"Agent 04",role:"Agent (sample)",entity:"Ticket DSP-10481",folder:"agency",ticket:"DSP-10481",correlation:"CORR-DSP-10481",
    outcome:"Recorded (sample)",reason:"The example record requires a second review of the agency approval evidence.",
    approver:"Agent 01",approval:"Supervisor review requested — sample",before:{flag:"Not flagged",reason:"—"},after:{flag:"Flagged",reason:"Approval evidence review"},
    source:"Synthetic workflow event",evidence:"Sample flag note. This does not represent a real colleague action."
  },
  {
    id:"AUD-20261123-014",occurredAt:"2026-11-23 10:18:07 UK",category:"Handover",event:"Ticket handed over",
    actor:"Agent 11 → Agent 06",role:"Agents (sample)",entity:"Ticket DSP-10481",folder:"agency",ticket:"DSP-10481",correlation:"CORR-DSP-10481",
    outcome:"Recorded (sample)",reason:"Illustrative handover after a shift boundary; the event is separate from the original allocation count.",
    approver:"Not recorded",approval:"No approval captured in this example",before:{owner:"Agent 11",workState:"In progress"},after:{owner:"Agent 06",workState:"In progress"},
    source:"Synthetic handover event",evidence:"Handover reference HANDOVER-SAMPLE-10481-01. No live assignment category was changed."
  },
  {
    id:"AUD-20261123-013",occurredAt:"2026-11-23 10:12:31 UK",category:"Assignment",event:"Initial assignment recorded",
    actor:"Sample dispatcher",role:"Automation (sample)",entity:"Ticket DSP-10481",folder:"agency",ticket:"DSP-10481",correlation:"CORR-DSP-10481",
    outcome:"Recorded (sample)",reason:"Illustrative first allocation to an eligible sample agent.",
    approver:"Not applicable",approval:"Not required in this example",before:{owner:"Unassigned",assignmentState:"Received"},after:{owner:"Agent 11",assignmentState:"Assigned"},
    source:"Synthetic dispatch event",evidence:"Assignment reference ASSIGN-SAMPLE-10481-01."
  },
  {
    id:"AUD-20261123-012",occurredAt:"2026-11-23 10:08:14 UK",category:"Ticket lifecycle",event:"Ticket received",
    actor:"Sample mailbox adapter",role:"Service identity (sample)",entity:"Ticket DSP-10481",folder:"agency",ticket:"DSP-10481",correlation:"CORR-DSP-10481",
    outcome:"Recorded (sample)",reason:"A synthetic inbound agency request entered the demonstration queue.",
    approver:"Not applicable",approval:"Not applicable",before:{ticketState:"Not present"},after:{ticketState:"Received",inbox:"Agency Detags"},
    source:"Synthetic ticket event",evidence:"Generated reference only. No live mailbox event was ingested."
  },
  {
    id:"AUD-20261123-011",occurredAt:"2026-11-23 10:02:44 UK",category:"Exception",event:"Duplicate delivery reviewed",
    actor:"Sample event processor",role:"Service identity (sample)",entity:"Ticket DSP-10480",folder:"transfers",ticket:"DSP-10480",correlation:"CORR-DSP-10480",
    outcome:"Suppressed (sample)",reason:"The repeated delivery matched the example event identity already associated with this ticket.",
    approver:"Not applicable",approval:"Not applicable",before:{deliveryCount:"1 observed",canonicalEvent:"EVT-SAMPLE-10480"},after:{deliveryCount:"2 observed",canonicalEvent:"EVT-SAMPLE-10480",duplicate:"Suppressed (sample)"},
    source:"Synthetic deduplication event",evidence:"Both delivery observations are represented in the sample record. No production side effect was inspected."
  },
  {
    id:"AUD-20261123-010",occurredAt:"2026-11-23 09:58:07 UK",category:"Assignment",event:"Initial assignment recorded",
    actor:"Sample dispatcher",role:"Automation (sample)",entity:"Ticket DSP-10480",folder:"transfers",ticket:"DSP-10480",correlation:"CORR-DSP-10480",
    outcome:"Recorded (sample)",reason:"Illustrative first allocation from the synthetic Transfers queue.",
    approver:"Not applicable",approval:"Not required in this example",before:{owner:"Unassigned",assignmentState:"Received"},after:{owner:"Agent 08",assignmentState:"Assigned"},
    source:"Synthetic dispatch event",evidence:"Assignment reference ASSIGN-SAMPLE-10480-01."
  },
  {
    id:"AUD-20261123-009",occurredAt:"2026-11-23 09:54:26 UK",category:"Ticket lifecycle",event:"Ticket received",
    actor:"Sample mailbox adapter",role:"Service identity (sample)",entity:"Ticket DSP-10480",folder:"transfers",ticket:"DSP-10480",correlation:"CORR-DSP-10480",
    outcome:"Recorded (sample)",reason:"A synthetic transfer request entered the demonstration queue.",
    approver:"Not applicable",approval:"Not applicable",before:{ticketState:"Not present"},after:{ticketState:"Received",inbox:"Transfers"},
    source:"Synthetic ticket event",evidence:"Generated reference only. No live shared mailbox was read."
  },
  {
    id:"AUD-20261123-008",occurredAt:"2026-11-23 09:48:19 UK",category:"Governance",event:"Manual assignment approval recorded",
    actor:"Agent 01",role:"Operations manager",entity:"Ticket DSP-10479",folder:"unadopts",ticket:"DSP-10479",correlation:"CORR-DSP-10479",
    outcome:"Approved (sample)",reason:"The example manual assignment includes a recorded business reason and a second-person review.",
    approver:"Agent 01",approval:"Approved in sample record",before:{approval:"Pending",requestedOwner:"Agent 08"},after:{approval:"Approved (sample)",requestedOwner:"Agent 08"},
    source:"Synthetic approval event",evidence:"Approval reference APPROVAL-SAMPLE-10479-01. No production approval was issued."
  },
  {
    id:"AUD-20261123-007",occurredAt:"2026-11-23 09:45:06 UK",category:"Assignment",event:"Manual assignment requested",
    actor:"Agent 08",role:"Agent (sample)",entity:"Ticket DSP-10479",folder:"unadopts",ticket:"DSP-10479",correlation:"CORR-DSP-10479",
    outcome:"Awaiting approval (sample)",reason:"A manual allocation was requested with a reason; the example requires manager review.",
    approver:"Agent 01",approval:"Pending — sample",before:{owner:"Unassigned",requestState:"None"},after:{owner:"Agent 08",requestState:"Awaiting approval"},
    source:"Synthetic manual-action event",evidence:"Request reference MANUAL-SAMPLE-10479-01. No mailbox or tracker change was made."
  },
  {
    id:"AUD-20261123-006",occurredAt:"2026-11-23 09:43:51 UK",category:"Exception",event:"Stale assignment request blocked",
    actor:"Sample assignment writer",role:"Service identity (sample)",entity:"Ticket DSP-10479",folder:"unadopts",ticket:"DSP-10479",correlation:"CORR-DSP-10479",
    outcome:"Blocked (sample)",reason:"The sample source version was older than the current record version, so the illustrative request was rejected.",
    approver:"Not applicable",approval:"Not applicable",before:{sourceVersion:"8",currentVersion:"9",writeState:"Not started"},after:{sourceVersion:"8",currentVersion:"9",writeState:"Blocked (sample)"},
    source:"Synthetic integrity-guard event",evidence:"Version mismatch example only. It does not prove that a live writer has this protection."
  },
  {
    id:"AUD-20261123-005",occurredAt:"2026-11-23 09:35:20 UK",category:"Configuration",event:"Allocation policy draft saved",
    actor:"Agent 01",role:"Operations manager",entity:"Global allocation policy v2",folder:"",ticket:"",correlation:"CORR-CFG-ALLOC-02",
    outcome:"Draft saved (sample)",reason:"A proposed increase in the illustrative open-work influence was saved for review.",
    approver:"Agent 02",approval:"Pending — sample",before:{openWorkInfluence:"50%",policyVersion:"Draft 1"},after:{openWorkInfluence:"60%",policyVersion:"Draft 2"},
    source:"Synthetic configuration history",evidence:"Proposal reference CFG-SAMPLE-ALLOC-02. The public prototype cannot persist or apply configuration."
  },
  {
    id:"AUD-20261123-004",occurredAt:"2026-11-23 09:32:11 UK",category:"Configuration",event:"Allocation policy review approved",
    actor:"Agent 02",role:"Operations manager",entity:"Global allocation policy v2",folder:"",ticket:"",correlation:"CORR-CFG-ALLOC-02",
    outcome:"Approved (sample)",reason:"The illustrative draft passed a sample policy review; approval is not an operational activation.",
    approver:"Agent 02",approval:"Approved in sample record",before:{reviewState:"Pending",policyVersion:"Draft 2"},after:{reviewState:"Approved (sample)",policyVersion:"Draft 2"},
    source:"Synthetic configuration history",evidence:"Review reference REVIEW-SAMPLE-ALLOC-02. No authenticated approver identity exists in this prototype."
  },
  {
    id:"AUD-20261123-003",occurredAt:"2026-11-23 09:30:42 UK",category:"Configuration",event:"Configuration apply blocked",
    actor:"Prototype policy guard",role:"System (sample)",entity:"Global allocation policy v2",folder:"",ticket:"",correlation:"CORR-CFG-ALLOC-02",
    outcome:"Blocked — no backend",reason:"Application is unavailable because there is no authenticated production configuration service or verified write path.",
    approver:"Not applicable",approval:"Sample approval does not authorise a production change",before:{policyState:"Approved (sample)",applicationState:"Not attempted"},after:{policyState:"Draft example only",applicationState:"Blocked — no backend"},
    source:"Synthetic governance guard",evidence:"This record demonstrates a blocked lifecycle stage. No configuration was deployed."
  },
  {
    id:"AUD-20261123-002",occurredAt:"2026-11-23 09:18:03 UK",category:"Access",event:"Role change request denied",
    actor:"Sample access reviewer",role:"Administrator (sample)",entity:"Agent 12 access profile",folder:"",ticket:"",correlation:"CORR-ACCESS-AGENT12",
    outcome:"Denied (sample)",reason:"The example request did not include the required second-person approval evidence.",
    approver:"Not recorded",approval:"Not approved — sample",before:{role:"Agent",requestedRole:"Manager"},after:{role:"Agent",requestedRole:"Manager",accessChange:"Not applied"},
    source:"Synthetic access-governance record",evidence:"No real identity, account or permission was changed."
  },
  {
    id:"AUD-20261123-001",occurredAt:"2026-11-23 09:02:12 UK",category:"Governance",event:"Corrective note appended",
    actor:"Agent 01",role:"Operations manager",entity:"Ticket DSP-10482",folder:"detags",ticket:"DSP-10482",correlation:"CORR-DSP-10482",
    outcome:"Appended (sample)",reason:"A correction should be appended as a new event rather than silently editing an earlier record.",
    approver:"Not applicable",approval:"Not required in this example",before:{priorRecord:"AUD-SAMPLE-000",priorValue:"Original owner was not stated"},after:{correction:"Original owner recorded as Agent 02",supersedes:"AUD-SAMPLE-000"},
    source:"Synthetic append-only design example",evidence:"This illustrates an audit pattern only; the prototype does not provide an immutable or tamper-evident store."
  }
];

/* Reliability Centre 2.0 — synthetic investigation records only */
const RELIABILITY_EVENTS = [
  {
    id:"EXC-2108",time:"10:42:18",kind:"write_failure",type:"Write failure",severity:"critical",status:"Retry exhausted",
    component:"Excel tracker adapter",folder:"detags",ticket:"DSP-10482",title:"Tracker write rejected after retry limit",
    attempts:3,actor:"Sample dispatcher",owner:"Agent 02",idempotency:"SAMPLE-ASSIGN-10482-V4",
    signal:"Three illustrative write attempts returned a rejected result. The sample record remains unresolved until a human reconciles the ticket and tracker state.",
    impact:"One synthetic assignment record is held from further automatic processing.",
    evidence:"Sample response: write rejected · attempt 3 of 3 · no verified commit acknowledgement.",
    next:"Check workbook availability, access, row schema and existing tracker state. Reconcile the assignment before any controlled retry."
  },
  {
    id:"EXC-2107",time:"10:38:12",kind:"recovery",type:"Recovery",severity:"warning",status:"Awaiting review",
    component:"Recovery coordinator",folder:"agency",ticket:"DSP-10481",title:"Interrupted assignment needs ownership review",
    attempts:2,actor:"Recovery queue",owner:"Agent 05",idempotency:"SAMPLE-RECOVERY-10481-R2",
    signal:"A sample interrupted workflow was detected. The original owner is preserved in the record while a reviewer confirms that the original assignment is still valid.",
    impact:"One synthetic ticket is held for review; no new owner is selected in this prototype.",
    evidence:"Sample recovery marker found · prior owner Agent 05 · current assignment not verified from a live source.",
    next:"Compare the current mailbox category and tracker row with the stored original assignment. Keep the original owner unless a documented manual decision overrides it."
  },
  {
    id:"EXC-2106",time:"10:34:06",kind:"duplicate_delivery",type:"Duplicate delivery",severity:"info",status:"Suppressed (sample)",
    component:"Event deduplicator",folder:"transfers",ticket:"DSP-10480",title:"Repeated delivery matched an existing event key",
    attempts:2,actor:"Event processor",owner:"Agent 08",idempotency:"SAMPLE-EVENT-10480-DELIVERY-01",
    signal:"A second copy of the same sample delivery matched the idempotency reference already recorded for the ticket event.",
    impact:"One duplicate sample delivery was suppressed from the illustrative event stream.",
    evidence:"Event reference SAMPLE-EVENT-10480-DELIVERY-01 · first-seen marker present · duplicate flag true.",
    next:"In production, retain both delivery observations, link them to one canonical event and verify that only one assignment side effect exists."
  },
  {
    id:"EXC-2105",time:"10:21:55",kind:"concurrency_conflict",type:"Concurrency conflict",severity:"warning",status:"Blocked (sample)",
    component:"Assignment writer",folder:"detags",ticket:"DSP-10479",title:"Concurrent update detected before sample write",
    attempts:1,actor:"Assignment writer",owner:"Agent 04",idempotency:"SAMPLE-CLAIM-10479-V12",
    signal:"The sample assignment version changed between read and write, so the stale request was rejected rather than overwriting a newer state.",
    impact:"One synthetic update was blocked. The event does not prove the live system has concurrency protection.",
    evidence:"Illustrative expected version 12 · observed version 13 · write not applied.",
    next:"Reload the canonical ticket state, compare the latest owner and event version, then prepare a fresh reviewed request."
  },
  {
    id:"EXC-2104",time:"10:12:31",kind:"recovery",type:"Recovery",severity:"info",status:"Restored (sample)",
    component:"Recovery coordinator",folder:"unadopts",ticket:"DSP-10478",title:"Original owner retained in sample recovery",
    attempts:1,actor:"Recovery queue",owner:"Agent 11",idempotency:"SAMPLE-RECOVERY-10478-R1",
    signal:"The illustrative recovery record found the original owner still eligible in the sample policy and recorded a restoration outcome.",
    impact:"One sample recovery case reached a marked restored state. No mailbox or tracker write was performed by this UI.",
    evidence:"Stored original owner Agent 11 · sample eligibility match · outcome label Restored (sample).",
    next:"Production must confirm the mailbox category, tracker state and backend write acknowledgement before recording a recovery as complete."
  },
  {
    id:"EXC-2103",time:"09:58:07",kind:"write_unknown",type:"Write outcome unknown",severity:"critical",status:"Retry exhausted",
    component:"Excel tracker adapter",folder:"agency",ticket:"DSP-10477",title:"Tracker write timed out on all sample attempts",
    attempts:3,actor:"Sample dispatcher",owner:"Agent 01",idempotency:"SAMPLE-ASSIGN-10477-V2",
    signal:"Three illustrative attempts timed out without a confirmed response. The final state is unknown, not a verified failure or success.",
    impact:"One synthetic assignment requires reconciliation before another write can be considered.",
    evidence:"Sample response: timeout · attempts 1–3 · acknowledgement unavailable.",
    next:"Read the tracker and mailbox state first. Never repeat a timed-out write blindly; use the same idempotency identity and verify the outcome."
  },
  {
    id:"EXC-2102",time:"09:41:22",kind:"retry",type:"Retry",severity:"info",status:"Retry succeeded (sample)",
    component:"Event processor",folder:"transfers",ticket:"DSP-10476",title:"Illustrative retry completed after transient error",
    attempts:2,actor:"Event processor",owner:"Agent 05",idempotency:"SAMPLE-EVENT-10476-RETRY-02",
    signal:"The sample event processor records one transient attempt followed by a successful retry outcome.",
    impact:"One synthetic event has a retry-success label; it is not evidence of actual connector availability.",
    evidence:"Attempt 1 transient response · attempt 2 sample success marker · persistent event ID retained.",
    next:"Production telemetry should retain both attempts, the same canonical event identity, duration and the final service acknowledgement."
  },
  {
    id:"EXC-2101",time:"09:22:10",kind:"duplicate_delivery",type:"Duplicate delivery",severity:"warning",status:"Awaiting review",
    component:"Event deduplicator",folder:"unadopts",ticket:"DSP-10475",title:"Repeated assignment signal needs reconciliation",
    attempts:2,actor:"Event processor",owner:"Unassigned",idempotency:"SAMPLE-ASSIGN-10475-CANDIDATE",
    signal:"Two sample assignment signals reference the same ticket but do not share a verified canonical event key.",
    impact:"Potential duplicate side effect is unconfirmed. The case is deliberately held for review rather than labelled safely suppressed.",
    evidence:"Sample event IDs differ · same ticket reference · canonical idempotency match not established.",
    next:"Compare both event payloads and the current mailbox category and tracker assignment. Establish one stable event identity before allowing another write."
  },
  {
    id:"EXC-2100",time:"09:08:45",kind:"stale_write",type:"Stale write guard",severity:"info",status:"Blocked (sample)",
    component:"Assignment writer",folder:"detags",ticket:"DSP-10474",title:"Stale assignment request rejected",
    attempts:1,actor:"Assignment writer",owner:"Agent 06",idempotency:"SAMPLE-CLAIM-10474-V8",
    signal:"The sample writer detected that its source version was older than the current record and marked the request blocked.",
    impact:"One synthetic stale update was not applied.",
    evidence:"Illustrative source version 8 · canonical version 9 · request rejected before write.",
    next:"Refresh the canonical state and re-evaluate eligibility. Preserve the conflict as an auditable event."
  },
  {
    id:"EXC-2099",time:"08:52:39",kind:"recovery",type:"Recovery",severity:"warning",status:"Awaiting review",
    component:"Recovery coordinator",folder:"transfers",ticket:"DSP-10473",title:"Original assignment state could not be confirmed",
    attempts:1,actor:"Recovery queue",owner:"Agent 03",idempotency:"SAMPLE-RECOVERY-10473-R1",
    signal:"The sample recovery payload contains an original owner but lacks a matching current-state confirmation.",
    impact:"One synthetic ticket remains in a hold-for-review state; no replacement owner is suggested.",
    evidence:"Original owner Agent 03 · current category unavailable in sample payload · verification required.",
    next:"Confirm the latest category and tracker row, then preserve or escalate the original assignment through an authorised process."
  }
];


/* Administration & Security 2.0 — proposed controls and synthetic review examples */
const ADMIN_ROLE_PROFILES = [
  {
    id:"platform_admin",title:"Platform administrator",level:"Privileged",scope:"Platform-wide configuration and security administration.",
    purpose:"Own platform configuration, identity lifecycle, integration registration and security-policy administration.",
    boundaries:"Cannot use an elevated identity for routine ticket handling. Secrets are managed in a server-side vault and are never displayed in the dashboard.",
    permissions:["dashboard_read","queue_read_all","ticket_assign","ticket_reassign","ticket_manage_all","roster_read","roster_manage","config_draft","config_approve","report_read_all","report_export_all","audit_read","audit_export","access_request_submit","access_review","user_manage","security_manage","integration_manage","retention_manage"]
  },
  {
    id:"operations_manager",title:"Operations manager",level:"Operational",scope:"Operational queues, workforce planning and approved reporting.",
    purpose:"Review queue activity, manage authorised ticket workflow, prepare roster and dispatch proposals, and review operational audit history.",
    boundaries:"Cannot administer platform identities, security settings, integration secrets or retention policy. Critical configuration approval remains separate from proposal preparation.",
    permissions:["dashboard_read","queue_read_all","ticket_assign","ticket_reassign","ticket_manage_all","roster_read","roster_manage","config_draft","report_read_all","report_export_all","audit_read","access_request_submit"]
  },
  {
    id:"team_agent",title:"Team agent",level:"Standard",scope:"Assigned operational work and personal information.",
    purpose:"Work tickets assigned to the agent, record permitted ticket updates, hand over work and view personal operational information.",
    boundaries:"No access to other agents' private performance, platform settings, full audit exports, identity administration or dispatch configuration.",
    permissions:["dashboard_read","ticket_read_own","ticket_update_assigned","handover_own","flag_own","personal_report_read","access_request_submit"]
  },
  {
    id:"auditor",title:"Read-only auditor",level:"Restricted",scope:"Approved audit and reporting evidence.",
    purpose:"Review authorised audit records and evidence without changing tickets, workforce settings or platform configuration.",
    boundaries:"Read-only scope. No assignment, handover, roster changes, access administration, configuration approval or integration management.",
    permissions:["dashboard_read","report_read_all","audit_read","audit_export"]
  }
];
const ADMIN_PERMISSION_CATALOG = [
  {code:"dashboard_read",group:"Platform visibility",label:"View dashboard shell and permitted summaries"},
  {code:"queue_read_all",group:"Ticket operations",label:"View all operational queue records"},
  {code:"ticket_read_own",group:"Ticket operations",label:"View tickets assigned to the current user"},
  {code:"ticket_update_assigned",group:"Ticket operations",label:"Update permitted fields on assigned tickets"},
  {code:"ticket_assign",group:"Ticket operations",label:"Assign unowned tickets within eligible inboxes"},
  {code:"ticket_reassign",group:"Ticket operations",label:"Reassign tickets with reason and audit evidence"},
  {code:"ticket_manage_all",group:"Ticket operations",label:"Manage permitted ticket lifecycle actions across queues"},
  {code:"handover_own",group:"Ticket operations",label:"Hand over work owned by the current user"},
  {code:"flag_own",group:"Ticket operations",label:"Flag assigned work for review"},
  {code:"roster_read",group:"Workforce",label:"View approved roster and coverage information"},
  {code:"roster_manage",group:"Workforce",label:"Prepare and manage roster proposals"},
  {code:"personal_report_read",group:"Reporting",label:"View personal workload and activity summary"},
  {code:"report_read_all",group:"Reporting",label:"View approved team and operational reports"},
  {code:"report_export_all",group:"Reporting",label:"Export approved team-level reports"},
  {code:"audit_read",group:"Audit & governance",label:"Read permitted audit events and evidence"},
  {code:"audit_export",group:"Audit & governance",label:"Export authorised audit evidence"},
  {code:"access_request_submit",group:"Identity & security",label:"Submit an access request for review"},
  {code:"access_review",group:"Identity & security",label:"Review access requests as an authorised independent reviewer"},
  {code:"user_manage",group:"Identity & security",label:"Create, suspend and manage user identities and role assignments"},
  {code:"security_manage",group:"Identity & security",label:"Manage authentication, session and security policy"},
  {code:"integration_manage",group:"Integrations",label:"Manage connector registration and secret-vault references"},
  {code:"retention_manage",group:"Data governance",label:"Manage approved retention and deletion schedules"},
  {code:"config_draft",group:"Dispatch governance",label:"Prepare dispatch and eligibility configuration proposals"},
  {code:"config_approve",group:"Dispatch governance",label:"Approve critical configuration changes independently"}
];
const ADMIN_ACCESS_REQUESTS = [
  {
    id:"ACCESS-SAMPLE-004",submittedAt:"2026-11-23 10:18 UK",requester:"Sample Agent 06",currentRole:"Team agent",requestedRole:"Operations manager",
    scope:"Roster & coverage · read and proposal access",status:"Awaiting independent review (sample)",risk:"High",
    reason:"Temporary supervisor cover is requested, but the example does not include a verified rota-owner approval or defined end date.",
    reviewer:"Not assigned",approval:"No approval recorded",evidence:"Illustrative request only. The requester identity, shift assignment and manager approval have not been verified.",
    outcome:"Not applied — sample",next:"Verify employment identity, approved cover dates, business owner and least-privilege scope. A reviewer independent of the requester must decide."
  },
  {
    id:"ACCESS-SAMPLE-003",submittedAt:"2026-11-23 09:52 UK",requester:"Sample Team Agent 03",currentRole:"Team agent",requestedRole:"Read-only auditor",
    scope:"Audit history · export access",status:"Declined (sample)",risk:"High",
    reason:"The request is not linked to an approved audit assignment, and the requested export scope exceeds the sample agent role.",
    reviewer:"Sample Platform Administrator",approval:"Declined in sample record",evidence:"Example decision record demonstrates least-privilege review; it is not a real access decision.",
    outcome:"No access change — sample",next:"A business sponsor and defined audit scope would be required before a new request could be considered."
  },
  {
    id:"ACCESS-SAMPLE-002",submittedAt:"2026-11-22 16:40 UK",requester:"Sample Operations Manager 01",currentRole:"Operations manager",requestedRole:"Platform administrator",
    scope:"User administration · integration and security settings",status:"Returned for clarification (sample)",risk:"Critical",
    reason:"The justification combines unrelated duties and does not establish a need for permanent platform-wide privilege.",
    reviewer:"Sample Security Reviewer",approval:"Returned; no approval",evidence:"Example separation-of-duties control. No privilege was elevated.",
    outcome:"Not applied — sample",next:"Split the requested duties, identify a time-bound task and request the minimum additional permission through an independently reviewed process."
  },
  {
    id:"ACCESS-SAMPLE-001",submittedAt:"2026-11-21 11:06 UK",requester:"Sample Auditor 01",currentRole:"Read-only auditor",requestedRole:"Read-only auditor",
    scope:"Audit history · read-only export",status:"Approved in sample",risk:"Low",
    reason:"The sample request includes a defined audit scope and a separate business sponsor.",
    reviewer:"Sample Platform Administrator",approval:"Approved in sample record",evidence:"A sample decision only; no account, role or permission was created or changed.",
    outcome:"No live access change — sample",next:"Production must confirm identity, role scope, approval authority and server-side policy before issuing access."
  }
];
const ADMIN_SECURITY_CONTROLS = [
  {id:"identity",area:"Identity provider",status:"Not connected",risk:"Critical",detail:"No trusted identity issuer or authenticated principal is connected to this public prototype.",requirement:"Choose an approved identity provider; validate issuer, audience, token signature, expiry and account lifecycle server-side."},
  {id:"mfa",area:"Multi-factor authentication",status:"Not configured",risk:"High",detail:"No MFA policy or challenge flow is active.",requirement:"Require MFA for privileged roles and define recovery and step-up authentication policy."},
  {id:"rbac",area:"Server-side role authorisation",status:"Not configured",risk:"Critical",detail:"The role matrix on this page is a proposal, not an access-control mechanism.",requirement:"Enforce deny-by-default permissions on every API and data operation; test object-level and role-level access."},
  {id:"session",area:"Session lifecycle",status:"Not configured",risk:"High",detail:"No server-issued session, revocation or idle-timeout service exists.",requirement:"Use secure, HttpOnly, SameSite cookies; define idle and absolute expiry, rotation, logout and revocation."},
  {id:"csrf",area:"Request protection",status:"Not configured",risk:"High",detail:"There is no authenticated API to protect yet.",requirement:"Use CSRF protections for cookie-authenticated writes, strict CORS, content security policy and input validation."},
  {id:"rate",area:"Abuse and rate controls",status:"Not configured",risk:"Medium",detail:"No API gateway, throttling or abuse detection is connected.",requirement:"Apply server-side rate limits and alert on suspicious authentication, export and privileged-action patterns."},
  {id:"audit",area:"Security audit telemetry",status:"Not connected",risk:"Critical",detail:"The audit page uses synthetic browser-side records only.",requirement:"Write authenticated, append-only security events to a protected store and verify delivery and integrity."},
  {id:"secrets",area:"Secrets management",status:"Not connected",risk:"Critical",detail:"No secret vault or protected runtime configuration is connected.",requirement:"Store connector credentials only in a server-side secret manager; rotate and scope credentials; never expose secret values to browser code."},
  {id:"encryption",area:"Encryption and transport",status:"Not verified",risk:"High",detail:"The static demo does not establish production storage or API encryption controls.",requirement:"Verify TLS, encryption at rest, key ownership, rotation, backup protection and data-flow boundaries."},
  {id:"backup",area:"Backup and recovery",status:"Not configured",risk:"High",detail:"No production database, backup schedule or restore test exists.",requirement:"Set protected backups, recovery objectives, restore tests and documented incident ownership."}
];
const ADMIN_RETENTION_POLICIES = [
  {data:"Ticket content and attachments",purpose:"Customer support and operational case history",period:"Not agreed",owner:"Operations + Data Protection",disposal:"Deletion / anonymisation method not defined"},
  {data:"Assignment and workflow events",purpose:"Operational traceability and dispute investigation",period:"Not agreed",owner:"Operations + Compliance",disposal:"Append-only correction and retention rules to approve"},
  {data:"Security and access events",purpose:"Identity, privileged access and incident investigation",period:"Not agreed",owner:"Security",disposal:"Restricted deletion with documented approval"},
  {data:"Audit exports and reports",purpose:"Approved management, audit and regulatory evidence",period:"Not agreed",owner:"Data Governance",disposal:"Controlled storage, expiry and download governance"},
  {data:"Backups and recovery copies",purpose:"Business continuity and restoration",period:"Not agreed",owner:"Platform Operations",disposal:"Expiry and cryptographic erasure process to define"}
];
const ADMIN_TIME_BOUNDARIES = [
  {domain:"Mailbox and ticket event timestamps",zone:"Europe/London",storage:"Store UTC; display in the Europe/London zone.",status:"Design requirement",note:"Use IANA timezone rules for UK daylight-saving transitions; never persist an ambiguous local-time string as the canonical event time."},
  {domain:"Roster and shift schedules",zone:"Africa/Cairo",storage:"Store the UTC instant plus the original local schedule and IANA zone.",status:"Design requirement",note:"Keep Egypt-local shift interpretation separate from UK mailbox event timestamps."},
  {domain:"Cross-system event correlation",zone:"UTC",storage:"Use timezone-aware UTC instants and stable correlation IDs.",status:"Required",note:"Use IDs and UTC instants for ordering; timezone labels are for human display only."},
  {domain:"Reporting cutoffs and calendars",zone:"Not defined",storage:"Owner approval required.",status:"Not agreed",note:"Define reporting week/month boundaries, late-arriving event treatment and public-holiday calendars before production."}
];
const ADMIN_INTEGRATIONS = [
  {name:"Outlook shared mailboxes",boundary:"Mailbox event and category adapter",status:"Not connected",secret:"No credential configured",gate:"Approved app registration, delegated/application permissions, mailbox scope and server-side token storage."},
  {name:"Excel dispatch tracker",boundary:"Tracker read/write adapter",status:"Not connected",secret:"No credential configured",gate:"Documented workbook schema, controlled service identity, atomic write strategy and verified reconciliation."},
  {name:"Identity provider",boundary:"Sign-in and lifecycle",status:"Not connected",secret:"No issuer configured",gate:"Approved issuer, MFA, lifecycle events, group/claim mapping and emergency-access design."},
  {name:"Database and audit store",boundary:"Authoritative records and append-only events",status:"Not configured",secret:"No connection string configured",gate:"Private database, server-side authorisation, immutable audit design, backup and restore tests."},
  {name:"Secret manager",boundary:"Connector credential storage",status:"Not connected",secret:"No vault reference configured",gate:"Server-side vault, scoped service identities, rotation, access logging and incident revocation."}
];

const state = {
  view:"overview", period:"month", folder:"all", search:"", memberSearch:"",
  importedSnapshot:null,
  selectedAgent:null, paused:false, pausedFolders:{}, modal:null,
  liveStatus:"all", liveOwner:"all", liveBrand:"all", liveSort:"oldest", liveSearch:"",
  ticketStatus:"all", ticketBrand:"all", ticketOwner:"all", ticketSort:"oldest", ticketSearch:"",
  rosterSearch:"", rosterShift:"all", rosterAvailability:"all", selectedRosterAgent:null,
  configPreviewFolder:"agency", configPreviewWeight:50,
  reliabilitySearch:"", reliabilityType:"all", reliabilityStatus:"all", reliabilitySeverity:"all", selectedReliabilityEvent:"EXC-2108",
  auditSearch:"", auditCategory:"all", auditOutcome:"all", auditActor:"all", selectedAuditEvent:"AUD-20261123-020",
  adminRole:"operations_manager", adminRequestSearch:"", adminRequestStatus:"all", selectedAdminRequest:"ACCESS-SAMPLE-004"
};
function validateAndSanitiseSnapshot(raw){
  const fail=message=>{throw new Error(message);};
  const isObject=value=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
  const count=(value,label)=>{
    if(typeof value!=="number"||!Number.isSafeInteger(value)||value<0)fail("Invalid "+label+".");
    return value;
  };
  const pct=(value,label)=>{
    if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>100)fail("Invalid "+label+".");
    return value;
  };
  const inboxCodes=["agency","detags","transfers","unadopts"];
  const brandCodes=["volkswagen","audi","skoda","seat","cupra","vwcv","other","unclassified"];
  const eventCodes=["received","flagged","handover","assigned","manual_assignment","reassigned","recovery_requested","recovery_held","recovery_restored","resolved","reopened","exception"];
  if(!isObject(raw)||raw.schema_version!=="dispatcher-reporting-snapshot-1"||raw.source_mode!=="offline_sanitised_aggregate"){
    fail("This is not a supported sanitised Dispatcher reporting snapshot.");
  }
  if(typeof raw.generated_at_utc!=="string"||!raw.generated_at_utc.endsWith("Z")||!Number.isFinite(Date.parse(raw.generated_at_utc))){
    fail("The snapshot generation timestamp is missing or invalid.");
  }
  if(!isObject(raw.tickets)||!isObject(raw.tickets.overall)||!Array.isArray(raw.tickets.by_inbox)||!Array.isArray(raw.tickets.by_brand)||!Array.isArray(raw.tickets.daily_volume)){
    fail("The snapshot is missing its required ticket summary sections.");
  }
  const byInbox=raw.tickets.by_inbox.map(row=>{
    if(!isObject(row)||!inboxCodes.includes(row.inbox_code))fail("The snapshot contains an unsupported inbox code.");
    return {
      inbox_code:row.inbox_code,
      ticket_records:count(row.ticket_records,"ticket record count"),
      initially_assigned:count(row.initially_assigned,"first-assignment count"),
      resolved:count(row.resolved,"resolved count"),
      outstanding:count(row.outstanding,"outstanding count"),
      unassigned:count(row.unassigned,"unassigned count")
    };
  });
  if(byInbox.length!==4||new Set(byInbox.map(row=>row.inbox_code)).size!==4)fail("The snapshot must contain exactly one summary for each of the four inboxes.");
  byInbox.sort((a,b)=>inboxCodes.indexOf(a.inbox_code)-inboxCodes.indexOf(b.inbox_code));
  const overall=raw.tickets.overall;
  const cleanOverall={
    ticket_records:count(overall.ticket_records,"overall ticket count"),
    initially_assigned:count(overall.initially_assigned,"overall first-assignment count"),
    resolved:count(overall.resolved,"overall resolved count"),
    outstanding:count(overall.outstanding,"overall outstanding count"),
    unassigned:count(overall.unassigned,"overall unassigned count")
  };
  const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0);
  for(const key of Object.keys(cleanOverall)){
    if(sum(byInbox,key)!==cleanOverall[key])fail("Inbox totals do not reconcile with the overall "+key+" value.");
  }
  const total=count(raw.tickets.total,"snapshot ticket total");
  if(total!==cleanOverall.ticket_records)fail("The snapshot ticket total does not reconcile.");
  const byBrand=raw.tickets.by_brand.map(row=>{
    if(!isObject(row)||!brandCodes.includes(row.brand_code))fail("The snapshot contains an unsupported brand code.");
    return {brand_code:row.brand_code,count:count(row.count,"brand count")};
  });
  if(new Set(byBrand.map(row=>row.brand_code)).size!==byBrand.length||sum(byBrand,"count")!==total)fail("Brand totals are duplicated or do not reconcile with the ticket total.");
  const dailyVolume=raw.tickets.daily_volume.map(row=>{
    if(!isObject(row)||!inboxCodes.includes(row.inbox_code)||typeof row.date_utc!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(row.date_utc)||!Number.isFinite(Date.parse(row.date_utc+"T00:00:00Z"))){
      fail("The snapshot contains an invalid daily-volume row.");
    }
    return {date_utc:row.date_utc,inbox_code:row.inbox_code,ticket_records:count(row.ticket_records,"daily ticket count")};
  });
  if(!isObject(raw.reporting_period)&&raw.reporting_period!==null)fail("The reporting-period metadata is invalid.");
  let reportingPeriod=null;
  if(raw.reporting_period){
    const first=raw.reporting_period.first_received_date_utc,last=raw.reporting_period.last_received_date_utc;
    if(typeof first!=="string"||typeof last!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(first)||!/^\d{4}-\d{2}-\d{2}$/.test(last)||first>last)fail("The reporting-period dates are invalid.");
    reportingPeriod={first_received_date_utc:first,last_received_date_utc:last};
  }
  if(!Array.isArray(raw.allocations)||!Array.isArray(raw.workflow)||!isObject(raw.data_quality)||!Array.isArray(raw.data_quality.sources)){
    fail("The snapshot is missing allocation, workflow or data-quality sections.");
  }
  const allocations=raw.allocations.map(row=>{
    if(!isObject(row)||!/^Agent-[A-F0-9]{10}$/.test(String(row.agent_ref||""))||!inboxCodes.includes(row.inbox_code))fail("An allocation row contains an invalid pseudonymous agent or inbox reference.");
    return {
      agent_ref:row.agent_ref,inbox_code:row.inbox_code,
      initial_assignments:count(row.initial_assignments,"agent initial-assignment count"),
      allocation_share_pct:pct(row.allocation_share_pct,"allocation share"),
      current_open_workload:count(row.current_open_workload,"agent open-workload count")
    };
  });
  const allocationKeys=new Set();
  for(const row of allocations){
    const key=row.agent_ref+"|"+row.inbox_code;
    if(allocationKeys.has(key))fail("Duplicate agent and inbox allocation rows were found.");
    allocationKeys.add(key);
  }
  for(const inbox of byInbox){
    const rows=allocations.filter(row=>row.inbox_code===inbox.inbox_code);
    if(sum(rows,"initial_assignments")!==inbox.initially_assigned)fail("Agent allocation totals do not reconcile for "+inbox.inbox_code+".");
    if(sum(rows,"current_open_workload")>inbox.outstanding)fail("Agent open-workload totals exceed outstanding work for "+inbox.inbox_code+".");
    for(const row of rows){
      const expected=inbox.initially_assigned?row.initial_assignments/inbox.initially_assigned*100:0;
      if(Math.abs(row.allocation_share_pct-expected)>0.05)fail("An agent allocation share does not reconcile for "+inbox.inbox_code+".");
    }
  }
  const workflow=raw.workflow.map(row=>{
    if(!isObject(row)||!eventCodes.includes(row.event_type)||!inboxCodes.includes(row.inbox_code))fail("The workflow contains an unsupported event or inbox code.");
    const eventCount=count(row.event_count,"workflow event count");
    const distinctTickets=count(row.distinct_tickets,"workflow distinct-ticket count");
    if(distinctTickets>eventCount)fail("Workflow distinct-ticket counts cannot exceed event counts.");
    return {event_type:row.event_type,inbox_code:row.inbox_code,event_count:eventCount,distinct_tickets:distinctTickets};
  });
  const sourceNames=["Ticket snapshot","Assignment history","Workflow history"];
  const qualityCounters=["rows_read","rows_accepted","rows_skipped","duplicate_rows","unknown_inbox","unknown_brand","unknown_status","ambiguous_time"];
  const sources=raw.data_quality.sources.map(row=>{
    if(!isObject(row)||!sourceNames.includes(row.source))fail("The data-quality section contains an unsupported source label.");
    const clean={source:row.source};
    for(const key of qualityCounters)clean[key]=count(row[key],key+" quality counter");
    if(clean.rows_accepted+clean.rows_skipped>clean.rows_read)fail("Data-quality row counts do not reconcile.");
    return clean;
  });
  if(!sources.some(row=>row.source==="Ticket snapshot"))fail("The data-quality section does not identify the ticket snapshot source.");
  const sourceSet=new Set(sources.map(row=>row.source));
  if(sourceSet.size!==sources.length)fail("Duplicate data-quality source rows were found.");
  return {
    schema_version:"dispatcher-reporting-snapshot-1",
    generated_at_utc:raw.generated_at_utc,
    source_mode:"offline_sanitised_aggregate",
    reporting_period:reportingPeriod,
    tickets:{total,overall:cleanOverall,by_inbox:byInbox,by_brand:byBrand,daily_volume:dailyVolume},
    allocations,workflow,
    data_quality:{
      sources,
      ambiguous_initial_assignment_tickets:count(raw.data_quality.ambiguous_initial_assignment_tickets,"ambiguous assignment count")
    }
  };
}
function importedSourceAvailable(source){
  return Boolean(state.importedSnapshot&&state.importedSnapshot.data_quality.sources.some(row=>row.source===source));
}
async function loadLocalSnapshot(file){
  if(!file)return;
  if(file.size>5*1024*1024)throw new Error("Snapshot files must be smaller than 5 MB.");
  const parsed=JSON.parse(await file.text());
  const clean=validateAndSanitiseSnapshot(parsed);
  state.importedSnapshot=clean;
  state.period="snapshot";
  const periodSelect=document.getElementById("periodSelect");
  periodSelect.value="snapshot";
  periodSelect.disabled=true;
  periodSelect.title="This is a point-in-time snapshot. Period trends require timestamped source history.";
  document.getElementById("datasetBadge").innerHTML="<span></span> LOCAL SNAPSHOT";
  document.getElementById("resetSnapshotButton").hidden=false;
  document.getElementById("importSnapshotButton").textContent="Replace snapshot";
  state.selectedAgent=null;
  render();
  const warnings=clean.data_quality.sources.reduce((sum,row)=>sum+row.rows_skipped+row.duplicate_rows+row.unknown_inbox+row.unknown_brand+row.unknown_status+row.ambiguous_time,0)+clean.data_quality.ambiguous_initial_assignment_tickets;
  showToast("Sanitised snapshot loaded locally"+(warnings?" · review data-quality counts":"")+". Refreshing the page clears it.");
}
function clearLocalSnapshot(){
  state.importedSnapshot=null;
  state.period="month";
  const periodSelect=document.getElementById("periodSelect");
  periodSelect.value="month";
  periodSelect.disabled=false;
  periodSelect.title="";
  document.getElementById("datasetBadge").innerHTML="<span></span> DEMO DATA";
  document.getElementById("resetSnapshotButton").hidden=true;
  document.getElementById("importSnapshotButton").textContent="Import snapshot";
  document.getElementById("snapshotFileInput").value="";
  state.selectedAgent=null;
  render();
  showToast("Returned to the synthetic demo dataset.");
}
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
function scaled(value){return Math.max(0,Math.round(value*(state.importedSnapshot?1:PERIODS[state.period].factor)));}
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
  if(state.importedSnapshot){
    return FOLDERS.map(folder=>{
      const row=state.importedSnapshot.tickets.by_inbox.find(item=>item.inbox_code===folder.id)||{};
      return {...folder,received:row.ticket_records||0,assigned:row.initially_assigned||0,resolved:row.resolved||0,open:row.outstanding||0,unassigned:row.unassigned||0};
    });
  }
  return FOLDERS.map(folder=>({...folder,assigned:scaled(folder.assigned),received:scaled(folder.received),resolved:scaled(folder.resolved),open:scaled(folder.open)}));
}
function allocationMatrix(){
  if(state.importedSnapshot){
    const agents=new Map();
    state.importedSnapshot.allocations.forEach(item=>{
      if(!agents.has(item.agent_ref)){
        agents.set(item.agent_ref,{id:"snapshot-"+item.agent_ref,name:item.agent_ref,shift:"Shift data not included",availability:"Not supplied",start:"—",end:"—",eligibleFolders:[],assigned:0,open:0,cells:FOLDERS.map(()=>0),openByFolder:FOLDERS.map(()=>0),total:0});
      }
      const agent=agents.get(item.agent_ref),index=FOLDERS.findIndex(folder=>folder.id===item.inbox_code);
      if(index>=0){agent.cells[index]=item.initial_assignments;agent.openByFolder[index]=item.current_open_workload;}
      agent.assigned+=item.initial_assignments;agent.open+=item.current_open_workload;agent.total+=item.initial_assignments;
    });
    return [...agents.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
  return AGENTS.map((agent,ai)=>{
    const cells=FOLDERS.map((folder,fi)=>distribute(scaled(folder.assigned),MATRIX_WEIGHTS.map(row=>row[fi]))[ai]);
    return {...agent,cells,total:cells.reduce((a,b)=>a+b,0)};
  });
}
function brandRows(){
  if(state.importedSnapshot){
    const counts=Object.fromEntries(state.importedSnapshot.tickets.by_brand.map(row=>[row.brand_code,row.count]));
    return BRANDS.map(brand=>{
      const code=brand.id==="vw"?"volkswagen":brand.id;
      const value=brand.id==="other"?(counts.other||0)+(counts.unclassified||0):(counts[code]||0);
      return {...brand,value};
    });
  }
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
  const unassigned=state.importedSnapshot?folders.reduce((a,f)=>a+(f.unassigned||0),0):Math.max(0,received-assigned);
  return {received,assigned,resolved,open,unassigned};
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
  if(["assigned","available","resolved","automatic","healthy","active","in progress","suppressed (sample)","restored (sample)","retry succeeded (sample)"].includes(key))type="good";
  if(["flagged","waiting","break","paused","pending","reassigned","not connected","not configured","awaiting review","blocked (sample)"].includes(key))type="warning";
  if(["overdue","unassigned","exception","failed","critical","retry exhausted"].includes(key))type="danger";
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
  const imported=Boolean(state.importedSnapshot);
  return '<div class="overview-inbox-grid">'+inboxes.map(folder=>{
    const allocationRate=folder.received?folder.assigned/folder.received*100:0;
    const outstandingRate=folder.received?folder.open/folder.received*100:0;
    return '<article class="overview-inbox-card">'+
      '<div class="overview-inbox-head"><strong>'+esc(folder.name)+'</strong><span>'+esc(folder.short)+'</span></div>'+
      '<div class="overview-inbox-open"><strong>'+fmt(folder.open)+'</strong><span>outstanding</span></div>'+
      '<div class="overview-inbox-metrics"><span><small>'+(imported?"TICKET RECORDS":"RECEIVED")+'</small><b>'+fmt(folder.received)+'</b></span><span><small>FIRST ASSIGNED</small><b>'+(imported&&!importedSourceAvailable("Assignment history")?"—":fmt(folder.assigned))+'</b></span><span><small>RESOLVED</small><b>'+fmt(folder.resolved)+'</b></span></div>'+
      '<div class="overview-inbox-track" role="img" aria-label="'+esc(folder.name)+' outstanding volume as a share of ticket records"><span style="width:'+Math.min(100,outstandingRate).toFixed(1)+'%;background:'+folder.color+'"></span></div>'+
      '<div class="overview-inbox-foot"><span>'+(imported&&!importedSourceAvailable("Assignment history")?"First-assignment history not supplied":allocationRate.toFixed(1)+'% initially allocated')+'</span><span>'+outstandingRate.toFixed(1)+'% open / records</span></div>'+
    '</article>';
  }).join("")+'</div>';
}function overviewRiskPanel(summary,tickets){
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
    return {name:folder.name,count:rows.reduce((sum,row)=>sum+(row.cells[fi]||0),0)};
  });
  const total=totalsByFolder.reduce((sum,item)=>sum+item.count,0);
  const values=rows.map(row=>folders.reduce((sum,folder)=>sum+(row.cells[FOLDERS.findIndex(item=>item.id===folder.id)]||0),0)).filter(Number.isFinite);
  const low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):0;
  const missing=state.importedSnapshot&&!importedSourceAvailable("Assignment history");
  return '<div class="overview-allocation-summary">'+
    '<div><strong>'+fmt(total)+'</strong><span>Initial allocations '+(state.importedSnapshot?"in imported snapshot":"in sample matrix")+'</span></div>'+
    '<div><strong>'+(missing?"Not supplied":fmt(low)+'–'+fmt(high))+'</strong><span>Member allocation range</span></div>'+
    '<div><strong>'+folders.length+'</strong><span>Inboxes in selected scope</span></div>'+
  '</div>'+
  '<div class="overview-allocation-bars">'+totalsByFolder.map(item=>{
    const share=total?item.count/total*100:0;
    return '<div><span>'+esc(item.name)+'</span><b>'+fmt(item.count)+'</b><i><em style="width:'+share.toFixed(1)+'%"></em></i></div>';
  }).join("")+'</div>'+
  '<p class="overview-panel-foot">'+(missing?"Assignment history was not supplied. No first-assignment distribution is inferred from current owners.":"Initial allocation is separate from handovers, reassignments and recoveries. Allocation volume is descriptive, not a performance ranking or proof of fairness.")+'</p>';
}function overviewIntegrationPanel(){
  return '<div class="overview-integration-list">'+
    healthRow("Outlook shared mailboxes","Not connected","warning","No mailbox messages are being read")+
    healthRow("Excel dispatch tracker","Not connected","warning","No assignment records are being read or written")+
    healthRow("Production data service","Not configured","warning","No live ticket database is connected")+
    healthRow("Authentication and roles","Not configured","warning","This public preview is not a protected production application")+
    healthRow("Demonstration dataset","Loaded","neutral","Synthetic records only · no operational side effects")+
  '</div>';
}
function renderOverview(){
  const imported=Boolean(state.importedSnapshot);
  const t=totals(),brands=brandRows(),rows=allocationMatrix();
  const inboxes=folderAssignedRows().filter(folder=>state.folder==="all"||folder.id===state.folder);
  const assignmentsAvailable=!imported||importedSourceAvailable("Assignment history");
  const allocationRate=assignmentsAvailable&&t.received?t.assigned/t.received*100:null;
  const resolutionRate=t.received?t.resolved/t.received*100:null;
  const trend=overviewTrendData(t.received,t.resolved);
  const trendPanel=imported
    ? panel("Received-date coverage","Actual UTC received dates present in the imported ticket snapshot. Resolved-date history is not included.",overviewSnapshotTrendTable(),'<span class="subtle-tag">SOURCE DATES ONLY</span>')
    : panel("Ticket flow pattern","12 illustrative intervals · distributed from the selected totals",'<div class="dual-bars">'+chartPair(trend.received,trend.resolved,trend.labels)+'</div><div class="overview-chart-note">The intervals are a generated distribution of the sample totals, not timestamped daily source records.</div>',horizontalLegend([{label:"Received",color:"#ff174f"},{label:"Resolved",color:"#ff85aa"}]));
  const banner=imported
    ? '<div class="overview-demo-strip local-snapshot-strip"><span class="overview-demo-label"><i></i> SANITISED LOCAL SNAPSHOT</span><span>Generated '+esc(new Date(state.importedSnapshot.generated_at_utc).toLocaleString("en-GB"))+'</span><span>In memory only · refresh clears import</span></div>'
    : '<div class="overview-demo-strip"><span class="overview-demo-label"><i></i> DEMONSTRATION DATA · READ ONLY</span><span>Portfolio reporting view</span><span>All figures are synthetic and illustrative</span></div>';
  const allocationValue=assignmentsAvailable?fmt(t.assigned):"Not supplied";
  const allocationRateValue=allocationRate===null?"Not available":allocationRate.toFixed(1)+"%";
  const resolutionRateValue=resolutionRate===null?"—":resolutionRate.toFixed(1)+"%";
  pageContent.innerHTML=
    heading("MANAGEMENT PERFORMANCE",imported?"Imported snapshot overview":"Performance overview",imported?"Explore aggregate ticket, inbox, brand and first-allocation data from the sanitised local snapshot. Individual tickets and source rows are not included.":"A portfolio-level view of demand, first allocations, completed tickets, inbox mix and brand demand. Use Live Operations when you need to inspect individual sample work.",'<a class="btn btn-primary" href="./reporting-studio.html">Open reporting studio ↗</a>')+
    banner+
    kpiGrid([
      kpi(imported?"Ticket records":"Tickets received",fmt(t.received),imported?"Current-state records in the imported snapshot":"Distinct tickets in selected reporting scope","▤"),
      kpi("Initially assigned",allocationValue,imported?(assignmentsAvailable?"Distinct tickets with one validated first allocation":"Assignment history was not supplied"):"Distinct tickets with a first allocation","↗"),
      kpi(imported?"Resolved / closed":"Tickets resolved",fmt(t.resolved),imported?"Current resolved state in the snapshot":"Recorded completed tickets in sample totals","✓"),
      kpi("Outstanding workload",fmt(t.open),imported?"Open records at snapshot time":"Illustrative open snapshot for selected scope","◷",null,"warning")
    ])+
    '<div class="overview-metric-strip">'+
      '<div class="overview-metric-tile"><span>INITIAL ALLOCATION RATE</span><strong>'+allocationRateValue+'</strong><small>'+(imported?"First-assigned ÷ snapshot records":"First-assigned ÷ received")+'</small></div>'+
      '<div class="overview-metric-tile"><span>RESOLUTION RATIO</span><strong>'+resolutionRateValue+'</strong><small>'+(imported?"Resolved ÷ snapshot records; not a cohort closure rate":"Resolved ÷ received · not a cohort closure rate")+'</small></div>'+
      '<div class="overview-metric-tile"><span>'+(imported?"CURRENTLY UNASSIGNED":"NOT INITIALLY ALLOCATED")+'</span><strong>'+fmt(t.unassigned)+'</strong><small>'+(imported?"Open records with no current owner":"Received less first-assigned total")+'</small></div>'+
      '<div class="overview-metric-tile overview-metric-na"><span>REOPENED TICKETS</span><strong>Not available</strong><small>No validated reopened field or event feed</small></div>'+
    '</div>'+
    '<div class="grid-two overview-primary-grid">'+
      trendPanel+
      panel("Initial allocation distribution","First assignment only · handovers and recoveries remain separate",overviewAllocationSummary(rows),'<button class="panel-action" data-go="folders">Open folder share matrix ↗</button>')+
    '</div>'+
    '<div class="section-heading overview-section-heading"><div><h2>Inbox performance</h2><p>'+(imported?"Current ticket records, first assignments, resolved and outstanding counts from the imported snapshot.":"Compare received, first-assigned, resolved and outstanding sample totals across the selected inbox scope.")+'</p></div><span class="subtle-tag">'+inboxes.length+' INBOXES IN SCOPE</span></div>'+
    overviewInboxSnapshot(inboxes)+
    '<div class="grid-two overview-secondary-grid">'+
      panel("Brand demand",imported?"Approved brand classification across all inboxes; the snapshot does not include a brand-by-inbox cross-tab.":"Unique ticket mix by identified brand, including unclassified",brandBarList(brands),'<button class="panel-action" data-go="brands">Explore brand insights ↗</button>')+
      panel("How to read this overview","Aggregate management measures — not a ticket workbench",'<div class="overview-guide-list">'+
        '<div><strong>Initial allocation</strong><span>Counts the first allocation for each ticket, not every subsequent owner. '+(imported&&!assignmentsAvailable?"No assignment-history file was included, so this measure is unavailable.":"")+'</span></div>'+
        '<div><strong>Resolution ratio</strong><span>'+(imported?"Resolved records ÷ current snapshot records. This is not a received-ticket cohort closure rate.":"Resolved ÷ received in the selected totals; it is not a same-cohort closure rate.")+'</span></div>'+
        '<div><strong>Outstanding workload</strong><span>'+(imported?"The current open-state snapshot, separate from historical allocation volume.":"A current-state sample snapshot, separate from historical allocation volume.")+'</span></div>'+
      '</div>','<span class="subtle-tag">MEASURE GUIDE</span>')+
    '</div>'+
    '<div class="overview-next-step"><div><span>NEED TO INSPECT OR WORK A TICKET?</span><strong>Live Operations remains a separate sample workbench. The sanitised aggregate snapshot intentionally contains no ticket references, subjects or individual source rows.</strong></div><button type="button" class="btn btn-primary" data-go="live">Open Live Operations ↗</button></div>'+
    '<div class="overview-final-note"><strong>Data boundary:</strong> '+(imported?"This view uses only the imported sanitised aggregate snapshot. It is held in memory in this tab and is not uploaded or persisted. Date trends require valid timestamps; resolution timing, SLA performance and production health are not inferred.":"All figures are synthetic portfolio aggregates. Reopened tickets, active handling time, approved SLA performance and production health require validated event data before they can be reported.")+'</div>';
}
function overviewSnapshotTrendTable(){
  if(!state.importedSnapshot)return "";
  const rows=state.importedSnapshot.tickets.daily_volume
    .filter(row=>state.folder==="all"||row.inbox_code===state.folder)
    .slice().sort((a,b)=>b.date_utc.localeCompare(a.date_utc)).slice(0,30)
    .map(row=>'<tr><td>'+esc(row.date_utc)+'</td><td>'+esc(FOLDERS.find(folder=>folder.id===row.inbox_code)?.name||row.inbox_code)+'</td><td class="total-cell">'+fmt(row.ticket_records)+'</td></tr>');
  return rows.length?dataTable(["Received date · UTC","Inbox","Ticket records"],rows):'<div class="empty-state">No valid timezone-explicit received dates were supplied. No date trend is inferred.</div>';
}function healthRow(label,value,type,note){
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
  pageContent.innerHTML=heading("LIVE OPERATIONS","Queue-first control room","Find and inspect individual tickets, filter unassigned and at-risk work, and review the illustrative team-coverage snapshot. This is the working view — not the portfolio performance summary.",'<button class="btn btn-secondary" data-action="export-live-queue">↓ Export visible queue</button>')+
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
  const rows=brandRows(),total=rows.reduce((a,b)=>a+b.value,0),other=rows.find(b=>b.id==="other")?.value||0,known=total-other;
  const imported=Boolean(state.importedSnapshot);
  pageContent.innerHTML=heading("BRAND INTELLIGENCE","Know the brands behind the workload",imported?"Explore validated brand categories from the sanitised snapshot. Brand-by-inbox detail is not present in this export.":"See how many tickets relate to each VW Group brand and compare brand demand across inboxes.",'<button class="btn btn-secondary" data-action="export-brands">↓ Export brand mix</button>')+
    (imported?'<div class="overview-demo-strip local-snapshot-strip"><span class="overview-demo-label"><i></i> SANITISED LOCAL SNAPSHOT</span><span>Brand totals · all inboxes</span><span>No brand-by-inbox split supplied</span></div>':'')+
    kpiGrid([
      kpi(imported?"Ticket records":"Total tickets",fmt(total),imported?"Current-state snapshot records":"Distinct received tickets","▤"),
      kpi("Identified brand",fmt(known),total?(known/total*100).toFixed(1)+"% classified":"—","◈"),
      kpi("Audi tickets",fmt(rows.find(b=>b.id==="audi").value),"Share "+(total?rows.find(b=>b.id==="audi").value/total*100:0).toFixed(1)+"%","A"),
      kpi("Škoda tickets",fmt(rows.find(b=>b.id==="skoda").value),"Share "+(total?rows.find(b=>b.id==="skoda").value/total*100:0).toFixed(1)+"%","Š")
    ])+
    '<div class="grid-two">'+
      panel("Brand distribution","Share of unique tickets in the current scope",brandBarList(rows),'<span class="subtle-tag">7 CATEGORIES</span>')+
      panel("Brand mix by inbox",imported?"Not supplied by the aggregate snapshot. Clear the global inbox filter to review overall brand totals.":"The selected folder filter applies to all views",brandFolderTable(),'<span class="subtle-tag">'+(imported?"NOT IN SOURCE":"SAMPLE COMPARISON")+'</span>')+
    '</div>'+
    panel("Brand register","Classification coverage and handling rules",dataTable(["Brand","Tickets","Share","Classification","Treatment"],rows.map(b=>{
      const share=total?b.value/total*100:0;
      return '<tr><td><span class="brand-register-name"><i style="background:'+b.color+'"></i>'+b.name+'</span></td><td class="total-cell">'+fmt(b.value)+'</td><td>'+share.toFixed(1)+'%</td><td>'+statusPill(b.id==="other"?"Review required":"Identified")+'</td><td>'+(b.id==="other"?"Retain until confirmed":"Explicit / validated mapping")+'</td></tr>';
    })),'<span class="subtle-tag">DISTINCT TICKETS</span>')+
    '<div class="prototype-warning"><strong>Classification safeguard.</strong> Brand identity comes from the explicit mapped field. Unrecognised values remain Other / unclassified; this dashboard does not infer brand from subject text.</div>';
}function brandFolderTable(){
  if(state.importedSnapshot)return '<div class="empty-state">Brand counts are available for the overall snapshot only. The export does not include brand-by-inbox rows, so no folder split is estimated.</div>';
  const rows=FOLDERS.filter(f=>state.folder==="all"||f.id===state.folder);
  return dataTable(["Inbox","VW","Audi","Škoda","Other"],rows.map(f=>{
    const total=scaled(f.received),mix=BRAND_MIX[f.id],v=distribute(total,mix);
    return '<tr><td>'+f.name+'</td><td>'+fmt(v[0])+'</td><td>'+fmt(v[1])+'</td><td>'+fmt(v[2])+'</td><td>'+fmt(v[6])+'</td></tr>';
  }));
}function renderWorkflow(){
  const imported=Boolean(state.importedSnapshot);
  const manual=workflowEvent("manual"),handover=workflowEvent("handover"),recovery=workflowEvent("recovery");
  const sourceAvailable=!imported||importedSourceAvailable("Workflow history");
  const summaries=workflowSummaryRows();
  const actualRows=imported?state.importedSnapshot.workflow.filter(row=>state.folder==="all"||row.inbox_code===state.folder).map(row=>
    '<tr><td>'+esc(row.event_type.replaceAll("_"," "))+'</td><td>'+esc(FOLDERS.find(folder=>folder.id===row.inbox_code)?.name||row.inbox_code)+'</td><td class="total-cell">'+fmt(row.event_count)+'</td><td>'+fmt(row.distinct_tickets)+'</td></tr>'
  ):null;
  const allocationMethodPanel=imported
    ? panel("Allocation method split","The snapshot distinguishes first allocations from workflow events but does not identify automatic versus manual allocation method.",'<div class="empty-state">Not available in this source export. No allocation method split is inferred.</div>','<span class="subtle-tag">NOT IN SOURCE</span>')
    : panel("Assignment method mix","Share of distinct assigned tickets",donutChart([{label:"Automatic",value:89.5,color:"#ff5c91"},{label:"Manual",value:4.6,color:"#ffbd68"},{label:"Other / pending",value:5.9,color:"#a7a3a0"}]),'<span class="subtle-tag">INITIAL ASSIGNMENT</span>');
  pageContent.innerHTML=heading("WORKFLOW ANALYTICS","Understand how work moves",imported?"Review the explicit workflow events found in the imported history. Event counts and distinct tickets affected remain separate.":"Separate ticket-level ratios from event counts so handovers, flags, manual interventions, recoveries and reassignments are not double-counted.")+
    (imported?'<div class="overview-demo-strip local-snapshot-strip"><span class="overview-demo-label"><i></i> SANITISED LOCAL SNAPSHOT</span><span>Workflow events '+(sourceAvailable?"included":"not supplied")+'</span><span>Event times are not retained in aggregate output</span></div>':'')+
    kpiGrid([
      kpi("Automatic allocation",imported?"Not available":"1,064",imported?"The source does not classify automatic versus manual first assignments":"89.5% of assigned tickets","↗"),
      kpi("Manual assignment events",sourceAvailable?fmt(manual.events):"Not supplied",sourceAvailable?fmt(manual.uniqueTickets)+" unique tickets affected":"No workflow-history file supplied","✎"),
      kpi("Handover events",sourceAvailable?fmt(handover.events):"Not supplied",sourceAvailable?fmt(handover.uniqueTickets)+" unique tickets affected":"No workflow-history file supplied","⇄"),
      kpi("Recovery events",sourceAvailable?fmt(recovery.events):"Not supplied",sourceAvailable?fmt(recovery.uniqueTickets)+" unique tickets affected":"No workflow-history file supplied","↺")
    ])+
    '<div class="grid-two">'+
      allocationMethodPanel+
      panel("Workflow events",imported?"Event types mapped from the supplied workflow history, scoped to the selected inbox.":"Recorded event volume in the sample",imported?(actualRows.length?dataTable(["Event type","Inbox","Events","Tickets affected"],actualRows):'<div class="empty-state">'+(sourceAvailable?"No mapped workflow events in this inbox scope.":"No workflow-history file was supplied.")+'</div>'):barRows(summaries.map(event=>({label:event.label,value:event.events,color:event.color}))),'<span class="subtle-tag">TEAM-LEVEL AGGREGATES</span>')+
    '</div>'+
    panel("Metric definitions","Unique tickets affected and event volume are separate measures",dataTable(["Metric","Unique tickets affected","Events recorded","Rate / interpretation"],summaries.map(event=>'<tr><td>'+event.label+'</td><td>'+fmt(event.uniqueTickets)+'</td><td>'+fmt(event.events)+'</td><td>'+(imported?"Not available — denominator and method not supplied":event.rate+' of assigned / handled tickets')+'</td></tr>')))+
    '<div class="prototype-warning"><strong>Counting rule.</strong> A ticket with three handovers counts once in the unique-ticket measure and three times in the event count. Event types may overlap; never add event counts to distinct ticket totals or initial allocations.</div>';
}function donutChart(items){
  let offset=0;
  const circles=items.map(item=>{
    const length=item.value*2.45;
    const circle='<circle cx="64" cy="64" r="39" fill="none" stroke="'+item.color+'" stroke-width="16" stroke-dasharray="'+length+' '+(245-length)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 64 64)"></circle>';
    offset+=length;return circle;
  }).join("");
  return '<div class="donut-layout"><svg viewBox="0 0 128 128" role="img" aria-label="Allocation method distribution">'+circles+'<text x="64" y="61" text-anchor="middle" class="donut-center">1,119</text><text x="64" y="76" text-anchor="middle" class="donut-sub">ASSIGNED</text></svg><div class="donut-legend">'+items.map(i=>'<div><span><i style="background:'+i.color+'"></i>'+i.label+'</span><strong>'+i.value+'%</strong></div>').join("")+'</div></div>';
}
function renderFolders(){
  const rows=allocationMatrix(),scope=folderAssignedRows().filter(folder=>state.folder==="all"||folder.id===state.folder);
  const folderCount=scope.length,assignmentsAvailable=!state.importedSnapshot||importedSourceAvailable("Assignment history");
  const assigned=scope.reduce((sum,folder)=>sum+folder.assigned,0);
  const open=scope.reduce((sum,folder)=>sum+folder.open,0);
  pageContent.innerHTML=heading("WORKLOAD DISTRIBUTION","Every member. Every folder.",state.importedSnapshot?"Review first allocations and current open workload from pseudonymised snapshot references. Roster and shift details are not part of this export.":"See each member’s share of initial ticket allocations in each inbox. Current open workload is measured separately.",'<button class="btn btn-secondary" data-action="export-folders">↓ Export matrix</button>')+
    (state.importedSnapshot?'<div class="overview-demo-strip local-snapshot-strip"><span class="overview-demo-label"><i></i> SANITISED LOCAL SNAPSHOT</span><span>Agent IDs are pseudonymised</span><span>Rota / shift data not included</span></div>':'')+
    kpiGrid([
      kpi(state.importedSnapshot?"Pseudonymised agents":"Team members",String(rows.length),state.importedSnapshot?"References present in allocation or workload data":"Illustrative team roster","♧"),
      kpi("Initial allocations",assignmentsAvailable?fmt(assigned):"Not supplied","Distinct tickets first assigned","↗"),
      kpi("Folders in scope",String(folderCount),"Four monitored workstreams","▤"),
      kpi("Open workload",fmt(open),state.importedSnapshot?"Current-state snapshot · selected inboxes":"Current-state sample snapshot","◷")
    ])+
    '<div class="prototype-warning"><strong>Share definition.</strong> Each percentage is the member’s distinct tickets first assigned in that folder divided by all first-assigned tickets in that folder. Handovers, recoveries and reassignments do not inflate original allocation share. '+(state.importedSnapshot&&!assignmentsAvailable?"Assignment history was not supplied; the matrix does not infer first allocation from current ownership.":"")+'</div>'+
    panel("Member allocation matrix","Counts and percentage share are shown for every visible folder",'<div class="table-toolbar"><input class="search-control" id="memberSearch" type="search" placeholder="Search pseudonymous agents…" value="'+esc(state.memberSearch)+'"></div>'+shareMatrix(rows,true),'<span class="subtle-tag">'+(state.importedSnapshot?rows.length+" PSEUDONYMISED REFERENCES":"14 SAMPLE MEMBERS")+'</span>')+
    '<div class="grid-two">'+
      panel("Folder allocation share","How the selected team shares initial allocations",assignmentsAvailable?barRows(scope.map(folder=>({label:folder.name,value:folder.assigned,color:folder.color}))):'<div class="empty-state">Initial-assignment history was not supplied.</div>',"")+
      panel("Current open workload","Snapshot of open tickets by folder",barRows(scope.map(folder=>({label:folder.name,value:folder.open,color:folder.color}))),"")+
    '</div>';
  const search=document.getElementById("memberSearch");
  if(search)search.addEventListener("input",e=>{state.memberSearch=e.target.value;const pos=e.target.selectionStart;renderFolders();const el=document.getElementById("memberSearch");el.focus();el.setSelectionRange(pos,pos);});
}function teamProfileRows(){
  const matrix=allocationMatrix(),folders=scopeFolders();
  if(state.importedSnapshot){
    return matrix.map(agent=>{
      const firstAssignedByFolder=agent.cells.slice();
      const firstAssigned=folders.reduce((sum,folder)=>sum+firstAssignedByFolder[FOLDERS.findIndex(item=>item.id===folder.id)],0);
      return {...agent,firstAssignedByFolder,firstAssigned,shift:"Shift data not included"};
    });
  }
  return AGENTS.map(agent=>{
    const allocation=matrix.find(row=>row.id===agent.id);
    const firstAssignedByFolder=allocation?allocation.cells.slice():FOLDERS.map(()=>0);
    const firstAssigned=folders.reduce((sum,folder)=>sum+firstAssignedByFolder[FOLDERS.findIndex(item=>item.id===folder.id)],0);
    return {...agent,firstAssignedByFolder,firstAssigned};
  });
}function teamWorkloadPanel(rows){
  if(!rows.length)return '<div class="empty-state">No anonymised profiles match the current search.</div>';
  const ordered=rows.slice().sort((a,b)=>b.open-a.open||a.name.localeCompare(b.name));
  const maximum=Math.max(1,...ordered.map(agent=>agent.open));
  return '<div class="team-workload-list">'+ordered.map(agent=>
    '<div class="team-workload-row"><div class="team-workload-person">'+memberCell(agent.name,agent.shift||"Pseudonymised reference")+'</div><div class="team-workload-track"><span style="width:'+(agent.open/maximum*100).toFixed(1)+'%"></span></div><strong>'+fmt(agent.open)+'</strong></div>'
  ).join("")+'</div>'+
  '<p class="team-panel-note">'+(state.importedSnapshot?"Open counts are taken from the current-state ticket snapshot and grouped by pseudonymised owner and inbox. They are not time-scoped or adjusted for scheduled hours, eligibility or ticket complexity.":"Open counts are a static current-workload sample. They are not period-scaled, inbox-scoped or adjusted for scheduled hours, eligibility or ticket complexity.")+'</p>';
}function teamEventLedger(){
  const imported=Boolean(state.importedSnapshot),sourceAvailable=!imported||importedSourceAvailable("Workflow history");
  if(imported&&!sourceAvailable)return '<div class="empty-state">Workflow history was not supplied with this snapshot. No event counts are inferred.</div>';
  const summaries=workflowSummaryRows();
  return '<div class="team-event-ledger">'+
    dataTable(["Event type","Events recorded","Unique tickets affected","Interpretation"],summaries.map(event=>
      '<tr><td>'+event.label+'</td><td class="total-cell">'+fmt(event.events)+'</td><td>'+fmt(event.uniqueTickets)+'</td><td>'+(imported?"Aggregate snapshot · not time-scoped":event.rate+' · sample ratio only')+'</td></tr>'
    ))+
    '<p class="team-panel-note">'+(imported?"These are team-level event aggregates from the local snapshot. The source has no event timestamps or member-attributed event detail.":"These are team-level synthetic aggregates, not member-attributed event histories and not time-scoped.")+' One ticket may generate multiple events; event counts must never be added to distinct ticket counts or initial allocations.</p>'+
  '</div>';
}function teamEvidencePanel(){
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
  const matrix=allocationMatrix(),allProfiles=teamProfileRows();
  const profiles=allProfiles.filter(agent=>activeSearch(agent.name));
  const folders=folderAssignedRows().filter(folder=>state.folder==="all"||folder.id===state.folder);
  const assignmentsAvailable=!state.importedSnapshot||importedSourceAvailable("Assignment history");
  const firstAssigned=folders.reduce((sum,folder)=>sum+folder.assigned,0);
  const openWorkload=allProfiles.reduce((sum,agent)=>sum+agent.open,0);
  const eventTypes=workflowSummaryRows().filter(event=>event.events>0).length;
  pageContent.innerHTML=heading("TEAM PERFORMANCE INTELLIGENCE","See the work clearly. Compare it fairly.","Separate first assignments, current open workload and workflow events — then add performance measures only when their source evidence exists.",'<button class="btn btn-secondary" data-action="export-team">↓ Export team snapshot</button>')+
    (state.importedSnapshot
      ? '<div class="team-demo-strip local-snapshot-strip"><span><i></i> SANITISED SNAPSHOT · READ ONLY</span><span>'+allProfiles.length+' pseudonymised agent references</span><span>Shift / rota data <b>Not supplied</b></span></div>'
      : '<div class="team-demo-strip"><span><i></i> DEMONSTRATION DATA · READ ONLY</span><span>All 14 profiles are anonymised sample records</span><span>Outlook / Excel <b>Not connected</b></span></div>')+
    kpiGrid([
      kpi(state.importedSnapshot?"Agent references in view":"Agent profiles in view",String(profiles.length),state.importedSnapshot?"Pseudonymised snapshot references · global search applies":"Anonymised sample profiles · global search applies","♧"),
      kpi("First assignments",assignmentsAvailable?fmt(firstAssigned):"Not supplied",state.importedSnapshot?"Current snapshot totals · not period-filtered":"Distinct tickets first assigned · selected period and inbox","↗"),
      kpi("Current open workload",fmt(openWorkload),state.importedSnapshot?"Owner snapshot · independent of inbox filter":"All-profile sample snapshot · not period or inbox scoped","◷"),
      kpi("Workflow event types",state.importedSnapshot?String(eventTypes):String(WORKFLOW_EVENT_SUMMARY.length),state.importedSnapshot?"Mapped event categories in current inbox scope":"Team-level aggregates shown separately below","⇄")
    ])+
    '<div class="team-scope-note"><strong>How to read this screen:</strong> '+(state.importedSnapshot?"Agent labels are keyed pseudonymous references, not colleague names. Current open workload is a point-in-time count. First-assignment totals and workflow event totals are aggregate measures; event timestamps, roster hours, eligibility and individual event attribution are not present.":"The period and inbox filters change first-assignment counts. Open workload is a separate current-state sample. Workflow events are team-level aggregate counts with no event dates or per-member attribution. None of these sample figures is a real colleague performance assessment.")+'</div>'+
    '<div class="section-heading team-section-heading"><div><h2>Member snapshot</h2><p>Initial allocations within the selected scope and current open-work '+(state.importedSnapshot?"snapshot by pseudonymised owner.":"sample for each anonymised profile.")+'</p></div><span class="subtle-tag">NO PERFORMANCE RANKING</span></div>'+
    (profiles.length?'<div class="team-profile-grid">'+profiles.map(agent=>
      '<button class="team-profile-card '+(state.selectedAgent===agent.id?'selected':'')+'" data-agent="'+agent.id+'" type="button" aria-pressed="'+(state.selectedAgent===agent.id)+'">'+
        '<div class="team-profile-head">'+memberCell(agent.name,agent.shift||"Pseudonymised reference")+'<span class="team-profile-chevron">↗</span></div>'+
        '<div class="team-profile-metrics"><div><strong>'+fmt(agent.open)+'</strong><span>OPEN WORKLOAD</span></div><div><strong>'+(assignmentsAvailable?fmt(agent.firstAssigned):"—")+'</strong><span>FIRST ASSIGNED</span></div></div>'+
        '<div class="team-profile-foot">'+(state.importedSnapshot?"Pseudonymous reference · no personal attribution":"Open profile · sample data only")+'</div>'+
      '</button>'
    ).join("")+'</div>':'<div class="empty-state">No team members match the global search.</div>')+
    (state.selectedAgent?agentDetail(state.selectedAgent):'')+
    '<div class="grid-two team-overview-grid">'+
      panel("Current open-work distribution",state.importedSnapshot?"Current-state open workload by pseudonymised owner · independent of date selection": "Current-state sample by member · independent of period and inbox filters",teamWorkloadPanel(profiles),'<span class="subtle-tag">SNAPSHOT</span>')+
      panel("First assignments by inbox","Distinct tickets first assigned in the selected scope",assignmentsAvailable?barRows(folders.map(folder=>({label:folder.name,value:folder.assigned,color:folder.color}))):'<div class="empty-state">Assignment history was not supplied.</div>','<span class="subtle-tag">FIRST ASSIGNMENT ONLY</span>')+
    '</div>'+
    panel("Member allocation matrix","Count and first-assignment share by inbox",'<p class="team-panel-note">Each share uses all first-assigned tickets in that inbox as its denominator. Searching for members filters visible rows but does not change the denominator. Open work remains a separate snapshot.</p>'+shareMatrix(matrix,true,matrix),'<span class="subtle-tag">INITIAL ASSIGNMENT ONLY</span>')+
    '<div class="grid-two team-secondary-grid">'+
      panel("Team-level workflow event ledger","Events and unique tickets affected · separate from initial allocation",teamEventLedger(),'<span class="subtle-tag">NOT MEMBER-ATTRIBUTED</span>')+
      panel("Performance measures awaiting evidence","Timing, quality and capacity measures are deliberately withheld until validated sources exist",teamEvidencePanel(),'<span class="subtle-tag">NOT AVAILABLE</span>')+
    '</div>';
}function agentDetail(id){
  const agent=AGENTS.find(item=>item.id===id)||teamProfileRows().find(item=>item.id===id);
  if(!agent)return "";
  const allocation=allocationMatrix().find(row=>row.id===id);
  if(!allocation)return "";
  const folders=scopeFolders();
  const firstAssigned=folders.reduce((sum,folder)=>sum+(allocation.cells[FOLDERS.findIndex(item=>item.id===folder.id)]||0),0);
  return '<section class="panel team-agent-detail"><div class="panel-heading"><div><div class="eyebrow">ANONYMISED MEMBER BREAKDOWN</div><h2 class="panel-title">'+esc(agent.name)+' · '+(state.importedSnapshot?"pseudonymous reference":agent.shift+" shift group")+'</h2><p class="panel-subtitle">'+(state.importedSnapshot?"Imported aggregate only. No direct colleague identity or individual workflow history is included.":"Synthetic sample only. This is a workload and allocation breakdown, not an individual performance rating.")+'</p></div><button class="panel-action" data-action="close-agent">Close profile</button></div>'+
    '<div class="team-detail-metrics"><div><span>First assignments · selected scope</span><strong>'+(state.importedSnapshot&&!importedSourceAvailable("Assignment history")?"Not supplied":fmt(firstAssigned))+'</strong></div><div><span>Current open workload</span><strong>'+fmt(agent.open)+'</strong></div><div><span>'+(state.importedSnapshot?"Roster information":"Shift group")+'</span><strong>'+(state.importedSnapshot?"Not supplied":esc(agent.shift))+'</strong><small>'+(state.importedSnapshot?"Shift times and eligibility are not part of this aggregate export.":"Indicative roster label; scheduled hours are not verified.")+'</small></div></div>'+
    '<div class="grid-two"><div><h3 class="mini-heading">First assignments by inbox</h3>'+barRows(folders.map(folder=>({label:folder.name,value:allocation.cells[FOLDERS.findIndex(item=>item.id===folder.id)],color:folder.color})))+'</div><div class="team-private-state"><strong>Individual workflow events · Not available</strong><p>Handover, reassignment, recovery and flag events are not attributed to individual profiles in the snapshot. The aggregate event ledger is shown separately and must not be distributed across members.</p></div></div>'+
    '</section>';
}function duration(minutes){return Math.floor(minutes/60)+"h "+String(minutes%60).padStart(2,"0")+"m";}
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
  })).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
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
function reliabilityBaseEvents(){
  return RELIABILITY_EVENTS.filter(event=>state.folder==="all"||event.folder===state.folder);
}
function reliabilityFilteredEvents(){
  const query=state.reliabilitySearch.trim().toLowerCase();
  return reliabilityBaseEvents().filter(event=>{
    const matchesType=state.reliabilityType==="all"||event.kind===state.reliabilityType;
    const matchesStatus=state.reliabilityStatus==="all"||event.status===state.reliabilityStatus;
    const matchesSeverity=state.reliabilitySeverity==="all"||event.severity===state.reliabilitySeverity;
    const haystack=[event.id,event.time,event.type,event.title,event.component,event.ticket,event.folder,event.actor,event.owner,event.status,event.idempotency,event.signal].join(" ").toLowerCase();
    return matchesType&&matchesStatus&&matchesSeverity&&(!query||haystack.includes(query));
  }).sort((a,b)=>b.time.localeCompare(a.time)||b.id.localeCompare(a.id));
}
function reliabilitySeverityPill(severity){
  return '<span class="reliability-severity '+esc(severity)+'">'+esc(severity.toUpperCase())+'</span>';
}
function reliabilityFolderName(id){
  return FOLDERS.find(folder=>folder.id===id)?.name||id;
}
function reliabilityEventRows(){
  const events=reliabilityFilteredEvents();
  if(!events.length)return '<div class="empty-state">No sample exception records match these filters.</div>';
  return dataTable(["Sample time","Case / ticket","Signal","Component / inbox","Severity","Outcome"],events.map(event=>
    '<tr class="'+(state.selectedReliabilityEvent===event.id?"selected":"")+'">'+
      '<td class="mono">'+esc(event.time)+'</td>'+
      '<td><button class="reliability-event-select" type="button" data-reliability-event="'+esc(event.id)+'" aria-pressed="'+(state.selectedReliabilityEvent===event.id?'true':'false')+'"><strong>'+esc(event.id)+'</strong><small>'+esc(event.ticket)+'</small></button></td>'+
      '<td>'+esc(event.type)+'</td>'+
      '<td><strong class="reliability-table-main">'+esc(event.component)+'</strong><small class="reliability-table-sub">'+esc(reliabilityFolderName(event.folder))+'</small></td>'+
      '<td>'+reliabilitySeverityPill(event.severity)+'</td>'+
      '<td>'+statusPill(event.status)+'</td>'+
    '</tr>'
  ));
}
function reliabilityDetailMarkup(event){
  if(!event)return '<div class="reliability-detail-empty"><strong>Select a sample case</strong><span>Choose an exception from the ledger to inspect its signal, impact, evidence and recommended investigation steps.</span></div>';
  return '<div class="reliability-detail-head"><div><span class="eyebrow">SYNTHETIC CASE · READ ONLY</span><h3>'+esc(event.id)+'</h3><p>'+esc(event.title)+'</p></div>'+statusPill(event.status)+'</div>'+
    '<div class="reliability-detail-facts"><div><span>Sample time</span><strong class="mono">'+esc(event.time)+'</strong></div><div><span>Ticket reference</span><strong>'+esc(event.ticket)+'</strong></div><div><span>Inbox</span><strong>'+esc(reliabilityFolderName(event.folder))+'</strong></div><div><span>Component</span><strong>'+esc(event.component)+'</strong></div><div><span>Attempts recorded</span><strong>'+event.attempts+'</strong></div><div><span>Original / sample owner</span><strong>'+esc(event.owner)+'</strong></div></div>'+
    '<div class="reliability-detail-section"><span>Signal summary</span><p>'+esc(event.signal)+'</p></div>'+
    '<div class="reliability-detail-section"><span>Impact boundary</span><p>'+esc(event.impact)+'</p></div>'+
    '<div class="reliability-detail-section"><span>Sample evidence</span><p class="mono">'+esc(event.evidence)+'</p></div>'+
    '<div class="reliability-next-step"><strong>Recommended investigation</strong><p>'+esc(event.next)+'</p></div>'+
    '<div class="reliability-idempotency"><span>Sample event / idempotency reference</span><strong class="mono">'+esc(event.idempotency)+'</strong></div>'+
    '<div class="reliability-no-action">No retry, restore, reopen or assignment action is available here. This detail view cannot change Outlook, Excel or the dispatcher.</div>';
}
function reliabilityTypeBreakdown(events){
  const labels=[
    ["write_failure","Write failures"],
    ["write_unknown","Unknown write outcomes"],
    ["recovery","Recoveries"],
    ["duplicate_delivery","Duplicate deliveries"],
    ["concurrency_conflict","Concurrency conflicts"],
    ["stale_write","Stale-write guards"],
    ["retry","Retry outcomes"]
  ];
  const maximum=Math.max(1,...labels.map(([kind])=>events.filter(event=>event.kind===kind).length));
  return '<div class="reliability-breakdown-list">'+labels.map(([kind,label])=>{
    const count=events.filter(event=>event.kind===kind).length;
    return '<div class="reliability-breakdown-row"><div><strong>'+label+'</strong><span>'+count+' sample records</span></div><div class="reliability-breakdown-track"><i style="width:'+(count/maximum*100)+'%"></i></div><b>'+count+'</b></div>';
  }).join("")+'</div>';
}
function reliabilityComponentReadiness(){
  const items=[
    ["Outlook mailbox event feed","Not connected","No live received / category event stream"],
    ["Excel tracker adapter","Not connected","No verified workbook reads or writes"],
    ["Dispatcher runtime and heartbeat","Not connected","No live process health or queue telemetry"],
    ["Recovery worker and retry queue","Not connected","No executable recovery worker or retry scheduler"],
    ["Persistent audit store","Not configured","No durable append-only event or config history"]
  ];
  return '<div class="reliability-component-list">'+items.map(item=>
    '<div><span class="reliability-component-dot"></span><div><strong>'+item[0]+'</strong><small>'+item[2]+'</small></div>'+statusPill(item[1])+'</div>'
  ).join("")+'</div>';
}
function reliabilityRecoveryPanel(events){
  const recoveries=events.filter(event=>event.kind==="recovery");
  if(!recoveries.length)return '<div class="empty-state">No recovery sample records in this inbox scope.</div>';
  return '<div class="reliability-recovery-list">'+recoveries.map(event=>
    '<div class="reliability-recovery-row"><div class="reliability-recovery-ref"><strong>'+esc(event.id)+'</strong><small>'+esc(event.ticket)+' · '+esc(reliabilityFolderName(event.folder))+'</small></div><div class="reliability-recovery-owner"><span>Original owner</span><strong>'+esc(event.owner)+'</strong></div>'+statusPill(event.status)+'<p>'+esc(event.impact)+'</p></div>'
  ).join("")+'</div>';
}
function reliabilityIntegrityPanel(events){
  const duplicates=events.filter(event=>event.kind==="duplicate_delivery");
  const conflicts=events.filter(event=>event.kind==="concurrency_conflict");
  const stale=events.filter(event=>event.kind==="stale_write");
  return '<div class="reliability-integrity-grid">'+
    '<div><span>Duplicate deliveries</span><strong>'+duplicates.length+'</strong><small>'+duplicates.filter(event=>event.status==="Suppressed (sample)").length+' carry a suppressed sample outcome</small></div>'+
    '<div><span>Concurrency conflicts</span><strong>'+conflicts.length+'</strong><small>Rejected before a sample write</small></div>'+
    '<div><span>Stale-write guards</span><strong>'+stale.length+'</strong><small>Older sample versions marked blocked</small></div>'+
    '</div>'+
    '<div class="reliability-integrity-note">A suppression or guard label in sample data is not proof that the production dispatcher prevents duplicate side effects. Production must verify stable event identity, atomic writes and the final mailbox / tracker state.</div>';
}
function renderReliability(){
  const base=reliabilityBaseEvents();
  if(state.reliabilityType!=="all"&&!base.some(event=>event.kind===state.reliabilityType))state.reliabilityType="all";
  if(state.reliabilityStatus!=="all"&&!base.some(event=>event.status===state.reliabilityStatus))state.reliabilityStatus="all";
  if(state.reliabilitySeverity!=="all"&&!base.some(event=>event.severity===state.reliabilitySeverity))state.reliabilitySeverity="all";
  const filtered=reliabilityFilteredEvents();
  if(!filtered.some(event=>event.id===state.selectedReliabilityEvent))state.selectedReliabilityEvent=filtered[0]?.id||null;
  const selected=filtered.find(event=>event.id===state.selectedReliabilityEvent)||null;
  const writeIssues=base.filter(event=>["write_failure","write_unknown"].includes(event.kind)).length;
  const pendingRecoveries=base.filter(event=>event.kind==="recovery"&&event.status==="Awaiting review").length;
  const retryRecords=base.filter(event=>event.attempts>1).length;
  const scopeLabel=state.folder==="all"?"All four inboxes":scopeName();
  pageContent.innerHTML=heading("RELIABILITY CENTRE 2.0","Investigate the exception — not just the status.","Explore synthetic write failures, retries, recovery cases and integrity guards. The screen reports what its sample records contain; it does not observe a live service.",'<button class="btn btn-secondary" data-action="reset-reliability-filters">Reset filters</button><button class="btn btn-primary" data-action="export-reliability">↓ Export incident ledger</button>')+
    '<div class="reliability-demo-strip"><span><i></i> SYNTHETIC INVESTIGATION DATA · READ ONLY</span><span>Runtime health <b>Not observable</b></span><span>Connector telemetry <b>Not connected</b></span><span>Recovery actions <b>Unavailable</b></span></div>'+
    kpiGrid([
      kpi("Sample incident records",String(base.length),"Unique synthetic exception references","◷"),
      kpi("Write issues to verify",String(writeIssues),"Rejected or unconfirmed sample outcomes","×"),
      kpi("Recoveries awaiting review",String(pendingRecoveries),"Ownership held for manual verification","↺",pendingRecoveries?"Review queue":"No sample queue","warning"),
      kpi("Cases with retry attempts",String(retryRecords),"Case records with more than one attempt","⟳"),
    ])+
    '<div class="reliability-scope-note"><strong>Scope:</strong> '+esc(scopeLabel)+'. All counts below are counts of synthetic incident records in the selected inbox scope, not live tickets, current failures or production service-level indicators. Repeated attempts remain part of one case record.</div>'+
    '<div class="grid-two reliability-overview-grid">'+
      panel("Integration and telemetry readiness","No live health claim is possible until these trusted sources are connected.",reliabilityComponentReadiness(),'<span class="subtle-tag">SOURCE STATUS</span>')+
      panel("Incident categories","Distribution of sample incident records in the selected inbox scope.",reliabilityTypeBreakdown(base),'<span class="subtle-tag">RECORD COUNTS</span>')+
    '</div>'+
    '<div class="section-heading reliability-section-heading"><div><h2>Exception investigation ledger</h2><p>Filter the sample cases, then open a record for its evidence and recommended next checks.</p></div><span class="subtle-tag">NO LIVE EVENT STREAM</span></div>'+
    '<section class="panel reliability-ledger-panel">'+
      '<div class="reliability-filter-toolbar">'+
        '<label class="live-queue-search"><span>⌕</span><input type="search" data-reliability-search value="'+esc(state.reliabilitySearch)+'" placeholder="Search case, ticket, component or key…" aria-label="Search reliability events" autocomplete="off"></label>'+
        '<label><span class="live-filter-label">CATEGORY</span><select class="live-select" data-reliability-filter="reliabilityType"><option value="all">All categories</option>'+[
          ["write_failure","Write failure"],["write_unknown","Write outcome unknown"],["recovery","Recovery"],["duplicate_delivery","Duplicate delivery"],["concurrency_conflict","Concurrency conflict"],["retry","Retry"],["stale_write","Stale write guard"]
        ].map(([value,label])=>'<option value="'+value+'" '+(state.reliabilityType===value?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
        '<label><span class="live-filter-label">SEVERITY</span><select class="live-select" data-reliability-filter="reliabilitySeverity"><option value="all">All severities</option>'+["critical","warning","info"].map(value=>'<option value="'+value+'" '+(state.reliabilitySeverity===value?"selected":"")+'>'+value.toUpperCase()+'</option>').join("")+'</select></label>'+
        '<label><span class="live-filter-label">OUTCOME</span><select class="live-select" data-reliability-filter="reliabilityStatus"><option value="all">All outcomes</option>'+[...new Set(base.map(event=>event.status))].map(value=>'<option value="'+esc(value)+'" '+(state.reliabilityStatus===value?"selected":"")+'>'+esc(value)+'</option>').join("")+'</select></label>'+
      '</div>'+
      '<div class="live-queue-meta"><span id="reliabilityLedgerCount">Showing '+filtered.length+' of '+base.length+' sample cases in '+esc(scopeLabel)+'</span><span>Repeated retries are not counted as separate cases</span></div>'+
      '<div id="reliabilityLedgerRows">'+reliabilityEventRows()+'</div>'+
    '</section>'+
    '<div id="reliabilityCaseDetail" class="panel reliability-case-panel">'+reliabilityDetailMarkup(selected)+'</div>'+
    '<div class="grid-two reliability-secondary-grid">'+
      panel("Recovery review queue","Preserve the original owner until the latest mailbox and tracker state has been verified.",reliabilityRecoveryPanel(base),'<span class="subtle-tag">'+pendingRecoveries+' AWAITING REVIEW</span>')+
      panel("Duplicate and write-integrity signals","Sample observations for deduplication, concurrency and stale-write protection.",reliabilityIntegrityPanel(base),'<span class="subtle-tag">GUARDRAIL EVIDENCE</span>')+
    '</div>'+
    '<div class="reliability-principle-grid">'+
      '<div><strong>Never blindly retry a timeout</strong><span>Read the canonical mailbox and tracker state before considering another write.</span></div>'+
      '<div><strong>One canonical event identity</strong><span>Retries and repeated deliveries must retain one idempotency identity and a linked attempt history.</span></div>'+
      '<div><strong>Preserve original ownership</strong><span>Recovery should restore the valid original owner or hold for review, never silently choose a new owner.</span></div>'+
      '<div><strong>Verify before green</strong><span>Only a backend acknowledgement plus independent state verification can confirm an operational success.</span></div>'+
    '</div>'+
    '<div class="reliability-final-note"><strong>Production boundary:</strong> this public page contains synthetic case records only. It has no live heartbeat, event ingestion, Excel / Outlook connector, recovery worker, queue control, persistent audit store or permission-checked operational action. Do not use it to decide whether a real assignment has succeeded or failed.</div>';
}
function exportReliability(){
  const events=reliabilityFilteredEvents();
  const rows=[
    ["RELIABILITY CENTRE 2.0 — SYNTHETIC DATA ONLY"],
    ["Scope",state.folder==="all"?"All four inboxes":scopeName()],
    ["Note","These sample case records do not represent current live system health or actual mailbox incidents."],
    [],
    ["Case reference","Sample time","Ticket","Inbox","Category","Severity","Outcome","Component","Attempts","Sample owner","Idempotency reference","Signal summary","Impact boundary","Sample evidence","Recommended investigation"],
    ...events.map(event=>[event.id,event.time,event.ticket,reliabilityFolderName(event.folder),event.type,event.severity,event.status,event.component,event.attempts,event.owner,event.idempotency,event.signal,event.impact,event.evidence,event.next])
  ];
  csvDownload("dispatcher-sample-reliability-investigation.csv",rows);
}

function auditBaseEvents(){
  return AUDIT_LEDGER.filter(event=>state.folder==="all"||event.folder===state.folder);
}
function auditFilteredEvents(){
  let events=auditBaseEvents();
  if(state.auditCategory!=="all")events=events.filter(event=>event.category===state.auditCategory);
  if(state.auditOutcome!=="all")events=events.filter(event=>event.outcome===state.auditOutcome);
  if(state.auditActor!=="all")events=events.filter(event=>event.actor===state.auditActor);
  const term=state.auditSearch.trim().toLowerCase();
  if(term)events=events.filter(event=>[
    event.id,event.occurredAt,event.category,event.event,event.actor,event.role,event.entity,event.folder,event.ticket,
    event.correlation,event.outcome,event.reason,event.approver,event.approval,event.source,event.evidence,
    JSON.stringify(event.before),JSON.stringify(event.after)
  ].join(" ").toLowerCase().includes(term));
  return events;
}
function auditStats(events){
  return {
    eventCount:events.length,
    ticketCount:new Set(events.map(event=>event.ticket).filter(Boolean)).size,
    configurationCount:events.filter(event=>event.category==="Configuration").length,
    exceptionCount:events.filter(event=>event.category==="Exception"||event.outcome==="Held for review"||event.outcome==="Blocked — no backend").length
  };
}
function auditSelectOptions(values,selected,label){
  return '<option value="all">'+label+'</option>'+values.map(value=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(value)+'</option>').join("");
}
function auditFilterToolbar(){
  const base=auditBaseEvents();
  const categories=[...new Set(base.map(event=>event.category))].sort();
  const outcomes=[...new Set(base.map(event=>event.outcome))].sort();
  const actors=[...new Set(base.map(event=>event.actor))].sort();
  return '<div class="audit-filter-toolbar">'+
    '<label class="live-queue-search"><span>SEARCH THE AUDIT LEDGER</span><input type="search" data-audit-search placeholder="Event ID, ticket, actor, reason or correlation…" value="'+esc(state.auditSearch)+'" autocomplete="off"></label>'+
    '<label class="filter-control"><span>CATEGORY</span><select data-audit-filter="auditCategory">'+auditSelectOptions(categories,state.auditCategory,"All categories")+'</select></label>'+
    '<label class="filter-control"><span>OUTCOME</span><select data-audit-filter="auditOutcome">'+auditSelectOptions(outcomes,state.auditOutcome,"All outcomes")+'</select></label>'+
    '<label class="filter-control"><span>ACTOR</span><select data-audit-filter="auditActor">'+auditSelectOptions(actors,state.auditActor,"All actors")+'</select></label>'+
  '</div>';
}
function auditEventRows(){
  return dataTable(["Recorded (UK)","Event / reference","Actor","Affected entity","Outcome"],auditFilteredEvents().map(event=>
    '<tr class="audit-ledger-row'+(event.id===state.selectedAuditEvent?' selected':'')+'">'+
      '<td class="mono audit-time-cell">'+esc(event.occurredAt)+'</td>'+
      '<td><button type="button" class="audit-select-event" data-audit-event="'+esc(event.id)+'"><strong>'+esc(event.event)+'</strong><small>'+esc(event.id)+' · '+esc(event.category)+'</small></button></td>'+
      '<td><strong class="audit-actor-name">'+esc(event.actor)+'</strong><small class="audit-actor-role">'+esc(event.role)+'</small></td>'+
      '<td><strong class="audit-entity-name">'+esc(event.entity)+'</strong><small class="audit-entity-scope">'+(event.folder?esc(FOLDERS.find(folder=>folder.id===event.folder)?.name||event.folder):'Platform scope')+'</small></td>'+
      '<td>'+statusPill(event.outcome)+'</td>'+
    '</tr>'
  ),"No sample audit records match the current search and filters.");
}
function auditValueRows(values){
  if(!values||typeof values!=="object"||!Object.keys(values).length)return '<div class="audit-value-empty">Not recorded in this sample event</div>';
  return Object.entries(values).map(([key,value])=>'<div class="audit-value-row"><span>'+esc(key.replace(/([A-Z])/g," $1").replace(/^./,ch=>ch.toUpperCase()))+'</span><strong>'+esc(value)+'</strong></div>').join("");
}
function auditDetailMarkup(event){
  if(!event)return '<div class="audit-empty"><strong>No event selected</strong><span>Change the filters or clear the search to inspect a sample record.</span></div>';
  return '<div class="audit-detail-head"><div><span class="audit-overline">'+esc(event.id)+' · '+esc(event.category)+'</span><h3>'+esc(event.event)+'</h3></div>'+statusPill(event.outcome)+'</div>'+
    '<div class="audit-detail-facts">'+
      '<div><span>Recorded time</span><strong>'+esc(event.occurredAt)+'</strong></div>'+
      '<div><span>Actor</span><strong>'+esc(event.actor)+'</strong><small>'+esc(event.role)+'</small></div>'+
      '<div><span>Affected record</span><strong>'+esc(event.entity)+'</strong></div>'+
      '<div><span>Correlation ID</span><strong class="mono">'+esc(event.correlation)+'</strong></div>'+
    '</div>'+
    '<div class="audit-diff-heading"><strong>Before and after</strong><span>Values carried by this sample event</span></div>'+
    '<div class="audit-diff-grid"><article><h4>BEFORE</h4>'+auditValueRows(event.before)+'</article><article><h4>AFTER</h4>'+auditValueRows(event.after)+'</article></div>'+
    '<div class="audit-detail-meta">'+
      '<div><span>Reason / context</span><p>'+esc(event.reason)+'</p></div>'+
      '<div><span>Approval record</span><p>'+esc(event.approval)+' · Approver: '+esc(event.approver)+'</p></div>'+
      '<div><span>Source</span><p>'+esc(event.source)+'</p></div>'+
      '<div><span>Evidence / reconciliation note</span><p>'+esc(event.evidence)+'</p></div>'+
    '</div>'+
    '<div class="audit-detail-disclaimer">Synthetic event record. Actor labels, timestamps, approval states and evidence are examples only; none were ingested from Outlook, Excel or a production audit service.</div>';
}
function auditRelatedEvents(event){
  if(!event)return [];
  const related=event.ticket?AUDIT_LEDGER.filter(item=>item.ticket===event.ticket):AUDIT_LEDGER.filter(item=>item.correlation===event.correlation);
  return related.slice().sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt));
}
function auditTimelineMarkup(event){
  if(!event)return '<div class="audit-empty"><strong>No related timeline</strong><span>Select an event to see its ticket or correlation sequence.</span></div>';
  const related=auditRelatedEvents(event);
  const heading=event.ticket?"Ticket timeline · "+event.ticket:"Configuration / entity timeline · "+event.entity;
  return '<div class="audit-timeline-heading"><strong>'+esc(heading)+'</strong><span>'+related.length+' linked sample events</span></div>'+
    '<div class="audit-timeline-list">'+related.map(item=>
      '<button type="button" class="audit-timeline-event'+(item.id===event.id?' selected':'')+'" data-audit-event="'+esc(item.id)+'">'+
        '<span class="audit-timeline-marker"></span><span class="audit-timeline-copy"><strong>'+esc(item.event)+'</strong><small>'+esc(item.occurredAt)+' · '+esc(item.actor)+'</small></span>'+
        '<span class="audit-timeline-outcome">'+esc(item.outcome)+'</span>'+
      '</button>'
    ).join("")+'</div>';
}
function refreshAuditPanels(){
  const filtered=auditFilteredEvents();
  if(!filtered.some(event=>event.id===state.selectedAuditEvent))state.selectedAuditEvent=filtered[0]?.id||null;
  const selected=filtered.find(event=>event.id===state.selectedAuditEvent)||null;
  const count=document.getElementById("auditLedgerCount");
  const rows=document.getElementById("auditLedgerRows");
  const detail=document.getElementById("auditEventDetail");
  const timeline=document.getElementById("auditRelatedTimeline");
  if(count)count.textContent="Showing "+filtered.length+" of "+auditBaseEvents().length+" sample events · "+(state.folder==="all"?"All four inboxes":scopeName());
  if(rows)rows.innerHTML=auditEventRows();
  if(detail)detail.innerHTML=auditDetailMarkup(selected);
  if(timeline)timeline.innerHTML=auditTimelineMarkup(selected);
}
function renderAudit(){
  const base=auditBaseEvents();
  for(const [key,field] of [["auditCategory","category"],["auditOutcome","outcome"],["auditActor","actor"]]){
    if(state[key]!=="all"&&!base.some(event=>event[field]===state[key]))state[key]="all";
  }
  const filtered=auditFilteredEvents(),stats=auditStats(base);
  if(!filtered.some(event=>event.id===state.selectedAuditEvent))state.selectedAuditEvent=filtered[0]?.id||null;
  const selected=filtered.find(event=>event.id===state.selectedAuditEvent)||null;
  pageContent.innerHTML=heading("AUDIT HISTORY 2.0","Trace every change, decision and outcome.","Investigate sample ticket events, manager approvals, configuration history and exception evidence. This is a read-only demonstration ledger, not a production audit source.",'<button class="btn btn-secondary" data-action="reset-audit-filters">Reset filters</button><button class="btn btn-primary" data-action="export-audit">↓ Export filtered ledger</button>')+
    '<div class="audit-demo-strip"><span><i></i> SYNTHETIC AUDIT DATA · READ ONLY</span><span>Persistent audit store <b>Not configured</b></span><span>Verified actor identity <b>Not available</b></span><span>Event integrity <b>Not verified</b></span></div>'+
    kpiGrid([
      kpi("Sample audit events",fmt(stats.eventCount),"Unique event records in this inbox scope","◷"),
      kpi("Ticket timelines",fmt(stats.ticketCount),"Distinct ticket references represented","▤"),
      kpi("Configuration records",fmt(stats.configurationCount),"Draft, review and blocked examples","⚙"),
      kpi("Exceptions / holds",fmt(stats.exceptionCount),"Exception, hold or blocked outcomes","!")
    ])+
    '<div class="audit-filter-wrap">'+auditFilterToolbar()+'<div class="audit-result-count" id="auditLedgerCount">Showing '+filtered.length+' of '+base.length+' sample events · '+(state.folder==="all"?"All four inboxes":esc(scopeName()))+'</div></div>'+
    '<div class="audit-workspace"><div class="audit-ledger-column">'+
      panel("Event ledger","Every row is one synthetic event record; repeated attempts are retained inside the record where relevant.",'<div id="auditLedgerRows">'+auditEventRows()+'</div>','<span class="subtle-tag">APPEND-ONLY MODEL · NOT PERSISTED</span>')+
    '</div><div class="audit-detail-column">'+
      panel("Event investigation","Actor, context, approval and value changes",'<div id="auditEventDetail">'+auditDetailMarkup(selected)+'</div>','<span class="subtle-tag">READ ONLY</span>')+
    '</div></div>'+
    panel("Related ticket and correlation timeline","Follow the sequence for the selected ticket, or the correlation chain for a configuration or access record.",'<div id="auditRelatedTimeline">'+auditTimelineMarkup(selected)+'</div>')+
    panel("Production audit contract","The fields the future authenticated audit service must preserve",'<div class="audit-contract-grid"><div><strong>Stable event identity</strong><span>Unique event ID, source ID and idempotency reference.</span></div><div><strong>Trusted actor attribution</strong><span>Authenticated principal, role, initiator and approver.</span></div><div><strong>Timezone-aware time</strong><span>UTC timestamp plus explicit UK mailbox or Egypt shift context.</span></div><div><strong>Change evidence</strong><span>Before / after values, reason, approval and source reference.</span></div><div><strong>Verified outcome</strong><span>Requested, approved, applied, acknowledged, reconciled or failed.</span></div><div><strong>Append-only corrections</strong><span>Corrections create linked events; earlier records are never silently overwritten.</span></div></div>','<span class="subtle-tag">DESIGN REQUIREMENTS</span>')+
    '<div class="audit-final-note"><strong>Prototype boundary:</strong> this page does not provide a tamper-evident ledger, authenticated actor identity, persistent audit storage, real approval workflow or production event ingestion. The “append-only” label describes the model being demonstrated, not a guarantee enforced by this static public site.</div>';
}
function renderReports(){
  pageContent.innerHTML=heading("REPORTING","Make the operation measurable","Prepare consistent daily, weekly and monthly snapshots for managers.",'<a class="btn btn-primary" href="./reporting-studio.html">Open local reporting studio ↗</a>')+
    '<div class="reporting-privacy-banner"><span class="reporting-privacy-icon">✓</span><div><strong>Separate reporting from live operations</strong><span>The studio processes selected CSV files locally in your browser. It has no mailbox, Worker or D1 connection and does not upload raw files.</span></div></div>'+
    '<div class="report-grid">'+
      reportCard("Daily operations report","Tickets received, assigned, resolved, open backlog and inbox distribution.","Daily","CSV export ready")+
      reportCard("Weekly performance report","Team allocation, shift comparison, handovers, flags and resolution trends.","Weekly","CSV export ready")+
      reportCard("Monthly management report","Brand volumes, folder share, service performance and exception trends.","Monthly","CSV export ready")+
      reportCard("Individual performance report","Private per-agent workload and resolution summary with scheduled-hour context.","Individual","Permission required")+
      reportCard("Brand volume report","Distinct ticket counts and brand share across all inboxes.","By brand","CSV export ready")+
      reportCard("Reliability report","Assignment failures, recoveries, retries and service health.","System","CSV export ready")+
      '<article class="report-card report-studio-card"><div class="report-card-icon">✓</div><span class="subtle-tag">LOCAL ONLY</span><h3>Offline sanitisation studio</h3><p>Map tracker CSV columns, remove direct identifiers, create stable pseudonymous agent references and export aggregate reporting files.</p><div class="report-card-foot"><span>Raw files stay on this device</span><a class="panel-action" href="./reporting-studio.html">Open studio ↗</a></div></article>'+
    '</div>'+
    panel("Current report scope","The selected global period and inbox filters apply",'<div class="report-scope"><div><span>Period</span><strong>'+PERIODS[state.period].label+'</strong></div><div><span>Inbox</span><strong>'+scopeName()+'</strong></div><div><span>Data status</span><strong>Demonstration only</strong></div></div>',"");
}
function reportCard(title,copy,tag,foot){
  return '<article class="report-card"><div class="report-card-icon">▤</div><span class="subtle-tag">'+tag+'</span><h3>'+title+'</h3><p>'+copy+'</p><div class="report-card-foot"><span>'+foot+'</span><button class="panel-action" data-action="export-summary">Export ↗</button></div></article>';
}
function adminRoleById(id){
  return ADMIN_ROLE_PROFILES.find(role=>role.id===id)||ADMIN_ROLE_PROFILES[0];
}
function adminRoleCards(){
  return '<div class="admin-role-cards">'+ADMIN_ROLE_PROFILES.map(role=>
    '<button type="button" class="admin-role-card'+(role.id===state.adminRole?' selected':'')+'" data-admin-role="'+esc(role.id)+'" aria-pressed="'+(role.id===state.adminRole?'true':'false')+'">'+
      '<span class="admin-role-level">'+esc(role.level)+'</span><strong>'+esc(role.title)+'</strong><small>'+esc(role.scope)+'</small><span class="admin-role-count">'+role.permissions.length+' proposed permissions</span>'+
    '</button>'
  ).join("")+'</div>';
}
function adminRoleDetail(){
  const role=adminRoleById(state.adminRole);
  const grouped=[...new Set(ADMIN_PERMISSION_CATALOG.map(item=>item.group))];
  return '<div class="admin-role-detail-head"><div><span class="admin-overline">PROPOSED ROLE PROFILE · '+esc(role.level.toUpperCase())+'</span><h3>'+esc(role.title)+'</h3><p>'+esc(role.scope)+'</p></div>'+statusPill("Design only")+'</div>'+
    '<div class="admin-role-purpose"><strong>Intended responsibilities</strong><p>'+esc(role.purpose)+'</p></div>'+
    '<div class="admin-role-purpose restricted"><strong>Privilege boundary</strong><p>'+esc(role.boundaries)+'</p></div>'+
    '<div class="admin-permission-groups">'+grouped.map(group=>{
      const permissions=ADMIN_PERMISSION_CATALOG.filter(item=>item.group===group);
      return '<section><h4>'+esc(group)+'</h4>'+permissions.map(item=>
        '<div class="admin-permission-line"><span>'+esc(item.label)+'</span><strong class="'+(role.permissions.includes(item.code)?'proposed-yes':'proposed-no')+'">'+(role.permissions.includes(item.code)?'Proposed':'Not proposed')+'</strong></div>'
      ).join("")+'</section>';
    }).join("")+'</div>';
}
function adminPermissionMatrix(){
  return dataTable(["Capability",...ADMIN_ROLE_PROFILES.map(role=>role.title)],ADMIN_PERMISSION_CATALOG.map(permission=>
    '<tr><td><strong class="admin-capability-name">'+esc(permission.label)+'</strong><small class="admin-capability-group">'+esc(permission.group)+'</small></td>'+
    ADMIN_ROLE_PROFILES.map(role=>'<td><span class="'+(role.permissions.includes(permission.code)?'admin-matrix-yes':'admin-matrix-no')+'">'+(role.permissions.includes(permission.code)?'Proposed':'—')+'</span></td>').join("")+
    '</tr>'
  ));
}
function adminRequestsFiltered(){
  const query=state.adminRequestSearch.trim().toLowerCase();
  return ADMIN_ACCESS_REQUESTS.filter(request=>{
    const statusMatch=state.adminRequestStatus==="all"||request.status===state.adminRequestStatus;
    const haystack=[request.id,request.requester,request.currentRole,request.requestedRole,request.scope,request.status,request.risk,request.reason,request.reviewer,request.evidence].join(" ").toLowerCase();
    return statusMatch&&(!query||haystack.includes(query));
  });
}
function adminRequestRows(){
  const requests=adminRequestsFiltered();
  if(!requests.length)return '<div class="admin-empty"><strong>No matching sample requests</strong><span>Change the search or status filter to inspect another example.</span></div>';
  return dataTable(["Submitted","Request / requester","Requested access","Risk","Decision"],requests.map(request=>
    '<tr><td class="mono">'+esc(request.submittedAt)+'</td>'+
    '<td><button type="button" class="admin-request-select" data-admin-request="'+esc(request.id)+'" aria-pressed="'+(request.id===state.selectedAdminRequest?'true':'false')+'"><strong>'+esc(request.id)+'</strong><small>'+esc(request.requester)+'</small></button></td>'+
    '<td><strong class="admin-capability-name">'+esc(request.requestedRole)+'</strong><small class="admin-capability-group">'+esc(request.scope)+'</small></td>'+
    '<td>'+statusPill(request.risk)+'</td><td>'+statusPill(request.status)+'</td></tr>'
  ));
}
function adminRequestDetail(){
  const request=adminRequestsFiltered().find(item=>item.id===state.selectedAdminRequest);
  if(!request)return '<div class="admin-empty"><strong>No request selected</strong><span>Select one of the sample requests to inspect the business case, review evidence and next step.</span></div>';
  return '<div class="admin-request-detail-head"><div><span class="admin-overline">'+esc(request.id)+' · SAMPLE REQUEST</span><h3>'+esc(request.requestedRole)+'</h3><p>'+esc(request.requester)+' · Current role: '+esc(request.currentRole)+'</p></div>'+statusPill(request.status)+'</div>'+
    '<div class="admin-request-facts"><div><span>Submitted</span><strong>'+esc(request.submittedAt)+'</strong></div><div><span>Risk label</span><strong>'+esc(request.risk)+'</strong></div><div><span>Reviewer</span><strong>'+esc(request.reviewer)+'</strong></div><div><span>Outcome</span><strong>'+esc(request.outcome)+'</strong></div></div>'+
    '<div class="admin-request-context"><span>Requested scope</span><p>'+esc(request.scope)+'</p></div>'+
    '<div class="admin-request-context"><span>Business reason</span><p>'+esc(request.reason)+'</p></div>'+
    '<div class="admin-request-context"><span>Approval evidence</span><p>'+esc(request.approval)+' · '+esc(request.evidence)+'</p></div>'+
    '<div class="admin-request-next"><strong>Required next step</strong><p>'+esc(request.next)+'</p></div>'+
    '<div class="admin-readonly-note">Read-only example. No approve, deny, grant, revoke or role-change action is available in this public prototype.</div>';
}
function refreshAdminRequestPanels(){
  const filtered=adminRequestsFiltered();
  if(!filtered.some(item=>item.id===state.selectedAdminRequest))state.selectedAdminRequest=filtered[0]?.id||null;
  const count=document.getElementById("adminRequestCount");
  const rows=document.getElementById("adminRequestRows");
  const detail=document.getElementById("adminRequestDetail");
  if(count)count.textContent="Showing "+filtered.length+" of "+ADMIN_ACCESS_REQUESTS.length+" synthetic access requests";
  if(rows)rows.innerHTML=adminRequestRows();
  if(detail)detail.innerHTML=adminRequestDetail();
}
function adminSecurityControlsMarkup(){
  return '<div class="admin-control-grid">'+ADMIN_SECURITY_CONTROLS.map(control=>
    '<article class="admin-control-card"><div class="admin-control-card-top"><span>'+esc(control.area)+'</span>'+statusPill(control.status)+'</div>'+
    '<div class="admin-risk-line"><span>Control priority</span>'+statusPill(control.risk)+'</div>'+
    '<p>'+esc(control.detail)+'</p><div class="admin-control-required"><strong>Production requirement</strong><span>'+esc(control.requirement)+'</span></div></article>'
  ).join("")+'</div>';
}
function adminRetentionMarkup(){
  return dataTable(["Data class","Purpose","Retention period","Policy owner","Disposition"],ADMIN_RETENTION_POLICIES.map(policy=>
    '<tr><td><strong class="admin-capability-name">'+esc(policy.data)+'</strong></td><td>'+esc(policy.purpose)+'</td><td>'+statusPill(policy.period)+'</td><td>'+esc(policy.owner)+'</td><td>'+esc(policy.disposal)+'</td></tr>'
  ));
}
function adminIntegrationMarkup(){
  return dataTable(["System boundary","Intended use","Connection state","Secret status","Readiness gate"],ADMIN_INTEGRATIONS.map(item=>
    '<tr><td><strong class="admin-capability-name">'+esc(item.name)+'</strong></td><td>'+esc(item.boundary)+'</td><td>'+statusPill(item.status)+'</td><td>'+statusPill(item.secret)+'</td><td>'+esc(item.gate)+'</td></tr>'
  ));
}
function adminTimeBoundaryMarkup(){
  return dataTable(["Time domain","IANA zone","Storage / display rule","Readiness","Implementation note"],ADMIN_TIME_BOUNDARIES.map(item=>
    '<tr><td><strong class="admin-capability-name">'+esc(item.domain)+'</strong></td><td><strong class="mono">'+esc(item.zone)+'</strong></td><td>'+esc(item.storage)+'</td><td>'+statusPill(item.status)+'</td><td>'+esc(item.note)+'</td></tr>'
  ));
}
function renderAdmin(){
  const pending=ADMIN_ACCESS_REQUESTS.filter(item=>/Awaiting|Returned/.test(item.status)).length;
  const notReady=ADMIN_SECURITY_CONTROLS.filter(item=>item.status!=="Configured").length;
  const roleCount=ADMIN_ROLE_PROFILES.length;
  const retentionPending=ADMIN_RETENTION_POLICIES.filter(item=>item.period==="Not agreed").length;
  if(!ADMIN_ROLE_PROFILES.some(role=>role.id===state.adminRole))state.adminRole="operations_manager";
  const filtered=adminRequestsFiltered();
  if(!filtered.some(item=>item.id===state.selectedAdminRequest))state.selectedAdminRequest=filtered[0]?.id||null;
  pageContent.innerHTML=heading("ADMINISTRATION & SECURITY 2.0","Design access deliberately. Enforce it on the server.","A manager-facing governance workspace for roles, access reviews, security controls, data retention and integration boundaries. Everything on this page is a proposal or synthetic example.",'<button class="btn btn-secondary" data-action="reset-admin-review">Reset review filters</button><button class="btn btn-primary" data-action="export-admin-security">↓ Export security blueprint</button>')+
    '<div class="admin-demo-strip"><span><i></i> DESIGN CATALOGUE · SYNTHETIC REVIEW CASES · READ ONLY</span><span>Authentication <b>Not configured</b></span><span>Server-side permissions <b>Not configured</b></span><span>Production changes <b>Unavailable</b></span></div>'+
    kpiGrid([
      kpi("Proposed role profiles",String(roleCount),"Role templates for policy review","♙"),
      kpi("Access requests for review",String(pending),"Synthetic pending / returned examples","◎"),
      kpi("Security controls not ready",String(notReady),"No control is verified as configured","◇"),
      kpi("Retention policies to agree",String(retentionPending),"No retention period has been approved","◷")
    ])+
    panel("Role profile explorer","Select a role to inspect its proposed purpose, scope and least-privilege permissions",adminRoleCards()+'<div id="adminRoleDetail">'+adminRoleDetail()+'</div>','<span class="subtle-tag">PROPOSED RBAC · NOT ENFORCED</span>')+
    panel("Permission comparison matrix","Proposed capability coverage by role. Blank means not proposed; every row requires security and business-owner approval.",'<div class="admin-matrix-wrap">'+adminPermissionMatrix()+'</div>','<span class="subtle-tag">POLICY DESIGN ONLY</span>')+
    panel("Access request review queue","Inspect synthetic requests and their evidence. These are not real colleague access requests.",'<div class="admin-request-filter"><label><span>SEARCH REQUESTS</span><input type="search" data-admin-request-search placeholder="Request ID, requester, scope or reason…" value="'+esc(state.adminRequestSearch)+'"></label><label><span>REVIEW STATUS</span><select data-admin-request-filter>'+auditSelectOptions([...new Set(ADMIN_ACCESS_REQUESTS.map(item=>item.status))],state.adminRequestStatus,"All sample statuses")+'</select></label></div><div class="admin-result-count" id="adminRequestCount">Showing '+filtered.length+' of '+ADMIN_ACCESS_REQUESTS.length+' synthetic access requests</div><div class="admin-request-layout"><div class="admin-request-ledger" id="adminRequestRows">'+adminRequestRows()+'</div><div class="admin-request-inspector" id="adminRequestDetail">'+adminRequestDetail()+'</div></div>','<span class="subtle-tag">NO GRANT / REVOKE CONTROLS</span>')+
    panel("Security control baseline","The controls required before any real customer, ticket or employee data is loaded",adminSecurityControlsMarkup(),'<span class="subtle-tag">ALL CONTROLS UNVERIFIED</span>')+
    panel("Data retention and disposal","Retention periods require approved business, legal and data-protection decisions. No period is assumed here.",'<div class="admin-retention-note">Do not store real customer or employee data in this public demo. Define separate rules for active records, audit evidence, exports, backups and legal holds before production.</div>'+adminRetentionMarkup())+
    panel("Integration and secret boundaries","Connector credentials must stay in a protected server-side secret manager; the browser must never receive secret values.",adminIntegrationMarkup())+
    panel("Operational timezone boundaries","Store canonical event instants in UTC. Keep UK mailbox display and Egypt-local roster interpretation explicit.",adminTimeBoundaryMarkup())+
    panel("Secure access lifecycle","Proposed production request path — the public prototype cannot execute any of these steps.",'<div class="admin-lifecycle">'+[
      ["01","Request","User identity and business reason captured"],
      ["02","Verify","Identity, employment status and scope checked"],
      ["03","Review","Independent owner approves or declines"],
      ["04","Enforce","Server validates role on every protected operation"],
      ["05","Audit","Decision, actor, before/after and result appended"]
    ].map((item,index)=>'<div><b>'+item[0]+'</b><strong>'+item[1]+'</strong><span>'+item[2]+'</span></div>'+(index<4?'<i>→</i>':'')).join("")+'</div>')+
    '<div class="admin-final-note"><strong>Production boundary:</strong> this static public page does not authenticate users, enforce roles, create accounts, approve requests, issue sessions, store secrets, connect Outlook or Excel, or define legally approved retention periods. Hiding controls in browser code is not security. Production access must be enforced by a trusted server with identity verification, least-privilege authorisation, protected storage and auditable outcomes.</div>';
}
function render(){
  document.getElementById("topbarPage").textContent=VIEW_TITLES[state.view]||"Overview";
  pageContent.dataset.view=state.view;
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
function exportAuditHistory(){
  const rows=[
    ["Event ID","Recorded time (UK sample)","Category","Event","Actor","Actor role","Affected entity","Inbox","Ticket","Correlation ID","Outcome","Reason","Approver","Approval","Before","After","Source","Evidence"],
    ...auditFilteredEvents().map(event=>[
      event.id,event.occurredAt,event.category,event.event,event.actor,event.role,event.entity,
      event.folder?FOLDERS.find(folder=>folder.id===event.folder)?.name||event.folder:"Platform scope",
      event.ticket,event.correlation,event.outcome,event.reason,event.approver,event.approval,
      JSON.stringify(event.before),JSON.stringify(event.after),event.source,event.evidence
    ])
  ];
  csvDownload("dispatcher-sample-audit-history.csv",rows);
}
function exportAdminSecurityBlueprint(){
  const rows=[["Section","Name","Scope / detail","Status / permission","Evidence / notes"]];
  ADMIN_ROLE_PROFILES.forEach(role=>rows.push(["Role",role.title,role.scope,role.permissions.join("; "),role.boundaries]));
  ADMIN_PERMISSION_CATALOG.forEach(permission=>rows.push(["Permission",permission.label,permission.group,permission.code,"Role mapping is a proposal only"]));
  ADMIN_ACCESS_REQUESTS.forEach(request=>rows.push(["Synthetic access request",request.id,request.requester+" · "+request.requestedRole,request.status,request.reason+" | "+request.approval+" | "+request.outcome]));
  ADMIN_SECURITY_CONTROLS.forEach(control=>rows.push(["Security control",control.area,control.detail,control.status,control.requirement]));
  ADMIN_RETENTION_POLICIES.forEach(policy=>rows.push(["Retention",policy.data,policy.purpose,policy.period,policy.owner+" | "+policy.disposal]));
  ADMIN_INTEGRATIONS.forEach(item=>rows.push(["Integration",item.name,item.boundary,item.status,item.secret+" | "+item.gate]));
  ADMIN_TIME_BOUNDARIES.forEach(item=>rows.push(["Time boundary",item.domain,item.zone,item.status,item.storage+" | "+item.note]));
  csvDownload("dispatcher-proposed-admin-security-blueprint.csv",rows);
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
  if(action==="export-audit"){exportAuditHistory();return;}
  if(action==="reset-audit-filters"){state.auditSearch="";state.auditCategory="all";state.auditOutcome="all";state.auditActor="all";state.selectedAuditEvent=null;renderAudit();return;}
  if(action==="export-admin-security"){exportAdminSecurityBlueprint();return;}
  if(action==="reset-admin-review"){state.adminRequestSearch="";state.adminRequestStatus="all";state.adminRole="operations_manager";state.selectedAdminRequest="ACCESS-SAMPLE-004";renderAdmin();return;}
  if(action==="export-summary"){exportSummary();return;}
  if(action==="close-agent"){state.selectedAgent=null;render();return;}
  if(action==="close-roster-agent"){state.selectedRosterAgent=null;render();return;}
  if(action==="reset-roster-filters"){state.rosterSearch="";state.rosterShift="all";state.rosterAvailability="all";state.selectedRosterAgent=null;render();return;}
  if(action==="rules-preview"){const target=document.getElementById("configPreviewPanel");if(target)target.scrollIntoView({behavior:"smooth",block:"center"});return;}
  if(action==="reset-config-preview"){state.configPreviewFolder="agency";state.configPreviewWeight=50;renderRules();showToast("Local scenario reset. No dispatch settings were changed.");return;}
  if(action==="export-config"){exportConfiguration();return;}
  if(action==="export-reliability"){exportReliability();return;}
  if(action==="reset-reliability-filters"){state.reliabilitySearch="";state.reliabilityType="all";state.reliabilityStatus="all";state.reliabilitySeverity="all";state.selectedReliabilityEvent=null;renderReliability();return;}
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
  const reliabilityFilter=event.target.closest("[data-reliability-filter]");
  if(reliabilityFilter){
    state[reliabilityFilter.dataset.reliabilityFilter]=reliabilityFilter.value;
    renderReliability();
  }
  const auditFilter=event.target.closest("[data-audit-filter]");
  if(auditFilter){
    state[auditFilter.dataset.auditFilter]=auditFilter.value;
    renderAudit();
  }
  const adminRequestFilter=event.target.closest("[data-admin-request-filter]");
  if(adminRequestFilter){
    state.adminRequestStatus=adminRequestFilter.value;
    renderAdmin();
  }
});
document.addEventListener("input",event=>{
  const adminSearch=event.target.closest("[data-admin-request-search]");
  if(adminSearch){
    state.adminRequestSearch=adminSearch.value;
    refreshAdminRequestPanels();
    return;
  }
  const auditSearch=event.target.closest("[data-audit-search]");
  if(auditSearch){
    state.auditSearch=auditSearch.value;
    refreshAuditPanels();
    return;
  }
  const reliabilitySearch=event.target.closest("[data-reliability-search]");
  if(reliabilitySearch){
    state.reliabilitySearch=reliabilitySearch.value;
    const filtered=reliabilityFilteredEvents();
    if(!filtered.some(item=>item.id===state.selectedReliabilityEvent))state.selectedReliabilityEvent=filtered[0]?.id||null;
    const count=document.getElementById("reliabilityLedgerCount");
    const rows=document.getElementById("reliabilityLedgerRows");
    const detail=document.getElementById("reliabilityCaseDetail");
    if(count)count.textContent="Showing "+filtered.length+" of "+reliabilityBaseEvents().length+" sample cases in "+(state.folder==="all"?"All four inboxes":scopeName());
    if(rows)rows.innerHTML=reliabilityEventRows();
    if(detail)detail.innerHTML=reliabilityDetailMarkup(filtered.find(item=>item.id===state.selectedReliabilityEvent)||null);
    return;
  }
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
  const reliabilityEvent=event.target.closest("[data-reliability-event]");
  const auditEvent=event.target.closest("[data-audit-event]");
  const adminRole=event.target.closest("[data-admin-role]");
  const adminRequest=event.target.closest("[data-admin-request]");
  if(action)handleAction(action.dataset.action);
  if(reliabilityEvent){state.selectedReliabilityEvent=reliabilityEvent.dataset.reliabilityEvent;renderReliability();}
  if(auditEvent){state.selectedAuditEvent=auditEvent.dataset.auditEvent;refreshAuditPanels();}
  if(adminRole){state.adminRole=adminRole.dataset.adminRole;renderAdmin();}
  if(adminRequest){state.selectedAdminRequest=adminRequest.dataset.adminRequest;refreshAdminRequestPanels();}
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
