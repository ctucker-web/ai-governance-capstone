import { z } from "zod";
import { answersSchema, configSchema } from "../risk/engine";
const text = z.string().trim().min(1, "This field is required.").max(4000);
const short = z.string().trim().min(1, "This field is required.").max(160);
export const intakeSchema = z
  .object({
    title: short,
    toolName: short,
    vendor: short,
    department: short,
    purpose: text,
    description: text,
    affectedUsers: text,
    affectedPeople: text,
    dataCategories: z
      .array(
        z.enum([
          "PUBLIC",
          "INTERNAL",
          "CLIENT_HEALTH",
          "EMPLOYEE",
          "FINANCIAL",
          "DONOR",
          "OTHER_CONFIDENTIAL",
        ]),
      )
      .min(1),
    decisionSupport: text,
    autonomy: text,
    oversight: text,
    vendorInformation: text,
    domain: z.enum([
      "GENERAL",
      "CLINICAL",
      "EMPLOYMENT",
      "FINANCE",
      "FUNDRAISING",
    ]),
    answers: answersSchema,
  })
  .strict();
export type Intake = z.infer<typeof intakeSchema>;
const id = z.uuid();
const revision = z.number().int().nonnegative();
const date = z.iso.date();
const mitigation = z
  .object({ description: text, ownerId: id, dueAt: date })
  .strict();
export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: intakeSchema }),
  z.object({ action: z.literal("edit"), id, revision, data: intakeSchema }),
  z.object({ action: z.literal("submit"), id, revision }),
  z
    .object({
      action: z.literal("decision"),
      id,
      revision,
      outcome: z.enum(["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED"]),
      rationale: text,
      mitigations: z.array(mitigation).max(20),
    })
    .superRefine((v, c) => {
      if (v.outcome === "CONDITIONALLY_APPROVED" && !v.mitigations.length)
        c.addIssue({
          code: "custom",
          path: ["mitigations"],
          message: "Conditional approval requires at least one mitigation.",
        });
    }),
  z.object({ action: z.literal("information"), id, revision, message: text }),
  z.object({
    action: z.literal("evidence"),
    id,
    type: short,
    description: text,
    reference: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => {
        try {
          return ["http:", "https:"].includes(new URL(v).protocol);
        } catch {
          return false;
        }
      }, "Use a valid http or https reference URL."),
    notes: z.string().trim().max(4000),
    reviewedAt: date.optional(),
  }),
  z
    .object({
      action: z.literal("mitigation"),
      id,
      mitigationId: id,
      status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETE", "WAIVED"]),
      notes: z.string().trim().max(4000),
    })
    .superRefine((v, c) => {
      if (["COMPLETE", "WAIVED"].includes(v.status) && !v.notes)
        c.addIssue({
          code: "custom",
          path: ["notes"],
          message: "Completion notes or a waiver rationale are required.",
        });
    }),
  z.object({ action: z.literal("addMitigation"), id, ...mitigation.shape }),
  z.object({ action: z.literal("reassess"), id, revision, reason: text }),
  z.object({ action: z.literal("archive"), id, revision, reason: text }),
  z.object({
    action: z.literal("configure"),
    version: z.number().int().positive(),
    settings: configSchema,
    routing: z
      .object({ LOW: id, MODERATE: id, HIGH: id, EXECUTIVE_EXCEPTION: id })
      .strict(),
  }),
]);
export type Command = z.infer<typeof commandSchema>;
