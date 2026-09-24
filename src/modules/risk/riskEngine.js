export const DEFAULT_RISK_CONFIG = Object.freeze({
  algorithmVersion: "1.0.0",
  factors: {
    dataSensitivity: {
      label: "Data sensitivity",
      weight: 1,
      highExplanation: "Sensitive or regulated data"
    },
    affectedPeople: {
      label: "Impact on clients / employees",
      weight: 1,
      highExplanation: "High impact on clients or employees"
    },
    autonomy: {
      label: "AI autonomy in decisions",
      weight: 1,
      highExplanation: "High level of AI autonomy"
    },
    humanOversight: {
      label: "Risk from limited human oversight",
      weight: 1,
      highExplanation: "Limited human oversight"
    },
    vendorAssurance: {
      label: "Risk from limited vendor assurance",
      weight: 1,
      highExplanation: "Limited vendor assurance evidence"
    }
  },
  thresholds: {
    moderate: 5,
    high: 9,
    restricted: 13
  }
});

const TIER_ORDER = ["Low", "Moderate", "High", "Restricted"];

function assertRiskValue(name, value) {
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw new RangeError(`${name} must be an integer from 0 through 3.`);
  }
}

function maxTier(currentTier, minimumTier) {
  return TIER_ORDER.indexOf(currentTier) >= TIER_ORDER.indexOf(minimumTier)
    ? currentTier
    : minimumTier;
}

/**
 * Calculates an explainable advisory risk tier.
 *
 * The algorithm never makes an approval decision. It only returns a preliminary
 * tier used to guide human review and routing.
 */
export function calculateRiskAssessment(input, config = DEFAULT_RISK_CONFIG) {
  const normalized = {};
  const factorResults = [];

  for (const [name, definition] of Object.entries(config.factors)) {
    const value = Number(input[name]);
    assertRiskValue(name, value);
    normalized[name] = value;

    factorResults.push({
      key: name,
      label: definition.label,
      value,
      weight: definition.weight,
      contribution: value * definition.weight
    });
  }

  const score = factorResults.reduce(
    (total, factor) => total + factor.contribution,
    0
  );

  let tier = "Low";
  if (score >= config.thresholds.restricted) tier = "Restricted";
  else if (score >= config.thresholds.high) tier = "High";
  else if (score >= config.thresholds.moderate) tier = "Moderate";

  const contributingFactors = factorResults
    .filter((factor) => factor.value >= 3)
    .map((factor) => config.factors[factor.key].highExplanation);

  const escalationRules = [];

  if (normalized.autonomy >= 3 && normalized.affectedPeople >= 3) {
    tier = "Restricted";
    escalationRules.push(
      "High-impact use combined with high AI autonomy requires restricted-level review."
    );
  }

  if (normalized.dataSensitivity >= 3 && normalized.vendorAssurance >= 3) {
    tier = maxTier(tier, "High");
    escalationRules.push(
      "Sensitive data combined with limited vendor assurance requires high-risk review."
    );
  }

  if (normalized.affectedPeople >= 3 && normalized.humanOversight >= 3) {
    tier = maxTier(tier, "High");
    escalationRules.push(
      "High impact combined with limited human oversight requires high-risk review."
    );
  }

  return {
    algorithmVersion: config.algorithmVersion,
    score,
    tier,
    contributingFactors,
    escalationRules,
    factorResults,
    advisoryOnly: true
  };
}
