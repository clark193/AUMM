"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { BarChart3, CalendarDays, CreditCard, FileText, Gift, Home, LogOut, Settings, Vote } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { NotificationBell } from "./NotificationBell";

const links = [
  ["/associado", "Início", Home],
  ["/associado/carteirinha", "Carteirinha", CreditCard],
  ["/associado/assembleias", "Assembleias", Vote],
  ["/associado/beneficios", "Benefícios", Gift],
  ["/associado/eventos", "Eventos", CalendarDays],
  ["/associado/documentos", "Documentos", FileText],
  ["/associado/transparencia", "Transparência", BarChart3],
  ["/associado/configuracoes", "Configurações", Settings],
] as const;

export function MemberSidebar({ footer = "Conteúdo exclusivo para associados" }: { footer?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() { await signOut(getFirebaseServices().auth); router.push("/associado/login"); }
  return <aside className="sidebar">
    <Link className="sidebar-brand" href="/"><Image src={withBasePath("/logo.png")} width={51} height={51} alt="AUMM" /><span><strong>AUMM</strong><small>Portal do associado</small></span></Link>
    <nav className="side-nav">{links.map(([href, label, Icon]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}><Icon /> {label}</Link>)}</nav>
    <button className="sidebar-logout" onClick={logout}><LogOut size={16} /> Sair</button>
    <div className="sidebar-footer">{footer}</div>
  </aside>;
}

export function MemberTopbar({ title }: { title: string }) {
  const [profile, setProfile] = useState({ name: "Associado", photoURL: "" });
  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, async (user) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    const [member, photo] = await Promise.all([getDoc(doc(db, "associados", user.uid)), getDoc(doc(db, "memberPhotos", user.uid))]);
    setProfile({ name: String(member.data()?.fullName || user.displayName || "Associado"), photoURL: String(photo.data()?.dataUrl || "") });
  }), []);
  const initials = profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="dash-top"><h1>{title}</h1><div className="dash-profile"><NotificationBell audience="member" /><span>{profile.name}</span><Link className="avatar member-avatar" href="/associado/configuracoes" aria-label="Abrir configurações do perfil">{profile.photoURL ? <Image src={profile.photoURL} width={32} height={32} unoptimized alt="" /> : initials || "A"}</Link></div></header>;
}
