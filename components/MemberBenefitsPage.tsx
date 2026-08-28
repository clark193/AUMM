"use client";

import { MemberBenefits } from "./MemberBenefits";
import { MemberSidebar, MemberTopbar } from "./MemberNavigation";

export function MemberBenefitsPage() {
  return <div className="dashboard member-dashboard">
    <MemberSidebar />
    <main className="dashboard-main"><MemberTopbar title="Benefícios do associado" /><div className="dash-content"><div className="dash-welcome"><div><span className="access-badge">Vantagens AUMM</span><h2 style={{ marginTop: 12 }}>Benefícios e parceiros</h2><p>Consulte descontos, serviços e oportunidades disponíveis para associados ativos.</p></div></div><MemberBenefits /></div></main>
  </div>;
}
