"use client";

import Image from "next/image";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

type Sponsor = { id: string; type?: "sponsor" | "support" | "partner"; logoDataUrl?: string; websiteUrl?: string; status?: string };

export function SponsorShowcase({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Sponsor[]>([]);
  useEffect(() => onSnapshot(query(collection(getFirebaseServices().db, "sponsors"), where("status", "==", "active"), where("type", "in", ["support", "sponsor"])), (snapshot) => setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Sponsor))), () => setRows([])), []);
  const group = (type: "sponsor" | "support") => rows.filter((item) => item.type === type);
  return <div className={`sponsor-showcase ${compact ? "compact" : ""}`}>{(["support", "sponsor"] as const).map((type) => <section key={type}><div className="form-heading"><div><span className="eyebrow">Rede AUMM</span><h2>{type === "sponsor" ? "Patrocínio" : "Apoio"}</h2></div></div><div className="sponsor-public-grid">{group(type).length === 0 ? <div className="empty-state">Nenhuma marca publicada nesta categoria.</div> : group(type).map((item) => <a href={item.websiteUrl} target="_blank" rel="noreferrer" key={item.id} aria-label={`Visitar ${type === "sponsor" ? "patrocinador" : "organização apoiadora"}`}>{item.logoDataUrl && <Image src={item.logoDataUrl} width={260} height={120} unoptimized alt={type === "sponsor" ? "Logotipo de patrocinador da AUMM" : "Logotipo de apoio à AUMM"} />}</a>)}</div></section>)}</div>;
}
