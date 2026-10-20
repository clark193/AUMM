"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Siren } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

type Emergency = { id: string; fullName: string; memberNumber: string; phone: string; contactName: string; contactPhone: string; status: string; location: { lat: number; lng: number; accuracy: number } | null; createdAt?: { toMillis(): number; toDate(): Date } };
export function EmergencyAdmin({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Emergency[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!firebaseEnabled) { setLoading(false); return; }
    return onSnapshot(query(collection(getFirebaseServices().db, "emergencyAlerts"), where("status", "in", ["open", "contacting"]), limit(100)), snap => {
      setItems(snap.docs.map(item => ({ id: item.id, ...item.data() }) as Emergency).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))); setLoading(false); setError("");
    }, () => { setError("Não foi possível acompanhar os alertas. Confira sua conexão e as permissões."); setItems([]); setLoading(false); });
  }, []);
  async function update(item: Emergency, status: "contacting" | "resolved") {
    setBusy(item.id); setError("");
    try {
      const { db, auth } = getFirebaseServices();
      await updateDoc(doc(db, "emergencyAlerts", item.id), { status, handledBy: auth.currentUser!.uid, updatedAt: serverTimestamp() });
    } catch { setError("O alerta mudou ou a atualização falhou. Confira a lista e tente novamente."); }
    finally { setBusy(""); }
  }
  if (compact) return items.length ? <Link className="emergency-admin-banner" href="/admin/solicitacoes"><Siren size={22} /><strong>{items.length} alerta(s) de emergência aguardando acompanhamento</strong><span>Abrir atendimento →</span></Link> : error ? <p role="alert">{error}</p> : null;
  return <section className="panel emergency-admin"><h2><Siren size={22} /> Alertas de acidente</h2><p>Alertas recebidos pelo aplicativo. Ligue para o associado, verifique a situação e registre o acompanhamento. Esta fila não aciona serviços públicos de socorro.</p>{error && <p role="alert">{error}</p>}{loading && <p role="status">Carregando alertas…</p>}{!loading && !error && !items.length && <p>Nenhum alerta de emergência em andamento.</p>}{items.map(item => <article key={item.id} className="emergency-admin-card"><h3>{item.fullName}</h3><p>{item.memberNumber} · {item.createdAt?.toDate().toLocaleString("pt-BR") || "Registrando horário…"}</p><strong>{item.status === "open" ? "Aguardando atendimento" : "Em acompanhamento pela associação"}</strong><p><a href={`tel:${item.phone}`}>Ligar para o associado: {item.phone}</a></p><p>Contato de emergência: {item.contactName} · <a href={`tel:${item.contactPhone}`}>{item.contactPhone}</a></p>{item.location ? <p><a href={`https://www.google.com/maps/search/?api=1&query=${item.location.lat}%2C${item.location.lng}`} target="_blank" rel="noopener noreferrer">Abrir localização do alerta no mapa</a> · precisão estimada: {Math.round(item.location.accuracy)} m</p> : <p>Localização não obtida. Confirme onde o associado está ao ligar.</p>}<div className="member-detail-actions">{item.status === "open" && <button className="btn btn-primary" disabled={busy === item.id} onClick={() => void update(item, "contacting")}>Estou entrando em contato</button>}<button className="table-action" disabled={busy === item.id} onClick={() => void update(item, "resolved")}>Encerrar atendimento</button></div></article>)}</section>;
}
