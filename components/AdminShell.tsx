"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, BookOpenText, CalendarDays, FileText, Handshake, LayoutDashboard, MessageSquareText, Newspaper, ReceiptText, ScrollText, Settings, ShieldCheck, Tags, UsersRound } from "lucide-react";
import { AuthGate } from "./AuthGate";

const links=[
  ["/admin", "Dashboard", LayoutDashboard], ["/admin/associados","Associados",UsersRound], ["/admin/cargos","Cargos",Tags], ["/admin/diretoria","Diretoria",ShieldCheck], ["/admin/noticias","Notícias",Newspaper], ["/admin/comunicados","Comunicados",Bell], ["/admin/eventos","Eventos",CalendarDays], ["/admin/beneficios","Benefícios",Handshake], ["/admin/solicitacoes","Solicitações",MessageSquareText], ["/admin/transparencia","Transparência",BarChart3], ["/admin/financeiro","Financeiro",ReceiptText], ["/admin/documentos","Documentos",FileText], ["/admin/administradores","Administradores",UsersRound], ["/admin/logs","Logs",ScrollText], ["/admin/configuracoes","Configurações",Settings],
] as const;
export function AdminShell({title,children}:{title:string;children:React.ReactNode}){const pathname=usePathname();return <AuthGate admin><div className="dashboard"><aside className="sidebar"><Link href="/admin" className="sidebar-brand"><Image src="/logo.png" width={51} height={51} alt="AUMM"/><span><strong>AUMM</strong><small>Administração</small></span></Link><nav className="side-nav" aria-label="Menu administrativo">{links.map(([href,label,Icon])=><Link key={href} className={pathname===href?"active":""} href={href}><Icon/> {label}</Link>)}</nav><div className="sidebar-footer"><BookOpenText size={15}/> Plataforma segura · RBAC ativo</div></aside><main className="dashboard-main"><header className="dash-top"><h1>{title}</h1><div className="dash-profile"><Bell size={18}/><span>Administrador</span><div className="avatar">AD</div></div></header><div className="dash-content">{children}</div></main></div></AuthGate>}
