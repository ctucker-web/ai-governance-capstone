import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { execute, getWorkspace } from "../../src/modules/workflow/service";
import { seed, sampleIntake, actorFor } from "../../prisma/seed";
import {
  emptyAnswers,
  defaultConfig,
  tiers,
} from "../../src/modules/risk/engine";
import { demoUsers, orgId } from "../../src/modules/auth/demo-users";
beforeAll(async () => {
  await seed();
});
afterAll(async () => {
  await db.$disconnect();
});
async function submitted() {
  const data = sampleIntake(`Integration ${randomUUID()}`);
  const { id } = await execute(actorFor(0), { action: "create", data });
  await execute(actorFor(0), { action: "submit", id, revision: 0 });
  return id;
}
describe("PostgreSQL governance lifecycle", () => {
  it("rejects inaccessible mitigation owners atomically with the decision", async () => {
    const id = await submitted();
    const count = await db.auditEvent.count({ where: { useCaseId: id } });
    await expect(
      execute(actorFor(1), {
        action: "decision",
        id,
        revision: 1,
        outcome: "CONDITIONALLY_APPROVED",
        rationale: "Requires a documented safeguard.",
        mitigations: [
          {
            description: "Must have an accountable owner",
            ownerId: demoUsers[3].id,
            dueAt: "2027-01-01",
          },
        ],
      }),
    ).rejects.toThrow("requester or an assigned reviewer");
    expect(await db.mitigation.count({ where: { useCaseId: id } })).toBe(0);
    expect(
      await db.decision.count({ where: { review: { useCaseId: id } } }),
    ).toBe(0);
    expect(await db.auditEvent.count({ where: { useCaseId: id } })).toBe(count);
    expect((await db.useCase.findUniqueOrThrow({ where: { id } })).status).toBe(
      "UNDER_REVIEW",
    );
  });
  it("completes clinical intake → advisory escalation → human conditional decision → mitigation → audit → reassessment", async () => {
    const data = sampleIntake(`Clinical acceptance ${randomUUID()}`);
    data.domain = "CLINICAL";
    data.dataCategories = ["CLIENT_HEALTH"];
    data.answers = {
      ...emptyAnswers,
      dataSensitivity: 3,
      impact: 3,
      vendorAssurance: 2,
      regulatory: 3,
    };
    const { id } = await execute(actorFor(0), { action: "create", data });
    expect((await db.useCase.findUniqueOrThrow({ where: { id } })).status).toBe(
      "DRAFT",
    );
    await execute(actorFor(0), { action: "submit", id, revision: 0 });
    const first = await db.riskAssessment.findFirstOrThrow({
      where: { useCaseId: id },
      include: { factors: true },
    });
    expect(first.tier).toBe("HIGH");
    expect(first.factors).toHaveLength(8);
    expect(first.triggeredRules.length).toBeGreaterThan(0);
    const review = await db.review.findFirstOrThrow({
      where: { useCaseId: id },
    });
    expect(review.reviewerId).toBe(demoUsers[4].id);
    expect(await db.decision.count({ where: { reviewId: review.id } })).toBe(0);
    const rationale =
      "Human verification and approved data handling are required before use.";
    await execute(actorFor(4), {
      action: "decision",
      id,
      revision: 1,
      outcome: "CONDITIONALLY_APPROVED",
      rationale,
      mitigations: [
        {
          description:
            "Human verification required before AI-generated content enters the official record.",
          ownerId: demoUsers[0].id,
          dueAt: "2027-01-01",
        },
      ],
    });
    const record = await db.useCase.findUniqueOrThrow({ where: { id } });
    expect(record.status).toBe("CONDITIONALLY_APPROVED");
    expect(record.reviewedAt).not.toBeNull();
    expect(record.nextReviewAt).not.toBeNull();
    expect(
      (await db.decision.findUniqueOrThrow({ where: { reviewId: review.id } }))
        .rationale,
    ).toBe(rationale);
    expect(
      await db.auditEvent.count({
        where: { useCaseId: id, action: "DECISION_RECORDED" },
      }),
    ).toBe(1);
    await execute(actorFor(0), {
      action: "reassess",
      id,
      revision: 2,
      reason: "Vendor model changed.",
    });
    await execute(actorFor(0), { action: "submit", id, revision: 3 });
    expect(await db.riskAssessment.count({ where: { useCaseId: id } })).toBe(2);
    expect(
      await db.riskAssessment.findUnique({
        where: { id: first.id },
        include: { factors: true },
      }),
    ).toEqual(first);
    expect(await db.decision.count({ where: { reviewId: review.id } })).toBe(1);
  });
  it("enforces assignment, ownership, auditor visibility, and admin restrictions in services", async () => {
    const id = await submitted();
    const decision = {
      action: "decision",
      id,
      revision: 1,
      outcome: "APPROVED",
      rationale: "Human reviewer rationale",
      mitigations: [],
    };
    for (const actor of [actorFor(0), actorFor(2), actorFor(3), actorFor(4)])
      await expect(execute(actor, decision)).rejects.toThrow();
    expect(
      (await getWorkspace(actorFor(3))).records.some((r) => r.id === id),
    ).toBe(false);
    await execute(actorFor(1), decision);
    expect(
      (await getWorkspace(actorFor(3))).records.some((r) => r.id === id),
    ).toBe(true);
    await expect(
      execute(actorFor(0), {
        action: "edit",
        id,
        revision: 2,
        data: sampleIntake("Changed"),
      }),
    ).rejects.toThrow();
    await expect(
      execute(actorFor(3), {
        action: "evidence",
        id,
        type: "Test",
        description: "Test",
        reference: "https://example.com",
        notes: "",
      }),
    ).rejects.toThrow();
  });
  it("returns follow-up requests to the owner and preserves superseded assessment versions", async () => {
    const id = await submitted();
    await execute(actorFor(1), {
      action: "information",
      id,
      revision: 1,
      message: "Please clarify vendor data retention.",
    });
    await execute(actorFor(0), {
      action: "edit",
      id,
      revision: 2,
      data: sampleIntake("Follow-up clarified"),
    });
    await execute(actorFor(0), { action: "submit", id, revision: 3 });
    expect(await db.riskAssessment.count({ where: { useCaseId: id } })).toBe(2);
    expect(
      await db.review.count({ where: { useCaseId: id, closedAt: null } }),
    ).toBe(1);
  });
  it("rolls back submission when no independent route exists", async () => {
    const dual = { ...actorFor(1), roles: ["REQUESTER", "REVIEWER"] as const };
    const { id } = await execute(
      { ...dual, roles: [...dual.roles] },
      { action: "create", data: sampleIntake("Cannot self-route") },
    );
    await expect(
      execute(
        { ...dual, roles: [...dual.roles] },
        { action: "submit", id, revision: 0 },
      ),
    ).rejects.toThrow("independent reviewer");
    expect(await db.riskAssessment.count({ where: { useCaseId: id } })).toBe(0);
    expect((await db.useCase.findUniqueOrThrow({ where: { id } })).status).toBe(
      "DRAFT",
    );
  });
  it("rejects stale revisions and simultaneous conflicting decisions", async () => {
    const id = await submitted(),
      command = {
        action: "decision",
        id,
        revision: 1,
        outcome: "APPROVED",
        rationale: "A human decision.",
        mitigations: [],
      };
    const results = await Promise.allSettled([
      execute(actorFor(1), command),
      execute(actorFor(1), command),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.decision.count({ where: { review: { useCaseId: id } } }),
    ).toBe(1);
  });
  it("requires reviewer rationale to waive a mitigation", async () => {
    const id = await submitted();
    await execute(actorFor(1), {
      action: "addMitigation",
      id,
      description: "Verify output",
      ownerId: demoUsers[0].id,
      dueAt: "2027-01-01",
    });
    const m = await db.mitigation.findFirstOrThrow({
      where: { useCaseId: id },
    });
    await expect(
      execute(actorFor(0), {
        action: "mitigation",
        id,
        mitigationId: m.id,
        status: "WAIVED",
        notes: "I prefer not to do it",
      }),
    ).rejects.toThrow();
    await execute(actorFor(0), {
      action: "mitigation",
      id,
      mitigationId: m.id,
      status: "COMPLETE",
      notes: "Verification procedure documented.",
    });
    expect(
      (await db.mitigation.findUniqueOrThrow({ where: { id: m.id } })).status,
    ).toBe("COMPLETE");
  });
  it("isolates records from other organizations", async () => {
    const id = await submitted();
    const outsider = { ...actorFor(2), organizationId: randomUUID() };
    expect((await getWorkspace(outsider)).records).toHaveLength(0);
    await expect(
      execute(outsider, {
        action: "archive",
        id,
        revision: 1,
        reason: "Not permitted",
      }),
    ).rejects.toThrow("unavailable");
  });
  it("allows only administrator policy updates and retains the old snapshot", async () => {
    const old = await db.riskConfiguration.findFirstOrThrow({
      where: { organizationId: orgId },
      orderBy: { version: "desc" },
    });
    const command = {
      action: "configure",
      version: old.version,
      settings: defaultConfig,
      routing: Object.fromEntries(
        tiers.map((t) => [
          t,
          demoUsers[t === "HIGH" || t === "EXECUTIVE_EXCEPTION" ? 4 : 1].id,
        ]),
      ),
    };
    await expect(execute(actorFor(0), command)).rejects.toThrow();
    await execute(actorFor(2), command);
    await expect(execute(actorFor(2), command)).rejects.toThrow(
      "Policy changed",
    );
    const event = await db.auditEvent.findFirstOrThrow({
      where: { action: "CONFIGURATION_CHANGED", actorId: demoUsers[2].id },
      orderBy: { createdAt: "desc" },
    });
    expect(event.summary).toContain(`LOW: ${demoUsers[1].name}`);
    expect(event.summary).toContain(
      `EXECUTIVE_EXCEPTION: ${demoUsers[4].name}`,
    );
    expect(
      await db.riskConfiguration.findUnique({ where: { id: old.id } }),
    ).toEqual(old);
  });
  it("database rejects edits and deletion of immutable history", async () => {
    const a = await db.auditEvent.findFirstOrThrow();
    await expect(
      db.auditEvent.update({
        where: { id: a.id },
        data: { summary: "Tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      db.auditEvent.delete({ where: { id: a.id } }),
    ).rejects.toThrow();
    const assessment = await db.riskAssessment.findFirstOrThrow();
    await expect(
      db.riskAssessment.update({
        where: { id: assessment.id },
        data: { score: 0 },
      }),
    ).rejects.toThrow();
    const decision = await db.decision.findFirstOrThrow();
    await expect(
      db.decision.update({
        where: { id: decision.id },
        data: { rationale: "Changed" },
      }),
    ).rejects.toThrow();
  });
});
