import { useSyncExternalStore } from "react";

export function currentRoute() { return window.location.hash.slice(1) || "/admin"; }
function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
export function useRoute() { return useSyncExternalStore(subscribe, currentRoute); }
export function navigate(path: string, replace = false) {
  if (path === "/" || path === "/associado" || path === "/associado/login") {
    window.location.assign(`./index.html${path === "/associado/login" ? "?login=1" : ""}`);
    return;
  }
  if (replace) { window.history.replaceState(null, "", `#${path}`); window.dispatchEvent(new HashChangeEvent("hashchange")); }
  else window.location.hash = path;
}
const router = { push: (path: string) => navigate(path), replace: (path: string) => navigate(path, true), back: () => window.history.back(), refresh: () => window.location.reload() };
export const useRouter = () => router;
export function usePathname() { return useRoute().split("?")[0]; }
export function useSearchParams() { return new URLSearchParams(useRoute().split("?")[1] || ""); }
export function notFound(): never { throw new Error("Esta página não existe no aplicativo."); }
