import type { ReactNode } from "react";
export const human = (value: string) =>
  value === "EXECUTIVE_EXCEPTION"
    ? "Executive exception"
    : value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/^\w/, (s) => s.toUpperCase());
export const date = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
export const day = (offset = 0) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
export function Badge({ value }: { value: string }) {
  return <span className={`badge ${value.toLowerCase()}`}>{human(value)}</span>;
}
export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {help && <small>{help}</small>}
      {children}
    </label>
  );
}
export function Empty({
  title = "Nothing here yet.",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">↗</span>
      <h3>{title}</h3>
      <p>
        {children ||
          "Items will appear here as your governance work progresses."}
      </p>
    </div>
  );
}
export function Panel({
  title,
  kicker,
  children,
  aside,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          {kicker && <span className="eyebrow">{kicker}</span>}
          <h2>{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
