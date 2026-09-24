import { Prisma, type Status } from "@prisma/client";
import { db } from "@/lib/db";
import {
  AppError,
  approved,
  canReview,
  pending,
  requireRole,
  type Actor,
} from "../auth/policy";
import { commandSchema, intakeSchema, type Intake } from "../intake/validation";
import { assess, configSchema, tiers } from "../risk/engine";
type Tx = Prisma.TransactionClient;
export const detailInclude = {
  system: true,
  requester: { select: { id: true, name: true } },
  assessments: { orderBy: { version: "desc" }, include: { factors: true } },
  reviews: {
    orderBy: { createdAt: "desc" },
    include: { reviewer: { select: { id: true, name: true } }, decision: true },
  },
  evidence: {
    orderBy: { createdAt: "desc" },
    include: { reviewer: { select: { id: true, name: true } } },
  },
  mitigations: {
    orderBy: { dueAt: "asc" },
    include: { owner: { select: { id: true, name: true } } },
  },
  reassessments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.UseCaseInclude;
export function scope(actor: Actor): Prisma.UseCaseWhereInput {
  const organization = { system: { organizationId: actor.organizationId } };
  if (actor.roles.includes("ADMINISTRATOR")) return organization;
  const OR: Prisma.UseCaseWhereInput[] = [];
  if (actor.roles.includes("REQUESTER")) OR.push({ requesterId: actor.id });
  if (actor.roles.includes("REVIEWER"))
    OR.push({ reviews: { some: { reviewerId: actor.id } } });
  if (actor.roles.includes("AUDITOR")) OR.push({ status: { in: approved } });
  return { ...organization, OR };
}
async function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  useCaseId: string | null,
  summary: string,
  previousStatus?: Status,
  newStatus?: Status,
) {
  await tx.auditEvent.create({
    data: {
      actorId: actor.id,
      action,
      useCaseId,
      summary,
      previousStatus,
      newStatus,
    },
  });
}
async function currentConfig(tx: Tx, organizationId: string) {
  const c = await tx.riskConfiguration.findFirst({
    where: { organizationId },
    orderBy: { version: "desc" },
  });
  if (!c)
    throw new AppError(
      409,
      "An administrator must configure risk policy first.",
    );
  return c;
}
function fields(data: Intake) {
  const { toolName: _toolName, vendor: _vendor, ...rest } = data;
  void _toolName;
  void _vendor;
  return { ...rest, answers: data.answers as Prisma.InputJsonValue };
}
async function person(tx: Tx, actor: Actor, id: string) {
  const u = await tx.user.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: { roles: true },
  });
  if (!u) throw new AppError(400, "Select an owner in your organization.");
  return u;
}
export async function execute(actor: Actor, input: unknown) {
  const c = commandSchema.parse(input);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          if (c.action === "configure") {
            requireRole(actor, "ADMINISTRATOR");
            const old = await currentConfig(tx, actor.organizationId);
            if (old.version !== c.version)
              throw new AppError(409, "Policy changed. Refresh before saving.");
            const routingSummary: string[] = [];
            for (const tier of tiers) {
              const u = await person(tx, actor, c.routing[tier]);
              if (!u.roles.some((r) => r.role === "REVIEWER"))
                throw new AppError(400, "Routing requires a reviewer account.");
              routingSummary.push(`${tier}: ${u.name} (${u.id})`);
            }
            const config = await tx.riskConfiguration.create({
              data: {
                organizationId: actor.organizationId,
                version: old.version + 1,
                settings: c.settings as Prisma.InputJsonValue,
              },
            });
            for (const tier of tiers)
              await tx.routingRule.upsert({
                where: {
                  organizationId_tier: {
                    organizationId: actor.organizationId,
                    tier,
                  },
                },
                create: {
                  organizationId: actor.organizationId,
                  tier,
                  reviewerId: c.routing[tier],
                },
                update: { reviewerId: c.routing[tier] },
              });
            await audit(
              tx,
              actor,
              "CONFIGURATION_CHANGED",
              null,
              `Policy version ${config.version}; scoring and reassessment settings saved. Routing: ${routingSummary.join("; ")}.`,
            );
            return { id: config.id };
          }
          if (c.action === "create") {
            requireRole(actor, "REQUESTER");
            const system = await tx.aISystem.create({
              data: {
                name: c.data.toolName,
                vendor: c.data.vendor,
                organizationId: actor.organizationId,
              },
            });
            const record = await tx.useCase.create({
              data: {
                ...fields(c.data),
                systemId: system.id,
                requesterId: actor.id,
              },
            });
            await audit(
              tx,
              actor,
              "REQUEST_CREATED",
              record.id,
              "Governance draft created.",
              undefined,
              "DRAFT",
            );
            return { id: record.id };
          }
          const record = await tx.useCase.findFirst({
            where: { id: c.id, ...scope(actor) },
            include: detailInclude,
          });
          if (!record) throw new AppError(404, "This record is unavailable.");
          const owner =
            record.requesterId === actor.id &&
            actor.roles.includes("REQUESTER");
          const activeReview = record.reviews.find(
            (r) => !r.closedAt && !r.decision && r.reviewerId === actor.id,
          );
          const reviewer =
            !!activeReview &&
            canReview(actor, record.requesterId, activeReview.reviewerId);
          const assignedReviewer = record.reviews.some((r) =>
            canReview(actor, record.requesterId, r.reviewerId),
          );
          const admin = actor.roles.includes("ADMINISTRATOR");
          const mitigationOwner = async (id: string) => {
            const user = await person(tx, actor, id);
            const eligible =
              (id === record.requesterId &&
                user.roles.some((r) => r.role === "REQUESTER")) ||
              (record.reviews.some((r) => r.reviewerId === id) &&
                user.roles.some((r) => r.role === "REVIEWER"));
            if (!eligible)
              throw new AppError(
                400,
                "Mitigation owner must be the requester or an assigned reviewer.",
              );
          };
          if ("revision" in c && record.revision !== c.revision)
            throw new AppError(
              409,
              "This record changed. Refresh and try again.",
            );
          const change = async (data: Prisma.UseCaseUpdateInput) =>
            tx.useCase.update({
              where: { id: record.id },
              data: { ...data, revision: { increment: 1 } },
            });
          if (c.action === "edit") {
            if (
              !owner ||
              !["DRAFT", "NEEDS_INFORMATION"].includes(record.status)
            )
              throw new AppError(
                403,
                "Only the requester may edit a draft or requested follow-up.",
              );
            await tx.aISystem.update({
              where: { id: record.systemId },
              data: { name: c.data.toolName, vendor: c.data.vendor },
            });
            await change(fields(c.data));
            await audit(
              tx,
              actor,
              "REQUEST_UPDATED",
              record.id,
              "Request details updated; previous assessment snapshots retained.",
            );
          } else if (c.action === "submit") {
            if (
              !owner ||
              !["DRAFT", "NEEDS_INFORMATION"].includes(record.status)
            )
              throw new AppError(
                403,
                "Only the requester may submit a draft or follow-up.",
              );
            const data = intakeSchema.parse({
              ...Object.fromEntries(
                Object.keys(intakeSchema.shape).map((k) => [
                  k,
                  record[k as keyof typeof record],
                ]),
              ),
              toolName: record.system.name,
              vendor: record.system.vendor,
            });
            const config = await currentConfig(tx, actor.organizationId),
              settings = configSchema.parse(config.settings);
            const result = assess(data.answers, data.domain, settings);
            const route = await tx.routingRule.findUnique({
              where: {
                organizationId_tier: {
                  organizationId: actor.organizationId,
                  tier: result.tier,
                },
              },
            });
            if (!route || route.reviewerId === actor.id)
              throw new AppError(
                409,
                "An administrator must assign an independent reviewer for this tier.",
              );
            const routed = await person(tx, actor, route.reviewerId);
            if (!routed.roles.some((r) => r.role === "REVIEWER"))
              throw new AppError(
                409,
                "The routing policy has no eligible reviewer.",
              );
            await tx.review.updateMany({
              where: { useCaseId: record.id, closedAt: null },
              data: { closedAt: new Date() },
            });
            const { factors, ...resultFields } = result;
            const assessment = await tx.riskAssessment.create({
              data: {
                ...resultFields,
                useCaseId: record.id,
                configurationId: config.id,
                version: (record.assessments[0]?.version ?? 0) + 1,
                inputSnapshot: data as Prisma.InputJsonValue,
                policySnapshot: settings as Prisma.InputJsonValue,
                factors: { create: factors },
              },
            });
            await audit(
              tx,
              actor,
              "REQUEST_SUBMITTED",
              record.id,
              "Request submitted for human review.",
              record.status,
              "SUBMITTED",
            );
            await audit(
              tx,
              actor,
              "RISK_ASSESSMENT_COMPLETED",
              record.id,
              `Assessment v${assessment.version}: advisory ${result.tier}, score ${result.score}; policy v${config.version}.`,
            );
            await tx.review.create({
              data: {
                useCaseId: record.id,
                assessmentId: assessment.id,
                reviewerId: route.reviewerId,
              },
            });
            await change({ status: "UNDER_REVIEW" });
            await audit(
              tx,
              actor,
              "REVIEW_ASSIGNED",
              record.id,
              `Assigned to ${routed.name}.`,
              "SUBMITTED",
              "UNDER_REVIEW",
            );
          } else if (c.action === "decision" || c.action === "information") {
            if (
              !reviewer ||
              !activeReview ||
              !["SUBMITTED", "UNDER_REVIEW"].includes(record.status)
            )
              throw new AppError(
                403,
                "Only the assigned independent reviewer can act on this pending review.",
              );
            if (c.action === "information") {
              await change({ status: "NEEDS_INFORMATION" });
              await audit(
                tx,
                actor,
                "MORE_INFORMATION_REQUESTED",
                record.id,
                c.message,
                record.status,
                "NEEDS_INFORMATION",
              );
            } else {
              for (const m of c.mitigations) {
                await mitigationOwner(m.ownerId);
                await tx.mitigation.create({
                  data: {
                    ...m,
                    dueAt: new Date(m.dueAt),
                    useCaseId: record.id,
                  },
                });
                await audit(
                  tx,
                  actor,
                  "MITIGATION_CREATED",
                  record.id,
                  "Decision mitigation created.",
                );
              }
              const approvedDecision = approved.includes(c.outcome);
              const days = configSchema.parse(
                record.assessments.find(
                  (a) => a.id === activeReview.assessmentId,
                )!.policySnapshot,
              ).reassessmentDays;
              const now = new Date();
              await tx.decision.create({
                data: {
                  reviewId: activeReview.id,
                  outcome: c.outcome,
                  rationale: c.rationale,
                },
              });
              await tx.review.update({
                where: { id: activeReview.id },
                data: { closedAt: now },
              });
              await change({
                status: c.outcome,
                reviewedAt: now,
                reviewIntervalDays: approvedDecision ? days : null,
                nextReviewAt: approvedDecision
                  ? new Date(now.getTime() + days * 86400000)
                  : null,
              });
              await audit(
                tx,
                actor,
                "DECISION_RECORDED",
                record.id,
                "Named human reviewer recorded a decision and rationale.",
                record.status,
                c.outcome,
              );
            }
          } else if (c.action === "evidence") {
            if (
              !(
                assignedReviewer ||
                (owner &&
                  ["DRAFT", "UNDER_REVIEW", "NEEDS_INFORMATION"].includes(
                    record.status,
                  ))
              ) ||
              record.status === "ARCHIVED"
            )
              throw new AppError(
                403,
                "You cannot add evidence to this record.",
              );
            await tx.evidence.create({
              data: {
                useCaseId: record.id,
                reviewerId: actor.id,
                type: c.type,
                description: c.description,
                reference: c.reference,
                notes: c.notes,
                reviewedAt:
                  c.reviewedAt && assignedReviewer
                    ? new Date(c.reviewedAt)
                    : null,
              },
            });
            await audit(
              tx,
              actor,
              "EVIDENCE_ADDED",
              record.id,
              "Evidence reference and metadata added.",
            );
          } else if (c.action === "addMitigation") {
            if (!assignedReviewer || record.status === "ARCHIVED")
              throw new AppError(
                403,
                "Only an assigned reviewer can add mitigations.",
              );
            await mitigationOwner(c.ownerId);
            await tx.mitigation.create({
              data: {
                useCaseId: record.id,
                description: c.description,
                ownerId: c.ownerId,
                dueAt: new Date(c.dueAt),
              },
            });
            await audit(
              tx,
              actor,
              "MITIGATION_CREATED",
              record.id,
              "Reviewer added a mitigation requirement.",
            );
          } else if (c.action === "mitigation") {
            const m = record.mitigations.find((m) => m.id === c.mitigationId);
            if (!m) throw new AppError(404, "Mitigation not found.");
            if (
              record.status === "ARCHIVED" ||
              !(assignedReviewer || (owner && m.ownerId === actor.id)) ||
              (c.status === "WAIVED" && !assignedReviewer)
            )
              throw new AppError(
                403,
                "Only the owner or assigned reviewer can update this mitigation; waivers require a reviewer.",
              );
            await tx.mitigation.update({
              where: { id: m.id },
              data: { status: c.status, completionNotes: c.notes },
            });
            await audit(
              tx,
              actor,
              c.status === "COMPLETE"
                ? "MITIGATION_COMPLETED"
                : "MITIGATION_UPDATED",
              record.id,
              `Mitigation ${m.id}: ${m.status} → ${c.status}. Notes: ${c.notes || "None"}`,
            );
          } else if (c.action === "reassess") {
            if (
              !(owner || assignedReviewer || admin) ||
              !approved.includes(record.status)
            )
              throw new AppError(
                403,
                "Only an owner, assigned reviewer, or administrator can reassess an approved use.",
              );
            await tx.reassessment.create({
              data: {
                useCaseId: record.id,
                reason: c.reason,
                previousVersion: record.assessments[0]?.version ?? 0,
              },
            });
            await change({ status: "DRAFT", nextReviewAt: null });
            await audit(
              tx,
              actor,
              "REASSESSMENT_STARTED",
              record.id,
              c.reason,
              record.status,
              "DRAFT",
            );
          } else if (c.action === "archive") {
            requireRole(actor, "ADMINISTRATOR");
            if (pending.includes(record.status) || record.status === "DRAFT")
              throw new AppError(
                409,
                "Finish the active review before archiving.",
              );
            await change({ status: "ARCHIVED" });
            await audit(
              tx,
              actor,
              "REQUEST_ARCHIVED",
              record.id,
              c.reason,
              record.status,
              "ARCHIVED",
            );
          }
          return { id: record.id };
        },
        { isolationLevel: "Serializable", timeout: 15000 },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw e;
    }
  }
  throw new AppError(
    409,
    "Another action is in progress. Refresh and try again.",
  );
}
export async function getWorkspace(actor: Actor) {
  const records = await db.useCase.findMany({
    where: scope(actor),
    include: detailInclude,
    orderBy: { updatedAt: "desc" },
  });
  const admin = actor.roles.includes("ADMINISTRATOR");
  const [events, users, configuration, routing] = await Promise.all([
    db.auditEvent.findMany({
      where: {
        OR: [
          { useCaseId: { in: records.map((r) => r.id) } },
          ...(admin
            ? [
                {
                  useCaseId: null,
                  actor: { organizationId: actor.organizationId },
                },
              ]
            : []),
        ],
      },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, name: true, roles: true },
    }),
    admin
      ? db.riskConfiguration.findFirst({
          where: { organizationId: actor.organizationId },
          orderBy: { version: "desc" },
        })
      : null,
    admin
      ? db.routingRule.findMany({
          where: { organizationId: actor.organizationId },
        })
      : [],
  ]);
  return { actor, records, events, users, configuration, routing };
}
type Jsonify<T> = T extends Date
  ? string
  : T extends object
    ? { [K in keyof T]: Jsonify<T[K]> }
    : T;
export type Workspace = Jsonify<Awaited<ReturnType<typeof getWorkspace>>>;
export type GovernanceRecord = Workspace["records"][number];
