"use client";

import { FileText } from "lucide-react";
import { DocumentLibrary } from "./DocumentLibrary";
import { MemberSidebar, MemberTopbar } from "./MemberNavigation";

export function MemberDocumentsPage() {
  return <div className="dashboard member-dashboard"><MemberSidebar /><main className="dashboard-main"><MemberTopbar title="Documentos do associado" /><div className="dash-content"><div className="dash-welcome"><div><span className="access-badge">Biblioteca AUMM</span><h2 style={{ marginTop: 12 }}>Documentos para associados</h2><p>Acesse atas, editais, normas, comunicados formais e outros arquivos publicados para os associados.</p></div><FileText size={42} /></div><section className="panel"><DocumentLibrary member /></section></div></main></div>;
}
