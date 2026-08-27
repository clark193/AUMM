"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, CreditCard, Gift, Home, KeyRound, LogOut, Vote } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { MemberBenefits } from "./MemberBenefits";

export function MemberBenefitsPage() {
  const router = useRouter();
  async function logout() { await signOut(getFirebaseServices().auth); router.push("/associado/login"); }
  return <div className="dashboard member-dashboard">
    <aside className="sidebar">
      <Link className="sidebar-brand" href="/"><Image src={withBasePath("/logo.png")} width={51} height={51} alt="AUMM" /><span><strong>AUMM</strong><small>Portal do associado</small></span></Link>
      <nav className="side-nav">
        <Link href="/associado"><Home /> Início</Link>
        <Link href="/associado/carteirinha"><CreditCard /> Carteirinha</Link>
        <Link href="/associado/assembleias"><Vote /> Assembleias</Link>
        <Link className="active" href="/associado/beneficios"><Gift /> Benefícios</Link>
        <Link href="/associado/transparencia"><BarChart3 /> Transparência</Link>
        <Link href="/associado/alterar-senha"><KeyRound /> Alterar senha</Link>
      </nav>
      <button className="sidebar-logout" onClick={logout}><LogOut /> Sair</button>
      <div className="sidebar-footer">Conteúdo exclusivo para associados</div>
    </aside>
    <main className="dashboard-main"><header className="dash-top"><h1>Benefícios do associado</h1></header><div className="dash-content"><div className="dash-welcome"><div><span className="access-badge">Vantagens AUMM</span><h2 style={{ marginTop: 12 }}>Benefícios e parceiros</h2><p>Consulte descontos, serviços e oportunidades disponíveis para associados ativos.</p></div></div><MemberBenefits /></div></main>
  </div>;
}
