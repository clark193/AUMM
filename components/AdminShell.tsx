"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  BarChart3,
  Bell,
  BookOpenText,
  CalendarDays,
  FileText,
  Handshake,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Newspaper,
  ReceiptText,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  UsersRound,
  Vote,
} from "lucide-react";
import { AuthGate } from "./AuthGate";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";

const links = [
  ["/admin", "Dashboard", LayoutDashboard, [1, 2, 3, 4, 5]],
  ["/admin/recrutamento", "Novo associado", UsersRound, [5]],
  ["/admin/associados", "Cadastros e associados", UsersRound, [1, 2, 3]],
  ["/admin/assembleias", "Assembleias eletrônicas", Vote, [1]],
  ["/admin/cargos", "Cargos", Tags, [1, 2]],
  ["/admin/diretoria", "Diretoria", ShieldCheck, [1, 2]],
  ["/admin/noticias", "Notícias", Newspaper, [1, 2, 4]],
  ["/admin/comunicados", "Comunicados", Bell, [1, 2, 4]],
  ["/admin/eventos", "Eventos", CalendarDays, [1, 2, 4]],
  ["/admin/beneficios", "Benefícios", Handshake, [1, 2, 4]],
  ["/admin/solicitacoes", "Solicitações", MessageSquareText, [1, 2, 3]],
  ["/admin/recuperacao-senha", "Recuperar senhas", LockKeyhole, [1, 2, 3]],
  ["/admin/transparencia", "Transparência", BarChart3, [1, 2]],
  ["/admin/financeiro", "Financeiro", ReceiptText, [1, 2]],
  ["/admin/documentos", "Documentos", FileText, [1, 2, 3]],
  ["/admin/administradores", "Administradores", UsersRound, [1]],
  ["/admin/logs", "Logs", ScrollText, [1]],
  ["/admin/configuracoes", "Configurações", Settings, [1]],
] as const;

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

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { auth, db } = getFirebaseServices();
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const access = await getDoc(doc(db, "adminRoles", user.uid));
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
        <div className="dashboard">
          <aside className="sidebar">
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
            <nav className="side-nav" aria-label="Menu administrativo">
              {links
                .filter(([href, , , levels]) =>
                  (levels as readonly number[]).includes(level)
                    || (href === "/admin/assembleias" && ["canManageAssemblies","canPublishAssembly","canPresideAssembly","canModerateAssembly","canCertifyResults","canFinalizeMinutes"].some((permission) => permissions[permission] === true)),
                )
                .map(([href, label, Icon]) => (
                  <Link
                    key={href}
                    className={pathname === href ? "active" : ""}
                    href={href}
                  >
                    <Icon /> {label}
                  </Link>
                ))}
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
              <h1>{title}</h1>
              <div className="dash-profile">
                <Bell size={18} />
                <span>{role}</span>
                <div className="avatar">N{level}</div>
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
