"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { Search, ShieldCheck } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";

type LogRow = { id: string; action?: string; actorUid?: string; resource?: string; resourceId?: string; timestamp?: { toDate(): Date } };

export function AuditLogAdmin() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(getFirebaseServices().db, "auditLogs"), limit(300)), (snapshot) => {
    const loaded = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as LogRow));
    loaded.sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0));
    setRows(loaded);
  }, (reason) => setError(reason.message)), []);
  const filtered = useMemo(() => rows.filter((row) => `${row.action} ${row.actorUid} ${row.resource} ${row.resourceId}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);
  return <section className="panel"><div className="panel-head"><div><h3><ShieldCheck size={18} /> Histórico administrativo</h3><p>Registros somente para consulta; não podem ser editados nem excluídos.</p></div></div><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar ação, administrador ou recurso" /></label>{error && <div className="form-message error">{error}</div>}{filtered.length === 0 ? <div className="empty-state">Nenhum registro de auditoria encontrado.</div> : <div className="table-wrap"><table><thead><tr><th>Data/hora</th><th>Ação</th><th>Administrador</th><th>Recurso</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td>{row.timestamp?.toDate().toLocaleString("pt-BR") || "—"}</td><td><strong>{row.action || "Ação administrativa"}</strong></td><td>{row.actorUid || "—"}</td><td>{row.resource || "—"}{row.resourceId ? ` / ${row.resourceId}` : ""}</td></tr>)}</tbody></table></div>}</section>;
}
