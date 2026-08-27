"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Newspaper } from "lucide-react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

type Publication = {
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  imageUrl?: string;
  status?: string;
  publishedAt?: Timestamp;
};

export function NewsPublication() {
  const id = useSearchParams().get("id") || "";
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loaded, setLoaded] = useState(!firebaseEnabled || !id);

  useEffect(() => {
    if (!firebaseEnabled || !id) {
      return;
    }
    return onSnapshot(doc(getFirebaseServices().db, "news", id), (snapshot) => {
      const data = snapshot.data() as Publication | undefined;
      setPublication(data?.status === "published" ? data : null);
      setLoaded(true);
    }, () => setLoaded(true));
  }, [id]);

  if (!loaded) return <div className="empty-state">Carregando publicação…</div>;
  if (!publication) return <div className="empty-state"><Newspaper /><h2>Publicação não encontrada</h2><p>Ela pode ter sido removida ou ainda não está publicada.</p><Link className="button button-sm" href="/noticias">Voltar às notícias</Link></div>;

  const paragraphs = (publication.content || publication.summary || "").split(/\n{2,}/).filter(Boolean);
  const safeImage = publication.imageUrl?.startsWith("https://") ? publication.imageUrl : undefined;
  return <article className="news-publication">
    <Link className="news-publication-back" href="/noticias"><ArrowLeft size={16} /> Todas as notícias</Link>
    {safeImage && <div className="news-publication-image" style={{ backgroundImage: `url("${safeImage.replace(/["\\]/g, "")}")` }} />}
    <div className="news-publication-header">
      <span>{publication.category || "Notícia"}</span>
      <small><CalendarDays size={14} /> {publication.publishedAt?.toDate?.().toLocaleDateString("pt-BR", { dateStyle: "long" }) || "AUMM"}</small>
      <h1>{publication.title}</h1>
      {publication.summary && <p>{publication.summary}</p>}
    </div>
    <div className="news-publication-content">
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
  </article>;
}
