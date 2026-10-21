"use client";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { GovernanceRecord } from "@/modules/workflow/service";
import {
  dimensions,
  type Answers,
  type FactorKey,
} from "@/modules/risk/engine";
import { intakeSchema, type Intake } from "@/modules/intake/validation";
import { human } from "./ui";

const stepNames = [
  "Your AI Idea",
  "People & Information",
  "Risk Questions & Submit",
];
const labels = {
  title: "Use-case name",
  department: "Department",
  toolName: "AI tool / product",
  vendor: "Vendor",
  purpose: "Business purpose",
  description: "Description of use",
  affectedUsers: "Who will use the tool?",
  affectedPeople: "Whose outcomes could be affected?",
  decisionSupport: "What decisions or work will AI support?",
  autonomy: "How independently will AI act?",
  oversight: "Describe human oversight",
  vendorInformation: "Vendor & safeguard information",
} as const;
type TextKey = keyof typeof labels;
const shortFields = new Set<TextKey>([
  "title",
  "department",
  "toolName",
  "vendor",
]);
const stepFields: string[][] = [
  [
    "title",
    "department",
    "toolName",
    "vendor",
    "purpose",
    "description",
    "domain",
  ],
  [
    "affectedUsers",
    "affectedPeople",
    "dataCategories",
    "decisionSupport",
    "autonomy",
    "oversight",
    "vendorInformation",
  ],
  dimensions.map((d) => `answers.${d.key}`),
];
const inputId = (key: string) => `intake-${key.replaceAll(".", "-")}`;
const fieldLabel = (key: string) =>
  key.startsWith("answers.")
    ? (dimensions.find((d) => `answers.${d.key}` === key)?.label ??
      "Risk answer")
    : key === "dataCategories"
      ? "Data categories"
      : key === "domain"
        ? "Area of use"
        : labels[key as TextKey];

function friendlyError(key: string, value: unknown): string {
  if (key === "dataCategories")
    return "Please select at least one category of information the AI tool will use.";
  if (key === "domain")
    return "Please select the area where you plan to use AI.";
  if (key.startsWith("answers.")) {
    const prompts: Record<FactorKey, string> = {
      dataSensitivity:
        "Please select the type of information your proposed AI use will process.",
      impact: "Please select how the AI output could affect people.",
      autonomy: "Please select how independently the AI will act.",
      oversight:
        "Please select who will check the AI results before they are used.",
      vendorAssurance:
        "Please select what assurance the AI provider has supplied, including if it is unknown.",
      transparency:
        "Please select how people can understand or question the AI output.",
      safeguards:
        "Please select the privacy and security protections in place, including if they are unknown.",
      regulatory:
        "Please select how your proposed AI use relates to legal or regulatory requirements.",
    };
    return (
      prompts[key.slice(8) as FactorKey] ??
      "Please choose an answer to this risk question."
    );
  }
  const max = shortFields.has(key as TextKey) ? 160 : 4000;
  if (typeof value === "string" && value.trim().length > max)
    return `Please shorten this answer to ${max.toLocaleString()} characters or fewer.`;
  const prompts: Record<TextKey, string> = {
    title: "Please give your assessment a short name.",
    department: "Please enter the department that plans to use this AI tool.",
    toolName: "Please enter the name of the AI tool or product.",
    vendor: "Please enter the company or provider of the AI tool.",
    purpose: "Please describe what you want AI to help with.",
    description: "Please describe how you plan to use the AI tool.",
    affectedUsers: "Please describe who will use the tool.",
    affectedPeople: "Please describe whose outcomes could be affected.",
    decisionSupport:
      "Please describe the decisions or work the AI will support.",
    autonomy: "Please describe how independently the AI will act.",
    oversight: "Please describe who will check the AI results.",
    vendorInformation:
      "Please describe the provider's safeguards, or explain what is still unknown.",
  };
  return prompts[key as TextKey] ?? "Please check this answer.";
}

