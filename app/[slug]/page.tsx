import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { PublicNewsFeed } from "@/components/PublicNewsFeed";
import { publicPages } from "@/lib/content";
import { ManagedPublicFeed } from "@/components/ManagedPublicFeed";
import { PublicContactDetails } from "@/components/PublicContactDetails";
import { SponsorShowcase } from "@/components/SponsorShowcase";
import { AccomplishmentsFeed } from "@/components/AccomplishmentsFeed";
import { LegalPage } from "@/components/LegalPage";
import { legalKind, legalDocuments } from "@/lib/legalContent";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [...Object.keys(publicPages), "noticias", "documentos"].map(slug => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const kind = legalKind(slug);
  if (kind) {
    const document = legalDocuments[kind], url = `https://aumm.com.br/${kind}/`;
    return { title: { absolute: document.title }, description: document.intro, alternates: { canonical: url }, openGraph: { title: document.title, description: document.intro, url, type: "website", images: ["https://aumm.com.br/logo.png"] }, twitter: { card: "summary", title: document.title, description: document.intro } };
  }
  if (slug === "noticias") return { title: "Notícias" };
  if (slug === "documentos") return { title: "Documentos Públicos" };
  return publicPages[slug] ? { title: publicPages[slug].title, description: publicPages[slug].intro } : {};
}

export default async function PublicPage({ params }: Props) {
  const { slug } = await params;
  const kind = legalKind(slug);
  if (kind) return <LegalPage kind={kind} />;
  if (slug === "noticias") return <NewsList />;
  if (slug === "documentos") return <Documents />;
  const page = publicPages[slug];
  if (!page) notFound();
  return <PublicShell>
    <section className="page-hero"><div className="container"><span className="eyebrow light">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div></section>
    <section className="page-body"><div className="container">{slug === "contato" ? <PublicContactDetails /> : slug === "patrocinadores" ? <SponsorShowcase /> : slug === "realizacoes" ? <AccomplishmentsFeed /> : page.sections.length ? <div className="page-cards">{page.sections.map((section,index)=><article className="page-card" key={section.title}><span>0{index+1}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</div> : !["beneficios","eventos","parceiros","realizacoes"].includes(slug) && <div className="empty-state">Nenhum registro publicado.</div>}{slug === "beneficios" && <div className="member-benefit-public-cta"><h2>Benefícios exclusivos para associados</h2><p>Os parceiros, descontos e condições especiais ficam disponíveis na área protegida.</p><Link className="button" href="/associado/beneficios">Acessar benefícios <ArrowRight /></Link></div>}{slug === "eventos" && <ManagedPublicFeed collectionName="events" />}{slug === "parceiros" && <div className="member-benefit-public-cta"><h2>Parceiros com vantagens exclusivas</h2><p>Entre no portal para consultar condições e contatos.</p><Link className="button" href="/associado/beneficios">Abrir área do associado <ArrowRight /></Link></div>}</div></section>
  </PublicShell>;
}

function NewsList() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Informação</span><h1>Notícias</h1><p>Acompanhe as ações, conquistas e assuntos que importam para a categoria.</p></div></section><section className="page-body"><div className="container"><div className="form-heading"><div><h2>Últimas publicações</h2><p>Conteúdos publicados pela administração da AUMM aparecem aqui.</p></div></div><PublicNewsFeed /></div></section></PublicShell>; }

function Documents() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Biblioteca institucional</span><h1>Documentos Institucionais</h1><p>Estatuto, atas, editais, normas e publicações formais da Associação União Maior Motoboys.</p></div></section><section className="page-body"><div className="container"><DocumentLibrary/><p style={{ marginTop: 22 }}><Link className="text-link" href="/associado/documentos">Acessar documentos exclusivos de associados <ArrowRight size={15}/></Link></p></div></section></PublicShell>; }
