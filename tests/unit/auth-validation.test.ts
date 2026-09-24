import { describe, it, expect } from "vitest";
import {
  canReview,
  requireRole,
  effectiveStatus,
  type Actor,
} from "../../src/modules/auth/policy";
import {
  commandSchema,
  intakeSchema,
} from "../../src/modules/intake/validation";
const requester: Actor = {
  id: "owner",
  organizationId: "org",
  name: "Requester",
  roles: ["REQUESTER"],
};
describe("authorization policies", () => {
  it("requester cannot approve own request", () =>
    expect(canReview(requester, "owner", "owner")).toBe(false));
  it("even a dual-role owner cannot approve their own request", () =>
    expect(
      canReview(
        { ...requester, roles: ["REQUESTER", "REVIEWER"] },
        "owner",
        "owner",
      ),
    ).toBe(false));
  it("requester cannot access configuration", () =>
    expect(() => requireRole(requester, "ADMINISTRATOR")).toThrow());
  it("administrator can configure policy", () =>
    expect(() =>
      requireRole({ ...requester, roles: ["ADMINISTRATOR"] }, "ADMINISTRATOR"),
    ).not.toThrow());
  it("assigned independent reviewer may review", () =>
    expect(
      canReview(
        { ...requester, id: "reviewer", roles: ["REVIEWER"] },
        "owner",
        "reviewer",
      ),
    ).toBe(true));
  it("unassigned reviewer cannot review", () =>
    expect(
      canReview(
        { ...requester, id: "reviewer", roles: ["REVIEWER"] },
        "owner",
        "someone-else",
      ),
    ).toBe(false));
  it("surfaces overdue approved records as reassessment due", () =>
    expect(
      effectiveStatus({ status: "APPROVED", nextReviewAt: "2000-01-01" }),
    ).toBe("REASSESSMENT_DUE"));
  it("does not label rejected uses as reassessment due", () =>
    expect(
      effectiveStatus({ status: "REJECTED", nextReviewAt: "2000-01-01" }),
    ).toBe("REJECTED"));
});
describe("input validation", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it("rejects missing intake fields", () =>
    expect(intakeSchema.safeParse({ title: "Test" }).success).toBe(false));
  it.each(["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED"])(
    "requires rationale for %s",
    (outcome) =>
      expect(
        commandSchema.safeParse({
          action: "decision",
          id,
          revision: 1,
          outcome,
          rationale: " ",
          mitigations: [],
        }).success,
      ).toBe(false),
  );
  it("requires a conditional mitigation", () =>
    expect(
      commandSchema.safeParse({
        action: "decision",
        id,
        revision: 1,
        outcome: "CONDITIONALLY_APPROVED",
        rationale: "Reason",
        mitigations: [],
      }).success,
    ).toBe(false));
  it("rejects script URLs", () =>
    expect(
      commandSchema.safeParse({
        action: "evidence",
        id,
        type: "Vendor",
        description: "Reference",
        reference: "javascript:alert(1)",
        notes: "",
      }).success,
    ).toBe(false));
  it("requires waiver rationale", () =>
    expect(
      commandSchema.safeParse({
        action: "mitigation",
        id,
        mitigationId: id,
        status: "WAIVED",
        notes: "",
      }).success,
    ).toBe(false));
});
