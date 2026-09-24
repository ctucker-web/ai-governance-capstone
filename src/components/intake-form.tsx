"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { GovernanceRecord } from "@/modules/workflow/service";
import { dimensions, type Answers } from "@/modules/risk/engine";
import { intakeSchema, type Intake } from "@/modules/intake/validation";
import { Field, human } from "./ui";
export default function IntakeForm({
  record,
  busy,
  onSave,
  onCancel,
}: {
  record?: GovernanceRecord;
  busy: boolean;
  onSave: (data: Intake, submit: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [data, setData] = useState<Intake>(() =>
    record
      ? {
          title: record.title,
          toolName: record.system.name,
          vendor: record.system.vendor,
          department: record.department,
          purpose: record.purpose,
          description: record.description,
          affectedUsers: record.affectedUsers,
          affectedPeople: record.affectedPeople,
          dataCategories: record.dataCategories as Intake["dataCategories"],
          decisionSupport: record.decisionSupport,
          autonomy: record.autonomy,
          oversight: record.oversight,
          vendorInformation: record.vendorInformation,
          domain: record.domain as Intake["domain"],
          answers: record.answers as Answers,
        }
      : {
          title: "",
          toolName: "",
          vendor: "",
          department: "",
          purpose: "",
          description: "",
          affectedUsers: "",
          affectedPeople: "",
          dataCategories: [],
          decisionSupport: "",
          autonomy: "",
          oversight: "",
          vendorInformation: "",
          domain: "GENERAL",
          answers: Object.fromEntries(
            dimensions.map((d) => [d.key, -1]),
          ) as Answers,
        },
  );
  const set = (key: keyof Intake, value: unknown) =>
    setData((d) => ({ ...d, [key]: value }));
  const text = (
    key: keyof Intake,
    label: string,
    placeholder: string,
    long = false,
  ) => (
    <Field label={label}>
      {long ? (
        <textarea
          required
          maxLength={4000}
          rows={3}
          value={String(data[key])}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          required
          maxLength={160}
          value={String(data[key])}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
  async function save(submit: boolean) {
    const parsed = intakeSchema.safeParse(data);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${human(String(i.path[0]))}: ${i.message}`)
          .join(" "),
      );
      return;
    }
    setError("");
    await onSave(parsed.data, submit);
  }
  return (
    <section className="panel intake">
      <div className="steps" aria-label={`Step ${step + 1} of 3`}>
        {["The idea", "People & safeguards", "Risk questions"].map((s, i) => (
          <div
            className={i === step ? "current" : i < step ? "complete" : ""}
            key={s}
          >
            <span>{i < step ? <Check size={15} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < 2) {
            setStep(step + 1);
            setError("");
          } else await save(true);
        }}
      >
        {step === 0 && (
          <>
            <span className="eyebrow">START WITH THE PURPOSE</span>
            <h2>What would you like AI to help with?</h2>
            <p>
              Tell reviewers about the idea, the tool, and the benefit you
              expect.
            </p>
            <div className="form-grid">
              {text(
                "title",
                "Use-case name",
                "e.g. Clinical documentation assistant",
              )}
              {text("department", "Department", "e.g. Programs")}
              {text("toolName", "AI tool / product", "Product name")}
              {text("vendor", "Vendor", "Company or provider")}
            </div>
            {text(
              "purpose",
              "Business purpose",
              "What problem will this solve?",
              true,
            )}
            {text(
              "description",
              "Description of use",
              "How will the tool fit into day-to-day work?",
              true,
            )}
            <Field label="Area of use">
              <select
                value={data.domain}
                onChange={(e) => set("domain", e.target.value)}
              >
                {[
                  "GENERAL",
                  "CLINICAL",
                  "EMPLOYMENT",
                  "FINANCE",
                  "FUNDRAISING",
                ].map((v) => (
                  <option key={v} value={v}>
                    {human(v)}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <span className="eyebrow">PEOPLE COME FIRST</span>
            <h2>Who is affected, and who checks the work?</h2>
            <div className="notice">
              Describe categories and safeguards. Do not paste health records,
              employee data, or confidential information.
            </div>
            <div className="form-grid">
              {text(
                "affectedUsers",
                "Who will use the tool?",
                "e.g. Program staff",
              )}
              {text(
                "affectedPeople",
                "Whose outcomes could be affected?",
                "e.g. Program participants",
              )}
            </div>
            <fieldset>
              <legend>Data categories (select at least one)</legend>
              <div className="checkbox-grid">
                {[
                  "PUBLIC",
                  "INTERNAL",
                  "CLIENT_HEALTH",
                  "EMPLOYEE",
                  "FINANCIAL",
                  "DONOR",
                  "OTHER_CONFIDENTIAL",
                ].map((v) => (
                  <label key={v} className="check">
                    <input
                      type="checkbox"
                      checked={data.dataCategories.includes(
                        v as Intake["dataCategories"][number],
                      )}
                      onChange={(e) =>
                        set(
                          "dataCategories",
                          e.target.checked
                            ? [...data.dataCategories, v]
                            : data.dataCategories.filter((x) => x !== v),
                        )
                      }
                    />
                    {human(v)}
                  </label>
                ))}
              </div>
            </fieldset>
            {text(
              "decisionSupport",
              "What decisions or work will AI support?",
              "e.g. Drafting notes; staff makes all final decisions",
              true,
            )}
            <div className="form-grid">
              {text(
                "autonomy",
                "How independently will AI act?",
                "e.g. Drafts only; no actions without staff",
              )}
              {text(
                "oversight",
                "Describe human oversight",
                "e.g. Clinician verifies each note",
              )}
            </div>
            {text(
              "vendorInformation",
              "Vendor & safeguard information",
              "Describe assurance evidence, data use, and security/privacy controls.",
              true,
            )}
          </>
        )}
        {step === 2 && (
          <>
            <span className="eyebrow">A SHARED UNDERSTANDING OF RISK</span>
            <h2>A few questions to guide human review</h2>
            <p>
              Choose the closest answer. If assurance or controls are unknown,
              select the option that says so.
            </p>
            <div className="form-grid risk-questions">
              {dimensions.map((d) => (
                <Field key={d.key} label={d.label} help={d.help}>
                  <select
                    required
                    value={
                      data.answers[d.key] === -1 ? "" : data.answers[d.key]
                    }
                    onChange={(e) =>
                      set("answers", {
                        ...data.answers,
                        [d.key]: Number(e.target.value),
                      })
                    }
                  >
                    <option value="" disabled>
                      Choose an answer
                    </option>
                    {d.choices.map((choice, i) => (
                      <option key={choice} value={i}>
                        {choice}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="notice">
              Advisory risk classifications support human review and do not
              constitute an approval decision.
            </div>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button secondary"
            type="button"
            onClick={step ? () => setStep(step - 1) : onCancel}
          >
            <ArrowLeft size={16} />
            {step ? "Back" : "Cancel"}
          </button>
          <span className="spacer" />
          {step === 2 && (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => save(false)}
            >
              Save draft
            </button>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? "Saving…"
              : step < 2
                ? "Continue"
                : "Submit for human review"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
