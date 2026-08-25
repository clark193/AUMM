"use client";

import { deleteApp, FirebaseError, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser, inMemoryPersistence, initializeAuth, signOut, type Auth, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from "firebase/firestore";
import { BadgeCheck, CheckCircle2, Copy, Eye, EyeOff, FileCheck2, Search, ShieldAlert, UserCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { firebaseConfig, firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { type MembershipCategory, type MembershipStatus } from "@/lib/application";
import { maskCpf } from "@/lib/membershipValidation";
import { withBasePath } from "@/lib/paths";

type MembershipRow = {
  id: string; requestId?: string; ownerUid?: string; fullName?: string; birthDate?: Timestamp; cpf?: string; email?: string;
  whatsapp?: string; category?: MembershipCategory; statuteVersion?: string; statuteAcceptedAt?: Timestamp; status?: MembershipStatus;
  statutoryDocumentVerified?: boolean; statutoryDocumentVerifiedAt?: Timestamp; statutoryDocumentVerifiedBy?: string;
  submittedAt?: Timestamp; memberNumber?: string; meetingReference?: string; minutesReference?: string; decisionNotes?: string;
};
type MembershipAudit = { id: string; requestId?: string; action?: string; actorNameSnapshot?: string; timestamp?: Timestamp };
type Credentials = { email: string; password: string; memberNumber: string };
type Filter = "all" | MembershipStatus;

const statusNames: Record<string, string> = { pending: "Aguardando", under_review: "Em análise", approved: "Aprovada", rejected: "Rejeitada" };
const filters: [Filter, string][] = [["all", "Todas"], ["pending", "Aguardando"], ["under_review", "Em análise"], ["approved", "Aprovadas"], ["rejected", "Rejeitadas"]];
function formatDate(value?: Timestamp, onlyDate = false) { return value?.toDate().toLocaleString("pt-BR", onlyDate ? { dateStyle: "short", timeZone: "UTC" } : { dateStyle: "short", timeStyle: "short" }) || "—"; }
function searchable(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function fullCpf(value?: string) { return value ? maskCpf(value) : "—"; }
function partialCpf(value?: string) { const digits = value?.replace(/\D/g, "") || ""; return digits.length === 11 ? `***.***.***-${digits.slice(-2)}` : "—"; }
function temporaryPassword() { const bytes = crypto.getRandomValues(new Uint8Array(9)); return `Aumm!${Array.from(bytes, (byte) => (byte % 36).toString(36)).join("")}7`; }
function friendlyError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use") return "Este e-mail já possui acesso. Pesquise a pessoa na lista de associados antes de aprovar.";
    if (error.code === "permission-denied") return "Sua conta não possui a permissão canManageMembershipRequests.";
  }
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}
async function uniqueMemberNumber() {
  const { db } = getFirebaseServices();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const number = `AUMM-${new Date().getFullYear()}-${String(random).padStart(6, "0")}`;
    if (!(await getDoc(doc(db, "publicMembers", number))).exists()) return number;
  }
  throw new Error("Não foi possível gerar um número único. Tente novamente.");
}

export function ApplicationReviewAdmin() {
  const [requests, setRequests] = useState<MembershipRow[]>([]);
  const [audits, setAudits] = useState<MembershipAudit[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [actorName, setActorName] = useState("Administrador autenticado");
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingReference, setMeetingReference] = useState("");
  const [minutesReference, setMinutesReference] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { auth, db } = getFirebaseServices();
    const stops: (() => void)[] = [];
    const stopAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const [role, profile] = await Promise.all([getDoc(doc(db, "adminRoles", user.uid)), getDoc(doc(db, "users", user.uid))]);
      setActorName(String(profile.data()?.fullName || role.data()?.fullName || user.displayName || user.email || role.data()?.role || "Administrador autenticado"));
      stops.push(onSnapshot(query(collection(db, "membershipRequests"), orderBy("submittedAt", "desc")), (snapshot) => setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MembershipRow))), (error) => setMessage({ type: "error", text: friendlyError(error) })));
      stops.push(onSnapshot(query(collection(db, "membershipAuditLogs"), orderBy("timestamp", "desc"), limit(300)), (snapshot) => setAudits(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MembershipAudit))), () => setAudits([])));
    });
    return () => { stopAuth(); stops.forEach((stop) => stop()); };
  }, []);

  const shown = useMemo(() => {
    const term = searchable(search.trim());
    return requests.filter((item) => (filter === "all" || (item.status || "pending") === filter) && (!term || searchable([item.fullName, item.email, item.whatsapp, item.category, item.memberNumber].filter(Boolean).join(" ")).includes(term)));
  }, [requests, filter, search]);
  const selected = requests.find((item) => item.id === selectedId);
  const pendingCount = requests.filter((item) => ["pending", "under_review"].includes(item.status || "pending")).length;
  const verificationAudit = selected ? audits.find((item) => item.requestId === selected.id && item.action === "MEMBERSHIP_DOCUMENT_VERIFIED") : undefined;

  function select(item: MembershipRow) { setSelectedId(item.id); setMessage(null); setCredentials(null); setDecisionDate(new Date().toISOString().slice(0, 10)); setMeetingReference(item.meetingReference || ""); setMinutesReference(item.minutesReference || ""); setDecisionNotes(item.decisionNotes || ""); }
  async function recordAction(item: MembershipRow, action: "review" | "verify" | "reject") {
    if (action === "verify" && !window.confirm("Confirma que a documentação estatutária necessária foi apresentada e conferida fora deste sistema?")) return;
    if (action === "reject" && !window.confirm(`Rejeitar a solicitação de ${item.fullName || "esta pessoa"}?`)) return;
    setBusy(true); setMessage(null);
    try {
      const { auth, db } = getFirebaseServices(); const actor = auth.currentUser; if (!actor) throw new Error("Sessão administrativa expirada.");
      const batch = writeBatch(db); const changes: Record<string, unknown> = {};
      let auditAction = "MEMBERSHIP_REQUEST_REVIEW_STARTED";
      if (action === "review") Object.assign(changes, { status: "under_review", reviewedAt: serverTimestamp(), reviewedBy: actor.uid });
      if (action === "verify") { Object.assign(changes, { statutoryDocumentVerified: true, statutoryDocumentVerifiedAt: serverTimestamp(), statutoryDocumentVerifiedBy: actor.uid }); auditAction = "MEMBERSHIP_DOCUMENT_VERIFIED"; }
      if (action === "reject") { Object.assign(changes, { status: "rejected", decisionAt: serverTimestamp(), decisionDate: Timestamp.fromDate(new Date(`${decisionDate}T12:00:00-03:00`)), decisionBy: actor.uid, decisionNotes: decisionNotes.trim(), meetingReference: meetingReference.trim(), minutesReference: minutesReference.trim() }); auditAction = "MEMBERSHIP_REQUEST_REJECTED"; }
      batch.update(doc(db, "membershipRequests", item.id), changes);
      if (action !== "verify") batch.update(doc(db, "membershipRequestOwners", item.ownerUid || "missing"), { status: action === "review" ? "under_review" : "rejected", updatedAt: serverTimestamp() });
      batch.set(doc(db, "membershipAuditLogs", crypto.randomUUID()), { action: auditAction, requestId: item.id, actorUid: actor.uid, actorNameSnapshot: actorName, timestamp: serverTimestamp() });
      await batch.commit(); setMessage({ type: "success", text: action === "verify" ? "Documentação marcada como conferida fora do sistema." : action === "review" ? "Solicitação colocada em análise." : "Solicitação rejeitada e registrada." });
    } catch (error) { setMessage({ type: "error", text: friendlyError(error) }); }
    finally { setBusy(false); }
  }

  async function approve(item: MembershipRow) {
    if (item.category === "Motoboy" && !item.statutoryDocumentVerified) { setMessage({ type: "error", text: "Pedidos de Motoboy só podem ser aprovados depois da conferência documental fora do sistema." }); return; }
    if (!window.confirm(`Aprovar a filiação de ${item.fullName || "esta pessoa"}?`)) return;
    setBusy(true); setMessage(null); setCredentials(null);
    let secondaryApp: ReturnType<typeof initializeApp> | null = null; let secondaryAuth: Auth | null = null; let createdUser: User | null = null;
    try {
      const { auth, db } = getFirebaseServices(); const actor = auth.currentUser; if (!actor) throw new Error("Sessão administrativa expirada.");
      if (!item.email || !item.ownerUid) throw new Error("A solicitação está incompleta.");
      const email = item.email.trim().toLowerCase();
      const duplicates = await getDocs(query(collection(db, "associados"), where("email", "==", email), limit(1)));
      if (!duplicates.empty) throw new Error("Este e-mail já pertence a um associado. Pesquise o cadastro existente.");
      const password = temporaryPassword();
      secondaryApp = initializeApp(firebaseConfig, `membership-approval-${crypto.randomUUID()}`);
      secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
      createdUser = (await createUserWithEmailAndPassword(secondaryAuth, email, password)).user;
      const memberNumber = await uniqueMemberNumber(); const verificationToken = crypto.randomUUID().replaceAll("-", "");
      const batch = writeBatch(db);
      batch.set(doc(db, "associados", createdUser.uid), { uid: createdUser.uid, membershipRequestId: item.id, memberNumber, fullName: item.fullName?.trim() || "Associado", email, phone: item.whatsapp || "", category: item.category, role: "Associado", status: "active", authorized: true, eligibleToVote: true, source: "membership_request", approvedBy: actor.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      batch.set(doc(db, "publicMembers", memberNumber), { uid: createdUser.uid, memberNumber, fullName: item.fullName?.trim() || "Associado", role: "Associado", status: "active", verificationToken, updatedAt: serverTimestamp() });
      batch.update(doc(db, "membershipRequests", item.id), { status: "approved", memberUid: createdUser.uid, memberNumber, decisionAt: serverTimestamp(), decisionDate: Timestamp.fromDate(new Date(`${decisionDate}T12:00:00-03:00`)), decisionBy: actor.uid, decisionNotes: decisionNotes.trim(), meetingReference: meetingReference.trim(), minutesReference: minutesReference.trim() });
      batch.update(doc(db, "membershipRequestOwners", item.ownerUid), { status: "approved", memberNumber, updatedAt: serverTimestamp() });
      batch.set(doc(db, "membershipAuditLogs", crypto.randomUUID()), { action: "MEMBERSHIP_REQUEST_APPROVED", requestId: item.id, actorUid: actor.uid, actorNameSnapshot: actorName, timestamp: serverTimestamp() });
      await batch.commit(); setCredentials({ email, password, memberNumber }); setMessage({ type: "success", text: `${item.fullName || "Associado"} foi aprovado. Copie os dados de primeiro acesso e envie por canal privado.` });
    } catch (error) { if (createdUser) try { await deleteUser(createdUser); } catch {} setMessage({ type: "error", text: friendlyError(error) }); }
    finally { if (secondaryApp) { try { if (secondaryAuth) await signOut(secondaryAuth); } catch {} await deleteApp(secondaryApp); } setBusy(false); }
  }

  async function copyCredentials() { if (!credentials) return; await navigator.clipboard.writeText(`Acesso AUMM\nE-mail: ${credentials.email}\nSenha temporária: ${credentials.password}\nNúmero: ${credentials.memberNumber}\nPortal: ${window.location.origin}${withBasePath("/associado/login")}`); setMessage({ type: "success", text: "Dados de acesso copiados." }); }

  return <div className="membership-admin">
    <section className="panel"><div className="panel-head"><div><h3><ShieldAlert size={18} /> Solicitações de Filiação</h3><p>Dados pessoais protegidos. Nenhuma cópia de CNH é armazenada.</p></div><span className="demo-badge">{pendingCount} aguardando análise</span></div>
      <div className="membership-admin-filters">{filters.map(([value, label]) => <button type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>
      <label className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome, e-mail, WhatsApp ou número" /></label>
      {message && <div className={`form-message ${message.type}`}>{message.type === "success" && <CheckCircle2 size={16} />} {message.text}</div>}
      {credentials && <div className="credentials-box"><BadgeCheck /><div><strong>Acesso liberado · {credentials.memberNumber}</strong><span>{credentials.email}</span><span>Senha temporária: {credentials.password}</span></div><button type="button" className="button button-sm button-dark" onClick={copyCredentials}><Copy size={15} /> Copiar acesso</button></div>}
      <div className="membership-request-grid">{shown.length === 0 ? <div className="empty-state">Nenhuma solicitação encontrada.</div> : shown.map((item) => <article className="membership-request-card" key={item.id}><div><span className={`status ${item.status || "pending"}`}>{statusNames[item.status || "pending"]}</span><small>Solicitado em {formatDate(item.submittedAt, true)}</small></div><h3>{item.fullName || "Sem nome"}</h3><p>{item.category || "Sem categoria"}</p><button className="button button-sm" type="button" onClick={() => select(item)}>Analisar</button></article>)}</div>
    </section>
    {selected && <section className="panel membership-analysis"><div className="panel-head"><div><span className="eyebrow">Análise da solicitação</span><h2>{selected.fullName}</h2></div><button type="button" className="button button-sm button-dark" onClick={() => setSelectedId(null)}>Fechar</button></div>
      <dl className="membership-details"><div><dt>Nome completo</dt><dd>{selected.fullName || "—"}</dd></div><div><dt>Data de nascimento</dt><dd>{formatDate(selected.birthDate, true)}</dd></div><div><dt>CPF</dt><dd>{revealed.has(selected.id) ? fullCpf(selected.cpf) : partialCpf(selected.cpf)} <button type="button" onClick={() => setRevealed((current) => { const next = new Set(current); if (next.has(selected.id)) next.delete(selected.id); else next.add(selected.id); return next; })}>{revealed.has(selected.id) ? <EyeOff /> : <Eye />} {revealed.has(selected.id) ? "Ocultar" : "Ver completo"}</button></dd></div><div><dt>WhatsApp</dt><dd>{selected.whatsapp || "—"}</dd></div><div><dt>E-mail</dt><dd>{selected.email || "—"}</dd></div><div><dt>Categoria</dt><dd>{selected.category || "—"}</dd></div><div><dt>Data do pedido</dt><dd>{formatDate(selected.submittedAt)}</dd></div><div><dt>Aceite do Estatuto</dt><dd>Estatuto Social — versão {selected.statuteVersion || "2021"}<small>Aceito em {formatDate(selected.statuteAcceptedAt)}</small></dd></div></dl>
      {selected.category === "Motoboy" && <div className={`statutory-check ${selected.statutoryDocumentVerified ? "verified" : ""}`}><FileCheck2 /><div><h3>Documentação estatutária</h3>{selected.statutoryDocumentVerified ? <><strong>Documentação conferida fora do sistema</strong><p>Conferida por {verificationAudit?.actorNameSnapshot || "administrador autorizado"} em {formatDate(selected.statutoryDocumentVerifiedAt)}.</p></> : <><strong>Pendente de conferência</strong><p>A documentação exigida pelo Estatuto deve ser apresentada e conferida fora do sistema.</p></>}<small>A documentação exigida pelo Estatuto foi apresentada/conferida fora do sistema. Nenhuma cópia do documento é armazenada neste portal.</small></div>{!selected.statutoryDocumentVerified && <button className="button button-sm" type="button" onClick={() => recordAction(selected, "verify")} disabled={busy}>Marcar como conferida</button>}</div>}
      <div className="membership-decision"><h3>Decisão e registro institucional</h3><div className="form-grid"><label className="field"><span>Data da decisão</span><input type="date" value={decisionDate} onChange={(event) => setDecisionDate(event.target.value)} /></label><label className="field"><span>Reunião do Conselho Diretor</span><input value={meetingReference} onChange={(event) => setMeetingReference(event.target.value)} placeholder="Reunião de 05/09/2026" /></label><label className="field"><span>Número/identificação da ata</span><input value={minutesReference} onChange={(event) => setMinutesReference(event.target.value)} placeholder="Ata nº 06/2026" /></label><label className="field full"><span>Observação administrativa</span><textarea value={decisionNotes} onChange={(event) => setDecisionNotes(event.target.value)} /></label></div><div className="approval-actions">{(selected.status || "pending") === "pending" && <button className="button button-dark" type="button" onClick={() => recordAction(selected, "review")} disabled={busy}><ShieldAlert size={15} /> Colocar em análise</button>}{!['approved','rejected'].includes(selected.status || "pending") && <><button className="button" type="button" onClick={() => approve(selected)} disabled={busy || (selected.category === "Motoboy" && !selected.statutoryDocumentVerified)}><UserCheck size={15} /> Aprovar filiação</button><button className="table-action-danger" type="button" onClick={() => recordAction(selected, "reject")} disabled={busy}><XCircle size={15} /> Rejeitar solicitação</button></>}</div></div>
    </section>}
  </div>;
}
