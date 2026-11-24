import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const dashboard = readFileSync(new URL("../dashboard.js", import.meta.url), "utf8");
const start = dashboard.indexOf("function validateAndSanitiseSnapshot(raw){");
const end = dashboard.indexOf("\nfunction importedSourceAvailable(", start);
assert.ok(start >= 0 && end > start, "snapshot validator must be present and extractable");
const validatorSource = dashboard.slice(start, end);
const validate = vm.runInNewContext(validatorSource + "\nvalidateAndSanitiseSnapshot", {});

function snapshotFixture() {
  return {
    schema_version: "dispatcher-reporting-snapshot-1",
    generated_at_utc: "2026-11-24T10:00:00.000Z",
    source_mode: "offline_sanitised_aggregate",
    reporting_period: {
      first_received_date_utc: "2026-11-22",
      last_received_date_utc: "2026-11-23"
    },
    tickets: {
      total: 3,
      overall: {
        ticket_records: 3,
        initially_assigned: 2,
        resolved: 1,
        outstanding: 2,
        unassigned: 1
      },
      by_inbox: [
        { inbox_code: "agency", ticket_records: 2, initially_assigned: 1, resolved: 1, outstanding: 1, unassigned: 0 },
        { inbox_code: "detags", ticket_records: 1, initially_assigned: 1, resolved: 0, outstanding: 1, unassigned: 1 },
        { inbox_code: "transfers", ticket_records: 0, initially_assigned: 0, resolved: 0, outstanding: 0, unassigned: 0 },
        { inbox_code: "unadopts", ticket_records: 0, initially_assigned: 0, resolved: 0, outstanding: 0, unassigned: 0 }
      ],
      by_brand: [
        { brand_code: "audi", count: 1 },
        { brand_code: "volkswagen", count: 2 }
      ],
      daily_volume: [
        { date_utc: "2026-11-22", inbox_code: "agency", ticket_records: 2 },
        { date_utc: "2026-11-23", inbox_code: "detags", ticket_records: 1 }
      ]
    },
    allocations: [
      { agent_ref: "Agent-AAAAAAAAAA", inbox_code: "agency", initial_assignments: 1, allocation_share_pct: 100, current_open_workload: 1 },
      { agent_ref: "Agent-BBBBBBBBBB", inbox_code: "detags", initial_assignments: 1, allocation_share_pct: 100, current_open_workload: 0 }
    ],
    workflow: [
      { event_type: "flagged", inbox_code: "agency", event_count: 1, distinct_tickets: 1 },
      { event_type: "handover", inbox_code: "detags", event_count: 2, distinct_tickets: 1 }
    ],
    data_quality: {
      sources: [
        { source: "Ticket snapshot", rows_read: 3, rows_accepted: 3, rows_skipped: 0, duplicate_rows: 0, unknown_inbox: 0, unknown_brand: 0, unknown_status: 0, ambiguous_time: 0 },
        { source: "Assignment history", rows_read: 2, rows_accepted: 2, rows_skipped: 0, duplicate_rows: 0, unknown_inbox: 0, unknown_brand: 0, unknown_status: 0, ambiguous_time: 0 },
        { source: "Workflow history", rows_read: 3, rows_accepted: 3, rows_skipped: 0, duplicate_rows: 0, unknown_inbox: 0, unknown_brand: 0, unknown_status: 0, ambiguous_time: 0 }
      ],
      ambiguous_initial_assignment_tickets: 0,
      warnings: ["Free-form text is discarded by the dashboard validator."]
    }
  };
}

test("accepts a reconciled, pseudonymised Reporting Studio snapshot", () => {
  const clean = JSON.parse(JSON.stringify(validate(snapshotFixture())));
  assert.equal(clean.tickets.total, 3);
  assert.equal(clean.tickets.overall.outstanding, 2);
  assert.equal(clean.allocations[0].agent_ref, "Agent-AAAAAAAAAA");
  assert.equal(clean.workflow[1].event_count, 2);
});

test("drops unrecognised properties before keeping the snapshot in memory", () => {
  const input = snapshotFixture();
  input.ticket_subjects = ["must not survive"];
  input.data_quality.warnings.push("A customer email must not survive");
  input.allocations[0].employee_name = "Real colleague name";
  const clean = JSON.parse(JSON.stringify(validate(input)));
  assert.equal("ticket_subjects" in clean, false);
  assert.equal("warnings" in clean.data_quality, false);
  assert.equal("employee_name" in clean.allocations[0], false);
});

