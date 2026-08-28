"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ExternalLink, FileText, Printer, Search } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { validExternalDocumentUrl, validInternalDocumentPath } from "@/lib/documentUrl";
import { withBasePath } from "@/lib/paths";
import { DOCUMENT_CATEGORY_NAMES, type InstitutionalDocument } from "@/lib/documentTypes";

export function DocumentLibrary({ member = false }: { member?: boolean }) {
  const [rows, setRows] = useState<InstitutionalDocument[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<InstitutionalDocument | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const { db } = getFirebaseServices();
    return onSnapshot(
      query(
        collection(db, "documents"),
        where("published", "==", true),
        where("visibility", "in", member ? ["public", "members"] : ["public"]),
        orderBy("documentDate", "desc"),
        limit(50),
      ),
      (snapshot) => {
        setError("");
        setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as InstitutionalDocument));
      },
      (reason) => setError(firebaseErrorMessage(reason, "Não foi possível carregar os documentos.")),
    );
  }, [member]);

  const shown = useMemo(() => rows.filter((item) =>
    (category === "all" || item.category === category)
      && `${item.title} ${item.documentNumber || ""} ${item.year}`.toLowerCase().includes(search.toLowerCase())),
  [rows, search, category]);
  const current = rows.find((item) => item.category === "statute" && item.isCurrent);

  function openUrl(item: InstitutionalDocument) {
    const internal = validInternalDocumentPath(item.internalUrl);
    return internal
      ? withBasePath(internal)
      : validExternalDocumentUrl(item.externalUrl) || validExternalDocumentUrl(item.signedDocumentUrl);
  }

  return <div className="document-library">
    {current && <section className="current-statute">
      <FileText />
      <div><span>Estatuto vigente</span><h2>{current.title}</h2><p>Versão {current.statuteVersion || current.year}</p></div>
      <button className="button" onClick={() => setSelected(current)}>Visualizar</button>
    </section>}
    <div className="document-filters">
      <label className="admin-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar documentos" /></label>
      <select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">Todas as categorias</option>
        {Object.entries(DOCUMENT_CATEGORY_NAMES).map(([id, name]) => <option value={id} key={id}>{name}</option>)}
      </select>
    </div>
    {error && <div className="form-message error">{error}</div>}
    <div className="document-grid">
      {!error && shown.length === 0
        ? <div className="empty-state">Nenhum documento publicado nesta categoria.</div>
        : shown.map((item) => {
          const primaryUrl = openUrl(item);
          const signedUrl = validExternalDocumentUrl(item.signedDocumentUrl);
          return <article className="document-public-card" key={item.id}>
            <span>{DOCUMENT_CATEGORY_NAMES[item.category] || item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <small>{item.documentNumber || item.year} · {item.documentDate?.toDate().toLocaleDateString("pt-BR")}</small>
            <div className="assembly-actions">
              <button className="button button-sm" onClick={() => setSelected(item)}>Visualizar</button>
              {primaryUrl && <a className="button button-sm button-dark" href={primaryUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir documento</a>}
              {signedUrl && signedUrl !== primaryUrl && <a className="button button-sm button-dark" href={signedUrl} target="_blank" rel="noreferrer">Documento assinado</a>}
            </div>
          </article>;
        })}
    </div>
    {selected && <div className="document-modal" role="dialog" aria-modal="true">
      <article>
        <button className="modal-close" onClick={() => setSelected(null)}>×</button>
        <span>{DOCUMENT_CATEGORY_NAMES[selected.category]}</span>
        <h1>{selected.title}</h1>
        <p>{selected.description}</p>
        <dl>
          <div><dt>Número/ano</dt><dd>{selected.documentNumber || selected.year}</dd></div>
          <div><dt>Visibilidade</dt><dd>{selected.visibility}</dd></div>
          <div><dt>Fonte</dt><dd>{selected.sourceType}</dd></div>
        </dl>
        {selected.sourceType === "assembly_minutes" && <p>Ata eletrônica vinculada à Assembleia {selected.sourceId}. Consulte o histórico no Portal do Associado para pautas, resultados e hash.</p>}
        <div className="assembly-actions">
          {openUrl(selected) && <a className="button" href={openUrl(selected)} target="_blank" rel="noreferrer">Visualizar documento</a>}
          <button className="button button-dark" onClick={() => window.print()}><Printer size={15} /> Imprimir / PDF</button>
        </div>
      </article>
    </div>}
  </div>;
}
