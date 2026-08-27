"use client";

import { CalendarDays, ExternalLink, Gift, Handshake } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

type Benefit = { id: string; title?: string; partner?: string; description?: string; validityDate?: string; url?: string; status?: string };

export function MemberBenefits({ limit }: { limit?: number }) {
  const [rows, setRows] = useState<Benefit[]>([]);
  useEffect(() => onSnapshot(query(collection(getFirebaseServices().db, "benefits"), where("status", "==", "active")), snapshot => setRows(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Benefit))), () => setRows([])), []);
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  if (!visible.length) return <div className="empty-state"><Gift /><strong>Novos benefícios serão publicados aqui.</strong><p>A administração está preparando vantagens para os associados.</p></div>;
  return <div className="member-benefit-grid">{visible.map(item => <article key={item.id}><div className="benefit-icon"><Gift /></div><span>Benefício para associado</span><h3>{item.title}</h3>{item.partner && <strong><Handshake /> {item.partner}</strong>}<p>{item.description}</p>{item.validityDate && <small><CalendarDays /> Válido até {new Date(`${item.validityDate}T12:00:00`).toLocaleDateString("pt-BR")}</small>}{item.url && <a className="text-link" href={item.url} target="_blank" rel="noreferrer">Usar benefício <ExternalLink /></a>}</article>)}</div>;
}
