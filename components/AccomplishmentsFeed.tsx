"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CalendarDays, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

type Accomplishment = { id: string; title?: string; description?: string; imageUrl?: string; actionDate?: string; url?: string };

function safeImage(value?: string) {
  const url = value?.trim();
  return url?.startsWith("https://") ? `url("${url.replace(/["\\]/g, "")}")` : undefined;
}

export function AccomplishmentsFeed({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Accomplishment[]>([]);
  useEffect(() => {
    if (!firebaseEnabled) return;
    return onSnapshot(query(collection(getFirebaseServices().db, "accomplishments"), where("status", "==", "active")), (snapshot) => {
      const loaded = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Accomplishment));
      loaded.sort((a, b) => String(b.actionDate || "").localeCompare(String(a.actionDate || "")));
      setRows(compact ? loaded.slice(0, 3) : loaded);
    }, () => setRows([]));
  }, [compact]);

  if (!rows.length) return <div className="empty-state">As realizações da AUMM serão publicadas aqui.</div>;
  return <div className="accomplishment-grid">{rows.map((item) => <article key={item.id}>
    <div className="accomplishment-image" style={{ backgroundImage: safeImage(item.imageUrl) }} aria-label={item.imageUrl ? `Imagem de ${item.title || "realização da AUMM"}` : undefined} />
    <div className="accomplishment-copy">{item.actionDate && <small><CalendarDays /> {new Date(`${item.actionDate}T12:00:00`).toLocaleDateString("pt-BR")}</small>}<h2>{item.title}</h2><p>{item.description}</p>{item.url && <a className="text-link" href={item.url} target="_blank" rel="noreferrer">Ver publicação <ExternalLink /></a>}</div>
  </article>)}</div>;
}
