"use client";

import Image from "next/image";
import { CalendarDays, ExternalLink, Gift, Handshake, MessageCircle } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

type Benefit = { id: string; title?: string; partner?: string; description?: string; validityDate?: string; url?: string; status?: string };
type Partner = { id: string; name?: string; description?: string; logoDataUrl?: string; websiteUrl?: string; website?: string; phone?: string; status?: string; type?: string };

export function MemberBenefits({ limit }: { limit?: number }) {
  const [rows, setRows] = useState<Benefit[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => {
    const db = getFirebaseServices().db;
    const stopBenefits = onSnapshot(query(collection(db, "benefits"), where("status", "==", "active")), snapshot => setRows(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Benefit))), () => setRows([]));
    const stopNetwork = onSnapshot(query(collection(db, "sponsors"), where("status", "==", "active")), snapshot => setPartners(current => [...current.filter(item => item.type === "legacy"), ...snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Partner)).filter(item => item.type === "partner")]), () => undefined);
    const stopLegacy = onSnapshot(query(collection(db, "partners"), where("status", "==", "active")), snapshot => setPartners(current => [...current.filter(item => item.type !== "legacy"), ...snapshot.docs.map(item => ({ id: item.id, type: "legacy", ...item.data() } as Partner))]), () => undefined);
    return () => { stopBenefits(); stopNetwork(); stopLegacy(); };
  }, []);
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  const visiblePartners = typeof limit === "number" ? partners.slice(0, limit) : partners;
  if (!visible.length && !visiblePartners.length) return <div className="empty-state"><Gift /><strong>Novos benefícios serão publicados aqui.</strong><p>A administração está preparando vantagens para os associados.</p></div>;
  return <div className="member-benefit-sections">{visiblePartners.length > 0 && <section><div className="form-heading"><div><span className="eyebrow">Rede de vantagens</span><h2>Parceiros dos associados</h2><p>Descontos e condições especiais para quem faz parte da AUMM.</p></div></div><div className="member-benefit-grid partner-benefit-grid">{visiblePartners.map(item => <article key={`${item.type}-${item.id}`}>{item.logoDataUrl ? <div className="partner-benefit-logo"><Image src={item.logoDataUrl} width={180} height={90} unoptimized alt={`Logo de ${item.name || "parceiro"}`} /></div> : <div className="benefit-icon"><Handshake /></div>}<span>Parceiro AUMM</span><h3>{item.name || "Parceiro de benefícios"}</h3><p>{item.description}</p><div className="partner-benefit-actions">{(item.websiteUrl || item.website) && <a className="text-link" href={item.websiteUrl || item.website} target="_blank" rel="noreferrer">Acessar parceiro <ExternalLink /></a>}{item.phone && <a className="text-link" href={`https://wa.me/55${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>}</div></article>)}</div></section>}{visible.length > 0 && <section><div className="form-heading"><div><span className="eyebrow">Condições publicadas</span><h2>Benefícios disponíveis</h2></div></div><div className="member-benefit-grid">{visible.map(item => <article key={item.id}><div className="benefit-icon"><Gift /></div><span>Benefício para associado</span><h3>{item.title}</h3>{item.partner && <strong><Handshake /> {item.partner}</strong>}<p>{item.description}</p>{item.validityDate && <small><CalendarDays /> Válido até {new Date(`${item.validityDate}T12:00:00`).toLocaleDateString("pt-BR")}</small>}{item.url && <a className="text-link" href={item.url} target="_blank" rel="noreferrer">Usar benefício <ExternalLink /></a>}</article>)}</div></section>}</div>;
}
