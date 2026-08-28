"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Send,
  UsersRound,
  Vote,
} from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { formatSaoPaulo } from "@/lib/assemblyRules";
import { acknowledgeNotice, castVote, confirmMinutesApproval, createAssemblyComment, registerPresence, type AssemblyActor } from "@/lib/assemblyService";
import { ASSEMBLY_MEMBER_VISIBLE_STATUSES, type Assembly, type AssemblyAgenda, type AssemblyComment, type AssemblyResult } from "@/lib/assemblyTypes";
import { MemberSidebar, MemberTopbar } from "./MemberNavigation";

type Member = { fullName?: string; memberNumber?: string; role?: string; status?: string; eligibleToVote?: boolean };

const statusNames: Record<string, string> = {
  published: "Convocada", first_call: "1ª chamada", waiting_second_call: "Aguardando 2ª chamada",
  second_call: "2ª chamada", waiting_third_call: "Aguardando 3ª chamada", third_call: "3ª chamada",
  in_session: "Em andamento", closed: "Encerrada", pending: "Aguardando", open: "Pauta aberta",
  discussion: "Discussão aberta", voting: "Votação aberta", voting_closed: "Apuração", result: "Resultado publicado",
};

export function AssemblyMember() {
  const [actor, setActor] = useState<AssemblyActor | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [eligibleForSelected, setEligibleForSelected] = useState(false);
  const [agendas, setAgendas] = useState<AssemblyAgenda[]>([]);
  const [comments, setComments] = useState<AssemblyComment[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [present, setPresent] = useState(false);
  const [ownVote, setOwnVote] = useState<string | null>(null);
  const [result, setResult] = useState<AssemblyResult | null>(null);
  const [minutes, setMinutes] = useState<Record<string, unknown> | null>(null);
  const [minutesApproved, setMinutesApproved] = useState(false);
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState<"manifestation" | "question">("manifestation");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "live" | "closed">("upcoming");

  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    let stopAssemblies: () => void = () => undefined;
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snapshot = await getDoc(doc(db, "associados", user.uid));
      const data = snapshot.data() as Member | undefined;
      setMember(data || null);
      setActor({ uid: user.uid, name: data?.fullName || user.displayName || "Associado", role: data?.role || "Associado" });
      stopAssemblies = onSnapshot(query(collection(db, "assemblies"), where("status", "in", ASSEMBLY_MEMBER_VISIBLE_STATUSES), orderBy("firstCallAt", "desc"), limit(50)), (items) => {
        const rows = items.docs.map((item) => ({ id: item.id, ...item.data() }) as Assembly).sort((a, b) => b.firstCallAt.toMillis() - a.firstCallAt.toMillis());
        setAssemblies(rows); setSelectedId((current) => current || rows.find((item) => item.status === "published")?.id || rows[0]?.id || "");
      }, (error) => setMessage({ type: "error", text: error.message }));
    });
    return () => { stopAuth(); stopAssemblies(); };
  }, []);

  const selected = assemblies.find((item) => item.id === selectedId) || null;
  const currentAgenda = agendas.find((item) => item.id === selected?.currentAgendaId) || null;
  const currentAgendaId = currentAgenda?.id || "";
  const upcoming = useMemo(() => assemblies.filter((item) => item.status === "published").length, [assemblies]);
  const live = useMemo(() => assemblies.filter((item) => !["published", "closed"].includes(item.status)).length, [assemblies]);
  const visibleAssemblies = useMemo(() => assemblies.filter((item) =>
    tab === "upcoming" ? item.status === "published" : tab === "closed" ? item.status === "closed" : !["published", "closed"].includes(item.status)
  ), [assemblies, tab]);

  useEffect(() => {
    if (!selectedId || !actor) return;
    const { db } = getFirebaseServices();
    const stop = onSnapshot(collection(db, "assemblies", selectedId, "agenda"), (snapshot) =>
      setAgendas(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AssemblyAgenda).sort((a, b) => a.order - b.order)));
    Promise.all([
      getDoc(doc(db, "assemblies", selectedId, "eligibleVoters", actor.uid)),
      getDoc(doc(db, "assemblies", selectedId, "acknowledgements", actor.uid)),
      getDoc(doc(db, "assemblies", selectedId, "presence", actor.uid)),
    ]).then(([eligibility, ack, presence]) => {
      setEligibleForSelected(eligibility.exists() && eligibility.data().eligible === true);
      setAcknowledged(ack.exists());
      setPresent(presence.exists());
    }).catch((error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível consultar sua habilitação." }));
    if (selected?.minutesStatus === "finalized") {
      getDoc(doc(db, "assemblies", selectedId, "minutes", "official")).then((snapshot) => setMinutes(snapshot.exists() ? snapshot.data() : null));
      getDoc(doc(db, "assemblies", selectedId, "minutes", "official", "approvals", actor.uid)).then((snapshot) => setMinutesApproved(snapshot.exists())).catch(() => setMinutesApproved(false));
    }
    return stop;
  }, [selectedId, actor, selected?.minutesStatus]);

  useEffect(() => {
    if (!selectedId || !currentAgendaId || !actor) return;
    const { db } = getFirebaseServices();
    const stop = onSnapshot(collection(db, "assemblies", selectedId, "agenda", currentAgendaId, "comments"), (snapshot) =>
      setComments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AssemblyComment).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))));
    getDoc(doc(db, "assemblies", selectedId, "agenda", currentAgendaId, "votes", actor.uid)).then((vote) => setOwnVote(vote.exists() ? String(vote.data().choice) : null));
    getDoc(doc(db, "assemblies", selectedId, "agenda", currentAgendaId, "results", "summary")).then((snapshot) => setResult(snapshot.exists() ? snapshot.data() as AssemblyResult : null));
    return stop;
  }, [selectedId, currentAgendaId, actor]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage(null);
    try { await action(); setMessage({ type: "success", text: success }); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível concluir." }); }
    finally { setBusy(false); }
  }

  function changeTab(next: "upcoming" | "live" | "closed") {
    setTab(next);
    const match = assemblies.find((item) => next === "upcoming" ? item.status === "published" : next === "closed" ? item.status === "closed" : !["published", "closed"].includes(item.status));
    setSelectedId(match?.id || "");
  }
  const eligible = member?.status === "active" && member.eligibleToVote !== false && eligibleForSelected;

  return <div className="dashboard member-dashboard assembly-member">
    <MemberSidebar footer={member?.memberNumber || "Associado"} />
    <main className="dashboard-main">
      <MemberTopbar title="Assembleias eletrônicas" />
      <div className="dash-content">
        <div className="dash-welcome"><div><span className="access-badge">Participação estatutária</span><h2>Assembleias Gerais da AUMM</h2><p>Convocações, presença, discussão e voto realizados integralmente por escrito.</p></div><div className="assembly-mini-stats"><span>{upcoming} próximas</span><span>{live} em curso</span></div></div>
        {message && <div className={`form-message ${message.type}`}>{message.type === "success" && <CheckCircle2 size={16} />} {message.text}</div>}
        {selected && !eligible && <div className="form-message error">{member?.eligibleToVote === false ? "Seu cadastro não está habilitado para votar. Procure a administração para revisar sua situação." : "Você pode acompanhar esta assembleia, mas não faz parte da lista de votantes habilitados desta convocação."}</div>}
        <div className="assembly-workspace">
          <section className="panel assembly-list"><div className="panel-head"><div><h3>Convocações e histórico</h3><p>Selecione uma assembleia.</p></div></div><div className="assembly-tabs"><button className={tab === "upcoming" ? "active" : ""} onClick={() => changeTab("upcoming")}>Próximas</button><button className={tab === "live" ? "active" : ""} onClick={() => changeTab("live")}>Em andamento</button><button className={tab === "closed" ? "active" : ""} onClick={() => changeTab("closed")}>Encerradas</button></div>{visibleAssemblies.length === 0 ? <div className="empty-state">Nenhuma assembleia nesta categoria.</div> : visibleAssemblies.map((item) => <button key={item.id} className={`assembly-list-item ${item.id === selectedId ? "active" : ""}`} onClick={() => { setSelectedId(item.id); setEligibleForSelected(false); setAgendas([]); setComments([]); setAcknowledged(false); setPresent(false); setOwnVote(null); setResult(null); setMinutes(null); setMinutesApproved(false); }}><strong>{item.title}</strong><small>{formatSaoPaulo(item.firstCallAt.toDate())}</small><span className={`status ${item.status}`}>{statusNames[item.status]}</span></button>)}</section>
          <section className="panel assembly-console">
            {!selected ? <div className="empty-state">Selecione uma assembleia para ver os detalhes.</div> : <>
              <div className="panel-head"><div><span className="access-badge">{statusNames[selected.status]}</span><h2>{selected.title}</h2><p>{selected.description}</p></div></div>
              <div className="assembly-notice"><strong>Edital e ordem do dia</strong><p>{selected.orderOfDay}</p>{selected.additionalInfo && <p>{selected.additionalInfo}</p>}<small>{selected.format}</small><small>Convocação por: {selected.publishedByName || selected.createdByName || "Administração da AUMM"}{selected.publishedAt ? ` · publicada em ${formatSaoPaulo(selected.publishedAt.toDate())}` : ""}</small></div>
              <div className="assembly-call-grid"><div><span>1ª chamada</span><strong>{formatSaoPaulo(selected.firstCallAt.toDate())}</strong></div><div><span>2ª chamada</span><strong>{formatSaoPaulo(selected.secondCallAt.toDate())}</strong></div><div><span>3ª chamada</span><strong>{formatSaoPaulo(selected.thirdCallAt.toDate())}</strong></div></div>
              <div className="assembly-progress"><span className={acknowledged ? "done" : "active"}>1. Convocação</span><span className={present ? "done" : selected.presenceOpen ? "active" : ""}>2. Presença</span><span className={selected.status === "in_session" ? "active" : selected.status === "closed" ? "done" : ""}>3. Assembleia</span><span className={currentAgenda ? "active" : selected.status === "closed" ? "done" : ""}>4. Pauta</span><span className={currentAgenda?.status === "discussion" ? "active" : ["voting","voting_closed","result","closed"].includes(currentAgenda?.status || "") ? "done" : ""}>5. Manifestação</span><span className={currentAgenda?.status === "voting" ? "active" : ["voting_closed","result","closed"].includes(currentAgenda?.status || "") ? "done" : ""}>6. Votação</span><span className={currentAgenda?.status === "result" ? "active" : currentAgenda?.status === "closed" ? "done" : ""}>7. Resultado</span><span className={selected.status === "closed" ? "done" : ""}>8. Encerramento</span></div>
              <div className="assembly-quorum"><UsersRound /><span>Eleitores habilitados <strong>{selected.eligibleVoterCount}</strong></span><span>Presentes <strong>{selected.presenceCount || 0}</strong></span></div>
              <div className="assembly-actions">
                {!acknowledged && eligible && <button className="button" disabled={busy} onClick={() => actor && window.confirm("Confirmo que recebi e tomei ciência desta convocação.") && run(async () => { await acknowledgeNotice(selected, actor); setAcknowledged(true); }, "Ciência da convocação registrada.")}><CheckCircle2 size={16} /> Confirmar ciência</button>}
                {selected.presenceOpen && !present && eligible && <button className="button" disabled={busy} onClick={() => actor && window.confirm("Declaro minha presença nesta Assembleia Geral Eletrônica da AUMM.") && run(async () => { await registerPresence(selected, actor); setPresent(true); }, "Presença registrada.")}><UsersRound size={16} /> Registrar presença</button>}
              </div>
              <div className="agenda-member-list"><h3>Pautas</h3>{agendas.map((agenda) => <article key={agenda.id} className={`agenda-card ${agenda.id === selected.currentAgendaId ? "active" : ""}`}><header><span>{agenda.order}</span><div><strong>{agenda.title}</strong><small>{statusNames[agenda.status] || agenda.status}</small></div></header><p>{agenda.description}</p>{agenda.fullText && <details><summary>Ler texto integral</summary><p>{agenda.fullText}</p></details>}{agenda.assetUrl && <a className="text-link" href={agenda.assetUrl} target="_blank" rel="noreferrer">Abrir documento vinculado</a>}</article>)}</div>
              {currentAgenda && <section className="assembly-discussion"><h3><MessageSquareText size={17} /> Discussão — {currentAgenda.title}</h3>{comments.length === 0 ? <div className="empty-state">Nenhuma manifestação registrada.</div> : comments.map((item) => <div className={`comment ${item.hidden ? "hidden" : ""}`} key={item.id}><strong>{item.authorNameSnapshot}</strong><small>{item.type === "question" ? "Pergunta" : item.type === "admin_response" ? "Resposta oficial" : "Manifestação"}</small><p>{item.hidden ? "Conteúdo ocultado pela moderação, com registro preservado na auditoria." : item.content}</p></div>)}
                {currentAgenda.commentsOpen && present && <form onSubmit={(event) => { event.preventDefault(); if (actor && comment.trim()) run(() => createAssemblyComment(selected.id, currentAgenda.id, comment, commentType, actor), "Manifestação registrada.").then(() => setComment("")); }}><div className="form-grid"><label className="field"><span>Tipo</span><select value={commentType} onChange={(e) => setCommentType(e.target.value as typeof commentType)}><option value="manifestation">Manifestação</option><option value="question">Pergunta</option></select></label><label className="field full"><span>Texto</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} required /></label></div><button className="button button-sm" disabled={busy}><Send size={14} /> Publicar</button></form>}
                {currentAgenda.votingOpen && <div className="vote-box"><h3><Vote size={18} /> Registre seu voto</h3>{!present ? <p>Registre presença antes de votar.</p> : ownVote ? <div className="vote-confirmation"><CheckCircle2 /><span>Voto confirmado: <strong>{ownVote}</strong></span><small>O voto não pode ser alterado.</small></div> : <div className="vote-options">{currentAgenda.options.map((option) => <button key={option} className="button" disabled={busy || !eligible} onClick={() => actor && window.confirm(`Confirmar o voto “${option}”? Esta ação não pode ser desfeita.`) && run(async () => { await castVote(selected.id, currentAgenda.id, option, actor); setOwnVote(option); }, "Voto registrado e confirmado pelo Firestore.")}>{option}</button>)}</div>}</div>}
                {currentAgenda.resultPublished && result && <div className="result-board"><h3>Resultado oficial</h3><strong>{result.resultStatus === "approved" ? "APROVADA" : result.resultStatus === "rejected" ? "REJEITADA" : "REGISTRADA"}</strong><div>{Object.entries(result.optionCounts).map(([option, count]) => <span key={option}>{option}: <b>{count}</b></span>)}</div><small>{result.totalVotes} votos · {result.notVoted} presentes não votaram</small></div>}
              </section>}
              {selected.status === "closed" && <div className="assembly-closed"><Clock3 /><div><strong>Assembleia encerrada</strong><p>A ata e os resultados permanecem disponíveis no histórico após sua finalização.</p></div></div>}
              {minutes && <div className="assembly-minutes"><h3>Ata finalizada</h3><p>Integridade interna SHA-256:</p><code>{String(minutes.hash || "Hash não disponível")}</code><div className="assembly-actions"><button className="button button-sm button-dark" onClick={() => window.print()}>Visualizar / imprimir ata</button>{actor && selected.minutesApproverUids?.includes(actor.uid) && !minutesApproved && <button className="button button-sm" onClick={() => window.confirm("Confirmar que você leu e concorda com esta ata? Isto não é uma assinatura digital certificada.") && run(async () => { await confirmMinutesApproval(selected.id, actor); setMinutesApproved(true); }, "Confirmação interna registrada.")}>Li e concordo com a ata</button>}{minutesApproved && <span className="status active">Confirmação interna registrada</span>}</div><small>Esta confirmação não constitui assinatura digital ICP-Brasil.</small></div>}
            </>}
          </section>
        </div>
        <Link className="button button-sm button-dark" href="/associado"><ArrowLeft size={15} /> Voltar ao portal</Link>
      </div>
    </main>
  </div>;
}
