export const base = new URL('./', window.location.href);
const router = { push: () => window.location.assign(base.href), refresh: () => {} };
export function useRouter() { return router; }