export default function IntakeForm({
  record,
  busy,
  onSave,
  onCancel,
  onDirtyChange,
}: {
  record?: GovernanceRecord;
  busy: boolean;
  onSave: (data: Intake, submit: boolean) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [focusError, setFocusError] = useState(0);
  const errorSummary = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
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
  const [savedData, setSavedData] = useState(() => JSON.stringify(data));
  const dirty = JSON.stringify(data) !== savedData;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);
  useEffect(() => {
    stepHeading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (focusError) errorSummary.current?.focus();
  }, [focusError]);

  const set = (key: keyof Intake, value: unknown, errorKey = key as string) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[errorKey];
      return next;
    });
    setSaveError("");
  };
  const describedBy = (key: string, help?: string) =>
    [
      help ? `${inputId(key)}-help` : "",
      errors[key] ? `${inputId(key)}-error` : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const inlineError = (key: string) =>
    errors[key] && (
      <small id={`${inputId(key)}-error`} className="field-error">
        {errors[key]}
      </small>
    );
  const text = (
    key: TextKey,
    placeholder: string,
    long = false,
    help?: string,
  ) => {
    const props = {
      id: inputId(key),
      required: true,
      disabled: busy,
      maxLength: shortFields.has(key) ? 160 : 4000,
      value: data[key],
      placeholder,
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby": describedBy(key, help),
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        set(key, event.target.value),
    };
    return (
      <div className="field">
        <label htmlFor={inputId(key)}>{labels[key]}</label>
        {help && <small id={`${inputId(key)}-help`}>{help}</small>}
        {long ? <textarea {...props} rows={3} /> : <input {...props} />}
        {inlineError(key)}
      </div>
    );
  };
  function validate(currentStep?: number) {
    const parsed = intakeSchema.safeParse(data);
    const next: Record<string, string> = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (currentStep !== undefined && !stepFields[currentStep].includes(key))
          continue;
        next[key] = friendlyError(key, data[key as keyof Intake]);
      }
    setErrors(next);
    setSaveError("");
    if (Object.keys(next).length) {
      const firstStep = stepFields.findIndex((fields) =>
        fields.includes(Object.keys(next)[0]),
      );
      if (firstStep >= 0) setStep(firstStep);
      setFocusError((count) => count + 1);
      return null;
    }
    return parsed.success ? parsed.data : data;
  }
  async function save(submit: boolean) {
    const parsed = validate();
    if (!parsed) return;
    try {
      await onSave(parsed, submit);
      setSavedData(JSON.stringify(data));
      onDirtyChange?.(false);
    } catch {
      setSaveError(
        "We could not confirm that your assessment was saved. Your answers are still here. Please check your connection and try again.",
      );
      setFocusError((count) => count + 1);
    }
  }
  function moveToField(key: string) {
    const targetStep = stepFields.findIndex((fields) => fields.includes(key));
    if (targetStep >= 0) setStep(targetStep);
    requestAnimationFrame(() => document.getElementById(inputId(key))?.focus());
  }
  return (
    <section className="panel intake" aria-label="AI assessment form">
      <p className="intake-progress-label">
        Step {step + 1} of 3 — {stepNames[step]}
      </p>
      <div className="steps" role="list" aria-label="Assessment progress">
        {stepNames.map((name, index) => (
          <div
            role="listitem"
            key={name}
            aria-current={index === step ? "step" : undefined}
            className={
              index === step ? "current" : index < step ? "complete" : ""
            }
          >
            <span aria-hidden="true">
              {index < step ? <Check size={15} /> : index + 1}
            </span>
            <div>
              {name}
              <small className="intake-step-state">
                {index < step
                  ? "Completed"
                  : index === step
                    ? "Current step"
                    : "Upcoming"}
              </small>
            </div>
          </div>
        ))}
      </div>
      <p className="intake-required-help">
        All fields are required. Use fictional information only.
      </p>
      <form
        noValidate
        aria-busy={busy}
        onSubmit={async (event) => {
          event.preventDefault();
          if (step < 2) {
            if (validate(step)) setStep(step + 1);
          } else await save(true);
        }}
      >
        {(Object.keys(errors).length > 0 || saveError) && (
          <div
            className="notice error intake-error-summary"
            role="alert"
            tabIndex={-1}
            ref={errorSummary}
            aria-labelledby="intake-error-heading"
          >
            <h3 id="intake-error-heading">
              {saveError
                ? "Your assessment needs another try"
                : "Please check your answers"}
            </h3>
            {saveError && <p>{saveError}</p>}
            {Object.keys(errors).length > 0 && (
              <ul>
                {Object.entries(errors).map(([key, message]) => (
                  <li key={key}>
                    <button
                      type="button"
                      className="intake-error-link"
                      onClick={() => moveToField(key)}
                    >
                      {fieldLabel(key)}: {message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {step === 0 && (
          <>
            <span className="eyebrow">START WITH THE PURPOSE</span>
            <h2 ref={stepHeading} tabIndex={-1}>
              What would you like AI to help with?
            </h2>
            <p>
              Tell reviewers about the idea, the tool, and the benefit you
              expect.
            </p>
            <div className="form-grid">
              {text("title", "e.g. Clinical documentation assistant")}
              {text("department", "e.g. Programs")}
              {text("toolName", "Product name")}
              {text(
                "vendor",
                "Company or provider",
                false,
                "The company or organization that provides the AI tool.",
              )}
            </div>
            {text("purpose", "What problem will this solve?", true)}
            {text(
              "description",
              "How will the tool fit into day-to-day work?",
              true,
            )}
            <div className="field">
              <label htmlFor={inputId("domain")}>Area of use</label>
              <select
                id={inputId("domain")}
                required
                disabled={busy}
                value={data.domain}
                aria-invalid={Boolean(errors.domain)}
                aria-describedby={describedBy("domain")}
                onChange={(event) => set("domain", event.target.value)}
              >
                {[
                  "GENERAL",
                  "CLINICAL",
                  "EMPLOYMENT",
                  "FINANCE",
                  "FUNDRAISING",
                ].map((value) => (
                  <option key={value} value={value}>
                    {human(value)}
                  </option>
                ))}
              </select>
              {inlineError("domain")}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <span className="eyebrow">PEOPLE COME FIRST</span>
            <h2 ref={stepHeading} tabIndex={-1}>
              Who is affected, and who checks the work?
            </h2>
            <div className="notice">
              Describe categories and safeguards. Do not paste health records,
              employee data, or confidential information.
            </div>
            <div className="form-grid">
              {text("affectedUsers", "e.g. Program staff")}
              {text("affectedPeople", "e.g. Program participants")}
            </div>
            <fieldset
              id={inputId("dataCategories")}
              disabled={busy}
              tabIndex={-1}
              aria-invalid={Boolean(errors.dataCategories)}
              aria-describedby={describedBy("dataCategories")}
            >
              <legend>Data categories (select at least one) </legend>
              <div className="checkbox-grid">
                {[
                  "PUBLIC",
                  "INTERNAL",
                  "CLIENT_HEALTH",
                  "EMPLOYEE",
                  "FINANCIAL",
                  "DONOR",
                  "OTHER_CONFIDENTIAL",
                ].map((value) => (
                  <label key={value} className="check">
                    <input
                      type="checkbox"
                      checked={data.dataCategories.includes(
                        value as Intake["dataCategories"][number],
                      )}
                      onChange={(event) =>
                        set(
                          "dataCategories",
                          event.target.checked
                            ? [...data.dataCategories, value]
                            : data.dataCategories.filter(
                                (item) => item !== value,
                              ),
                        )
                      }
                    />
                    {human(value)}
                  </label>
                ))}
              </div>
              {inlineError("dataCategories")}
            </fieldset>
            {text(
              "decisionSupport",
              "e.g. Drafting notes; staff makes all final decisions",
              true,
            )}
            <div className="form-grid">
              {text(
                "autonomy",
                "e.g. Drafts only; no actions without staff",
                false,
                "Explain whether AI only suggests something or can take action itself.",
              )}
              {text(
                "oversight",
                "e.g. Clinician verifies each note",
                false,
                "Who checks AI-generated results before they are used?",
              )}
            </div>
            {text(
              "vendorInformation",
              "Describe security/privacy controls and what is still unknown.",
              true,
              "What information has the AI provider supplied about security, privacy, and responsible operation?",
            )}
          </>
        )}
        {step === 2 && (
          <>
            <span className="eyebrow">A SHARED UNDERSTANDING OF RISK</span>
            <h2 ref={stepHeading} tabIndex={-1}>
              A few questions to guide human review
            </h2>
            <p>
              Choose the closest answer. If assurance or controls are unknown,
              select the option that says so.
            </p>
            <div className="form-grid risk-questions">
              {dimensions.map((dimension) => {
                const key = `answers.${dimension.key}`;
                const help =
                  dimension.key === "vendorAssurance"
                    ? "What information has the AI provider supplied about security, privacy, and responsible operation?"
                    : dimension.key === "regulatory"
                      ? "Does your proposed AI use involve activities with legal or regulatory requirements?"
                      : dimension.help;
                return (
                  <div className="field" key={dimension.key}>
                    <label htmlFor={inputId(key)}>{dimension.label}</label>
                    <small id={`${inputId(key)}-help`}>{help}</small>
                    <select
                      id={inputId(key)}
                      required
                      disabled={busy}
                      value={
                        data.answers[dimension.key] === -1
                          ? ""
                          : data.answers[dimension.key]
                      }
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={describedBy(key, help)}
                      onChange={(event) =>
                        set(
                          "answers",
                          {
                            ...data.answers,
                            [dimension.key]: Number(event.target.value),
                          },
                          key,
                        )
                      }
                    >
                      <option value="" disabled>
                        Choose an answer
                      </option>
                      {dimension.choices.map((choice, index) => (
                        <option key={choice} value={index}>
                          {choice}
                        </option>
                      ))}
                    </select>
                    {inlineError(key)}
                  </div>
                );
              })}
            </div>
            <details className="disclosure intake-review" open>
              <summary>Review your assessment</summary>
              <p>
                Check your answers before submitting. Use Back to make changes.
              </p>
              <dl className="intake-review-grid">
                {Object.entries(labels).map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{data[key as TextKey] || "Not answered"}</dd>
                  </div>
                ))}
                <div>
                  <dt>Area of use</dt>
                  <dd>{human(data.domain)}</dd>
                </div>
                <div>
                  <dt>Data categories</dt>
                  <dd>
                    {data.dataCategories.map(human).join(", ") ||
                      "Not answered"}
                  </dd>
                </div>
                {dimensions.map((dimension) => (
                  <div key={dimension.key}>
                    <dt>{dimension.label}</dt>
                    <dd>
                      {dimension.choices[data.answers[dimension.key]] ??
                        "Not answered"}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
            <div className="notice">
              <strong>What happens after you submit?</strong> The software
              generates an advisory risk classification: a preliminary
              indication of potential risk. A designated human reviewer makes
              the final decision. Submitting does not approve your AI use.
            </div>
            <p className="intake-draft-help">
              <strong>Save Draft</strong> saves these completed answers without
              sending them for review. All required questions must be answered
              to save. <strong>Submit Assessment</strong> saves your answers and
              sends them to a human reviewer.
            </p>
          </>
        )}
        <div className="form-actions">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={
              step
                ? () => {
                    setStep(step - 1);
                    setErrors({});
                    setSaveError("");
                  }
                : onCancel
            }
          >
            <ArrowLeft size={16} aria-hidden="true" />
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
              Save Draft
            </button>
          )}
          <button className="button" disabled={busy} type="submit">
            {busy ? "Saving…" : step < 2 ? "Continue" : "Submit Assessment"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
