import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { PublicNewsFeed } from "@/components/PublicNewsFeed";
import { publicPages } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [...Object.keys(publicPages), "noticias", "documentos"].map(slug => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "noticias") return { title: "Notícias" };
  if (slug === "documentos") return { title: "Documentos Públicos" };
  return publicPages[slug] ? { title: publicPages[slug].title, description: publicPages[slug].intro } : {};
}

export default async function PublicPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "noticias") return <NewsList />;
  if (slug === "documentos") return <Documents />;
  const page = publicPages[slug];
  if (!page) notFound();
  return <PublicShell>
    <section className="page-hero"><div className="container"><span className="eyebrow light">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div></section>
    <section className="page-body"><div className="container">{page.sections.length ? <div className="page-cards">{page.sections.map((section,index)=><article className="page-card" key={section.title}><span>0{index+1}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</div> : <div className="empty-state">Nenhum registro publicado.</div>}</div></section>
  </PublicShell>;
}

function NewsList() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Informação</span><h1>Notícias</h1><p>Acompanhe as ações, conquistas e assuntos que importam para a categoria.</p></div></section><section className="page-body"><div className="container"><div className="form-heading"><div><h2>Últimas publicações</h2><p>Conteúdos publicados pela administração da AUMM aparecem aqui.</p></div></div><PublicNewsFeed /></div></section></PublicShell>; }

function Documents() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Acesso institucional</span><h1>Documentos</h1><p>Informações públicas institucionais da AUMM.</p></div></section><section className="page-body"><div className="container"><div className="empty-state">Nenhum documento público disponível.</div><p style={{ marginTop: 22 }}><Link className="text-link" href="/associado/transparencia">Acessar transparência como associado <ArrowRight size={15}/></Link></p></div></section></PublicShell>; }
