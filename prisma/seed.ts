import "dotenv/config";
import { pathToFileURL } from "node:url";
import { db } from "../src/lib/db";
import { demoUsers, orgId } from "../src/modules/auth/demo-users";
import {
  defaultConfig,
  emptyAnswers,
  tiers,
  type Answers,
} from "../src/modules/risk/engine";
import { execute } from "../src/modules/workflow/service";
import type { Actor } from "../src/modules/auth/policy";
import type { Intake } from "../src/modules/intake/validation";
export const actorFor = (index: number): Actor => ({
  id: demoUsers[index].id,
  name: demoUsers[index].name,
  organizationId: orgId,
  roles: [demoUsers[index].role],
});
export function sampleIntake(
  title: string,
  department = "Operations",
  answers: Answers = {
    ...emptyAnswers,
    dataSensitivity: 1,
    impact: 1,
    autonomy: 1,
    oversight: 1,
    vendorAssurance: 1,
    transparency: 1,
    safeguards: 1,
    regulatory: 1,
  },
): Intake {
  return {
    title,
    toolName: title,
    vendor: "Example Tools (synthetic)",
    department,
    purpose:
      "Reduce repetitive administrative work while preserving staff accountability.",
    description:
      "A synthetic demonstration of assisted drafting, checked by a staff member before use.",
    affectedUsers: "Department staff",
    affectedPeople: "Staff and program participants",
    dataCategories: ["INTERNAL"],
    decisionSupport: "Draft content for an accountable staff member to verify.",
    autonomy: "Suggestions only; no independent action.",
    oversight: "Named staff member verifies every output.",
    vendorInformation:
      "Synthetic vendor; assurance references still need human review.",
    domain: "GENERAL",
    answers,
  };
}
export async function seed() {
  await db.organization.upsert({
    where: { id: orgId },
    create: { id: orgId, name: "Community Partners · Demonstration" },
    update: {},
  });
  for (const u of demoUsers)
    await db.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        organizationId: orgId,
        name: u.name,
        email: u.email,
        roles: { create: { role: u.role } },
      },
      update: {},
    });
  if (
    !(await db.riskConfiguration.findFirst({
      where: { organizationId: orgId },
    }))
  )
    await db.riskConfiguration.create({
      data: { organizationId: orgId, version: 1, settings: defaultConfig },
    });
  for (const tier of tiers)
    await db.routingRule.upsert({
      where: { organizationId_tier: { organizationId: orgId, tier } },
      create: {
        organizationId: orgId,
        tier,
        reviewerId:
          demoUsers[tier === "HIGH" || tier === "EXECUTIVE_EXCEPTION" ? 4 : 1]
            .id,
      },
      update: {},
    });
  const titles = [
    "Meeting notes, made easier",
    "A writing partner for the team",
    "Clinical documentation assistant",
    "Applicant ranking assistant",
    "Invoice processing assistant",
    "Donor outreach planning",
  ];
  const departments = [
    "Operations",
    "Communications",
    "Programs",
    "People & Culture",
    "Finance",
    "Development",
  ];
  for (let index = 0; index < titles.length; index++) {
    if (
      await db.useCase.findFirst({
        where: { title: titles[index], requesterId: demoUsers[0].id },
      })
    )
      continue;
    const data = sampleIntake(titles[index], departments[index]);
    if (index === 0)
      data.answers = { ...emptyAnswers, dataSensitivity: 1, transparency: 1 };
    if (index === 2) {
      data.domain = "CLINICAL";
      data.dataCategories = ["CLIENT_HEALTH"];
      data.answers = {
        ...emptyAnswers,
        dataSensitivity: 3,
        impact: 3,
        vendorAssurance: 2,
        regulatory: 3,
      };
    }
    if (index === 3) {
      data.domain = "EMPLOYMENT";
      data.dataCategories = ["EMPLOYEE"];
      data.answers = {
        ...emptyAnswers,
        autonomy: 3,
        impact: 3,
        oversight: 3,
        vendorAssurance: 2,
      };
    }
    const created = await execute(actorFor(0), { action: "create", data });
    if (index === 5) continue;
    await execute(actorFor(0), {
      action: "submit",
      id: created.id,
      revision: 0,
    });
    const review = await db.review.findFirstOrThrow({
      where: { useCaseId: created.id },
    });
    const reviewer = actorFor(review.reviewerId === demoUsers[4].id ? 4 : 1);
    if (index === 0 || index === 2 || index === 4) {
      await execute(reviewer, {
        action: "decision",
        id: created.id,
        revision: 1,
        outcome: index === 2 ? "CONDITIONALLY_APPROVED" : "APPROVED",
        rationale:
          "Synthetic demonstration decision: use is limited to the documented scope and accountable human review.",
        mitigations:
          index === 2
            ? [
                {
                  description:
                    "Human verification required before AI-generated content enters the official record.",
                  ownerId: demoUsers[0].id,
                  dueAt: new Date(Date.now() + 14 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                },
              ]
            : [],
      });
    }
    if (index === 3)
      await execute(reviewer, {
        action: "decision",
        id: created.id,
        revision: 1,
        outcome: "REJECTED",
        rationale:
          "Synthetic human decision: autonomous hiring decisions are outside the acceptable use proposed for this demonstration.",
        mitigations: [],
      });
    if (index === 2)
      await execute(reviewer, {
        action: "evidence",
        id: created.id,
        type: "Vendor assurance",
        description:
          "Synthetic review reference; no confidential documents are stored.",
        reference: "https://example.com/vendor-assurance",
        notes: "Training on organizational information must remain disabled.",
        reviewedAt: new Date().toISOString().slice(0, 10),
      });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  seed()
    .then(() => console.log("Synthetic demonstration data ready."))
    .finally(() => db.$disconnect());
