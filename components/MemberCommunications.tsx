"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Bell } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

type Communication = { id: string; subject?: string; body?: string; updatedAt?: { toDate(): Date } };

export function MemberCommunications() {
  const [rows, setRows] = useState<Communication[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const db = getFirebaseServices().db;
    const loaded = new Map<string, Communication>();
    const refresh = () => setRows([...loaded.values()].sort((a, b) => (b.updatedAt?.toDate().getTime() || 0) - (a.updatedAt?.toDate().getTime() || 0)));
    const stops = ["all", "members"].map((audience) => onSnapshot(query(collection(db, "communications"), where("status", "==", "published"), where("audience", "==", audience)), (snapshot) => {
      snapshot.docs.forEach((item) => loaded.set(item.id, { id: item.id, ...item.data() } as Communication)); refresh();
    }, (reason) => setError(firebaseErrorMessage(reason, "Não foi possível carregar os comunicados."))));
    return () => stops.forEach((stop) => stop());
  }, []);
  if (error) return <div className="form-message error">{error}</div>;
  if (rows.length === 0) return <div className="empty-state">Nenhum comunicado disponível.</div>;
  return <div className="communication-list">{rows.map((row) => <article key={row.id}><Bell size={17} /><div><h4>{row.subject}</h4><p>{row.body}</p><small>{row.updatedAt?.toDate().toLocaleString("pt-BR") || "Publicado pela AUMM"}</small></div></article>)}</div>;
}
