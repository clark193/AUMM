"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CalendarDays, ExternalLink, Handshake, MapPin } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

type PublicRow = { id: string; title?: string; name?: string; description?: string; partner?: string; category?: string; eventDate?: string; validityDate?: string; location?: string; url?: string; website?: string };

export function ManagedPublicFeed({ collectionName }: { collectionName: "benefits" | "events" | "partners" }) {
  const [rows, setRows] = useState<PublicRow[]>([]);
  useEffect(() => {
    if (!firebaseEnabled) return;
    return onSnapshot(query(collection(getFirebaseServices().db, collectionName), where("status", "==", "active")), (snapshot) => setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PublicRow))));
  }, [collectionName]);
  if (rows.length === 0) return null;
  return <div className="managed-public-section"><div className="form-heading"><div><h2>Publicações da administração</h2><p>Informações atualizadas pelo painel da AUMM.</p></div></div><div className="page-cards">{rows.map((row, index) => <article className="page-card" key={row.id}><span>0{index + 1}</span><h2>{row.title || row.name}</h2>{row.partner && <strong><Handshake size={14} /> {row.partner}</strong>}{row.category && <strong>{row.category}</strong>}<p>{row.description}</p>{row.eventDate && <small><CalendarDays size={14} /> {new Date(`${row.eventDate}T12:00:00`).toLocaleDateString("pt-BR")}</small>}{row.location && <small><MapPin size={14} /> {row.location}</small>}{row.validityDate && <small>Válido até {new Date(`${row.validityDate}T12:00:00`).toLocaleDateString("pt-BR")}</small>}{(row.url || row.website) && <a className="text-link" href={row.url || row.website} target="_blank" rel="noreferrer">Saiba mais <ExternalLink size={14} /></a>}</article>)}</div></div>;
}
