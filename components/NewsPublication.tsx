"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Newspaper, Share2 } from "lucide-react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { newsPath, shareNews } from "@/lib/newsSharing";

type Publication = {
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  imageUrl?: string;
  status?: string;
  publishedAt?: Timestamp;
  publishedAtISO?: string;
};

export function LegacyNewsPublication() {
  const id = useSearchParams().get("id") || "";
  return <NewsPublication publicationId={id} />;
}

export function NewsPublication({ publicationId, initialPublication, previewVersion }: { publicationId?: string; initialPublication?: Publication; previewVersion?: string } = {}) {
  const id = publicationId || "";
  const [publication, setPublication] = useState<Publication | null>(initialPublication || null);
  const [loaded, setLoaded] = useState(Boolean(initialPublication) || !firebaseEnabled || !id);
  const [shareMessage, setShareMessage] = useState("");

  async function share() {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
    const url = `${base}${newsPath(id)}?imagem=${encodeURIComponent(previewVersion || "2")}`;
    try {
      const response = await fetch(newsPath(id), { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) { setShareMessage("A notícia já pode ser lida. O link com prévia está sendo preparado; tente compartilhar novamente em alguns minutos."); return; }
      const result = await shareNews(publication?.title || "Notícia AUMM", url, navigator);
      setShareMessage(result === "copied" ? "Link da notícia copiado. Cole no WhatsApp ou onde preferir." : "");
    } catch {
      setShareMessage("Não foi possível compartilhar neste navegador. Copie este link: " + url);
    }
  }

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
      <small><CalendarDays size={14} /> {(publication.publishedAt?.toDate?.() || (publication.publishedAtISO ? new Date(publication.publishedAtISO) : undefined))?.toLocaleDateString("pt-BR", { dateStyle: "long" }) || "AUMM"}</small>
      <h1>{publication.title}</h1>
      {publication.summary && <p>{publication.summary}</p>}
      <button type="button" className="button button-sm" onClick={share}><Share2 size={16} /> Compartilhar notícia</button>
      {shareMessage && <p role="status">{shareMessage}</p>}
    </div>
    <div className="news-publication-content">
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
  </article>;
}
