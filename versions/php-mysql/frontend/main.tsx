import { createRoot } from 'react-dom/client';
import GovernanceApp from '../../../src/components/governance-app';
import Login from '../../../src/components/login';
import { base } from './navigation';
const originalFetch = window.fetch.bind(window);
let csrf = '';
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const resource = input.slice(5);
    const headers = new Headers(init?.headers);
    if (init?.method && init.method !== 'GET') headers.set('X-CSRF-Token', csrf);
    const response = await originalFetch(new URL(`api.php?resource=${encodeURIComponent(resource)}`, base), {...init, headers, credentials:'same-origin'});
    if (resource === 'session' && response.ok) {
      const data = await response.clone().json();
      if (data.csrf) csrf = data.csrf;
    }
    return response;
  }
  return originalFetch(input, init);
};
const root = createRoot(document.getElementById('root')!);
async function start() {
  const session = await fetch('/api/session');
  const settings = await session.json();
  if (!session.ok) throw new Error(settings.error);
  const response = await fetch('/api/workspace');
  if (response.status === 401) root.render(<Login enabled={settings.demoEnabled} />);
  else {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    root.render(<GovernanceApp initial={data} />);
  }
}
start().catch((error) => root.render(<main className="loading"><h1>PHP/MySQL Version</h1><p role="alert">{error instanceof Error ? error.message : 'The workspace could not be opened.'}</p><button className="button" onClick={() => window.location.reload()}>Try again</button></main>));
