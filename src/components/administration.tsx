"use client";
import type { Workspace } from "@/modules/workflow/service";
import {
  dimensions,
  configSchema,
  tiers,
  type RiskConfig,
} from "@/modules/risk/engine";
import { Field, human, Panel } from "./ui";
import type { Run } from "./governance-app";
export default function Administration({
  ws,
  busy,
  run,
}: {
  ws: Workspace;
  busy: boolean;
  run: Run;
}) {
  if (!ws.configuration) return <p>Administrator access is required.</p>;
  const config = configSchema.parse(ws.configuration.settings),
    configuration = ws.configuration;
  return (
    <form
      key={configuration.version}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const settings: RiskConfig = {
          weights: Object.fromEntries(
            dimensions.map((d) => [d.key, Number(f.get(d.key))]),
          ) as RiskConfig["weights"],
          moderate: Number(f.get("moderate")),
          high: Number(f.get("high")),
          exception: Number(f.get("exception")),
          reassessmentDays: Number(f.get("days")),
          rules: {
            autonomousCritical: f.has("autonomousCritical"),
            sensitiveVendor: f.has("sensitiveVendor"),
            uncontrolledImpact: f.has("uncontrolledImpact"),
          },
        };
        const routing = Object.fromEntries(
          tiers.map((t) => [t, String(f.get(`route-${t}`))]),
        ) as Record<(typeof tiers)[number], string>;
        await run({
          action: "configure",
          version: configuration.version,
          settings,
          routing,
        });
      }}
    >
      <div className="notice">
        Policy version {configuration.version}. Saving creates a new policy
        version. Existing assessments retain their original scoring and review
        interval.
      </div>
      <Panel title="Advisory scoring" kicker="WEIGHTS & THRESHOLDS">
        <p>
          Each answer scores 0–3. Its contribution is the answer score
          multiplied by the configured weight.
        </p>
        <div className="form-grid">
          {dimensions.map((d) => (
            <Field label={`${d.label} weight`} key={d.key}>
              <input
                name={d.key}
                type="number"
                required
                min="0.25"
                max="5"
                step="0.25"
                defaultValue={config.weights[d.key]}
              />
            </Field>
          ))}
        </div>
        <div className="form-grid three">
          {[
            ["moderate", "Moderate threshold", config.moderate],
            ["high", "High threshold", config.high],
            ["exception", "Executive exception threshold", config.exception],
          ].map(([name, label, v]) => (
            <Field label={String(label)} key={String(name)}>
              <input
                name={String(name)}
                type="number"
                min="1"
                step="0.25"
                required
                defaultValue={v}
              />
            </Field>
          ))}
        </div>
      </Panel>
      <Panel title="Mandatory escalation rules">
        <p>
          When enabled, these rules can raise the advisory tier. They never
          approve or reject a use case.
        </p>
        {[
          [
            "autonomousCritical",
            "Autonomous clinical or employment decisions → Executive exception",
          ],
          [
            "sensitiveVendor",
            "Highly sensitive information with limited / unknown vendor assurance → High",
          ],
          [
            "uncontrolledImpact",
            "High-impact decisions with limited / absent oversight → High",
          ],
        ].map(([name, label]) => (
          <label className="check rule-check" key={name}>
            <input
              name={name}
              type="checkbox"
              defaultChecked={config.rules[name as keyof RiskConfig["rules"]]}
            />
            {label}
          </label>
        ))}
      </Panel>
      <Panel title="Reviewer routing">
        <p>
          One accountable reviewer per advisory tier. The requester cannot
          review their own use case.
        </p>
        <div className="form-grid">
          {tiers.map((t) => (
            <Field label={`${human(t)} reviewer`} key={t}>
              <select
                required
                name={`route-${t}`}
                defaultValue={ws.routing.find((r) => r.tier === t)?.reviewerId}
              >
                {ws.users
                  .filter((u) => u.roles.some((r) => r.role === "REVIEWER"))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
          ))}
        </div>
        <Field label="Default reassessment interval (days)">
          <input
            type="number"
            name="days"
            min="7"
            max="730"
            required
            defaultValue={config.reassessmentDays}
          />
        </Field>
      </Panel>
      <button className="button" disabled={busy}>
        {busy ? "Saving policy…" : "Save a new policy version"}
      </button>
    </form>
  );
}
