import Link from "next/link";
import { PublicShell } from "./PublicShell";
import { DeletionRequestForm } from "./DeletionRequestForm";
import { legalDocuments, legalUpdated, legalWhatsapp, legalWhatsappLabel, type LegalKind } from "@/lib/legalContent";

export function LegalPage({ kind }: { kind: LegalKind }) {
  const document = legalDocuments[kind];
  return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Site e aplicativo AUMM</span><h1>{document.title}</h1><p>{document.intro}</p></div></section>
    <article className="container" style={{ maxWidth: 940, paddingTop: 32, paddingBottom: 56, lineHeight: 1.8 }}>
      <p><strong>Atualizado em {legalUpdated}.</strong></p>
      <nav aria-label="Privacidade e conta" style={{ display: "flex", flexWrap: "wrap", gap: 18, margin: "20px 0 28px" }}><Link href="/privacidade/">Política de privacidade</Link><Link href="/termos/">Termos de uso</Link><Link href="/exclusao/">Excluir conta e dados</Link></nav>
      {kind === "exclusao" ? <DeletionRequestForm /> : <p><Link className="button button-sm" href="/exclusao/#solicitar-exclusao">Solicitar exclusão da conta e dos dados</Link></p>}
      <nav aria-label="Índice desta página" style={{ margin: "28px 0" }}><strong>Nesta página</strong><ul>{document.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ul></nav>
      {document.sections.map(section => <section id={section.id} key={section.id} style={{ margin: "32px 0", scrollMarginTop: 100 }}><h2>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index} style={{ marginTop: 14 }}>{paragraph}</p>)}</section>)}
      <section aria-label="Atendimento sobre privacidade"><h2>Atendimento AUMM</h2><p><a href={`https://wa.me/${legalWhatsapp}`}>WhatsApp {legalWhatsappLabel}</a> · <Link href="/contato/">Outros canais de contato</Link></p><p><Link href="/exclusao/#solicitar-exclusao">Iniciar pedido de exclusão da conta e dos dados</Link></p></section>
    </article></PublicShell>;
}
