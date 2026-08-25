import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { news, publicPages } from "@/lib/content";

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
    <section className="page-body"><div className="container page-cards">{page.sections.map((section,index)=><article className="page-card" key={section.title}><span>0{index+1}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</div></section>
  </PublicShell>;
}

function NewsList() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Informação</span><h1>Notícias</h1><p>Acompanhe as ações, conquistas e assuntos que importam para a categoria.</p></div></section><section className="page-body"><div className="container"><div className="form-heading"><div><h2>Últimas publicações</h2><p>Conteúdo demonstrativo pronto para ser gerenciado pelo painel.</p></div><span className="demo-badge">Dados de demonstração</span></div><div className="news-grid">{news.map(item=><Link className="news-card" href={`/noticias/${item.slug}`} key={item.slug}><div className="news-art"><span>{item.category}</span><FileText/></div><div className="news-body"><small>{item.date}</small><h3>{item.title}</h3><p>{item.summary}</p><span className="read-more">Ler notícia <ArrowRight size={16}/></span></div></Link>)}</div></div></section></PublicShell>; }

function Documents() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Acesso institucional</span><h1>Documentos</h1><p>Informações públicas institucionais da AUMM.</p></div></section><section className="page-body"><div className="container page-cards">{["Estatuto Social","Regulamentos","Informações institucionais"].map((title,i)=><article className="page-card" key={title}><span>0{i+1}</span><FileText color="#d71920"/><h2>{title}</h2><p>Demonstrativos financeiros, atas e prestações de contas ficam disponíveis somente na área do associado.</p><Link className="text-link" href="/associado/transparencia">Acessar como associado <ArrowRight size={15}/></Link></article>)}</div></section></PublicShell>; }
