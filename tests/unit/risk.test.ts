import { describe, it, expect } from "vitest";
import {
  assess,
  defaultConfig,
  emptyAnswers,
  configSchema,
  answersSchema,
} from "../../src/modules/risk/engine";
describe("deterministic advisory scoring", () => {
  it.each([
    [7, "LOW"],
    [8, "MODERATE"],
    [14, "MODERATE"],
    [15, "HIGH"],
    [21, "HIGH"],
    [22, "EXECUTIVE_EXCEPTION"],
  ])("classifies numeric boundary %i as %s", (total, tier) => {
    let remaining = total;
    const answers = { ...emptyAnswers };
    for (const key of Object.keys(answers) as (keyof typeof answers)[]) {
      answers[key] = Math.min(remaining, 3);
      remaining -= answers[key];
    }
    const policy = {
      ...defaultConfig,
      rules: {
        autonomousCritical: false,
        sensitiveVendor: false,
        uncontrolledImpact: false,
      },
    };
    const result = assess(answers, "GENERAL", policy);
    expect(result.score).toBe(total);
    expect(result.tier).toBe(tier);
    expect(result.triggeredRules).toEqual([]);
  });
  it("preserves all explanations when escalation rules overlap", () => {
    const result = assess(
      {
        ...emptyAnswers,
        autonomy: 3,
        dataSensitivity: 3,
        vendorAssurance: 2,
        impact: 3,
        oversight: 2,
      },
      "CLINICAL",
      defaultConfig,
    );
    expect(result.tier).toBe("EXECUTIVE_EXCEPTION");
    expect(result.triggeredRules).toHaveLength(3);
    expect(
      result.factors.reduce((sum, factor) => sum + factor.contribution, 0),
    ).toBe(result.score);
  });
  it("uses a configured disabled rule without changing other escalations", () => {
    const policy = {
      ...defaultConfig,
      rules: { ...defaultConfig.rules, autonomousCritical: false },
    };
    expect(
      assess({ ...emptyAnswers, autonomy: 3 }, "CLINICAL", policy).tier,
    ).toBe("LOW");
    expect(
      assess(
        { ...emptyAnswers, dataSensitivity: 3, vendorAssurance: 2 },
        "CLINICAL",
        policy,
      ).tier,
    ).toBe("HIGH");
  });
  it("does not mutate answers or the assessed policy", () => {
    const answers = structuredClone(emptyAnswers),
      policy = structuredClone(defaultConfig);
    const first = assess(answers, "GENERAL", policy);
    expect(assess(answers, "GENERAL", policy)).toEqual(first);
    expect(answers).toEqual(emptyAnswers);
    expect(policy).toEqual(defaultConfig);
  });
  it.each([NaN, Infinity, 1.5])(
    "rejects invalid numeric answer %s",
    (impact) => {
      expect(() =>
        assess({ ...emptyAnswers, impact }, "GENERAL", defaultConfig),
      ).toThrow();
    },
  );
  it("classifies minimal information as low without making a decision", () => {
    const r = assess(emptyAnswers, "GENERAL", defaultConfig);
    expect(r.tier).toBe("LOW");
    expect(r.score).toBe(0);
    expect(r).not.toHaveProperty("decision");
  });
  it("classifies a moderate scenario", () =>
    expect(
      assess(
        {
          ...emptyAnswers,
          dataSensitivity: 2,
          impact: 2,
          autonomy: 2,
          transparency: 2,
        },
        "GENERAL",
        defaultConfig,
      ).tier,
    ).toBe("MODERATE"));
  it("classifies a high weighted score", () =>
    expect(
      assess(
        {
          ...emptyAnswers,
          dataSensitivity: 2,
          impact: 2,
          autonomy: 2,
          oversight: 2,
          vendorAssurance: 2,
          transparency: 2,
          safeguards: 2,
          regulatory: 2,
        },
        "GENERAL",
        defaultConfig,
      ).tier,
    ).toBe("HIGH"));
  it.each(["CLINICAL", "EMPLOYMENT"])(
    "escalates autonomous %s decisions regardless of numeric threshold",
    (domain) => {
      const r = assess({ ...emptyAnswers, autonomy: 3 }, domain, defaultConfig);
      expect(r.tier).toBe("EXECUTIVE_EXCEPTION");
      expect(r.triggeredRules).toHaveLength(1);
    },
  );
  it("escalates sensitive data and inadequate vendor assurance", () =>
    expect(
      assess(
        { ...emptyAnswers, dataSensitivity: 3, vendorAssurance: 2 },
        "GENERAL",
        defaultConfig,
      ).tier,
    ).toBe("HIGH"));
  it("escalates high impact without meaningful oversight", () =>
    expect(
      assess(
        { ...emptyAnswers, impact: 3, oversight: 3 },
        "GENERAL",
        defaultConfig,
      ).tier,
    ).toBe("HIGH"));
  it("retains every contribution and applies configured weights", () => {
    const r = assess({ ...emptyAnswers, dataSensitivity: 2 }, "GENERAL", {
      ...defaultConfig,
      weights: { ...defaultConfig.weights, dataSensitivity: 2 },
    });
    expect(r.score).toBe(4);
    expect(r.factors).toHaveLength(8);
    expect(r.factors[0]).toMatchObject({
      score: 2,
      weight: 2,
      contribution: 4,
    });
  });
  it("uses inclusive threshold boundaries", () =>
    expect(
      assess(
        { ...emptyAnswers, dataSensitivity: 2, impact: 3, transparency: 3 },
        "GENERAL",
        defaultConfig,
      ).tier,
    ).toBe("MODERATE"));
  it("rejects negative or out-of-range answers", () => {
    expect(
      answersSchema.safeParse({ ...emptyAnswers, impact: 4 }).success,
    ).toBe(false);
    expect(
      answersSchema.safeParse({ ...emptyAnswers, impact: -1 }).success,
    ).toBe(false);
  });
  it("rejects inverted or unreachable thresholds", () => {
    expect(configSchema.safeParse({ ...defaultConfig, high: 2 }).success).toBe(
      false,
    );
    expect(
      configSchema.safeParse({ ...defaultConfig, exception: 100 }).success,
    ).toBe(false);
  });
});
