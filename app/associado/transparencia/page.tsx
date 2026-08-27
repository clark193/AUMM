import Image from "next/image";
import Link from "next/link";
import { BarChart3, CreditCard, FileText, Gift, Home, KeyRound, Vote } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { withBasePath } from "@/lib/paths";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { MemberTransparencyFeed } from "@/components/MemberTransparencyFeed";

export default function MemberTransparency() {
  return (
    <AuthGate>
      <div className="dashboard member-dashboard">
        <aside className="sidebar">
          <Link className="sidebar-brand" href="/">
            <Image src={withBasePath("/logo.png")} width={51} height={51} alt="AUMM" />
            <span>
              <strong>AUMM</strong>
              <small>Portal do associado</small>
            </span>
          </Link>
          <nav className="side-nav">
            <Link href="/associado">
              <Home /> Início
            </Link>
            <Link href="/associado/carteirinha">
              <CreditCard /> Carteirinha
            </Link>
            <Link href="/associado/assembleias"><Vote /> Assembleias</Link>
            <Link href="/associado/beneficios"><Gift /> Benefícios</Link>
            <Link className="active" href="/associado/transparencia">
              <BarChart3 /> Transparência
            </Link>
            <Link href="/associado/alterar-senha">
              <KeyRound /> Alterar senha
            </Link>
          </nav>
          <div className="sidebar-footer">
            Conteúdo exclusivo para associados
          </div>
        </aside>
        <main className="dashboard-main">
          <header className="dash-top">
            <h1>Portal da Transparência</h1>
          </header>
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
