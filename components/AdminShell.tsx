"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { BarChart3, Bell, BookOpenText, CalendarDays, FileText, Handshake, LayoutDashboard, MessageSquareText, Newspaper, ReceiptText, ScrollText, Settings, ShieldCheck, Tags, UsersRound } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

const links=[
  ["/admin", "Dashboard", LayoutDashboard,5], ["/admin/associados","Associados",UsersRound,3], ["/admin/cargos","Cargos",Tags,2], ["/admin/diretoria","Diretoria",ShieldCheck,2], ["/admin/noticias","Notícias",Newspaper,4], ["/admin/comunicados","Comunicados",Bell,4], ["/admin/eventos","Eventos",CalendarDays,4], ["/admin/beneficios","Benefícios",Handshake,4], ["/admin/solicitacoes","Solicitações",MessageSquareText,3], ["/admin/transparencia","Transparência",BarChart3,2], ["/admin/financeiro","Financeiro",ReceiptText,2], ["/admin/documentos","Documentos",FileText,3], ["/admin/administradores","Administradores",UsersRound,1], ["/admin/logs","Logs",ScrollText,1], ["/admin/configuracoes","Configurações",Settings,1],
] as const;
export function AdminShell({title,children}:{title:string;children:React.ReactNode}){const pathname=usePathname();const [level,setLevel]=useState(firebaseEnabled?5:1);const [role,setRole]=useState("Administrador");useEffect(()=>{if(!firebaseEnabled)return;const {auth,db}=getFirebaseServices();return onAuthStateChanged(auth,async user=>{if(!user)return;const access=await getDoc(doc(db,"adminRoles",user.uid));if(access.exists()){setLevel(Number(access.data().level||5));setRole(String(access.data().role||"Administrador"));}})},[]);return <AuthGate admin><div className="dashboard"><aside className="sidebar"><Link href="/admin" className="sidebar-brand"><Image src="/logo.png" width={51} height={51} alt="AUMM"/><span><strong>AUMM</strong><small>Administração · Nível {level}</small></span></Link><nav className="side-nav" aria-label="Menu administrativo">{links.filter(([, , ,minimumLevel])=>level<=minimumLevel).map(([href,label,Icon])=><Link key={href} className={pathname===href?"active":""} href={href}><Icon/> {label}</Link>)}</nav><div className="sidebar-footer"><BookOpenText size={15}/> Acesso {role} · nível {level}</div></aside><main className="dashboard-main"><header className="dash-top"><h1>{title}</h1><div className="dash-profile"><Bell size={18}/><span>{role}</span><div className="avatar">N{level}</div></div></header><div className="dash-content">{children}</div></main></div></AuthGate>}
