"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Sprout, ShieldCheck } from "lucide-react";
import { demoUsers } from "@/modules/auth/demo-users";
import { human } from "./ui";
export default function Login({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function signIn(id: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <Sprout />
          </span>
          <strong>AI Governance</strong>
        </div>
        <div>
          <span className="eyebrow">
            THOUGHTFUL TECHNOLOGY. HUMAN DECISIONS.
          </span>
          <h1>
            A little clarity.
            <br />A lot of confidence.
          </h1>
          <p>
            Give good ideas a responsible path forward. Assess AI use, bring the
            right people into the conversation, and keep every decision in view.
          </p>
          <div className="login-principle">
            <ShieldCheck />
            <span>
              Technology advises.
              <br />
              <strong>People decide.</strong>
            </span>
          </div>
        </div>
        <small>MSIT 5910 · Academic MVP · Synthetic data only</small>
      </section>
      <section className="login-options">
        <span className="eyebrow">WELCOME TO THE DEMONSTRATION</span>
        <h2>Choose a perspective</h2>
        <p>Explore the same governance lifecycle through different roles.</p>
        {!enabled ? (
          <div role="alert" className="notice error">
            Demo authentication is disabled. Configure a verified identity
            provider before enabling access.
          </div>
        ) : (
          demoUsers.map((u) => (
            <button
              className="identity-card"
              key={u.id}
              disabled={busy}
              onClick={() => signIn(u.id)}
            >
              <span className="avatar">
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <span>
                <strong>
                  {human(u.role)}
                  {u.id.endsWith("15") ? " · Executive review" : ""}
                </strong>
                <small>
                  {u.name} · {u.description}
                </small>
              </span>
              <ArrowUpRight size={19} />
            </button>
          ))
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <p className="footnote">
          These are fictional accounts. This demo selector is not production
          authentication. Enter governance metadata only—never client records,
          employee details, or confidential documents.
        </p>
      </section>
    </main>
  );
}
