"use client";

import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";

type ResetRequest = { id: string; email?: string; phone?: string; status?: string; createdAt?: Timestamp };

function whatsapp(phone: string, email: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  const message = encodeURIComponent(`Olá! Somos da AUMM. Recebemos uma solicitação de recuperação de acesso para ${email}. Antes de prosseguir, precisamos confirmar alguns dados de segurança.`);
  return `https://wa.me/${digits}?text=${message}`;
}

export function PasswordResetAdmin() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { db } = getFirebaseServices();
    return onSnapshot(query(collection(db, "passwordResetRequests"), orderBy("createdAt", "desc"), limit(100)), snapshot => {
      setRequests(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as ResetRequest)));
    });
  }, []);

  async function setStatus(item: ResetRequest, status: "contacted" | "resolved") {
    const { auth, db } = getFirebaseServices();
    await updateDoc(doc(db, "passwordResetRequests", item.id), {
      status,
      [status === "contacted" ? "contactedAt" : "resolvedAt"]: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "admin",
    });
    setMessage(status === "contacted" ? "Solicitação marcada como contatada." : "Solicitação concluída.");
  }

  return <section className="panel"><div className="panel-head"><div><h3>Solicitações de recuperação</h3><p>Confirme a identidade antes de orientar qualquer alteração de acesso.</p></div></div>
    {message && <div className="form-message success"><CheckCircle2 size={16} /> {message}</div>}
    {requests.length === 0 ? <div className="empty-state">Nenhuma solicitação de recuperação.</div> : <div className="table-wrap"><table><thead><tr><th>E-mail</th><th>WhatsApp</th><th>Recebida em</th><th>Status</th><th>Ações</th></tr></thead><tbody>{requests.map(item => <tr key={item.id}><td><strong>{item.email}</strong></td><td>{item.phone}</td><td>{item.createdAt?.toDate().toLocaleString("pt-BR") || "—"}</td><td><span className={`status ${item.status === "resolved" ? "active" : "pending"}`}>{item.status === "resolved" ? "Concluída" : item.status === "contacted" ? "Contatada" : "Pendente"}</span></td><td><div className="table-actions"><a className="button button-sm button-dark" href={whatsapp(item.phone || "", item.email || "")} target="_blank" rel="noreferrer" onClick={() => setStatus(item, "contacted")}><MessageCircle size={14} /> WhatsApp</a><button className="button button-sm" onClick={() => setStatus(item, "resolved")}><CheckCircle2 size={14} /> Concluir</button></div></td></tr>)}</tbody></table></div>}
  </section>;
}
