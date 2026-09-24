import test from "node:test";
import assert from "node:assert/strict";
import { calculateRiskAssessment } from "../src/modules/risk/riskEngine.js";

const scenario = (overrides = {}) => ({
  dataSensitivity: 0,
  affectedPeople: 0,
  autonomy: 0,
  humanOversight: 0,
  vendorAssurance: 0,
  ...overrides
});

test("black-box: minimal inputs produce Low advisory risk", () => {
  const result = calculateRiskAssessment(scenario());
  assert.equal(result.score, 0);
  assert.equal(result.tier, "Low");
  assert.equal(result.advisoryOnly, true);
});

test("black-box: score of 5 produces Moderate risk", () => {
  const result = calculateRiskAssessment(
    scenario({ dataSensitivity: 2, affectedPeople: 1, autonomy: 1, humanOversight: 1 })
  );
  assert.equal(result.score, 5);
  assert.equal(result.tier, "Moderate");
});

test("black-box: score of 9 produces High risk", () => {
  const result = calculateRiskAssessment(
    scenario({ dataSensitivity: 3, affectedPeople: 2, autonomy: 2, humanOversight: 1, vendorAssurance: 1 })
  );
  assert.equal(result.score, 9);
  assert.equal(result.tier, "High");
});

test("white-box: high autonomy plus high impact forces Restricted escalation", () => {
  const result = calculateRiskAssessment(
    scenario({ affectedPeople: 3, autonomy: 3 })
  );
  assert.equal(result.score, 6);
  assert.equal(result.tier, "Restricted");
  assert.match(result.escalationRules[0], /High-impact use/);
});

test("white-box: sensitive data plus weak vendor assurance raises minimum tier to High", () => {
  const result = calculateRiskAssessment(
    scenario({ dataSensitivity: 3, vendorAssurance: 3 })
  );
  assert.equal(result.score, 6);
  assert.equal(result.tier, "High");
  assert.match(result.escalationRules[0], /Sensitive data/);
});

test("white-box: factor explanations are retained for transparency", () => {
  const result = calculateRiskAssessment(
    scenario({ dataSensitivity: 3, humanOversight: 3 })
  );
  assert.deepEqual(result.contributingFactors, [
    "Sensitive or regulated data",
    "Limited human oversight"
  ]);
});

test("input validation rejects risk values outside 0-3", () => {
  assert.throws(
    () => calculateRiskAssessment(scenario({ autonomy: 4 })),
    /autonomy must be an integer from 0 through 3/
  );
});
