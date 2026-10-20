import type { AnchorHTMLAttributes } from "react";
import { navigate } from "./navigation";
import { openUrl } from "../platform";

export default function Link({ href, onClick, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} href={href.startsWith("/") ? `#${href}` : href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (href.startsWith("/")) { event.preventDefault(); navigate(href); }
    else if (/^(https?:|tel:|mailto:)/i.test(href)) { event.preventDefault(); void openUrl(href); }
  }}>{children}</a>;
}
