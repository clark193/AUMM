"use client";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  CheckCircle2,
  Edit3,
  ImageIcon,
  Newspaper,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

type NewsRow = {
  id: string;
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  imageUrl?: string;
  status?: "draft" | "published";
  showOnHome?: boolean;
  publishedAt?: Timestamp;
  updatedAt?: Timestamp;
};

const emptyForm = {
  title: "",
  category: "Institucional",
  summary: "",
  content: "",
  imageUrl: "",
  status: "draft" as "draft" | "published",
  showOnHome: false,
};

function rowTime(item: NewsRow) {
  return item.publishedAt?.toMillis?.() || item.updatedAt?.toMillis?.() || 0;
}

export function NewsAdmin() {
  const [items, setItems] = useState<NewsRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [level, setLevel] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { auth, db } = getFirebaseServices();
    let stopNews: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const role = await getDoc(doc(db, "adminRoles", user.uid));
      setLevel(Number(role.data()?.level || 5));
      stopNews?.();
      stopNews = onSnapshot(
        collection(db, "news"),
        (snapshot) => {
          const loaded = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as NewsRow[];
          setItems(loaded.sort((a, b) => rowTime(b) - rowTime(a)));
        },
        () => setMessage({ type: "error", text: "Não foi possível carregar as notícias." }),
      );
    });
    return () => { stopAuth(); stopNews?.(); };
  }, []);

  const update = <K extends keyof typeof emptyForm>(field: K, value: (typeof emptyForm)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function edit(item: NewsRow) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      category: item.category || "Institucional",
      summary: item.summary || "",
      content: item.content || item.summary || "",
      imageUrl: item.imageUrl || "",
      status: item.status || "draft",
      showOnHome: item.showOnHome === true,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!firebaseEnabled) return setMessage({ type: "error", text: "Configure o Firebase para salvar." });
    if (form.title.trim().length < 5) return setMessage({ type: "error", text: "Informe um título com pelo menos 5 caracteres." });
    if (form.summary.trim().length < 20) return setMessage({ type: "error", text: "Escreva um resumo com pelo menos 20 caracteres." });
    if (form.content.trim().length < 40) return setMessage({ type: "error", text: "Escreva o texto completo da publicação com pelo menos 40 caracteres." });
    if (form.imageUrl && !form.imageUrl.startsWith("https://")) return setMessage({ type: "error", text: "A imagem precisa usar uma URL pública iniciada por https://." });

    setBusy(true);
    try {
      const { auth, db } = getFirebaseServices();
      const reference = editingId ? doc(db, "news", editingId) : doc(collection(db, "news"));
      const previous = editingId ? items.find((item) => item.id === editingId) : undefined;
      await setDoc(reference, {
        title: form.title.trim(),
        category: form.category.trim() || "Notícia",
        summary: form.summary.trim(),
        content: form.content.trim(),
        imageUrl: form.imageUrl.trim(),
        status: form.status,
        showOnHome: form.showOnHome,
        publishedAt: form.status === "published" ? previous?.publishedAt || serverTimestamp() : null,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || "",
        ...(!editingId ? { createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid || "" } : {}),
      }, { merge: true });
      setMessage({ type: "success", text: form.status === "published" ? "Notícia publicada com sucesso." : "Rascunho salvo com sucesso." });
      reset();
    } catch (error) {
      setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível salvar a notícia.") });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: NewsRow) {
    if (!window.confirm(`Excluir definitivamente a notícia “${item.title || "Sem título"}”?`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(getFirebaseServices().db, "news", item.id));
      if (editingId === item.id) reset();
      setMessage({ type: "success", text: "Notícia excluída." });
    } catch (error) {
      setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível excluir.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="news-admin-layout">
      <section className="panel news-editor">
        <div className="panel-head">
          <div>
            <h3><Newspaper size={18} /> {editingId ? "Editar notícia" : "Nova notícia"}</h3>
            <p>Publique a notícia e escolha se ela deve rodar no topo da página inicial.</p>
          </div>
          {editingId && <button type="button" className="button button-ghost-dark button-sm" onClick={reset}><X size={15} /> Cancelar</button>}
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="field full"><span>Título *</span><input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={150} required /></label>
            <label className="field"><span>Categoria *</span><input value={form.category} onChange={(event) => update("category", event.target.value)} maxLength={60} required /></label>
            <label className="field"><span>Status</span><select value={form.status} onChange={(event) => update("status", event.target.value as "draft" | "published")}><option value="draft">Rascunho</option><option value="published">Publicada</option></select></label>
            <label className="field full"><span>Resumo *</span><textarea value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={420} required placeholder="Texto que aparecerá no destaque e na lista de notícias." /></label>
            <label className="field full"><span>Texto completo da publicação *</span><textarea className="news-content-input" value={form.content} onChange={(event) => update("content", event.target.value)} minLength={40} maxLength={12000} required placeholder="Escreva aqui a notícia completa. Os parágrafos serão preservados na página da publicação." /><small>Este conteúdo será aberto quando o visitante clicar em “Ver publicação”.</small></label>
            <label className="field full"><span><ImageIcon size={14} /> URL pública da imagem de fundo</span><input type="url" value={form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://..." /><small>Use uma imagem horizontal. Sem imagem, será usado o fundo institucional.</small></label>
          </div>
          <label className={`home-feature-switch ${form.showOnHome ? "active" : ""}`}>
            <input type="checkbox" checked={form.showOnHome} onChange={(event) => update("showOnHome", event.target.checked)} />
            <Star />
            <span><strong>Exibir na tela inicial</strong><small>Quando publicada, esta notícia entrará na rotação do primeiro painel.</small></span>
          </label>
          {form.showOnHome && form.status !== "published" && <p className="news-draft-warning">O destaque começará a aparecer somente quando o status for “Publicada”.</p>}
          {message && <div className={`form-message ${message.type}`}><CheckCircle2 size={16} /> {message.text}</div>}
          <button className="button" type="submit" disabled={busy}><Save size={16} /> {busy ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar notícia"}</button>
        </form>
      </section>

      <section className="panel news-manager">
        <div className="panel-head"><div><h3>Notícias cadastradas</h3><p>{items.length} registro(s) no painel.</p></div><button className="button button-sm" type="button" onClick={reset}><Plus size={15} /> Nova</button></div>
        {!items.length ? <div className="empty-state">Nenhuma notícia cadastrada.</div> : <div className="news-admin-list">{items.map((item) => (
          <article className="news-admin-item" key={item.id}>
            <div className="news-admin-thumb" style={item.imageUrl?.startsWith("https://") ? { backgroundImage: `url("${item.imageUrl.replace(/["\\]/g, "")}")` } : undefined}>{!item.imageUrl && <Newspaper />}</div>
            <div className="news-admin-copy">
              <div><span className={`status ${item.status === "published" ? "active" : "pending"}`}>{item.status === "published" ? "Publicada" : "Rascunho"}</span>{item.showOnHome && <span className="home-feature-badge"><Star /> Tela inicial</span>}</div>
              <h4>{item.title || "Sem título"}</h4>
              <p>{item.summary || "Sem resumo"}</p>
            </div>
            <div className="news-admin-actions"><button type="button" onClick={() => edit(item)}><Edit3 /> Editar</button>{level <= 2 && <button type="button" className="danger" disabled={busy} onClick={() => remove(item)}><Trash2 /> Excluir</button>}</div>
          </article>
        ))}</div>}
      </section>
    </div>
  );
}
