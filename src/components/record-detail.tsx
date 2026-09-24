"use client";
import { useState } from "react";
import { FileCheck2, Pencil, ShieldCheck } from "lucide-react";
import type { GovernanceRecord, Workspace } from "@/modules/workflow/service";
import type { Run } from "./governance-app";
import { approved, canReview, effectiveStatus } from "@/modules/auth/policy";
import { Badge, date, day, Field, human, Panel, Empty } from "./ui";
import { AuditList } from "./governance-app";
export default function RecordDetail({
  record: r,
  ws,
  busy,
  run,
  onEdit,
}: {
  record: GovernanceRecord;
  ws: Workspace;
  busy: boolean;
  run: Run;
  onEdit: () => void;
}) {
  const [outcome, setOutcome] = useState<
    "APPROVED" | "CONDITIONALLY_APPROVED" | "REJECTED"
  >("CONDITIONALLY_APPROVED");
  const [tab, setTab] = useState("overview");
  const owner =
    ws.actor.id === r.requesterId && ws.actor.roles.includes("REQUESTER");
  const active = r.reviews.find((v) => !v.closedAt && !v.decision);
  const reviewer =
    !!active && canReview(ws.actor, r.requesterId, active.reviewerId);
  const assigned = r.reviews.some((v) =>
    canReview(ws.actor, r.requesterId, v.reviewerId),
  );
  const admin = ws.actor.roles.includes("ADMINISTRATOR"),
    assessment = r.assessments[0];
  const editable = owner && ["DRAFT", "NEEDS_INFORMATION"].includes(r.status);
  const value = (f: FormData, k: string) => String(f.get(k) ?? "");
  const ownerOptions = ws.users.filter(
    (u) =>
      u.id === r.requesterId || r.reviews.some((v) => v.reviewerId === u.id),
  );
  return (
    <>
      <div className="record-banner">
        <div>
          <Badge value={effectiveStatus(r)} />
          <span className="muted">{r.id}</span>
        </div>
        <div>
          {editable && (
            <button className="button secondary" onClick={onEdit}>
              <Pencil size={15} />
              Edit {r.status === "DRAFT" ? "draft" : "follow-up"}
            </button>
          )}
          {editable && (
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                run({ action: "submit", id: r.id, revision: r.revision })
              }
            >
              Submit for human review
            </button>
          )}
        </div>
      </div>
      <div className="record-meta">
        <span>
          <small>REQUESTER</small>
          {r.requester.name}
        </span>
        <span>
          <small>REVIEWER</small>
          {active?.reviewer.name ??
            r.reviews[0]?.reviewer.name ??
            "Assigned on submission"}
        </span>
        <span>
          <small>LAST REVIEW</small>
          {date(r.reviewedAt)}
        </span>
        <span>
          <small>NEXT REVIEW</small>
          {date(r.nextReviewAt)}
        </span>
      </div>
      <div className="tabs" role="tablist" aria-label="Record sections">
        {["overview", "evidence", "mitigations", "history"].map((t) => (
          <button
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {human(t)}
            {t === "mitigations"
              ? ` (${r.mitigations.length})`
              : t === "evidence"
                ? ` (${r.evidence.length})`
                : ""}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && (
          <>
            <div className="detail-grid">
              <Panel
                title="The idea & its safeguards"
                kicker="USE-CASE DETAILS"
              >
                <dl className="details">
                  {[
                    ["Business purpose", r.purpose],
                    ["How it will be used", r.description],
                    ["Affected users", r.affectedUsers],
                    ["People affected", r.affectedPeople],
                    ["Data categories", r.dataCategories.map(human).join(", ")],
                    ["Decision support", r.decisionSupport],
                    ["AI autonomy", r.autonomy],
                    ["Human oversight", r.oversight],
                    ["Vendor information", r.vendorInformation],
                  ].map(([label, text]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel
                title="A guide for human review"
                kicker="ADVISORY RISK ASSESSMENT"
              >
                {assessment ? (
                  <>
                    <div className="risk-summary">
                      <Badge value={assessment.tier} />
                      <strong>
                        {assessment.score}
                        <small> weighted points</small>
                      </strong>
                      <p>
                        Assessment v{assessment.version} ·{" "}
                        {date(assessment.createdAt)}
                      </p>
                    </div>
                    {assessment.triggeredRules.length > 0 && (
                      <div className="notice warning">
                        <strong>Mandatory escalation</strong>
                        <ul>
                          {assessment.triggeredRules.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="factor-list">
                      {assessment.factors.map((f) => (
                        <div key={f.id}>
                          <span>
                            {f.label}
                            <small>
                              {f.score} × weight {f.weight}
                            </small>
                          </span>
                          <strong>+{f.contribution}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="principle">
                      <ShieldCheck size={20} />
                      <p>
                        Advisory risk classifications support human review and
                        do not constitute an approval decision.
                      </p>
                    </div>
                  </>
                ) : (
                  <Empty title="No assessment yet.">
                    Submit this draft to calculate an advisory tier and assign a
                    reviewer.
                  </Empty>
                )}
              </Panel>
            </div>
            {r.status === "NEEDS_INFORMATION" && (
              <div className="notice warning">
                <strong>More information requested</strong>
                <p>
                  {
                    ws.events.find(
                      (e) =>
                        e.useCaseId === r.id &&
                        e.action === "MORE_INFORMATION_REQUESTED",
                    )?.summary
                  }
                </p>
                {owner && (
                  <p>
                    Edit the follow-up and resubmit. Previous assessment
                    versions will remain in history.
                  </p>
                )}
              </div>
            )}
            {reviewer && ["SUBMITTED", "UNDER_REVIEW"].includes(r.status) && (
              <Panel
                title="Record your governance decision"
                kicker="HUMAN AUTHORITY"
              >
                <p>
                  Review the details, supporting evidence, and safeguards before
                  making your decision. Your name and rationale will be
                  retained.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await run({
                      action: "decision",
                      id: r.id,
                      revision: r.revision,
                      outcome,
                      rationale: value(f, "rationale"),
                      mitigations:
                        outcome === "CONDITIONALLY_APPROVED"
                          ? [
                              {
                                description: value(f, "mitigation"),
                                ownerId: value(f, "ownerId"),
                                dueAt: value(f, "dueAt"),
                              },
                            ]
                          : [],
                    });
                  }}
                >
                  <div className="form-grid">
                    <Field label="Final human decision">
                      <select
                        value={outcome}
                        onChange={(e) =>
                          setOutcome(e.target.value as typeof outcome)
                        }
                      >
                        <option value="CONDITIONALLY_APPROVED">
                          Conditionally approve
                        </option>
                        <option value="APPROVED">Approve</option>
                        <option value="REJECTED">Reject</option>
                      </select>
                    </Field>
                    <Field label="Decision rationale">
                      <textarea
                        name="rationale"
                        required
                        maxLength={4000}
                        rows={3}
                        placeholder="Explain why this use is acceptable, acceptable with conditions, or not acceptable."
                      />
                    </Field>
                  </div>
                  {outcome === "CONDITIONALLY_APPROVED" && (
                    <fieldset>
                      <legend>Required mitigation</legend>
                      <Field label="Mitigation requirement">
                        <textarea
                          name="mitigation"
                          required
                          maxLength={4000}
                          placeholder="e.g. Human verification required before AI-generated content enters the official record."
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Mitigation owner">
                          <select name="ownerId" defaultValue={r.requesterId}>
                            {ownerOptions.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Mitigation due date">
                          <input
                            type="date"
                            name="dueAt"
                            defaultValue={day(14)}
                            required
                          />
                        </Field>
                      </div>
                      <small>
                        Additional requirements can be added in the Mitigations
                        section.
                      </small>
                    </fieldset>
                  )}
                  <div className="form-actions">
                    <button className="button" disabled={busy}>
                      <FileCheck2 size={16} />
                      {busy ? "Saving…" : "Record decision"}
                    </button>
                  </div>
                </form>
                <details className="disclosure">
                  <summary>Need more information first?</summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await run({
                        action: "information",
                        id: r.id,
                        revision: r.revision,
                        message: value(
                          new FormData(e.currentTarget),
                          "message",
                        ),
                      });
                    }}
                  >
                    <Field label="Information needed">
                      <textarea
                        name="message"
                        required
                        maxLength={4000}
                        placeholder="Tell the requester what to clarify."
                      />
                    </Field>
                    <button className="button secondary" disabled={busy}>
                      Request more information
                    </button>
                  </form>
                </details>
              </Panel>
            )}
            {r.reviews.some((v) => v.decision) && (
              <Panel title="Recorded human decisions">
                {r.reviews
                  .filter((v) => v.decision)
                  .map((v) => (
                    <article className="decision-card" key={v.id}>
                      <div>
                        <Badge value={v.decision!.outcome} />
                        <small>
                          {v.reviewer.name} · {date(v.decision!.createdAt)} ·
                          Assessment v
                          {
                            r.assessments.find((a) => a.id === v.assessmentId)
                              ?.version
                          }
                        </small>
                      </div>
                      <p>{v.decision!.rationale}</p>
                    </article>
                  ))}
              </Panel>
            )}
            {approved.includes(r.status) && (owner || assigned || admin) && (
              <Panel title="Start a reassessment">
                <p>
                  A change in vendor, model, intended use, people affected, data
                  categories, or controls can warrant a fresh review. The
                  requester updates the draft and resubmits; all previous
                  assessments and decisions remain available.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await run({
                      action: "reassess",
                      id: r.id,
                      revision: r.revision,
                      reason: value(new FormData(e.currentTarget), "reason"),
                    });
                  }}
                >
                  <Field label="Reason for reassessment">
                    <textarea
                      name="reason"
                      required
                      maxLength={4000}
                      placeholder="What changed, or why is a scheduled review needed?"
                    />
                  </Field>
                  <button className="button secondary" disabled={busy}>
                    Start reassessment
                  </button>
                </form>
              </Panel>
            )}
            {admin &&
              [
                "APPROVED",
                "CONDITIONALLY_APPROVED",
                "REJECTED",
                "REASSESSMENT_DUE",
              ].includes(r.status) && (
                <details className="disclosure">
                  <summary>Archive this use case</summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await run({
                        action: "archive",
                        id: r.id,
                        revision: r.revision,
                        reason: value(new FormData(e.currentTarget), "reason"),
                      });
                    }}
                  >
                    <Field label="Reason for archiving">
                      <input name="reason" required maxLength={4000} />
                    </Field>
                    <button className="button secondary" disabled={busy}>
                      Archive record
                    </button>
                  </form>
                </details>
              )}
          </>
        )}
        {tab === "evidence" && (
          <Panel title="Evidence & references">
            <p>
              Store reference links and review metadata. Confidential source
              documents are not required.
            </p>
            {r.evidence.map((e) => (
              <article className="evidence-card" key={e.id}>
                <strong>{e.type}</strong>
                <p>{e.description}</p>
                <a href={e.reference} target="_blank" rel="noopener noreferrer">
                  Open reference ↗
                </a>
                <p>{e.notes}</p>
                <small>
                  Added by {e.reviewer.name} · Reviewed {date(e.reviewedAt)}
                </small>
              </article>
            ))}
            {!r.evidence.length && (
              <Empty title="No evidence references yet." />
            )}
            {(assigned ||
              (owner &&
                ["DRAFT", "UNDER_REVIEW", "NEEDS_INFORMATION"].includes(
                  r.status,
                ))) &&
              r.status !== "ARCHIVED" && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    const result = await run({
                      action: "evidence",
                      id: r.id,
                      type: value(f, "type"),
                      description: value(f, "description"),
                      reference: value(f, "reference"),
                      notes: value(f, "notes"),
                      ...(value(f, "reviewedAt")
                        ? { reviewedAt: value(f, "reviewedAt") }
                        : {}),
                    });
                    if (result) form.reset();
                  }}
                >
                  <h3>Add an evidence reference</h3>
                  <div className="form-grid">
                    <Field label="Evidence type">
                      <input
                        name="type"
                        required
                        maxLength={160}
                        placeholder="e.g. Vendor assurance"
                      />
                    </Field>
                    <Field label="Reference URL">
                      <input
                        name="reference"
                        type="url"
                        required
                        maxLength={2000}
                        placeholder="https://example.com/reference"
                      />
                    </Field>
                  </div>
                  <Field label="Evidence description">
                    <textarea name="description" required maxLength={4000} />
                  </Field>
                  <Field label="Evidence notes">
                    <textarea name="notes" maxLength={4000} />
                  </Field>
                  {assigned && (
                    <Field label="Date reviewed">
                      <input name="reviewedAt" type="date" />
                    </Field>
                  )}
                  <button className="button" disabled={busy}>
                    Add evidence
                  </button>
                </form>
              )}
          </Panel>
        )}
        {tab === "mitigations" && (
          <Panel title="Mitigation commitments">
            {r.mitigations.map((m) => (
              <article className="mitigation-card" key={m.id}>
                <div className="panel-heading">
                  <h3>{m.description}</h3>
                  <Badge value={m.status} />
                </div>
                <p>
                  {m.owner.name} · Due {date(m.dueAt)}
                </p>
                {m.completionNotes && <p>{m.completionNotes}</p>}
                {(assigned || (owner && m.ownerId === ws.actor.id)) &&
                  r.status !== "ARCHIVED" && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        await run({
                          action: "mitigation",
                          id: r.id,
                          mitigationId: m.id,
                          status: value(f, "status") as
                            "OPEN" | "IN_PROGRESS" | "COMPLETE" | "WAIVED",
                          notes: value(f, "notes"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <Field label="Mitigation status">
                          <select name="status" defaultValue={m.status}>
                            {[
                              "OPEN",
                              "IN_PROGRESS",
                              "COMPLETE",
                              ...(assigned ? ["WAIVED"] : []),
                            ].map((s) => (
                              <option key={s} value={s}>
                                {human(s)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Completion notes / waiver rationale">
                          <textarea
                            name="notes"
                            maxLength={4000}
                            defaultValue={m.completionNotes}
                          />
                        </Field>
                      </div>
                      <button className="button secondary" disabled={busy}>
                        Update mitigation
                      </button>
                    </form>
                  )}
              </article>
            ))}
            {!r.mitigations.length && (
              <Empty title="No mitigations recorded." />
            )}
            {assigned && r.status !== "ARCHIVED" && (
              <details className="disclosure">
                <summary>Add a mitigation</summary>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    const result = await run({
                      action: "addMitigation",
                      id: r.id,
                      description: value(f, "description"),
                      ownerId: value(f, "ownerId"),
                      dueAt: value(f, "dueAt"),
                    });
                    if (result) form.reset();
                  }}
                >
                  <Field label="New mitigation description">
                    <textarea name="description" required maxLength={4000} />
                  </Field>
                  <div className="form-grid">
                    <Field label="Owner">
                      <select name="ownerId" defaultValue={r.requesterId}>
                        {ownerOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Due date">
                      <input
                        name="dueAt"
                        type="date"
                        defaultValue={day(14)}
                        required
                      />
                    </Field>
                  </div>
                  <button className="button" disabled={busy}>
                    Add mitigation
                  </button>
                </form>
              </details>
            )}
          </Panel>
        )}
        {tab === "history" && (
          <>
            <Panel title="Assessment versions">
              {r.assessments.length ? (
                r.assessments.map((a) => (
                  <details className="disclosure" key={a.id}>
                    <summary>
                      Version {a.version} · {human(a.tier)} · {a.score} points ·{" "}
                      {date(a.createdAt)}
                    </summary>
                    <p>Escalations: {a.triggeredRules.join(" ") || "None"}</p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Factor</th>
                            <th>Score</th>
                            <th>Weight</th>
                            <th>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.factors.map((f) => (
                            <tr key={f.id}>
                              <td>{f.label}</td>
                              <td>{f.score}</td>
                              <td>{f.weight}</td>
                              <td>{f.contribution}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <details>
                      <summary>Original intake and policy snapshot</summary>
                      <pre>
                        {JSON.stringify(
                          { intake: a.inputSnapshot, policy: a.policySnapshot },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </details>
                ))
              ) : (
                <Empty />
              )}
            </Panel>
            <Panel title="Reassessment history">
              {r.reassessments.map((a) => (
                <article key={a.id} className="evidence-card">
                  <strong>
                    {date(a.createdAt)} · After assessment v{a.previousVersion}
                  </strong>
                  <p>{a.reason}</p>
                </article>
              ))}
              {!r.reassessments.length && (
                <p>No reassessments have been started.</p>
              )}
            </Panel>
            <Panel title="Audit trail">
              <AuditList
                events={ws.events.filter((e) => e.useCaseId === r.id)}
              />
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
