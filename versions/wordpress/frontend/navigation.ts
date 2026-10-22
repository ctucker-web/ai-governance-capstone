import { settings } from "./settings";

export const base = new URL(settings.appUrl, window.location.href);
const router = {
  push: (href: string) =>
    window.location.assign(href === "/login" ? settings.loginUrl : base.href),
  refresh: () => {},
};

export function useRouter() {
  return router;
}
