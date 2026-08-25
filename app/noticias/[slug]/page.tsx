import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Share2 } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { news } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const item=news.find(n=>n.slug===slug); return item?{title:item.title,description:item.summary}:{title:"Notícia"}; }
export default async function NewsArticle({params}:Props){const {slug}=await params;const item=news.find(n=>n.slug===slug);if(!item)notFound();return <PublicShell><article><header className="page-hero"><div className="container"><span className="eyebrow light">{item.category}</span><h1>{item.title}</h1><p>{item.summary}</p><div className="hero-trust"><span><CalendarDays/> {item.date}</span><span><Share2/> Compartilhar</span></div></div></header><div className="page-body"><div className="container" style={{maxWidth:820}}><span className="demo-badge">Notícia demonstrativa</span><p className="lead" style={{marginTop:30}}>A AUMM segue trabalhando para que a segurança viária seja tratada como prioridade coletiva. A iniciativa reúne escuta da categoria, orientação técnica e diálogo responsável.</p><p style={{lineHeight:1.9,color:"#555"}}>A programação inclui encontros com profissionais, levantamento de pontos críticos e construção de propostas para reduzir riscos no dia a dia. Todo o conteúdo definitivo poderá ser criado, revisado, agendado e publicado pelo painel administrativo.</p><p style={{lineHeight:1.9,color:"#555"}}>Associados também receberão comunicados específicos no portal, mantendo informações internas separadas das notícias públicas.</p><Link className="text-link" href="/noticias"><ArrowLeft size={16}/> Voltar às notícias</Link></div></div></article></PublicShell>}
