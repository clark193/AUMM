import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NewsPublication } from "@/components/NewsPublication";
import { PublicShell } from "@/components/PublicShell";
import { getPublicNews, getPublicNewsById, getNewsPreview } from "@/lib/publicNews";

export const dynamicParams = false;
export async function generateStaticParams() { return (await getPublicNews()).map(({ id }) => ({ id })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getPublicNewsById(id);
  if (!item) return { title: "Publicação não encontrada", robots: { index: false } };
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://aumm.com.br").replace(/\/$/, "");
  const url = `${base}/noticias/${encodeURIComponent(id)}/`;
  const preview = getNewsPreview(id, item.imageUrl);
  const image = preview ? `${base}${preview.path}` : `${base}/logo.png`;
  return {
    title: item.title, description: item.summary, alternates: { canonical: url },
    openGraph: { type: "article", locale: "pt_BR", siteName: "AUMM", title: item.title, description: item.summary, url, images: [{ url: image, secureUrl: image, alt: item.title, ...(preview ? { width: preview.width, height: preview.height, type: preview.type } : {}) }], ...(item.publishedAtISO ? { publishedTime: item.publishedAtISO } : {}) },
    twitter: { card: "summary_large_image", title: item.title, description: item.summary, images: [image] },
  };
}

export default async function NewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const publication = await getPublicNewsById(id);
  if (!publication) notFound();
  const previewVersion = getNewsPreview(id, publication.imageUrl)?.version;
  return <PublicShell><section className="page-body news-publication-page"><div className="container"><Suspense fallback={<div className="empty-state">Carregando publicação…</div>}><NewsPublication publicationId={id} initialPublication={publication} previewVersion={previewVersion} /></Suspense></div></section></PublicShell>;
}
