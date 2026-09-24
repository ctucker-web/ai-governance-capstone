import { calculateRiskAssessment } from "../src/modules/risk/riskEngine.js";
import { createDecisionRecord, createAuditEvent } from "../src/modules/workflow/workflow.js";

const assessment = calculateRiskAssessment({
  dataSensitivity: 3,
  affectedPeople: 3,
  autonomy: 1,
  humanOversight: 1,
  vendorAssurance: 2
});

console.log("=== Advisory Risk Assessment ===");
console.log(JSON.stringify(assessment, null, 2));

const decision = createDecisionRecord({
  requestId: "AIG-DEMO-001",
  role: "Reviewer",
  requesterId: "requester-1",
  reviewerId: "reviewer-1",
  decision: "Conditional",
  rationale: "Human verification is required before AI-generated content enters the official record."
}, new Date("2026-09-24T18:00:00.000Z"));

console.log("\n=== Human Decision ===");
console.log(JSON.stringify(decision, null, 2));

const auditEvent = createAuditEvent({
  requestId: decision.requestId,
  actorId: decision.reviewerId,
  action: "DECISION_RECORDED",
  previousStatus: "UNDER_REVIEW",
  newStatus: "CONDITIONALLY_APPROVED",
  context: decision.rationale
}, new Date("2026-09-24T18:00:05.000Z"));

console.log("\n=== Audit Event ===");
console.log(JSON.stringify(auditEvent, null, 2));