test("preserves safe Activity Log event details and automatic/manual method counts",()=>{
  const input=snapshotFixture();
  input.tickets.resolution_tracking="not_captured";
  input.tickets.brand_field_mapped=false;
  input.assignment_methods={automatic:1,manual:1,other:0};
  input.activity_log=[{
    event_time_egypt:"2026-11-24 12:00:00",
    event_time_utc:"2026-11-24T10:00:00.000Z",
    event_type:"handover",
    inbox_code:"detags",
    ticket_ref:"Ref-CCCCCCCCCC",
    original_agent_ref:"Agent-AAAAAAAAAA",
    current_agent_ref:"Agent-BBBBBBBBBB",
    assignment_flag:true,
    incident_count:1,
    details:"This property must be discarded."
  }];
  const clean=JSON.parse(JSON.stringify(validate(input)));
  assert.deepEqual(clean.assignment_methods,{automatic:1,manual:1,other:0});
  assert.equal(clean.activity_log.length,1);
  assert.equal(clean.activity_log[0].event_type,"handover");
  assert.equal(clean.activity_log[0].ticket_ref,"Ref-CCCCCCCCCC");
  assert.equal(clean.activity_log[0].assignment_flag,true);
  assert.equal(clean.tickets.resolution_tracking,"not_captured");
  assert.equal(clean.tickets.brand_field_mapped,false);
  assert.equal("details" in clean.activity_log[0],false);
});

test("validates explicit resolution-time summaries and resolver references",()=>{
  const input=snapshotFixture();
  input.tickets.resolution_tracking="source_status_present";
  input.tickets.resolution_metrics={
    status_field_mapped:true,
    resolved_at_field_mapped:true,
    resolved_by_field_mapped:true,
    overall:{timed_tickets:1,average_minutes:120,median_minutes:120,p90_minutes:120},
    by_inbox:[
      {inbox_code:"agency",timed_tickets:1,average_minutes:120,median_minutes:120,p90_minutes:120},
      {inbox_code:"detags",timed_tickets:0,average_minutes:null,median_minutes:null,p90_minutes:null},
      {inbox_code:"transfers",timed_tickets:0,average_minutes:null,median_minutes:null,p90_minutes:null},
      {inbox_code:"unadopts",timed_tickets:0,average_minutes:null,median_minutes:null,p90_minutes:null}
    ]
  };
  input.tickets.resolution_by_agent=[
    {agent_ref:"Agent-AAAAAAAAAA",resolved_tickets:1,timed_tickets:1,total_resolution_minutes:120}
  ];
  const clean=JSON.parse(JSON.stringify(validate(input)));
  assert.equal(clean.tickets.resolution_metrics.overall.average_minutes,120);
  assert.equal(clean.tickets.resolution_by_agent[0].resolved_tickets,1);
  assert.equal(clean.tickets.resolution_by_agent[0].total_resolution_minutes,120);
});

test("rejects an overall total that does not reconcile with inbox totals", () => {
  const input = snapshotFixture();
  input.tickets.overall.ticket_records = 99;
  assert.throws(() => validate(input), /do not reconcile/);
});

test("rejects unpseudonymised agent identifiers", () => {
  const input = snapshotFixture();
  input.allocations[0].agent_ref = "Momo";
  assert.throws(() => validate(input), /pseudonymous agent/);
});

test("rejects event types outside the Reporting Studio allow-list", () => {
  const input = snapshotFixture();
  input.workflow[0].event_type = "customer email received";
  assert.throws(() => validate(input), /unsupported event/);
});

test("supports a snapshot without assignment-history data without inventing allocations", () => {
  const input = snapshotFixture();
  input.tickets.overall.initially_assigned = 0;
  input.tickets.by_inbox.forEach(row => { row.initially_assigned = 0; });
  input.allocations = [
    { agent_ref: "Agent-AAAAAAAAAA", inbox_code: "agency", initial_assignments: 0, allocation_share_pct: 0, current_open_workload: 1 }
  ];
  input.data_quality.sources = [input.data_quality.sources[0]];
  input.workflow = [];
  const clean = JSON.parse(JSON.stringify(validate(input)));
  assert.equal(clean.tickets.overall.initially_assigned, 0);
  assert.deepEqual(clean.data_quality.sources.map(row => row.source), ["Ticket snapshot"]);
  assert.equal(clean.allocations[0].current_open_workload, 1);
});

test("rejects inconsistent first-assignment shares", () => {
  const input = snapshotFixture();
  input.allocations[0].allocation_share_pct = 50;
  assert.throws(() => validate(input), /allocation share does not reconcile/);
});
