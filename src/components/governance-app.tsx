"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sprout,
  History,
  ChevronLeft,
} from "lucide-react";
import type { Workspace, GovernanceRecord } from "@/modules/workflow/service";
import type { Command, Intake } from "@/modules/intake/validation";
import { approved, effectiveStatus, pending } from "@/modules/auth/policy";
import { tiers } from "@/modules/risk/engine";
import { Badge, date, Empty, human, Panel } from "./ui";
import IntakeForm from "./intake-form";
import RecordDetail from "./record-detail";
import Administration from "./administration";
export type Run = (command: Command) => Promise<{ id: string } | undefined>;
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["new", "New assessment", Plus],
  ["inventory", "AI inventory", ClipboardList],
  ["review", "Review queue", FileCheck2],
  ["mitigations", "Mitigations", ListChecks],
  ["reassessments", "Reassessments", RefreshCw],
  ["audit", "Audit history", History],
  ["admin", "Administration", Settings2],
] as const;
const headings: Record<string, [string, string]> = {
  dashboard: [
    "A clear view of your AI use",
    "Good governance starts with knowing where things stand.",
  ],
  new: [
    "Give your idea a responsible start",
    "A short guided assessment, followed by a human conversation.",
  ],
  inventory: [
    "Your AI inventory",
    "One place for every use case, review, and next step.",
  ],
  review: [
    "Ready for your perspective",
    "Review the evidence. Make the call. Leave a clear rationale.",
  ],
  mitigations: [
    "Turn decisions into action",
    "Keep the commitments behind each approval in view.",
  ],
  reassessments: [
    "Keep approved uses current",
    "Revisit decisions when the use or its safeguards change.",
  ],
  audit: [
    "Every action, accounted for",
    "An append-only record of the work behind your governance decisions.",
  ],
  admin: [
    "Policy that fits your organization",
    "Configure advisory scoring, reviewer routing, and review intervals.",
  ],
};
export default function GovernanceApp({ initial }: { initial: Workspace }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [ws, setWs] = useState<Workspace>(initial),
    [view, setView] = useState("dashboard"),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [tier, setTier] = useState(""),
    [department, setDepartment] = useState(""),
    [sort, setSort] = useState("updated");
  const refresh = useCallback(async () => {
    const r = await fetch("/api/workspace", { cache: "no-store" });
    if (r.status === 401) {
      router.push("/login");
      return;
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setWs(data);
    setNow(Date.now());
  }, [router]);
  const run: Run = async (command) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await refresh();
      setNotice(
        command.action === "submit"
          ? "Submitted. An independent human reviewer has been assigned."
          : command.action === "decision"
            ? "Human decision recorded. Inventory, audit history, and reassessment schedule updated."
            : "Changes saved to the governance record.",
      );
      return result;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The action could not be completed.",
      );
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const go = (next: string) => {
    setView(next);
    setSelected(null);
    setEditing(false);
    setQuery("");
    setStatus("");
    setTier("");
    setDepartment("");
    setError("");
    setNotice("");
  };
  const open = (id: string) => {
    setSelected(id);
    setEditing(false);
    setError("");
  };
  if (!ws)
    return (
      <main className="loading">
        <Sprout size={40} />
        <h1>Opening your workspace</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="button"
              onClick={() => refresh().catch((e) => setError(e.message))}
            >
              Try again
            </button>
          </>
        ) : (
          <p>Gathering your governance records…</p>
        )}
      </main>
    );
  const { actor } = ws,
    requester = actor.roles.includes("REQUESTER"),
    admin = actor.roles.includes("ADMINISTRATOR"),
    reviewer = actor.roles.includes("REVIEWER");
  const record = ws.records.find((r) => r.id === selected);
  const filtered = ws.records
    .filter(
      (r) =>
        (!query ||
          [r.title, r.system.name, r.system.vendor, r.id, r.requester.name]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!status || effectiveStatus(r) === status) &&
        (!tier || r.assessments[0]?.tier === tier) &&
        (!department || r.department === department),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "risk"
          ? tiers.indexOf(b.assessments[0]?.tier ?? "LOW") -
            tiers.indexOf(a.assessments[0]?.tier ?? "LOW")
          : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const waiting = filtered.filter((r) => pending.includes(r.status));
  const allMitigations = filtered.flatMap((r) =>
    r.mitigations.map((m) => ({ ...m, record: r })),
  );
  const overdue = allMitigations.filter(
    (m) =>
      !["COMPLETE", "WAIVED"].includes(m.status) &&
      new Date(m.dueAt) < new Date(),
  );
  const upcoming = filtered.filter(
    (r) =>
      approved.includes(r.status) &&
      r.nextReviewAt &&
      new Date(r.nextReviewAt).getTime() <= now + 30 * 86400000,
  );
  async function save(data: Intake, submit: boolean) {
    const created = await run(
      record
        ? { action: "edit", id: record.id, revision: record.revision, data }
        : { action: "create", data },
    );
    if (!created) return;
    if (submit) {
      const result = await run({
        action: "submit",
        id: created.id,
        revision: record ? record.revision + 1 : 0,
      });
      if (!result) {
        setSelected(created.id);
        setEditing(false);
        setView("inventory");
        return;
      }
    }
    setSelected(created.id);
    setEditing(false);
    setView("inventory");
  }
  const filters = (
    <div className="filters">
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Search records"
          placeholder="Search tools, use cases, or owners…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        {[
          "DRAFT",
          "UNDER_REVIEW",
          "NEEDS_INFORMATION",
          "APPROVED",
          "CONDITIONALLY_APPROVED",
          "REJECTED",
          "REASSESSMENT_DUE",
          "ARCHIVED",
        ].map((v) => (
          <option key={v} value={v}>
            {human(v)}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by risk tier"
        value={tier}
        onChange={(e) => setTier(e.target.value)}
      >
        <option value="">All risk tiers</option>
        {tiers.map((v) => (
          <option key={v} value={v}>
            {human(v)}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        <option value="">All departments</option>
        {[...new Set(ws.records.map((r) => r.department))].sort().map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
      <select
        aria-label="Sort inventory"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        <option value="updated">Recently updated</option>
        <option value="name">Name A–Z</option>
        <option value="risk">Highest risk first</option>
      </select>
    </div>
  );
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Sprout size={25} />
          </span>
          <span>
            <strong>AI Governance</strong>
            <small>GOOD IDEAS. RESPONSIBLE USE.</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-dot" />
          Community Partners<small>Demonstration workspace</small>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav
            .filter(
              ([id]) =>
                (id !== "admin" || admin) &&
                (id !== "new" || requester) &&
                (id !== "review" || reviewer || admin),
            )
            .map(([id, label, Icon]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {id === "review" && waiting.length > 0 && (
                  <span className="nav-count">{waiting.length}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="demo-dot" />
            SYNTHETIC DATA DEMO
            <p>A space to practice responsible AI governance.</p>
          </div>
          <div className="user">
            <span className="avatar">
              {actor.name
                .split(" ")
                .map((v) => v[0])
                .join("")}
            </span>
            <span>
              <strong>{actor.name}</strong>
              <small>{actor.roles.map(human).join(", ")}</small>
            </span>
          </div>
          <button
            className="switch-role"
            onClick={async () => {
              await fetch("/api/session", { method: "DELETE" });
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut size={15} />
            Switch demo identity
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Community workspace <span className="slash">/</span>{" "}
            {headings[view]?.[0] ? "Governance" : "Workspace"}
          </span>
          <span className="top-label">
            <ShieldCheck size={15} />
            Human-led by design
          </span>
        </header>
        <main id="main" className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {record ? "GOVERNANCE RECORD" : human(view).toUpperCase()}
              </span>
              <h1>{record ? record.title : headings[view][0]}</h1>
              <p>
                {record
                  ? `${record.department} · ${record.system.vendor}`
                  : headings[view][1]}
              </p>
            </div>
            {requester && view !== "new" && !record && (
              <button className="button" onClick={() => go("new")}>
                <Plus size={17} />
                New assessment
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="notice success">
              {notice}
            </div>
          )}
          {record ? (
            <>
              <button className="back-link" onClick={() => setSelected(null)}>
                <ChevronLeft size={16} />
                Back to {human(view)}
              </button>
              {editing ? (
                <IntakeForm
                  key={record.id}
                  record={record}
                  busy={busy}
                  onSave={save}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <RecordDetail
                  record={record}
                  ws={ws}
                  busy={busy}
                  run={run}
                  onEdit={() => setEditing(true)}
                />
              )}
            </>
          ) : view === "new" ? (
            <IntakeForm
              busy={busy}
              onSave={save}
              onCancel={() => go("dashboard")}
            />
          ) : view === "admin" ? (
            <Administration ws={ws} busy={busy} run={run} />
          ) : (
            <>
              {[
                "dashboard",
                "inventory",
                "review",
                "mitigations",
                "reassessments",
                "audit",
              ].includes(view) && filters}
              {view === "dashboard" && (
                <>
                  <section className="welcome">
                    <div>
                      <span className="eyebrow">RESPONSIBLE AI, TOGETHER</span>
                      <h2>
                        Make room for possibility.
                        <br />
                        Keep people at the center.
                      </h2>
                      <p>
                        Every risk classification is a starting point for a
                        conversation.
                        <br />
                        Every final decision belongs to a person.
                      </p>
                      <button
                        className="text-button"
                        onClick={() =>
                          go(
                            requester
                              ? "new"
                              : reviewer
                                ? "review"
                                : "inventory",
                          )
                        }
                      >
                        {requester
                          ? "Bring an idea forward"
                          : reviewer
                            ? "See your review queue"
                            : "Explore the inventory"}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="welcome-art" aria-hidden="true">
                      <div className="art-orbit" />
                      <div className="art-card c1">
                        <Sprout />
                        An idea
                      </div>
                      <div className="art-card c2">
                        <ShieldCheck />A thoughtful review
                      </div>
                      <div className="art-card c3">
                        <FileCheck2 />A human decision
                      </div>
                    </div>
                  </section>
                  <div className="metrics">
                    {[
                      [
                        filtered.length,
                        "AI use cases",
                        "In your accessible inventory",
                        ClipboardList,
                      ],
                      [
                        waiting.length,
                        "Awaiting review",
                        "Human attention needed",
                        Clock3,
                      ],
                      [
                        filtered.filter(
                          (r) =>
                            r.assessments[0] &&
                            ["HIGH", "EXECUTIVE_EXCEPTION"].includes(
                              r.assessments[0].tier,
                            ),
                        ).length,
                        "Elevated advisory risk",
                        "High or executive exception",
                        ShieldCheck,
                      ],
                      [
                        filtered.filter((r) => r.status === "APPROVED").length,
                        "Approved",
                        "Final human decisions",
                        FileCheck2,
                      ],
                    ].map(([value, title, note, Icon]) => {
                      const MetricIcon = Icon as typeof ClipboardList;
                      return (
                        <div className="metric" key={String(title)}>
                          <div>
                            <span>{String(title)}</span>
                            <MetricIcon size={19} />
                          </div>
                          <strong>{String(value)}</strong>
                          <small>{String(note)}</small>
                        </div>
                      );
                    })}
                  </div>
                  <div className="summary-strip">
                    <span>
                      <strong>
                        {
                          filtered.filter(
                            (r) => r.status === "CONDITIONALLY_APPROVED",
                          ).length
                        }
                      </strong>{" "}
                      Conditional approvals
                    </span>
                    <span>
                      <strong>
                        {filtered.filter((r) => r.status === "REJECTED").length}
                      </strong>{" "}
                      Rejected
                    </span>
                    <span>
                      <strong>{overdue.length}</strong> Overdue mitigations
                    </span>
                    <span>
                      <strong>{upcoming.length}</strong> Reassessments within 30
                      days / overdue
                    </span>
                  </div>
                  <div className="dashboard-grid">
                    <Panel
                      title="Recent use cases"
                      kicker="THE WORK IN MOTION"
                      aside={
                        <button
                          className="text-button"
                          onClick={() => go("inventory")}
                        >
                          View all <ArrowRight size={15} />
                        </button>
                      }
                    >
                      <Inventory
                        records={filtered.slice(0, 5)}
                        open={open}
                        compact
                      />
                    </Panel>
                    <Panel
                      title="A little attention goes a long way"
                      kicker="YOUR NEXT STEPS"
                    >
                      <div className="attention">
                        <span className="attention-icon">
                          <Clock3 />
                        </span>
                        <div>
                          <strong>
                            {waiting.length} requests in the review process
                          </strong>
                          <p>Clear decisions help teams move forward.</p>
                          <button
                            className="text-button"
                            onClick={() =>
                              go(reviewer ? "review" : "inventory")
                            }
                          >
                            See requests <ArrowDownRight size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="attention">
                        <span className="attention-icon amber">
                          <ListChecks />
                        </span>
                        <div>
                          <strong>{overdue.length} overdue commitments</strong>
                          <p>
                            Follow through on the safeguards behind approval.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => go("mitigations")}
                          >
                            Track mitigations <ArrowDownRight size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="principle">
                        <ShieldCheck size={19} />
                        <p>
                          Advisory risk classifications support human review and
                          do not constitute an approval decision.
                        </p>
                      </div>
                    </Panel>
                  </div>
                </>
              )}
              {view === "inventory" && (
                <Panel title={`${filtered.length} use cases`}>
                  <Inventory records={filtered} open={open} />
                </Panel>
              )}
              {view === "review" && (
                <Panel title="Requests awaiting a human decision">
                  <Inventory
                    records={waiting.filter(
                      (r) =>
                        admin ||
                        r.reviews.some(
                          (v) => v.reviewerId === actor.id && !v.closedAt,
                        ),
                    )}
                    open={open}
                  />
                </Panel>
              )}
              {view === "mitigations" && (
                <Panel title="Safeguards & commitments">
                  {allMitigations.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Mitigation</th>
                            <th>Owner</th>
                            <th>Due date</th>
                            <th>Status</th>
                            <th>Use case</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allMitigations.map((m) => (
                            <tr key={m.id}>
                              <td>{m.description}</td>
                              <td>{m.owner.name}</td>
                              <td>
                                {date(m.dueAt)}
                                {overdue.some((o) => o.id === m.id) && (
                                  <span className="overdue">Overdue</span>
                                )}
                              </td>
                              <td>
                                <Badge value={m.status} />
                              </td>
                              <td>
                                <button
                                  className="table-link"
                                  onClick={() => open(m.record.id)}
                                >
                                  {m.record.title}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty title="No mitigations to track yet." />
                  )}
                </Panel>
              )}
              {view === "reassessments" && (
                <Panel title="Scheduled reviews">
                  <Inventory
                    records={filtered
                      .filter((r) => approved.includes(r.status))
                      .sort((a, b) =>
                        (a.nextReviewAt ?? "").localeCompare(
                          b.nextReviewAt ?? "",
                        ),
                      )}
                    open={open}
                  />
                </Panel>
              )}
              {view === "audit" && (
                <Panel title="Governance history">
                  <AuditList
                    events={ws.events.filter((e) =>
                      e.useCaseId
                        ? filtered.some((r) => r.id === e.useCaseId)
                        : !query && !status && !tier && !department,
                    )}
                    open={open}
                  />
                </Panel>
              )}
            </>
          )}
          <footer className="footer">
            <span>AI Governance · Academic MVP</span>
            <span>Synthetic data only · Human accountability, always</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export function Inventory({
  records,
  open,
  compact = false,
}: {
  records: GovernanceRecord[];
  open: (id: string) => void;
  compact?: boolean;
}) {
  return records.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>AI use case</th>
            <th>Advisory tier</th>
            <th>Status</th>
            {!compact && (
              <>
                <th>Owner / reviewer</th>
                <th>Decision / reviewed</th>
                <th>Next review</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const decision = r.reviews.find((v) => v.decision);
            return (
              <tr key={r.id}>
                <td>
                  <button className="table-link" onClick={() => open(r.id)}>
                    {r.title}
                  </button>
                  <small>
                    {r.department} · {r.system.name}
                  </small>
                  <small className="record-id">
                    {r.id.slice(0, 8).toUpperCase()}
                  </small>
                </td>
                <td>
                  {r.assessments[0] ? (
                    <Badge value={r.assessments[0].tier} />
                  ) : (
                    <span className="muted">Not assessed</span>
                  )}
                </td>
                <td>
                  <Badge value={effectiveStatus(r)} />
                </td>
                {!compact && (
                  <>
                    <td>
                      {r.requester.name}
                      <small>
                        {r.reviews[0]?.reviewer.name ?? "Not assigned"}
                      </small>
                    </td>
                    <td>
                      {decision?.decision
                        ? human(decision.decision.outcome)
                        : "Pending"}
                      <small>{date(r.reviewedAt)}</small>
                    </td>
                    <td>{date(r.nextReviewAt)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="No matching use cases.">
      Try changing your filters or start a new assessment.
    </Empty>
  );
}
export function AuditList({
  events,
  open,
}: {
  events: Workspace["events"];
  open?: (id: string) => void;
}) {
  return events.length ? (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.id}>
          <span className="timeline-dot" />
          <div>
            <strong>{human(e.action)}</strong>
            <p>{e.summary}</p>
            <small>
              {e.actor.name} · {new Date(e.createdAt).toLocaleString()}
              {e.previousStatus &&
                ` · ${human(e.previousStatus)} → ${human(e.newStatus ?? e.previousStatus)}`}
            </small>
            {e.useCaseId && open && (
              <button
                className="text-button"
                onClick={() => open(e.useCaseId!)}
              >
                Record {e.useCaseId.slice(0, 8)} <ArrowRight size={13} />
              </button>
            )}
            <span className="event-id">Event {e.id}</span>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <Empty title="No audit events in this view." />
  );
}
