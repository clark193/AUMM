import { useSyncExternalStore } from "react";

let embeddedPath:string|null=null;
let embeddedExit:((path:string)=>void)|null=null;
const embeddedListeners=new Set<()=>void>();
export function activateEmbeddedNavigation(path:string,onExit:(path:string)=>void){embeddedPath=path;embeddedExit=onExit;embeddedListeners.forEach(fn=>fn());return()=>{embeddedPath=null;embeddedExit=null;embeddedListeners.forEach(fn=>fn());};}
export function currentRoute() { return embeddedPath ?? (window.location.hash.slice(1) || "/admin"); }
export function backFromEmbeddedNavigation() {
  if (embeddedPath === "/estatuto" || embeddedPath === "/privacidade") {
    navigate("/associe-se");
    return true;
  }
  if (embeddedPath?.startsWith("/admin/")) {
    navigate("/admin");
    return true;
  }
  return false;
}
function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  embeddedListeners.add(listener);
  return () => {window.removeEventListener("hashchange", listener);embeddedListeners.delete(listener);};
}
export function useRoute() { return useSyncExternalStore(subscribe, currentRoute); }
export function navigate(path: string, replace = false) {
  if(embeddedPath!==null){if(path.startsWith("/admin")||["/associe-se","/estatuto","/privacidade"].includes(path.split("?")[0])){embeddedPath=path;embeddedListeners.forEach(fn=>fn());}else embeddedExit?.(path);return;}
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
