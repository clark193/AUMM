"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Download,
  FileCheck2,
  Gavel,
  MessageSquareText,
  Play,
  Plus,
  Send,
  Trash2,
  UsersRound,
  Vote,
} from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { calculateQuorum, formatSaoPaulo } from "@/lib/assemblyRules";
import {
  closeAgenda,
  closeAssembly,
  closeVotingAndCalculate,
  cancelAssembly,
  createAssemblyComment,
  createAssemblyDraft,
  finalizeMinutes,
  openAssembly,
  performCall,
  publishAgendaResult,
  publishAssembly,
  saveMinutesDraft,
  setAgendaOperation,
  waitForNextCall,
  moderateComment,
  deleteDraftAgenda,
  skipPendingAgenda,
  type AgendaDraft,
  type AssemblyActor,
} from "@/lib/assemblyService";
import type { Assembly, AssemblyAgenda, AssemblyComment, AssemblyResult } from "@/lib/assemblyTypes";
import { publishAssemblyMinutesDocument } from "@/lib/documentService";

const statusNames: Record<string, string> = {
  draft: "Rascunho", published: "Convocada", first_call: "1ª chamada",
  waiting_second_call: "Aguardando 2ª chamada", second_call: "2ª chamada",
  waiting_third_call: "Aguardando 3ª chamada", third_call: "3ª chamada",
  in_session: "Em andamento", closed: "Encerrada", cancelled: "Cancelada",
  pending: "Pendente", open: "Aberta", discussion: "Discussão",
  voting: "Votação aberta", voting_closed: "Votação encerrada", result: "Resultado", 
};

const newAgenda = (): AgendaDraft => ({
  title: "", description: "", fullText: "", assetUrl: "", links: [],
  allowComments: true, allowVoting: true, votingType: "yes_no_abstention",
  votePrivacy: "reserved", options: ["APROVO", "REJEITO", "ABSTENÇÃO"],
});

