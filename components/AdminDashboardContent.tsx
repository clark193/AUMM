"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { Activity, Bell, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

type Application = { id: string; fullName?: string; status?: string; createdAt?: Timestamp };
type Audit = { id: string; action?: string; createdAt?: Timestamp };
type Communication = { id: string; subject?: string; body?: string; audience?: string; status?: string; updatedAt?: Timestamp };

function date(value?: Timestamp) {
  return value?.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) || "—";
}

export function AdminDashboardContent() {
  const [level, setLevel] = useState(1);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activity, setActivity] = useState<Audit[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { auth, db } = getFirebaseServices();
    const unsubscribers: (() => void)[] = [];
    const stopAuth = onAuthStateChanged(auth, async user => {
      if (!user) return;
      const access = await getDoc(doc(db, "adminRoles", user.uid));
      setLevel(Number(access.data()?.level || 5));
      unsubscribers.push(onSnapshot(query(collection(db, "membershipRequests"), orderBy("submittedAt", "desc"), limit(8)), snapshot => {
        setApplications(snapshot.docs.map(item => ({ id: item.id, fullName: item.data().fullName, status: item.data().status, createdAt: item.data().submittedAt } as Application)));
      }, () => setApplications([])));
      unsubscribers.push(onSnapshot(query(collection(db, "dashboardActivity"), orderBy("createdAt", "desc"), limit(8)), snapshot => {
        setActivity(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Audit)));
      }, () => setActivity([])));
      unsubscribers.push(onSnapshot(collection(db, "communications"), snapshot => {
        const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Communication)).filter(item => item.status === "published" && ["all", "members", "admin"].includes(item.audience || ""));
        setCommunications(rows.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)).slice(0, 5));
      }, () => setCommunications([])));
    });
    return () => { stopAuth(); unsubscribers.forEach(stop => stop()); };
  }, []);

  const recruiter = level === 5;
  return <>
    <div className="dash-welcome"><div><span className="access-badge">{recruiter ? "Recrutamento · nível 5" : `Administração · nível ${level}`}</span><h2 style={{ marginTop: 12 }}>{recruiter ? "Painel de recrutamento" : "Visão geral"}</h2><p>{recruiter ? "Consulta visual de inscrições e movimentações recentes." : "Acompanhe os registros que precisam de atenção."}</p></div></div>
    <div className="dashboard-grid dashboard-readonly">
      <section className="panel">
        <div className="panel-head"><h3><UsersRound size={17} /> Filiações recentes</h3>{!recruiter && <Link href="/admin/filiacoes">Gerenciar</Link>}</div>
        {applications.length === 0 ? <div className="empty-state">Nenhum cadastro recebido.</div> : <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Enviado em</th><th>Status</th></tr></thead><tbody>{applications.map(item => <tr key={item.id}><td><strong>{item.fullName || "Sem nome"}</strong></td><td>{date(item.createdAt)}</td><td><span className={`status ${item.status || "pending"}`}>{item.status === "approved" ? "Aprovado" : "Pendente"}</span></td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel">
        <div className="panel-head"><h3><Activity size={17} /> Atividade recente</h3></div>
        {activity.length === 0 ? <div className="empty-state">Nenhuma atividade registrada.</div> : <div className="activity-list">{activity.map(item => <div className="activity" key={item.id}><i /><div><p>{item.action || "Atividade administrativa"}</p><small>{date(item.createdAt)}</small></div></div>)}</div>}
      </section>
    </div>
    <section className="panel admin-announcements">
      <div className="panel-head"><div><h3><Bell size={17} /> Comunicados da administração</h3><p>Os comunicados publicados para a equipe aparecem também nesta tela inicial.</p></div>{level <= 4 && <Link href="/admin/comunicados">Gerenciar comunicados</Link>}</div>
      {communications.length === 0 ? <div className="empty-state">Nenhum comunicado administrativo publicado.</div> : <div className="communication-list">{communications.map(item => <article key={item.id}><Bell size={17} /><div><h4>{item.subject || "Comunicado"}</h4><p>{item.body}</p><small>{item.updatedAt?.toDate().toLocaleString("pt-BR") || "Publicado pela AUMM"}</small></div></article>)}</div>}
    </section>
    {recruiter && <p className="readonly-note">Acesso somente para consulta. Este perfil não abre cadastros, aprova associados, publica notícias, responde solicitações nem acessa auditoria.</p>}
  </>;
}
