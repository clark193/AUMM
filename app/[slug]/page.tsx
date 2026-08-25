import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, FileText, Search } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { news, publicPages } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [...Object.keys(publicPages), "noticias", "transparencia", "documentos"].map(slug => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "noticias") return { title: "Notícias" };
  if (slug === "transparencia") return { title: "Portal da Transparência" };
  if (slug === "documentos") return { title: "Documentos Públicos" };
  return publicPages[slug] ? { title: publicPages[slug].title, description: publicPages[slug].intro } : {};
}

export default async function PublicPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "noticias") return <NewsList />;
  if (slug === "transparencia") return <Transparency />;
  if (slug === "documentos") return <Documents />;
  const page = publicPages[slug];
  if (!page) notFound();
  return <PublicShell>
    <section className="page-hero"><div className="container"><span className="eyebrow light">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div></section>
    <section className="page-body"><div className="container page-cards">{page.sections.map((section,index)=><article className="page-card" key={section.title}><span>0{index+1}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</div></section>
  </PublicShell>;
}

function NewsList() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Informação</span><h1>Notícias</h1><p>Acompanhe as ações, conquistas e assuntos que importam para a categoria.</p></div></section><section className="page-body"><div className="container"><div className="form-heading"><div><h2>Últimas publicações</h2><p>Conteúdo demonstrativo pronto para ser gerenciado pelo painel.</p></div><span className="demo-badge">Dados de demonstração</span></div><div className="news-grid">{news.map(item=><Link className="news-card" href={`/noticias/${item.slug}`} key={item.slug}><div className="news-art"><span>{item.category}</span><FileText/></div><div className="news-body"><small>{item.date}</small><h3>{item.title}</h3><p>{item.summary}</p><span className="read-more">Ler notícia <ArrowRight size={16}/></span></div></Link>)}</div></div></section></PublicShell>; }

function Transparency() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Prestação de contas</span><h1>Portal da Transparência</h1><p>Informação pública, organizada e acessível para associados e para toda a sociedade.</p></div></section><section className="page-body surface"><div className="container"><span className="demo-badge">Dados financeiros demonstrativos</span><div className="finance-summary"><div className="finance-card positive"><small>Receitas · agosto</small><strong>R$ 18.450,00</strong></div><div className="finance-card negative"><small>Despesas · agosto</small><strong>R$ 12.780,00</strong></div><div className="finance-card"><small>Saldo do período</small><strong>R$ 5.670,00</strong></div></div><div className="bar-chart" aria-label="Gráfico demonstrativo de receitas e despesas">{[68,72,55,83,74,90].map((v,i)=><div className="bar-pair" key={i}><i style={{height:`${v}%`}}/><i style={{height:`${Math.max(v-18,25)}%`}}/></div>)}</div><div className="panel" style={{marginTop:20}}><div className="panel-head"><h3>Publicações recentes</h3><button className="button button-sm"><Search size={14}/> Filtrar</button></div><div className="table-wrap"><table><thead><tr><th>Documento</th><th>Categoria</th><th>Competência</th><th>Ação</th></tr></thead><tbody>{[["Balancete mensal","Prestação de contas","Agosto/2026"],["Ata da Assembleia nº 08","Atas","Agosto/2026"],["Relatório de atividades","Relatórios","2º trimestre/2026"]].map(row=><tr key={row[0]}><td><strong>{row[0]}</strong></td><td>{row[1]}</td><td>{row[2]}</td><td><a className="text-link" href="#"><Download size={14}/> PDF</a></td></tr>)}</tbody></table></div></div></div></section></PublicShell>; }

function Documents() { return <PublicShell><section className="page-hero"><div className="container"><span className="eyebrow light">Acesso público</span><h1>Documentos</h1><p>Estatuto, atas, regulamentos, relatórios e prestações de contas publicados pela AUMM.</p></div></section><section className="page-body"><div className="container page-cards">{["Estatuto Social","Atas e Assembleias","Relatórios e Contas"].map((title,i)=><article className="page-card" key={title}><span>0{i+1}</span><FileText color="#d71920"/><h2>{title}</h2><p>Os documentos aparecerão aqui após publicação autorizada pelo painel administrativo.</p><Link className="text-link" href="/transparencia">Consultar <ArrowRight size={15}/></Link></article>)}</div></section></PublicShell>; }
