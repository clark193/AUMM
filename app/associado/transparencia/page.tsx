import { AuthGate } from "@/components/AuthGate";
import { MemberFinancialTransparency } from "@/components/MemberFinancialTransparency";
import { MemberSidebar, MemberTopbar } from "@/components/MemberNavigation";

export default function MemberTransparency() {
  return <AuthGate>
    <div className="dashboard member-dashboard">
      <MemberSidebar />
      <main className="dashboard-main">
        <MemberTopbar title="Transparência financeira" />
        <div className="dash-content">
          <div className="dash-welcome">
            <div>
              <span className="access-badge">Prestação de contas</span>
              <h2 style={{ marginTop: 12 }}>Entradas e saídas da AUMM</h2>
              <p>Acompanhe exclusivamente os lançamentos financeiros disponibilizados aos associados.</p>
            </div>
          </div>
          <MemberFinancialTransparency />
        </div>
      </main>
    </div>
  </AuthGate>;
}
