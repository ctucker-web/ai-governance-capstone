import { z } from "zod";
export const dimensions = [
  {
    key: "dataSensitivity",
    label: "Data sensitivity",
    help: "What categories of information will the tool process?",
    choices: [
      "Public information only",
      "Internal, non-sensitive information",
      "Confidential organizational information",
      "Health, employee, or other highly sensitive data",
    ],
  },
  {
    key: "impact",
    label: "Impact on people",
    help: "How much could the output affect a person?",
    choices: [
      "No decisions about people",
      "Minor, reversible effects",
      "Meaningful service or workplace effects",
      "Clinical care, employment, or essential services",
    ],
  },
  {
    key: "autonomy",
    label: "AI autonomy",
    help: "How independently will AI act?",
    choices: [
      "Drafts or suggestions only",
      "Staff chooses whether to use output",
      "Acts with limited review",
      "Makes or executes decisions autonomously",
    ],
  },
  {
    key: "oversight",
    label: "Human oversight",
    help: "Who checks the output before it is used?",
    choices: [
      "A qualified person verifies every output",
      "Regular human review",
      "Occasional or informal checks",
      "No meaningful human oversight",
    ],
  },
  {
    key: "vendorAssurance",
    label: "Vendor assurance",
    help: "How much assurance has the vendor provided?",
    choices: [
      "Documented and independently verified",
      "Documented, with minor gaps",
      "Limited assurance evidence",
      "No assurance or unclear data use",
    ],
  },
  {
    key: "transparency",
    label: "Transparency",
    help: "Can people understand and challenge the output?",
    choices: [
      "Clear explanations and a challenge process",
      "Mostly understandable",
      "Limited explanations",
      "Opaque outputs with no challenge process",
    ],
  },
  {
    key: "safeguards",
    label: "Privacy & security safeguards",
    help: "What protections are in place?",
    choices: [
      "Verified controls and data restrictions",
      "Documented basic safeguards",
      "Incomplete safeguards",
      "Missing or unknown safeguards",
    ],
  },
  {
    key: "regulatory",
    label: "Legal & regulatory exposure",
    help: "Does the use touch regulated activities?",
    choices: [
      "No identified regulated activity",
      "Limited policy considerations",
      "Potential regulated activity",
      "Regulated care, employment, or sensitive data",
    ],
  },
] as const;
export type FactorKey = (typeof dimensions)[number]["key"];
const score = z.number().int().min(0).max(3);
export const answersSchema = z
  .object({
    dataSensitivity: score,
    impact: score,
    autonomy: score,
    oversight: score,
    vendorAssurance: score,
    transparency: score,
    safeguards: score,
    regulatory: score,
  })
  .strict();
export type Answers = z.infer<typeof answersSchema>;
export const tiers = [
  "LOW",
  "MODERATE",
  "HIGH",
  "EXECUTIVE_EXCEPTION",
] as const;
export type RiskTier = (typeof tiers)[number];
const weight = z.number().min(0.25).max(5);
export const configSchema = z
  .object({
    weights: z
      .object({
        dataSensitivity: weight,
        impact: weight,
        autonomy: weight,
        oversight: weight,
        vendorAssurance: weight,
        transparency: weight,
        safeguards: weight,
        regulatory: weight,
      })
      .strict(),
    moderate: z.number().min(1),
    high: z.number().min(2),
    exception: z.number().min(3),
    reassessmentDays: z.number().int().min(7).max(730),
    rules: z
      .object({
        autonomousCritical: z.boolean(),
        sensitiveVendor: z.boolean(),
        uncontrolledImpact: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!(
      c.moderate < c.high &&
      c.high < c.exception &&
      c.exception <= Object.values(c.weights).reduce((a, b) => a + b, 0) * 3
    ))
      ctx.addIssue({
        code: "custom",
        message:
          "Thresholds must increase and remain within the maximum weighted score.",
      });
  });
export type RiskConfig = z.infer<typeof configSchema>;
export const defaultConfig: RiskConfig = {
  weights: {
    dataSensitivity: 1,
    impact: 1,
    autonomy: 1,
    oversight: 1,
    vendorAssurance: 1,
    transparency: 1,
    safeguards: 1,
    regulatory: 1,
  },
  moderate: 8,
  high: 15,
  exception: 22,
  reassessmentDays: 180,
  rules: {
    autonomousCritical: true,
    sensitiveVendor: true,
    uncontrolledImpact: true,
  },
};
export const emptyAnswers: Answers = {
  dataSensitivity: 0,
  impact: 0,
  autonomy: 0,
  oversight: 0,
  vendorAssurance: 0,
  transparency: 0,
  safeguards: 0,
  regulatory: 0,
};
export function assess(input: Answers, domain: string, policy: RiskConfig) {
  const a = answersSchema.parse(input),
    c = configSchema.parse(policy);
  const factors = dimensions.map((d) => ({
    key: d.key,
    label: d.label,
    score: a[d.key],
    weight: c.weights[d.key],
    contribution: a[d.key] * c.weights[d.key],
  }));
  const score = Number(
    factors.reduce((sum, f) => sum + f.contribution, 0).toFixed(2),
  );
  let tier: RiskTier =
    score >= c.exception
      ? "EXECUTIVE_EXCEPTION"
      : score >= c.high
        ? "HIGH"
        : score >= c.moderate
          ? "MODERATE"
          : "LOW";
  const triggeredRules: string[] = [];
  function escalate(to: RiskTier, reason: string) {
    if (tiers.indexOf(to) > tiers.indexOf(tier)) tier = to;
    triggeredRules.push(reason);
  }
  if (
    c.rules.autonomousCritical &&
    a.autonomy === 3 &&
    ["CLINICAL", "EMPLOYMENT"].includes(domain)
  )
    escalate(
      "EXECUTIVE_EXCEPTION",
      "Autonomous clinical or employment decisions require executive exception review.",
    );
  if (
    c.rules.sensitiveVendor &&
    a.dataSensitivity === 3 &&
    a.vendorAssurance >= 2
  )
    escalate(
      "HIGH",
      "Highly sensitive information combined with inadequate vendor assurance or unclear data use.",
    );
  if (c.rules.uncontrolledImpact && a.impact === 3 && a.oversight >= 2)
    escalate("HIGH", "High-impact decisions lack meaningful human oversight.");
  return { score, tier, factors, triggeredRules };
}
