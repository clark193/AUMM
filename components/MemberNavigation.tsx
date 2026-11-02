"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { LogOut, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { NotificationBell } from "./NotificationBell";
import { useActiveAdmin } from "@/lib/useActiveAdmin";
import { AdminNavLinks, MemberNavLinks } from "./PortalNavigationLinks";

const MemberMenuContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  menuId: string;
} | null>(null);

export function MemberMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  return <MemberMenuContext.Provider value={{ open, setOpen, menuId }}>{children}</MemberMenuContext.Provider>;
}

function useMemberMenu() {
  const menu = useContext(MemberMenuContext);
  if (!menu) throw new Error("O menu do associado precisa de MemberMenuProvider.");
  return menu;
}

export function MemberSidebar({ footer = "Conteúdo exclusivo para associados" }: { footer?: string }) {
  const { role } = useActiveAdmin();
  const { open, setOpen, menuId } = useMemberMenu();
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLButtonElement>(".sidebar-close")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const items = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    const media = window.matchMedia("(max-width: 800px)");
    function onResize() { if (!media.matches) setOpen(false); }
    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onResize);
      previousFocus?.focus();
    };
  }, [open, setOpen]);
  const router = useRouter();
  async function logout() { await signOut(getFirebaseServices().auth); router.push("/associado/login"); }
  return <>
    {open && <button type="button" className="sidebar-backdrop member-menu-backdrop" aria-label="Fechar menu do associado" onClick={() => setOpen(false)} />}
    <aside ref={sidebar} id={menuId} className={`sidebar member-sidebar${open ? " member-menu-open" : ""}`} aria-label="Navegação do associado">
    <Link className="sidebar-brand" href="/"><Image src={withBasePath("/logo.png")} width={51} height={51} alt="AUMM" /><span><strong>AUMM</strong><small>Portal do associado</small></span></Link>
    <button type="button" className="sidebar-close" aria-label="Fechar menu do associado" onClick={() => setOpen(false)}><X /></button>
    <nav className="side-nav" aria-label="Menu do associado e funções do cargo">
      <MemberNavLinks onNavigate={() => setOpen(false)} />
      <AdminNavLinks role={role} onNavigate={() => setOpen(false)} />
    </nav>
    <button className="sidebar-logout" onClick={logout}><LogOut size={16} /> Sair</button>
    <div className="sidebar-footer">{footer}</div>
  </aside></>;
}

export function MemberTopbar({ title }: { title: string }) {
  const { open, setOpen, menuId } = useMemberMenu();
  const [profile, setProfile] = useState({ name: "Associado", photoURL: "" });
  useEffect(() => {
    let stopMember=()=>{},stopPhoto=()=>{};
    const {auth,db}=getFirebaseServices();
    const stop=onAuthStateChanged(auth,user=>{
      stopMember();stopPhoto();setProfile({name:"Associado",photoURL:""});if(!user)return;
      stopMember=onSnapshot(doc(db,"associados",user.uid),s=>setProfile(v=>({...v,name:String(s.data()?.fullName||user.displayName||"Associado")})),()=>{});
      stopPhoto=onSnapshot(doc(db,"memberPhotos",user.uid),s=>setProfile(v=>({...v,photoURL:String(s.data()?.dataUrl||"")})),()=>{});
    });
    return ()=>{stop();stopMember();stopPhoto();};
  }, []);
  const initials = profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="dash-top"><div className="dash-title"><button type="button" className="admin-menu-toggle" aria-label={open ? "Fechar menu do associado" : "Abrir menu do associado"} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}><Menu /></button><h1>{title}</h1></div><div className="dash-profile"><NotificationBell audience="member" /><span>{profile.name}</span><Link className="avatar member-avatar" href="/associado/configuracoes" aria-label="Abrir configurações do perfil">{profile.photoURL ? <Image src={profile.photoURL} width={32} height={32} unoptimized alt="" /> : initials || "A"}</Link></div></header>;
}
