import { createRoot } from "react-dom/client";
import GovernanceApp from "../../../src/components/governance-app";
import { settings } from "./settings";

// Only adapt this application's API. WordPress owns authentication and logout.
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  if (input !== "/api/workspace") return originalFetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set("X-WP-Nonce", settings.nonce);
  const response = await originalFetch(settings.restUrl, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.ok) return response;
  // WordPress REST errors use message/data; shared UI expects an error field.
  let message =
    "The workspace could not be loaded. Please refresh and try again.";
  if (response.status === 401) {
    message = "Your WordPress session has ended. Sign in to continue.";
  } else if (response.status === 403) {
    message =
      "Your access or session verification has changed. Refresh the page, or contact your WordPress administrator.";
  } else if (response.status < 500) {
    try {
      const data = await response.json();
      if (typeof data.error === "string") message = data.error;
      else if (typeof data.message === "string") message = data.message;
    } catch {
      // Preserve a readable error when an upstream response is not JSON.
    }
  }
  return new Response(JSON.stringify({ error: message }), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
};

const root = createRoot(document.getElementById("root")!);
async function start() {
  const response = await fetch("/api/workspace");
  if (response.status === 401) {
    window.location.assign(settings.loginUrl);
    return;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  root.render(
    <GovernanceApp
      initial={data}
      presentation={{
        workspaceName: settings.siteName,
        environmentLabel: "WordPress account",
        identityLabel: "Sign out of WordPress",
        identityAction: () =>
          setTimeout(() => window.location.assign(settings.logoutUrl), 0),
      }}
    />,
  );
}

start().catch((error: unknown) =>
  root.render(
    <main className="loading">
      <h1>AI Governance — WordPress Version</h1>
      <p role="alert">
        {error instanceof Error
          ? error.message
          : "The workspace could not be opened. Please try again."}
      </p>
      <button className="button" onClick={() => window.location.reload()}>
        Try again
      </button>
      <a href={settings.loginUrl}>Return to WordPress sign-in</a>
    </main>,
  ),
);