function initialDate(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function csvDownload(filename: string, rows: Record<string, unknown>[]) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [keys.map(quote).join(";"), ...rows.map((row) => keys.map((key) => quote(row[key])).join(";"))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function AssemblyAdmin() {
  const [actor, setActor] = useState<AssemblyActor | null>(null);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [agendas, setAgendas] = useState<AssemblyAgenda[]>([]);
  const [comments, setComments] = useState<AssemblyComment[]>([]);
  const [results, setResults] = useState<Record<string, AssemblyResult>>({});
  const [draftMinutes, setDraftMinutes] = useState<Record<string, unknown> | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    type: "ordinary" as "ordinary" | "extraordinary", title: "", description: "",
    orderOfDay: "", additionalInfo: "", firstCall: initialDate(16), minutesApprovers: "", agendas: [newAgenda()],
  });

  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const role = await getDoc(doc(db, "adminRoles", user.uid));
      setActor({ uid: user.uid, name: user.displayName || user.email || "Administrador", role: String(role.data()?.role || "Super Admin") });
    });
    const stopData = onSnapshot(query(collection(db, "assemblies"), orderBy("createdAt", "desc"), limit(50)), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Assembly)
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAssemblies(rows);
      setSelectedId((current) => current || rows[0]?.id || "");
    }, (error) => setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível carregar as assembleias.") }));
    return () => { stopAuth(); stopData(); };
  }, []);

  const selected = assemblies.find((item) => item.id === selectedId) || null;
  const currentAgenda = agendas.find((item) => item.id === selected?.currentAgendaId) || null;
  const currentAgendaId = currentAgenda?.id || "";

  useEffect(() => {
    if (!selectedId) return;
    const { db } = getFirebaseServices();
    return onSnapshot(collection(db, "assemblies", selectedId, "agenda"), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AssemblyAgenda).sort((a, b) => a.order - b.order);
      setAgendas(rows);
      rows.forEach(async (agenda) => {
        const result = await getDoc(doc(db, "assemblies", selectedId, "agenda", agenda.id, "results", "summary"));
        if (result.exists()) setResults((current) => ({ ...current, [agenda.id]: result.data() as AssemblyResult }));
      });
    });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !currentAgendaId) return;
    const { db } = getFirebaseServices();
    return onSnapshot(collection(db, "assemblies", selectedId, "agenda", currentAgendaId, "comments"), (snapshot) =>
      setComments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AssemblyComment).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))));
  }, [selectedId, currentAgendaId]);

  const counts = useMemo(() => ({
    draft: assemblies.filter((item) => item.status === "draft").length,
    published: assemblies.filter((item) => item.status === "published").length,
    active: assemblies.filter((item) => !["draft", "published", "closed", "cancelled"].includes(item.status)).length,
    closed: assemblies.filter((item) => item.status === "closed").length,
    cancelled: assemblies.filter((item) => item.status === "cancelled").length,
  }), [assemblies]);

  function report(error: unknown, success?: string) {
    setMessage(error ? { type: "error", text: firebaseErrorMessage(error) } : { type: "success", text: success || "Operação concluída." });
  }

  async function run(label: string, action: () => Promise<unknown>, success: string) {
    if (!window.confirm("Confirmar esta operação administrativa? Ela será registrada na auditoria.")) return;
    setBusy(label); setMessage(null);
    try { await action(); report(null, success); } catch (error) { report(error); } finally { setBusy(""); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!actor) return;
    const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value || "draft";
    const first = new Date(form.firstCall);
    const second = new Date(first.getTime() + 30 * 60_000);
    const third = new Date(first.getTime() + 60 * 60_000);
    await run(intent === "schedule" ? "schedule" : "create", async () => {
      const id = await createAssemblyDraft({ ...form, minutesApproverUids: form.minutesApprovers.split(",").map((item) => item.trim()).filter(Boolean), firstCallAt: first, secondCallAt: second, thirdCallAt: third }, actor);
      if (intent === "schedule") {
        const created = await getDoc(doc(getFirebaseServices().db, "assemblies", id));
        await publishAssembly({ id, ...created.data() } as Assembly, actor);
      }
      setSelectedId(id); setForm({ type: "ordinary", title: "", description: "", orderOfDay: "", additionalInfo: "", firstCall: initialDate(16), minutesApprovers: "", agendas: [newAgenda()] });
    }, intent === "schedule" ? "Assembleia marcada e convocação publicada para os associados." : "Rascunho da assembleia criado.");
  }

  function updateAgenda(index: number, field: keyof AgendaDraft, value: unknown) {
    setForm((current) => ({ ...current, agendas: current.agendas.map((agenda, itemIndex) => itemIndex === index ? { ...agenda, [field]: value } : agenda) }));
  }

  function removeFormAgenda(index: number) {
    setForm((current) => ({ ...current, agendas: current.agendas.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function exportCollection(path: string, filename: string) {
    if (!selected) return;
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, "assemblies", selected.id, path));
    csvDownload(filename, snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }

  async function exportAcknowledgementReport() {
    if (!selected) return;
    const { db } = getFirebaseServices();
    const [eligibleRows, acknowledgements] = await Promise.all([
      getDocs(collection(db, "assemblies", selected.id, "eligibleVoters")),
      getDocs(collection(db, "assemblies", selected.id, "acknowledgements")),
    ]);
    const acknowledged = new Map(acknowledgements.docs.map((item) => [item.id, item.data()]));
    csvDownload(`ciencia-completa-${selected.id}.csv`, eligibleRows.docs.map((item) => ({
      uid: item.id, nome: item.data().name, numero: item.data().memberNumber,
      confirmou: acknowledged.has(item.id) ? "SIM" : "NÃO",
      confirmadoEm: acknowledged.get(item.id)?.acknowledgedAt || "",
    })));
  }

  async function exportVotes() {
    if (!selected) return;
    const { db } = getFirebaseServices();
    const rows = (await Promise.all(agendas.map(async (agenda) => {
      const votes = await getDocs(collection(db, "assemblies", selected.id, "agenda", agenda.id, "votes"));
      return votes.docs.map((item) => ({ pauta: agenda.title, uid: item.id, escolha: item.data().choice, registradoEm: item.data().createdAt }));
    }))).flat();
    csvDownload(`votos-auditoria-${selected.id}.csv`, rows);
  }

  async function exportAudit() {
    if (!selected) return;
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, "assemblies", selected.id, "auditLogs"));
    const blob = new Blob([JSON.stringify(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `auditoria-${selected.id}.json`; link.click(); URL.revokeObjectURL(link.href);
  }

  return (
    <div className="assembly-admin">
      <div className="assembly-stats">
        <span><strong>{counts.draft}</strong> rascunhos</span><span><strong>{counts.published}</strong> convocadas</span><span><strong>{counts.active}</strong> em curso</span><span><strong>{counts.closed}</strong> encerradas</span><span><strong>{counts.cancelled}</strong> canceladas</span>
      </div>
      {message && <div className={`form-message ${message.type}`}>{message.type === "success" && <CheckCircle2 size={16} />} {message.text}</div>}

      <section className="panel assembly-create">
        <div className="panel-head"><div><h3><Plus size={18} /> Nova assembleia</h3><p>O edital precisa ser publicado com no mínimo 15 dias de antecedência.</p></div></div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field"><span>Tipo</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}><option value="ordinary">Ordinária</option><option value="extraordinary">Extraordinária</option></select></label>
            <label className="field"><span>Data e hora da 1ª chamada</span><input type="datetime-local" value={form.firstCall} onChange={(e) => setForm({ ...form, firstCall: e.target.value })} required /></label>
            <label className="field full"><span>Título</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={180} /></label>
            <label className="field full"><span>Descrição da convocação</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required maxLength={4000} /></label>
            <label className="field full"><span>Ordem do dia</span><textarea value={form.orderOfDay} onChange={(e) => setForm({ ...form, orderOfDay: e.target.value })} required maxLength={4000} /></label>
            <label className="field full"><span>Informações adicionais</span><textarea value={form.additionalInfo} onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })} maxLength={4000} /></label>
            <label className="field full"><span>UIDs responsáveis por conferir a ata (separados por vírgula)</span><input value={form.minutesApprovers} onChange={(e) => setForm({ ...form, minutesApprovers: e.target.value })} placeholder="UID do Presidente, UID do Secretário" /><small>Esses usuários poderão registrar confirmação interna após a ata ser finalizada.</small></label>
          </div>
          <div className="agenda-builder">
            {form.agendas.map((agenda, index) => <fieldset key={index} className="agenda-editor"><legend>Pauta {index + 1}</legend>{form.agendas.length > 1 && <button className="agenda-remove-draft" type="button" onClick={() => removeFormAgenda(index)}><Trash2 /> Remover pauta</button>}
              <label className="field"><span>Título</span><input value={agenda.title} onChange={(e) => updateAgenda(index, "title", e.target.value)} required /></label>
              <label className="field"><span>Resumo</span><textarea value={agenda.description} onChange={(e) => updateAgenda(index, "description", e.target.value)} required /></label>
              <label className="field"><span>Texto integral</span><textarea value={agenda.fullText} onChange={(e) => updateAgenda(index, "fullText", e.target.value)} required /></label>
              <label className="field"><span>Link de documento (opcional)</span><input type="url" value={agenda.assetUrl} onChange={(e) => updateAgenda(index, "assetUrl", e.target.value)} /></label>
              <div className="assembly-switches"><label><input type="checkbox" checked={agenda.allowComments} onChange={(e) => updateAgenda(index, "allowComments", e.target.checked)} /> Discussão escrita</label><label><input type="checkbox" checked={agenda.allowVoting} onChange={(e) => updateAgenda(index, "allowVoting", e.target.checked)} /> Votação</label><label><input type="checkbox" checked={agenda.votePrivacy === "reserved"} onChange={(e) => updateAgenda(index, "votePrivacy", e.target.checked ? "reserved" : "nominal")} /> Voto reservado</label></div>
            </fieldset>)}
          </div>
          <div className="assembly-actions"><button type="button" className="button button-sm button-dark" onClick={() => setForm((current) => ({ ...current, agendas: [...current.agendas, newAgenda()] }))}><Plus size={15} /> Adicionar pauta</button><button className="button button-dark" name="intent" value="draft" disabled={!!busy}><FileCheck2 size={16} /> Salvar rascunho</button><button className="button" name="intent" value="schedule" disabled={!!busy}><CalendarClock size={16} /> Salvar e marcar assembleia</button></div>
        </form>
      </section>

      <div className="assembly-workspace">
        <section className="panel assembly-list"><div className="panel-head"><div><h3>Assembleias</h3><p>Selecione para operar ou consultar.</p></div></div>
          {assemblies.length === 0 ? <div className="empty-state">Nenhuma assembleia criada.</div> : assemblies.map((item) => <button key={item.id} className={`assembly-list-item ${item.id === selectedId ? "active" : ""}`} onClick={() => { setSelectedId(item.id); setAgendas([]); setComments([]); setResults({}); setDraftMinutes(null); }}><strong>{item.title}</strong><small>{formatSaoPaulo(item.firstCallAt.toDate())}</small><span className={`status ${item.status}`}>{statusNames[item.status]}</span></button>)}
        </section>

        <section className="panel assembly-console">
          {!selected ? <div className="empty-state">Selecione uma assembleia.</div> : <>
            <div className="panel-head"><div><span className="access-badge">{statusNames[selected.status]}</span><h2>{selected.title}</h2><p>{selected.description}</p></div></div>
            <div className="assembly-call-grid"><div><span>1ª chamada</span><strong>{formatSaoPaulo(selected.firstCallAt.toDate())}</strong></div><div><span>2ª chamada</span><strong>{formatSaoPaulo(selected.secondCallAt.toDate())}</strong></div><div><span>3ª chamada</span><strong>{formatSaoPaulo(selected.thirdCallAt.toDate())}</strong></div></div>
            <div className="assembly-quorum"><UsersRound /><span>Eleitores <strong>{selected.eligibleVoterCount}</strong></span><span>Presentes <strong>{selected.presenceCount || 0}</strong></span><span>Quórum desta chamada <strong>{selected.currentCall ? calculateQuorum(selected.eligibleVoterCount, selected.currentCall) : "—"}</strong></span></div>
            <div className="assembly-actions">
              {selected.status === "draft" && actor && <button className="button" disabled={!!busy} onClick={() => run("publish", () => publishAssembly(selected, actor), "Edital publicado e colégio eleitoral congelado.")}><Send size={16} /> Publicar convocação</button>}
              {["draft", "published"].includes(selected.status) && actor && <button className="button button-dark" onClick={() => { const reason = window.prompt("Justificativa do cancelamento (mínimo 10 caracteres):"); if (reason) run("cancel", () => cancelAssembly(selected, reason, actor), "Assembleia cancelada com justificativa registrada."); }}><Archive size={16} /> Cancelar</button>}
              {selected.status === "published" && actor && <button className="button" onClick={() => run("call1", () => performCall(selected, 1, actor), "Primeira chamada registrada.")}><Gavel size={16} /> Realizar 1ª chamada</button>}
              {selected.status === "first_call" && actor && <button className="button" onClick={() => run("call1", () => performCall(selected, 1, actor), "Presenças e quórum da primeira chamada atualizados.")}><UsersRound size={16} /> Atualizar quórum</button>}
              {selected.status === "waiting_second_call" && actor && <button className="button" onClick={() => run("call2", () => performCall(selected, 2, actor), "Segunda chamada registrada.")}><Gavel size={16} /> Realizar 2ª chamada</button>}
              {selected.status === "second_call" && actor && <button className="button" onClick={() => run("call2", () => performCall(selected, 2, actor), "Presenças e quórum da segunda chamada atualizados.")}><UsersRound size={16} /> Atualizar quórum</button>}
              {selected.status === "waiting_third_call" && actor && <button className="button" onClick={() => run("call3", () => performCall(selected, 3, actor), "Terceira chamada registrada.")}><Gavel size={16} /> Realizar 3ª chamada</button>}
              {selected.status === "third_call" && actor && <button className="button" onClick={() => run("call3", () => performCall(selected, 3, actor), "Presenças e quórum da terceira chamada atualizados.")}><UsersRound size={16} /> Atualizar quórum</button>}
              {["first_call", "second_call"].includes(selected.status) && !selected.quorumMet && actor && <button className="button button-dark" onClick={() => run("wait", () => waitForNextCall(selected, actor), "Assembleia avançou para a próxima chamada.")}><CalendarClock size={16} /> Aguardar próxima chamada</button>}
              {["first_call", "second_call", "third_call"].includes(selected.status) && selected.quorumMet && actor && <button className="button" onClick={() => run("open", () => openAssembly(selected, actor), "Assembleia instalada.")}><Play size={16} /> Instalar assembleia</button>}
              {selected.status === "in_session" && actor && <button className="button button-dark" onClick={() => run("close", () => closeAssembly(selected.id, actor), "Assembleia encerrada.")}><Archive size={16} /> Encerrar assembleia</button>}
            </div>

            <div className="agenda-admin-list"><h3>Pautas</h3>{agendas.map((agenda) => <article key={agenda.id} className={`agenda-card ${agenda.id === selected.currentAgendaId ? "active" : ""}`}><header><span>{agenda.order}</span><div><strong>{agenda.title}</strong><small>{statusNames[agenda.status]}</small></div></header><p>{agenda.description}</p>
              {selected.status === "draft" && agenda.status === "pending" && actor && <div className="assembly-actions"><button className="table-action-danger" type="button" onClick={() => run("agenda-delete", () => deleteDraftAgenda(selected.id, agenda.id, actor), "Pauta removida do rascunho.")}><Trash2 size={14} /> Remover pauta</button></div>}
              {["published", "in_session"].includes(selected.status) && agenda.status === "pending" && actor && <div className="assembly-actions"><button className="button button-sm button-dark" type="button" onClick={() => { const reason = window.prompt("Por que esta pauta não será realizada?"); if (reason) run("agenda-skip", () => skipPendingAgenda(selected.id, agenda.id, reason, actor), "Pauta fechada sem realização e justificativa registrada."); }}>Fechar sem realizar</button></div>}
              {selected.status === "in_session" && actor && <div className="assembly-actions">
                {agenda.status === "pending" && !selected.currentAgendaId && <button className="button button-sm" onClick={() => run("agenda", () => setAgendaOperation(selected.id, agenda, "open", actor), "Pauta aberta.")}><Play size={14} /> Abrir pauta</button>}
                {agenda.allowComments && agenda.status === "open" && <button className="button button-sm" onClick={() => run("comments", () => setAgendaOperation(selected.id, agenda, "open_comments", actor), "Discussão aberta.")}><MessageSquareText size={14} /> Abrir discussão</button>}
                {agenda.status === "discussion" && <button className="button button-sm button-dark" onClick={() => run("comments", () => setAgendaOperation(selected.id, agenda, "close_comments", actor), "Discussão encerrada.")}>Encerrar discussão</button>}
                {agenda.allowVoting && ["open", "discussion"].includes(agenda.status) && <button className="button button-sm" onClick={() => run("vote", () => setAgendaOperation(selected.id, agenda, "open_voting", actor, 30), "Votação aberta por 30 minutos.")}><Vote size={14} /> Abrir votação</button>}
                {agenda.status === "voting" && <button className="button button-sm button-dark" onClick={() => run("vote-close", () => closeVotingAndCalculate(selected, agenda, actor), "Votação encerrada e apurada.")}>Encerrar e apurar</button>}
                {agenda.status === "voting_closed" && <button className="button button-sm" onClick={() => run("result", () => publishAgendaResult(selected.id, agenda.id, actor), "Resultado publicado.")}>Publicar resultado</button>}
                {["result", "voting_closed", "open"].includes(agenda.status) && <button className="button button-sm button-dark" onClick={() => run("agenda-close", () => closeAgenda(selected.id, agenda.id, actor), "Pauta encerrada.")}>Encerrar pauta</button>}
              </div>}
              {results[agenda.id] && <div className="result-summary"><strong>{results[agenda.id].resultStatus === "approved" ? "APROVADA" : "REJEITADA"}</strong><span>{results[agenda.id].totalVotes} votos · {results[agenda.id].notVoted} não votaram</span></div>}
            </article>)}</div>

            {currentAgenda && <section className="assembly-discussion"><h3>Discussão escrita — {currentAgenda.title}</h3>{comments.length === 0 ? <div className="empty-state">Nenhuma manifestação.</div> : comments.map((comment) => <div className={`comment ${comment.hidden ? "hidden" : ""}`} key={comment.id}><strong>{comment.authorNameSnapshot}</strong><small>{comment.type}</small><p>{comment.hidden ? `Ocultada: ${comment.moderationReason || "moderação administrativa"}` : comment.content}</p>{!comment.hidden && actor && <button type="button" className="table-action-danger" onClick={() => { const reason = window.prompt("Motivo obrigatório da moderação:"); if (reason) run("moderate", () => moderateComment(selected.id, currentAgenda.id, comment.id, reason, actor), "Manifestação ocultada; o original foi preservado."); }}>Ocultar com motivo</button>}</div>)}
              <form onSubmit={(event) => { event.preventDefault(); if (actor && adminComment.trim()) run("reply", () => createAssemblyComment(selected.id, currentAgenda.id, adminComment, "admin_response", actor), "Resposta publicada.").then(() => setAdminComment("")); }}><textarea value={adminComment} onChange={(event) => setAdminComment(event.target.value)} placeholder="Resposta oficial por escrito" maxLength={2000} /><button className="button button-sm"><Send size={14} /> Responder</button></form>
            </section>}

            <div className="assembly-exports"><h3>Comprovação e exportações</h3><div className="assembly-actions"><button className="button button-sm button-dark" onClick={exportAcknowledgementReport}><Download size={14} /> Ciência completa CSV</button><button className="button button-sm button-dark" onClick={() => exportCollection("presence", `presencas-${selected.id}.csv`)}><Download size={14} /> Presença CSV</button><button className="button button-sm button-dark" onClick={exportVotes}><Download size={14} /> Votos CSV</button><button className="button button-sm button-dark" onClick={exportAudit}><Download size={14} /> Auditoria JSON</button>
              {selected.status === "closed" && actor && <button className="button button-sm" onClick={() => run("minutes", async () => { const value = await saveMinutesDraft(selected, agendas, actor); setDraftMinutes(value as Record<string, unknown>); }, "Minuta gerada.")}><FileCheck2 size={14} /> Gerar minuta</button>}
              {draftMinutes && actor && <button className="button button-sm" onClick={() => run("finalize", () => finalizeMinutes(selected.id, draftMinutes, actor), "Ata finalizada e protegida por hash SHA-256.")}>Finalizar ata</button>}
              {selected.minutesStatus === "finalized" && !selected.publishedDocumentId && actor && <button className="button button-sm" onClick={() => { const number=window.prompt("Número da ata (ex.: 04/2026):",""); if(!number)return; const visibility=(window.prompt("Visibilidade: public, members ou admin","public")||"public") as "public"|"members"|"admin"; if(["public","members","admin"].includes(visibility)) run("publish-document",()=>publishAssemblyMinutesDocument(selected,agendas,visibility,number,actor),"Ata publicada no Portal de Documentos."); }}>Publicar ata no Portal</button>}
              {selected.publishedDocumentId && <span className="status active">Ata publicada em Documentos</span>}
              {draftMinutes && <button className="button button-sm button-dark" onClick={() => window.print()}>Imprimir / PDF</button>}
            </div></div>
            {draftMinutes && <pre className="minutes-preview">{JSON.stringify(draftMinutes, null, 2)}</pre>}
          </>}
        </section>
      </div>
    </div>
  );
}
