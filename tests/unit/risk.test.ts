import { describe, it, expect } from "vitest";
import {
  assess,
  defaultConfig,
  emptyAnswers,
  configSchema,
  answersSchema,
} from "../../src/modules/risk/engine";
describe("deterministic advisory scoring", () => {
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
