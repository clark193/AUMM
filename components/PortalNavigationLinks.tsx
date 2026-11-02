"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminNavGroups, memberLinks } from "@/lib/portalNavigation";
import type { ActiveAdmin } from "@/lib/useActiveAdmin";

type NavigationProps = { onNavigate: () => void };

export function MemberNavLinks({ onNavigate }: NavigationProps) {
  const pathname = usePathname().replace(/\/+$/, "");
  return <section className="nav-group" aria-label="Área do associado"><h2>Área do associado</h2>
    {memberLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined} onClick={onNavigate}><Icon /><span>{label}</span></Link>)}
  </section>;
}

export function AdminNavLinks({ role, onNavigate }: NavigationProps & { role: ActiveAdmin | null }) {
  const pathname = usePathname().replace(/\/+$/, "");
  return <>{getAdminNavGroups(role).map(group => <section className="nav-group" key={group.label} aria-label={`Cargo · ${group.label}`}><h2>Cargo · {group.label}</h2>
    {group.links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined} onClick={onNavigate}><Icon /><span>{label}</span></Link>)}
  </section>)}</>;
}
