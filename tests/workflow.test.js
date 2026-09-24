import test from "node:test";
import assert from "node:assert/strict";
import {
  canRecordDecision,
  validateDecision,
  createDecisionRecord,
  createAuditEvent
} from "../src/modules/workflow/workflow.js";

test("black-box: requester cannot record a governance decision", () => {
  assert.equal(canRecordDecision("Requester"), false);
});

test("black-box: reviewer can record a governance decision", () => {
  assert.equal(canRecordDecision("Reviewer"), true);
});

test("white-box: requester and reviewer cannot be the same person", () => {
  const result = validateDecision({
    role: "Reviewer",
    requesterId: "user-1",
    reviewerId: "user-1",
    decision: "Approved",
    rationale: "Reviewed."
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /cannot approve or reject their own request/);
});

test("black-box: final decision requires reviewer rationale", () => {
  const result = validateDecision({
    role: "Reviewer",
    requesterId: "user-1",
    reviewerId: "user-2",
    decision: "Conditional",
    rationale: " "
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /rationale is required/);
});

test("decision record stores rationale and timestamp", () => {
  const now = new Date("2026-09-24T18:00:00.000Z");
  const record = createDecisionRecord({
    requestId: "AIG-100",
    role: "Reviewer",
    requesterId: "user-1",
    reviewerId: "user-2",
    decision: "Conditional",
    rationale: "Human verification is required before use."
  }, now);

  assert.equal(record.requestId, "AIG-100");
  assert.equal(record.decision, "Conditional");
  assert.equal(record.recordedAt, "2026-09-24T18:00:00.000Z");
});

test("audit event captures actor, action, status transition, and time", () => {
  const now = new Date("2026-09-24T18:05:00.000Z");
  const event = createAuditEvent({
    requestId: "AIG-100",
    actorId: "user-2",
    action: "DECISION_RECORDED",
    previousStatus: "UNDER_REVIEW",
    newStatus: "CONDITIONALLY_APPROVED"
  }, now);

  assert.deepEqual(event, {
    requestId: "AIG-100",
    actorId: "user-2",
    action: "DECISION_RECORDED",
    previousStatus: "UNDER_REVIEW",
    newStatus: "CONDITIONALLY_APPROVED",
    context: null,
    timestamp: "2026-09-24T18:05:00.000Z"
  });
});
