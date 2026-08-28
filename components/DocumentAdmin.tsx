"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Archive, ExternalLink, FilePlus2, FileText, Plus, Search, Send, X } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import {
  archiveInstitutionalDocument,
  createInstitutionalDocument,
  publishInstitutionalDocument,
  updateSignedDocument,
  type DocumentDraft,
} from "@/lib/documentService";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_NAMES,
  type InstitutionalDocument,
} from "@/lib/documentTypes";
import { validExternalDocumentUrl, validInternalDocumentPath } from "@/lib/documentUrl";
import type { AssemblyActor } from "@/lib/assemblyService";

const initial = {
  category: "institutional",
  title: "",
  description: "",
  documentNumber: "",
  year: String(new Date().getFullYear()),
  documentDate: new Date().toISOString().slice(0, 10),
  sourceType: "external",
  url: "",
  visibility: "admin",
  statuteVersion: "",
  signedDocumentUrl: "",
};

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export function DocumentAdmin() {
  const [actor, setActor] = useState<AssemblyActor | null>(null);
  const [rows, setRows] = useState<InstitutionalDocument[]>([]);
  const [form, setForm] = useState(initial);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const role = await getDoc(doc(db, "adminRoles", user.uid));
      setActor({ uid: user.uid, name: user.displayName || user.email || "Administrador", role: String(role.data()?.role || "Administrador") });
    });
    const unsubscribeDocuments = onSnapshot(
      query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(100)),
      (snapshot) => setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as InstitutionalDocument)),
      (error) => setMessage(firebaseErrorMessage(error, "Não foi possível carregar os documentos.")),
    );
    return () => { unsubscribeAuth(); unsubscribeDocuments(); };
  }, []);

  useEffect(() => {
    if (!creating) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setCreating(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [creating, busy]);

  const adminDocuments = useMemo(() => rows.filter((item) => item.visibility === "admin"), [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return adminDocuments;
    return adminDocuments.filter((item) => `${item.title} ${item.documentNumber || ""} ${item.year} ${DOCUMENT_CATEGORY_NAMES[item.category] || item.category}`.toLowerCase().includes(term));
  }, [adminDocuments, search]);

  function openForm() {
    setForm(initial);
    setFormMessage("");
    setCreating(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!actor || busy) return;
    setBusy(true);
    setFormMessage("");
    try {
      const url = form.sourceType === "internal" ? validInternalDocumentPath(form.url) : validExternalDocumentUrl(form.url);
      if (!url) throw new Error(form.sourceType === "internal" ? "Informe um caminho interno válido iniciado por /." : "Informe uma URL externa completa iniciada por https://.");
      const signed = form.signedDocumentUrl.trim() ? validExternalDocumentUrl(form.signedDocumentUrl) : "";
      if (form.signedDocumentUrl.trim() && !signed) throw new Error("A URL do documento assinado deve começar com https://.");
      const input: DocumentDraft = {
        category: form.category,
        title: form.title,
        description: form.description,
        documentNumber: form.documentNumber,
        year: Number(form.year),
        documentDate: new Date(`${form.documentDate}T12:00:00-03:00`),
        sourceType: form.sourceType as DocumentDraft["sourceType"],
        internalUrl: form.sourceType === "internal" ? url : "",
        externalUrl: form.sourceType === "external" ? url : "",
        sourceId: "",
        visibility: "admin",
        status: "draft",
        published: false,
        isCurrent: false,
        statuteVersion: form.statuteVersion,
        signedDocumentUrl: signed,
      };
      await createInstitutionalDocument(input, actor);
      setForm(initial);
      setCreating(false);
      setMessage("Documento administrativo salvo como rascunho.");
    } catch (error) {
      setFormMessage(firebaseErrorMessage(error, "Falha ao salvar o documento."));
    } finally {
      setBusy(false);
    }
  }

  async function publish(item: InstitutionalDocument) {
    if (!actor) return;
    try {
      setMessage("");
      await publishInstitutionalDocument(item, actor, false);
      setMessage("Documento publicado somente para a administração.");
    } catch (error) {
      setMessage(firebaseErrorMessage(error, "Não foi possível publicar o documento."));
    }
  }

  async function archive(item: InstitutionalDocument) {
    if (!actor || !window.confirm("Arquivar este documento administrativo?")) return;
    try {
      setMessage("");
      await archiveInstitutionalDocument(item, actor);
      setMessage("Documento arquivado.");
    } catch (error) {
      setMessage(firebaseErrorMessage(error, "Não foi possível arquivar o documento."));
    }
  }

  async function linkSignedDocument(item: InstitutionalDocument) {
    if (!actor) return;
    const url = window.prompt("URL da versão assinada/registrada:", item.signedDocumentUrl || "");
    if (!url) return;
    try {
      setMessage("");
      await updateSignedDocument(item, url, actor);
      setMessage("Documento assinado vinculado.");
    } catch (error) {
      setMessage(firebaseErrorMessage(error, "Não foi possível vincular o documento assinado."));
    }
  }

  return <div className="document-admin admin-document-library">
    <section className="panel">
      <div className="panel-head admin-document-heading">
        <div><h3><FileText size={18} /> Biblioteca da administração</h3><p>Área reservada: somente documentos marcados para a administração aparecem aqui.</p></div>
        <button className="button button-sm" type="button" onClick={openForm}><Plus size={16} /> Adicionar documento</button>
      </div>
      <div className="admin-document-toolbar">
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, número, ano ou categoria" /></label>
        <span className="admin-document-count">{adminDocuments.length} documento(s) interno(s)</span>
      </div>
      {message && <div className="form-message">{message}</div>}
      <div className="document-admin-list">
        {filtered.length === 0 ? <div className="empty-state admin-document-empty"><FileText size={30} /><strong>Nenhum documento administrativo encontrado.</strong><span>Use “Adicionar documento” para criar o primeiro registro interno.</span></div> : filtered.map((item) => {
          const primaryUrl = item.sourceType === "internal" ? validInternalDocumentPath(item.internalUrl) : validExternalDocumentUrl(item.externalUrl);
          const signedUrl = validExternalDocumentUrl(item.signedDocumentUrl);
          return <article className="document-card admin-document-card" key={item.id}>
            <div>
              <div className="admin-document-meta"><span>{DOCUMENT_CATEGORY_NAMES[item.category] || item.category}</span><b className={`status ${item.status === "published" ? "active" : item.status === "archived" ? "archived" : "pending"}`}>{statusLabel[item.status] || item.status}</b></div>
              <h3>{item.title}</h3><p>{item.description}</p><small>{item.documentNumber || item.year} · Somente administração</small>
            </div>
            <div className="assembly-actions">
              {primaryUrl && <a className="button button-sm button-dark" href={primaryUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir</a>}
              {signedUrl && signedUrl !== primaryUrl && <a className="button button-sm button-dark" href={signedUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Assinado</a>}
              {!item.published && item.status !== "archived" && <button className="button button-sm" type="button" onClick={() => publish(item)}><Send size={14} /> Publicar</button>}
              {item.published && <button className="button button-sm button-dark" type="button" onClick={() => archive(item)}><Archive size={14} /> Arquivar</button>}
              <button className="button button-sm button-dark" type="button" onClick={() => linkSignedDocument(item)}>Vincular assinado</button>
            </div>
          </article>;
        })}
      </div>
    </section>

    {creating && <div className="document-modal admin-document-modal" role="dialog" aria-modal="true" aria-labelledby="new-admin-document-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setCreating(false); }}>
      <article>
        <button className="modal-close" type="button" aria-label="Fechar" onClick={() => setCreating(false)} disabled={busy}><X /></button>
        <span>Biblioteca interna</span><h1 id="new-admin-document-title">Adicionar documento</h1>
        <p className="admin-document-modal-intro">Este registro ficará visível somente para usuários autorizados do painel administrativo.</p>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field"><span>Categoria</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{DOCUMENT_CATEGORY_NAMES[item]}</option>)}</select></label>
            <label className="field"><span>Acesso</span><input value="Somente administração" disabled /></label>
            <label className="field full"><span>Título</span><input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nome do documento" /></label>
            <label className="field full"><span>Descrição/assuntos</span><textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o conteúdo e a finalidade do documento" /></label>
            <label className="field"><span>Data</span><input type="date" required value={form.documentDate} onChange={(event) => setForm({ ...form, documentDate: event.target.value })} /></label>
            <label className="field"><span>Número</span><input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} placeholder="04/2026" /></label>
            <label className="field"><span>Ano</span><input type="number" min="1900" max="2200" required value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></label>
            <label className="field"><span>Versão do Estatuto</span><input value={form.statuteVersion} onChange={(event) => setForm({ ...form, statuteVersion: event.target.value })} placeholder="Somente quando aplicável" /></label>
            <label className="field"><span>Origem</span><select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}><option value="external">Link externo/Google Drive</option><option value="internal">Arquivo interno do site</option></select></label>
            <label className="field"><span>{form.sourceType === "internal" ? "Caminho interno" : "URL do documento"}</span><input required value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder={form.sourceType === "internal" ? "/documentos/arquivo.pdf" : "https://drive.google.com/..."} /></label>
            <label className="field full"><span>URL do documento assinado/registrado (opcional)</span><input type="url" inputMode="url" value={form.signedDocumentUrl} onChange={(event) => setForm({ ...form, signedDocumentUrl: event.target.value })} placeholder="https://drive.google.com/..." /></label>
          </div>
          {form.sourceType === "external" && <p className="document-warning">Confira se o arquivo está compartilhado com as pessoas autorizadas antes de salvar.</p>}
          {formMessage && <div className="form-message">{formMessage}</div>}
          <div className="admin-document-modal-actions">
            <button className="button button-dark" type="button" onClick={() => setCreating(false)} disabled={busy}>Cancelar</button>
            {form.url && <a className="button button-sm button-dark" href={form.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Testar link</a>}
            <button className="button" disabled={busy}><FilePlus2 size={15} /> {busy ? "Salvando…" : "Salvar rascunho"}</button>
          </div>
        </form>
      </article>
    </div>}
  </div>;
}
