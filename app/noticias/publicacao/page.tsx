import type { Metadata } from "next";
import { Suspense } from "react";
import { LegacyNewsPublication } from "@/components/NewsPublication";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = { title: "Publicação", description: "Notícia completa da AUMM." };

export default function PublicationPage() { return <PublicShell><section className="page-body news-publication-page"><div className="container"><Suspense fallback={<div className="empty-state">Carregando publicação…</div>}><LegacyNewsPublication /></Suspense></div></section></PublicShell>; }
