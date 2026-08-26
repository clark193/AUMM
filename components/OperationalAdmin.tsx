"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Edit3, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { operationalModules, type AdminField } from "@/lib/adminModuleConfig";

type Row = Record<string, unknown> & { id: string };
type FormState = Record<string, string | boolean>;

function blankForm(fields: readonly AdminField[]): FormState {
  return Object.fromEntries(fields.map((field) => [
    field.key,
    field.type === "checkbox" ? false : field.options?.[0]?.value || "",
  ]));
}

function inputValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
  if (typeof value === "string") return value || "—";
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString("pt-BR");
  }
  return "—";
}

export function OperationalAdmin({ module }: { module: string }) {
  const config = operationalModules[module];
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<FormState>(() => blankForm(config.fields));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actorUid, setActorUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { auth, db } = getFirebaseServices();
    let stopRows: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setActorUid(user.uid);
      stopRows?.();
      stopRows = onSnapshot(collection(db, config.collection), (snapshot) => {
        const loaded = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Row));
        loaded.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
        setRows(loaded);
      }, (error) => setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível carregar os registros.") }));
    });
    return () => { stopAuth(); stopRows?.(); };
  }, [config.collection]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => config.searchFields.some((key) => String(row[key] || "").toLowerCase().includes(needle)));
  }, [config.searchFields, rows, search]);

  function reset() {
    setEditingId(null);
    setForm(blankForm(config.fields));
    setMessage(null);
  }

  function edit(row: Row) {
    setEditingId(row.id);
    setForm(Object.fromEntries(config.fields.map((field) => [field.key, inputValue(row[field.key])])));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function payload() {
    return Object.fromEntries(config.fields.map((field) => {
      const value = form[field.key];
      if (field.type === "number") return [field.key, Number(String(value).replace(",", ".")) || 0];
      if (field.type === "checkbox") return [field.key, Boolean(value)];
      return [field.key, String(value || "").trim()];
    }));
  }

  async function audit(action: string, resourceId: string) {
    if (!actorUid) return;
    const { db } = getFirebaseServices();
    await addDoc(collection(db, "auditLogs"), {
      action,
      resource: config.collection,
      resourceId,
      actorUid,
      timestamp: serverTimestamp(),
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!actorUid) return;
    setBusy(true);
    setMessage(null);
    try {
      const { db } = getFirebaseServices();
      if (editingId) {
        await updateDoc(doc(db, config.collection, editingId), { ...payload(), updatedAt: serverTimestamp(), updatedBy: actorUid });
        await audit("ADMIN_RECORD_UPDATED", editingId).catch(() => undefined);
        setMessage({ type: "success", text: `${config.singular} atualizado com sucesso.` });
      } else {
        const created = await addDoc(collection(db, config.collection), {
          ...payload(),
          createdAt: serverTimestamp(),
          createdBy: actorUid,
          updatedAt: serverTimestamp(),
          updatedBy: actorUid,
        });
        await audit("ADMIN_RECORD_CREATED", created.id).catch(() => undefined);
        setMessage({ type: "success", text: `${config.singular} cadastrado com sucesso.` });
      }
      setEditingId(null);
      setForm(blankForm(config.fields));
    } catch (reason) {
      setMessage({ type: "error", text: firebaseErrorMessage(reason, "Não foi possível salvar.") });
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Excluir definitivamente este ${config.singular}?`)) return;
    setBusy(true);
    try {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, config.collection, row.id));
      await audit("ADMIN_RECORD_DELETED", row.id).catch(() => undefined);
      if (editingId === row.id) reset();
      setMessage({ type: "success", text: `${config.singular} excluído.` });
    } catch (reason) {
      setMessage({ type: "error", text: firebaseErrorMessage(reason, "Não foi possível excluir.") });
    } finally {
      setBusy(false);
    }
  }

  return <div className="operational-admin">
    {(config.canCreate !== false || editingId) && <section className="panel operational-editor">
      <div className="panel-head"><div><h3>{editingId ? <><Edit3 size={18} /> Editar {config.singular}</> : <><Plus size={18} /> Novo {config.singular}</>}</h3><p>Os dados ficam salvos no Firebase e podem ser alterados posteriormente.</p></div>{editingId && <button type="button" className="button button-sm button-dark" onClick={reset}><RotateCcw size={14} /> Cancelar edição</button>}</div>
      <form onSubmit={submit}>
        <div className="form-grid">{config.fields.map((field) => <Field key={field.key} field={field} value={form[field.key]} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} />)}</div>
        {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
        <button className="button" disabled={busy}><Save size={16} /> {busy ? "Salvando…" : editingId ? "Salvar alterações" : `Cadastrar ${config.singular}`}</button>
      </form>
    </section>}
    <section className="panel">
      <div className="panel-head"><div><h3>Registros cadastrados</h3><p>{rows.length} registro(s) encontrado(s).</p></div></div>
      <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar registros" /></label>
      {config.canCreate === false && message && <div className={`form-message ${message.type}`}>{message.text}</div>}
      {filtered.length === 0 ? <div className="empty-state">Nenhum registro cadastrado.</div> : <div className="table-wrap"><table><thead><tr><th>{config.fields[0]?.label || "Registro"}</th>{config.fields.slice(1, 4).map((field) => <th key={field.key}>{field.label}</th>)}<th>Ações</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{displayValue(row[config.fields[0]?.key])}</strong></td>{config.fields.slice(1, 4).map((field) => <td key={field.key}>{displayValue(row[field.key])}</td>)}<td><div className="table-actions"><button type="button" className="button button-sm button-dark" onClick={() => edit(row)}><Edit3 size={14} /> Editar</button>{config.canDelete !== false && <button type="button" className="table-action-danger" disabled={busy} onClick={() => remove(row)}><Trash2 size={14} /> Excluir</button>}</div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function Field({ field, value, onChange }: { field: AdminField; value: string | boolean; onChange: (value: string | boolean) => void }) {
  if (field.type === "checkbox") return <label className={`authorization-switch ${field.full ? "full" : ""}`}><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><span className="switch-track"><i /></span><span><strong>{field.label}</strong><small>Ative ou desative este registro.</small></span></label>;
  return <label className={`field ${field.full ? "full" : ""}`}><span>{field.label}</span>{field.type === "textarea" ? <textarea required={field.required} value={String(value)} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} /> : field.type === "select" ? <select required={field.required} value={String(value)} onChange={(event) => onChange(event.target.value)}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required={field.required} type={field.type || "text"} step={field.type === "number" ? "0.01" : undefined} value={String(value)} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;
}
