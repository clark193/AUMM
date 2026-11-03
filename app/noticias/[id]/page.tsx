import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NewsPublication } from "@/components/NewsPublication";
import { PublicShell } from "@/components/PublicShell";
import { getPublicNews, getPublicNewsById } from "@/lib/publicNews";

export const dynamicParams = false;
export async function generateStaticParams() { return (await getPublicNews()).map(({ id }) => ({ id })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getPublicNewsById(id);
  if (!item) return { title: "Publicação não encontrada", robots: { index: false } };
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://aumm.com.br").replace(/\/$/, "");
  const url = `${base}/noticias/${encodeURIComponent(id)}/`;
  const image = item.imageUrl.startsWith("https://") ? item.imageUrl : `${base}/logo.png`;
  return {
    title: item.title, description: item.summary, alternates: { canonical: url },
    openGraph: { type: "article", locale: "pt_BR", siteName: "AUMM", title: item.title, description: item.summary, url, images: [{ url: image, alt: item.title }], ...(item.publishedAtISO ? { publishedTime: item.publishedAtISO } : {}) },
    twitter: { card: "summary_large_image", title: item.title, description: item.summary, images: [image] },
  };
}

export default async function NewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const publication = await getPublicNewsById(id);
  if (!publication) notFound();
  return <PublicShell><section className="page-body news-publication-page"><div className="container"><Suspense fallback={<div className="empty-state">Carregando publicação…</div>}><NewsPublication publicationId={id} initialPublication={publication} /></Suspense></div></section></PublicShell>;
}
