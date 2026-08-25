import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><main id="conteudo">{children}</main><SiteFooter /></>;
}
