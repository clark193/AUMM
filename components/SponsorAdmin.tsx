"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { Handshake, LoaderCircle, Trash2, Upload } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { writeAdminAudit } from "@/lib/audit";

type SponsorType = "sponsor" | "support" | "partner";
type Sponsor = { id: string; type?: SponsorType; logoDataUrl?: string; websiteUrl?: string; name?: string; description?: string; phone?: string; status?: string };
const accepted = ["image/jpeg", "image/png", "image/webp"];

async function prepareLogo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const item = new window.Image(); item.onload = () => resolve(item); item.onerror = () => reject(new Error("Não foi possível ler a imagem.")); item.src = url; });
    const scale = Math.min(1, 700 / image.naturalWidth, 320 / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar o logotipo.");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/webp", .84);
    if (result.length > 500_000) result = canvas.toDataURL("image/jpeg", .7);
    if (result.length > 500_000) throw new Error("O logotipo ficou muito grande. Escolha uma imagem menor.");
    return result;
  } finally { URL.revokeObjectURL(url); }
}

export function SponsorAdmin() {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Sponsor[]>([]);
  const [type, setType] = useState<SponsorType>("sponsor");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  useEffect(() => onSnapshot(collection(getFirebaseServices().db, "sponsors"), (snapshot) => setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Sponsor))), (error) => setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível carregar os logotipos.") })), []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    if (!/^https:\/\//i.test(websiteUrl.trim())) { setMessage({ type: "error", text: "Informe um link completo começando com https:// antes de selecionar a imagem." }); return; }
    if (type === "partner" && (!name.trim() || !description.trim())) { setMessage({ type: "error", text: "Para parceiros, informe também o nome e as condições do benefício." }); return; }
    if (!accepted.includes(file.type)) { setMessage({ type: "error", text: "Use um arquivo JPG, PNG ou WebP." }); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: "error", text: "A imagem deve ter no máximo 5 MB." }); return; }
    setBusy(true);
    try {
      const logoDataUrl = await prepareLogo(file);
      const user = getFirebaseServices().auth.currentUser;
      const created = await addDoc(collection(getFirebaseServices().db, "sponsors"), { type, logoDataUrl, websiteUrl: websiteUrl.trim(), name: name.trim(), description: description.trim(), phone: phone.trim(), status: "active", createdAt: serverTimestamp(), createdBy: user?.uid || "admin", updatedAt: serverTimestamp() });
      const typeLabel = type === "sponsor" ? "patrocinador" : type === "support" ? "apoio" : "parceiro de benefícios";
      await writeAdminAudit({ action: "SPONSOR_CREATED", resource: "sponsors", resourceId: created.id, description: `Adicionou um logotipo como ${typeLabel}.` }).catch(() => undefined);
      setMessage({ type: "success", text: `${type === "sponsor" ? "Patrocinador" : type === "support" ? "Apoiador" : "Parceiro"} adicionado com sucesso.` });
      setWebsiteUrl(""); setName(""); setDescription(""); setPhone("");
    } catch (error) { setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível enviar o logotipo.") }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  async function toggle(item: Sponsor) { const status = item.status === "active" ? "archived" : "active"; await updateDoc(doc(getFirebaseServices().db, "sponsors", item.id), { status, updatedAt: serverTimestamp() }); await writeAdminAudit({ action: "SPONSOR_UPDATED", resource: "sponsors", resourceId: item.id, description: `${status === "active" ? "Publicou" : "Ocultou"} uma marca da rede AUMM.` }).catch(() => undefined); }
  async function remove(item: Sponsor) { if (window.confirm("Remover este logotipo definitivamente?")) { await deleteDoc(doc(getFirebaseServices().db, "sponsors", item.id)); await writeAdminAudit({ action: "SPONSOR_DELETED", resource: "sponsors", resourceId: item.id, description: "Removeu um logotipo da página de patrocinadores e apoio." }).catch(() => undefined); } }

  return <div className="sponsor-admin">
    <section className="panel sponsor-uploader"><div className="panel-head"><div><h3><Handshake /> Nova marca da rede AUMM</h3><p>Escolha entre apoio, patrocínio ou parceiro de benefícios. Em todos os casos, a imagem será clicável.</p></div></div>
      <div className="form-grid sponsor-network-form"><label className="field"><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as SponsorType)}><option value="support">Apoio</option><option value="sponsor">Patrocínio</option><option value="partner">Parceiro de benefícios</option></select></label><label className="field"><span>Site ou rede social</span><input type="url" required value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://..." /></label>{type === "partner" && <><label className="field"><span>Nome do parceiro</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>Telefone/WhatsApp</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="field full"><span>Benefício e condições especiais</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label></>}<div className="full"><button className="button" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="spin" /> : <Upload />} {busy ? "Enviando…" : "Selecionar logotipo e cadastrar"}</button><input ref={input} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></div></div>
      {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
    </section>
    <section className="panel"><div className="panel-head"><div><h3>Marcas cadastradas</h3><p>Apoios e patrocínios aparecem no site; parceiros aparecem nos benefícios do associado.</p></div><span className="demo-badge">{rows.length} logos</span></div><div className="sponsor-admin-grid">{rows.length === 0 ? <div className="empty-state">Nenhum logotipo cadastrado.</div> : rows.map((item) => <article key={item.id}><div className="sponsor-logo-box">{item.logoDataUrl && <Image src={item.logoDataUrl} width={220} height={100} unoptimized alt="Logotipo cadastrado" />}</div><div><span className={`status ${item.status === "active" ? "active" : "archived"}`}>{item.status === "active" ? "Visível" : "Oculto"}</span><strong>{item.type === "support" ? "Apoio" : item.type === "partner" ? "Parceiro de benefícios" : "Patrocínio"}</strong>{item.name && <small>{item.name}</small>}</div><div className="table-actions"><a className="button button-sm button-dark" href={item.websiteUrl} target="_blank" rel="noreferrer">Testar link</a><button className="button button-sm button-dark" type="button" onClick={() => toggle(item)}>{item.status === "active" ? "Ocultar" : "Publicar"}</button><button className="table-action-danger" type="button" onClick={() => remove(item)}><Trash2 /> Remover</button></div></article>)}</div></section>
  </div>;
}
