"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ExternalLink, FileText } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";

type TransparencyRow = { id: string; title?: string; description?: string; category?: string; competence?: string; url?: string };

export function MemberTransparencyFeed() {
  const [rows, setRows] = useState<TransparencyRow[]>([]);
  useEffect(() => onSnapshot(query(collection(getFirebaseServices().db, "transparency"), where("status", "==", "published")), (snapshot) => setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TransparencyRow)))), []);
  if (rows.length === 0) return null;
  return <section className="panel" style={{ marginBottom: 18 }}><div className="panel-head"><h3><FileText size={18} /> Publicações de transparência</h3></div><div className="document-admin-list">{rows.map((row) => <article className="document-card" key={row.id}><div><span>{row.category || "Transparência"}</span><h3>{row.title}</h3><p>{row.description}</p><small>{row.competence}</small></div>{row.url && <a className="button button-sm button-dark" href={row.url} target="_blank" rel="noreferrer">Abrir <ExternalLink size={14} /></a>}</article>)}</div></section>;
}
