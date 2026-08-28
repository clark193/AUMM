import type { Metadata } from "next";
import { Landmark, ShieldCheck } from "lucide-react";
import { MemberFinancialTransparency } from "@/components/MemberFinancialTransparency";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Transparência financeira",
  description: "Acompanhe as receitas, despesas e o saldo dos lançamentos financeiros publicados pela AUMM.",
  alternates: { canonical: "https://aumm.com.br/transparencia" },
};

export default function PublicTransparencyPage() {
  return <PublicShell>
    <section className="public-transparency-hero">
      <div className="container public-transparency-hero-grid">
        <div><span className="eyebrow light">Prestação de contas</span><h1>Transparência<br />financeira</h1><p>Acompanhe as entradas, saídas e o saldo das movimentações que a AUMM tornou públicas.</p></div>
        <div className="public-transparency-seal"><ShieldCheck /><strong>Compromisso com a transparência</strong><span>Informações publicadas pela administração da associação.</span></div>
      </div>
    </section>
    <section className="section surface public-transparency-content">
      <div className="container">
        <div className="public-transparency-intro"><Landmark /><div><h2>Movimentações publicadas</h2><p>Os valores abaixo são calculados automaticamente a partir dos lançamentos públicos cadastrados no painel administrativo.</p></div></div>
        <MemberFinancialTransparency publicOnly />
      </div>
    </section>
  </PublicShell>;
}
