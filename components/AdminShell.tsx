"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  BarChart3,
  BadgeCheck,
  Bell,
  BookOpenText,
  CalendarDays,
  FileText,
  ClipboardCheck,
  Handshake,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Newspaper,
  ReceiptText,
  LogOut,
  ScrollText,
  Settings,
  CreditCard,
  ShieldCheck,
  Tags,
  UsersRound,
  Vote,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { AuthGate } from "./AuthGate";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { NotificationBell } from "./NotificationBell";

type AdminLink = { href: string; label: string; icon: LucideIcon; levels: readonly number[] };
const navGroups: { label: string; links: AdminLink[] }[] = [
  { label: "Visão geral", links: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, levels: [1, 2, 3, 4, 5] },
  ] },
  { label: "Pessoas", links: [
    { href: "/admin/recrutamento", label: "Cadastrar associado", icon: UsersRound, levels: [1, 2, 3, 5] },
    { href: "/admin/associados", label: "Lista de associados", icon: UsersRound, levels: [1, 2, 3] },
    { href: "/admin/filiacoes", label: "Filiações", icon: ClipboardCheck, levels: [1] },
    { href: "/admin/cargos", label: "Cargos", icon: Tags, levels: [1, 2] },
    { href: "/admin/diretoria", label: "Diretoria", icon: ShieldCheck, levels: [1, 2] },
  ] },
  { label: "Comunicação", links: [
    { href: "/admin/noticias", label: "Notícias", icon: Newspaper, levels: [1, 2, 4] },
    { href: "/admin/realizacoes", label: "O que já fizemos", icon: BadgeCheck, levels: [1, 2, 4] },
    { href: "/admin/comunicados", label: "Comunicados", icon: Bell, levels: [1, 2, 4] },
    { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, levels: [1, 2, 4] },
    { href: "/admin/beneficios", label: "Benefícios", icon: Handshake, levels: [1, 2, 4] },
    { href: "/admin/patrocinadores", label: "Apoio, patrocínio e parceiros", icon: Handshake, levels: [1, 2, 4] },
  ] },
  { label: "Atendimento e gestão", links: [
    { href: "/admin/solicitacoes", label: "Solicitações", icon: MessageSquareText, levels: [1, 2, 3] },
    { href: "/admin/recuperacao-senha", label: "Recuperar senhas", icon: LockKeyhole, levels: [1, 3] },
    { href: "/admin/assembleias", label: "Assembleias", icon: Vote, levels: [1] },
    { href: "/admin/transparencia", label: "Transparência", icon: BarChart3, levels: [1, 2] },
    { href: "/admin/financeiro", label: "Financeiro", icon: ReceiptText, levels: [1, 2] },
    { href: "/admin/documentos", label: "Documentos", icon: FileText, levels: [1, 2, 3] },
  ] },
  { label: "Sistema", links: [
    { href: "/admin/carteirinha", label: "Minha carteirinha", icon: CreditCard, levels: [1, 2, 3, 4, 5] },
    { href: "/admin/administradores", label: "Administradores", icon: UsersRound, levels: [1] },
    { href: "/admin/logs", label: "Auditoria", icon: ScrollText, levels: [1] },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings, levels: [1, 2, 3, 4, 5] },
  ] },
];

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
  const pathname = usePathname();
  const router = useRouter();
  const [level, setLevel] = useState<number | null>(firebaseEnabled ? null : 1);
  const [role, setRole] = useState("Administrador");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { auth, db } = getFirebaseServices();
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const [access, photo] = await Promise.all([getDoc(doc(db, "adminRoles", user.uid)), getDoc(doc(db, "adminPhotos", user.uid))]);
      setPhotoURL(String(photo.data()?.dataUrl || ""));
      if (access.exists()) {
        setLevel(Number(access.data().level || 5));
        setRole(String(access.data().role || "Administrador"));
        setPermissions((access.data().permissions || {}) as Record<string, boolean>);
      }
    });
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
              {navGroups.map((group) => {
                const visible = group.links.filter(({ href, levels }) =>
                  levels.includes(level)
                    || (href === "/admin/assembleias" && ["canManageAssemblies","canPublishAssembly","canPresideAssembly","canModerateAssembly","canCertifyResults","canFinalizeMinutes"].some((permission) => permissions[permission] === true))
                    || (href === "/admin/filiacoes" && permissions.canManageMembershipRequests === true));
                if (!visible.length) return null;
                return <section className="nav-group" key={group.label}><h2>{group.label}</h2>{visible.map(({ href, label, icon: Icon }) => <Link key={href} className={pathname === href ? "active" : ""} href={href} onClick={() => setMenuOpen(false)}><Icon /> <span>{label}</span></Link>)}</section>;
              })}
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
                <NotificationBell audience="admin" />
                <span>{role}</span>
                <Link className="avatar" href="/admin/configuracoes" aria-label="Abrir configurações do perfil">{photoURL ? <Image src={photoURL} width={32} height={32} unoptimized alt="" /> : `N${level}`}</Link>
              </div>
            </header>
            <div className="dash-content">
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
