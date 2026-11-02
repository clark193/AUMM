"use client";
import { EmbeddedAdminContext } from "./EmbeddedAdmin";
import { EmergencyAdmin } from "./EmergencyAdmin";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { BookOpenText, LogOut, LockKeyhole, Menu, X } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { NotificationBell } from "./NotificationBell";
import { AdminNavLinks, MemberNavLinks } from "./PortalNavigationLinks";
export { navGroups } from "@/lib/portalNavigation";


type Props = {
  title: string;
  children: React.ReactNode;
  allowedLevels?: readonly number[];
  requiredPermissions?: readonly string[];
};

export function AdminShell({
  title,
  children,
  allowedLevels = [1, 2, 3, 4, 5],
  requiredPermissions = [],
}: Props) {
  const embedded = useContext(EmbeddedAdminContext);
  const router = useRouter();
  const [level, setLevel] = useState<number | null>(firebaseEnabled ? null : 1);
  const [role, setRole] = useState("Administrador");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    if (!firebaseEnabled) return;
    const {auth,db}=getFirebaseServices();let stopRole=()=>{},stopPhoto=()=>{};
    const stop=onAuthStateChanged(auth,user=>{stopRole();stopPhoto();setLevel(null);setPermissions({});setPhotoURL("");if(!user)return;
      stopRole=onSnapshot(doc(db,"adminRoles",user.uid),snap=>{const data=snap.data();setLevel(data?.active===true?Number(data.level||5):0);setRole(String(data?.role||"Administrador"));setPermissions(data?.permissions||{});},()=>setLevel(0));
      stopPhoto=onSnapshot(doc(db,"memberPhotos",user.uid),snap=>{if(snap.exists())setPhotoURL(String(snap.data().dataUrl||""));else void getDoc(doc(db,"adminPhotos",user.uid)).then(p=>setPhotoURL(String(p.data()?.dataUrl||""))).catch(()=>{});},()=>{});
    });return()=>{stop();stopRole();stopPhoto();};
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      if (firebaseEnabled) await signOut(getFirebaseServices().auth);
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  }

  if (embedded) return <AuthGate admin>{level === null ? <p role="status">Carregando permissões…</p> : allowedLevels.includes(level) || requiredPermissions.some(p => permissions[p] === true) ? <section className="embedded-admin-module"><h2>{title}</h2>{children}</section> : <p role="alert">Seu nível não permite abrir este módulo.</p>}</AuthGate>;
  return (
    <AuthGate admin>
      {level === null ? (
        <div className="verify-shell">
          <div className="empty-state">Carregando permissões…</div>
        </div>
      ) : (
        <div className={`dashboard ${menuOpen ? "menu-open" : ""}`}>
          <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <aside className="sidebar" aria-label="Navegação administrativa">
            <Link href="/admin" className="sidebar-brand">
              <Image
                src={withBasePath("/logo.png")}
                width={51}
                height={51}
                alt="AUMM"
              />
              <span>
                <strong>AUMM</strong>
                <small>Administração · Nível {level}</small>
              </span>
            </Link>
            <button className="sidebar-close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X /></button>
            <nav className="side-nav" aria-label="Menu administrativo">
              <MemberNavLinks onNavigate={() => setMenuOpen(false)} />
              <AdminNavLinks role={{ active: true, level, role, permissions }} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="sidebar-footer">
              <BookOpenText size={15} /> Acesso {role} · nível {level}
            </div>
            <button
              className="sidebar-logout"
              onClick={logout}
              disabled={loggingOut}
            >
              <LogOut size={17} />{" "}
              {loggingOut ? "Saindo…" : "Sair e voltar ao site"}
            </button>
          </aside>
          <main className="dashboard-main">
            <header className="dash-top">
              <div className="dash-title"><button className="admin-menu-toggle" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu /></button><h1>{title}</h1></div>
              <div className="dash-profile">
                <NotificationBell audience="admin" canAttend={[1, 2, 3].includes(level)} />
                <span>{role}</span>
                <Link className="avatar" href="/admin/configuracoes" aria-label="Abrir configurações do perfil">{photoURL ? <Image src={photoURL} width={32} height={32} unoptimized alt="" /> : `N${level}`}</Link>
              </div>
            </header>
            <div className="dash-content">
              {[1, 2, 3].includes(level) && <EmergencyAdmin compact />}
              {allowedLevels.includes(level) || requiredPermissions.some((permission) => permissions[permission] === true) ? (
                children
              ) : (
                <section className="panel access-denied">
                  <LockKeyhole />
                  <h2>Acesso não permitido</h2>
                  <p>
                    Seu nível administrativo não possui permissão para abrir
                    este módulo.
                  </p>
                  <Link className="button button-sm" href="/admin">
                    Voltar ao painel
                  </Link>
                </section>
              )}
            </div>
          </main>
        </div>
      )}
    </AuthGate>
  );
}
