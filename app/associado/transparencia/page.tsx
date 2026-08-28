import { FileText } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { MemberTransparencyFeed } from "@/components/MemberTransparencyFeed";
import { MemberSidebar, MemberTopbar } from "@/components/MemberNavigation";

export default function MemberTransparency() {
  return (
    <AuthGate>
      <div className="dashboard member-dashboard">
        <MemberSidebar />
        <main className="dashboard-main">
          <MemberTopbar title="Portal da Transparência" />
          <div className="dash-content">
            <div className="dash-welcome">
              <div>
                <span className="access-badge">Área protegida</span>
                <h2 style={{ marginTop: 12 }}>Transparência AUMM</h2>
                <p>
                  Receitas, despesas, atas, relatórios e documentos serão
                  disponibilizados aqui.
                </p>
              </div>
            </div>
            <MemberTransparencyFeed />
            <section className="panel">
              <div className="panel-head">
                <h3>
                  <FileText size={18} /> Documentos e demonstrativos
                </h3>
              </div>
              <DocumentLibrary member />
            </section>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
