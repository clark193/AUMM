"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, limit, onSnapshot, query } from "firebase/firestore";
import { Search, ShieldCheck } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

type LogRow = { id: string; source: string; action?: string; actorUid?: string; actorName?: string; actorNameSnapshot?: string; actorEmail?: string; actorRole?: string; actorRoleSnapshot?: string; actorLevel?: number; resource?: string; resourceId?: string; assemblyId?: string; agendaId?: string; description?: string; timestamp?: { toDate(): Date } };
const actionNames: Record<string, string> = {
  ADMIN_RECORD_CREATED: "Registro criado", ADMIN_RECORD_UPDATED: "Registro editado", ADMIN_RECORD_DELETED: "Registro excluído",
  NEWS_CREATED: "Notícia criada", NEWS_UPDATED: "Notícia editada", NEWS_PUBLISHED: "Notícia publicada", NEWS_DELETED: "Notícia excluída",
  MEMBER_CREATED: "Associado cadastrado", MEMBER_STATUS_UPDATED: "Situação do associado alterada", MEMBER_VOTE_UPDATED: "Direito a voto alterado", MEMBERS_IMPORTED: "Associados importados",
  MEMBER_CARD_ISSUED: "Carteirinha emitida", MEMBER_CARD_RENEWED: "Carteirinha renovada", ADMIN_CARD_ISSUED: "Carteirinha administrativa emitida", ADMIN_CARD_RENEWED: "Carteirinha administrativa renovada",
  SPONSOR_CREATED: "Marca adicionada", SPONSOR_UPDATED: "Marca alterada", SPONSOR_DELETED: "Marca removida", SETTINGS_UPDATED: "Configurações alteradas",
  ADMIN_CREATED: "Administrador criado", ADMIN_ACCESS_UPDATED: "Acesso administrativo alterado", BOARD_UPDATED: "Diretoria atualizada",
  ASSEMBLY_CREATED: "Rascunho de assembleia criado", ASSEMBLY_PUBLISHED: "Assembleia marcada e convocação publicada", ASSEMBLY_CANCELLED: "Assembleia cancelada", ASSEMBLY_CLOSED: "Assembleia encerrada",
  AGENDA_OPENED: "Pauta aberta", AGENDA_CLOSED: "Pauta encerrada", AGENDA_DELETED: "Pauta removida", AGENDA_SKIPPED: "Pauta fechada sem realização", COMMENTS_OPENED: "Discussão aberta", COMMENTS_CLOSED: "Discussão encerrada", VOTING_OPENED: "Votação aberta", VOTING_CLOSED: "Votação encerrada", RESULT_PUBLISHED: "Resultado publicado",
  DOCUMENT_CREATED: "Documento criado", DOCUMENT_PUBLISHED: "Documento publicado", DOCUMENT_ARCHIVED: "Documento arquivado", SIGNED_DOCUMENT_LINKED: "Documento assinado vinculado",
  MEMBERSHIP_REQUEST_CREATED: "Solicitação de filiação enviada", MEMBERSHIP_REQUEST_REVIEW_STARTED: "Análise de filiação iniciada", MEMBERSHIP_DOCUMENT_VERIFIED: "Documentação conferida", MEMBERSHIP_REQUEST_APPROVED: "Filiação aprovada e associado criado", MEMBERSHIP_REQUEST_REJECTED: "Filiação rejeitada",
};
function actionName(value?: string) { return actionNames[value || ""] || (value || "Ação administrativa").toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }

export function AuditLogAdmin() {
  const [general, setGeneral] = useState<LogRow[]>([]); const [documents, setDocuments] = useState<LogRow[]>([]); const [assemblies, setAssemblies] = useState<LogRow[]>([]); const [memberships, setMemberships] = useState<LogRow[]>([]);
  const [search, setSearch] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    const db = getFirebaseServices().db; const fail = (reason: unknown) => setError(firebaseErrorMessage(reason, "Não foi possível carregar parte do histórico."));
    const a = onSnapshot(query(collection(db, "auditLogs"), limit(500)), (snapshot) => setGeneral(snapshot.docs.map((item) => ({ id: item.id, source: "admin", ...item.data() } as LogRow))), fail);
    const d = onSnapshot(query(collection(db, "documentAuditLogs"), limit(500)), (snapshot) => setDocuments(snapshot.docs.map((item) => ({ id: item.id, source: "documentos", resource: "documents", resourceId: item.data().documentId, ...item.data() } as LogRow))), fail);
    const m = onSnapshot(query(collection(db, "membershipAuditLogs"), limit(500)), (snapshot) => setMemberships(snapshot.docs.map((item) => ({ id: item.id, source: "filiações", resource: "membershipRequests", resourceId: item.data().requestId, ...item.data() } as LogRow))), fail);
    const s = onSnapshot(query(collectionGroup(db, "auditLogs"), limit(500)), (snapshot) => setAssemblies(snapshot.docs.filter((item) => item.ref.parent.parent?.parent.id === "assemblies").map((item) => ({ id: item.id, source: "assembleias", resource: "assemblies", resourceId: item.data().assemblyId, ...item.data() } as LogRow))), fail);
    return () => { a(); d(); m(); s(); };
  }, []);
  const rows = useMemo(() => [...general, ...documents, ...memberships, ...assemblies].sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0)), [general, documents, memberships, assemblies]);
  const filtered = useMemo(() => { const term = search.toLowerCase(); return rows.filter((row) => `${row.action} ${row.description} ${row.actorName} ${row.actorNameSnapshot} ${row.actorEmail} ${row.actorUid} ${row.resource} ${row.resourceId}`.toLowerCase().includes(term)); }, [rows, search]);
  return <section className="panel"><div className="panel-head"><div><h3><ShieldCheck size={18} /> Histórico completo do sistema</h3><p>Publicações, edições, cadastros, permissões, documentos e operações de assembleias, com identificação do responsável.</p></div><span className="demo-badge">{rows.length} ações</span></div><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar ação, nome, e-mail ou recurso" /></label>{error && <div className="form-message error">{error}</div>}{filtered.length === 0 ? <div className="empty-state">Nenhum registro de auditoria encontrado.</div> : <div className="table-wrap"><table><thead><tr><th>Data/hora</th><th>Ação</th><th>Quem fez</th><th>Área/registro</th></tr></thead><tbody>{filtered.map((row) => <tr key={`${row.source}-${row.id}`}><td>{row.timestamp?.toDate().toLocaleString("pt-BR") || "—"}</td><td><strong>{actionName(row.action)}</strong>{row.description && <small className="audit-description">{row.description}</small>}</td><td><strong>{row.actorName || row.actorNameSnapshot || row.actorEmail || "Administrador"}</strong><small className="audit-description">{row.actorRole || row.actorRoleSnapshot || (row.actorLevel ? `Nível ${row.actorLevel}` : row.actorUid || "—")}</small></td><td>{row.resource || row.source}{row.resourceId ? ` / ${row.resourceId}` : ""}{row.agendaId ? ` / pauta ${row.agendaId}` : ""}</td></tr>)}</tbody></table></div>}</section>;
}
