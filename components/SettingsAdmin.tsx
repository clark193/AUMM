"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Save, Settings } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

const initial = { associationName: "Associação União Maior Motoboys", acronym: "AUMM", email: "", phone: "", whatsapp: "", address: "", city: "Blumenau", state: "SC", instagram: "", facebook: "", siteMessage: "", cardValidityText: "Válida enquanto o associado estiver ativo" };

export function SettingsAdmin() {
  const [form, setForm] = useState(initial);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, async (user) => {
    if (!user) return;
    setUid(user.uid);
    const { db } = getFirebaseServices();
    const [publicDoc, cardDoc] = await Promise.all([getDoc(doc(db, "settings", "public")), getDoc(doc(db, "settings", "cardPublic"))]);
    setForm((current) => ({ ...current, ...(publicDoc.data() || {}), ...(cardDoc.exists() ? { cardValidityText: cardDoc.data().validityText || current.cardValidityText } : {}) }));
  }), []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const { db } = getFirebaseServices();
      const { cardValidityText, ...publicSettings } = form;
      await Promise.all([
        setDoc(doc(db, "settings", "public"), { ...publicSettings, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }),
        setDoc(doc(db, "settings", "cardPublic"), { validityText: cardValidityText, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }),
      ]);
      await addDoc(collection(db, "auditLogs"), { action: "SETTINGS_UPDATED", resource: "settings", resourceId: "public", actorUid: uid, timestamp: serverTimestamp() }).catch(() => undefined);
      setMessage({ type: "success", text: "Configurações salvas com sucesso." });
    } catch (reason) { setMessage({ type: "error", text: firebaseErrorMessage(reason, "Não foi possível salvar.") }); }
    finally { setBusy(false); }
  }
  return <section className="panel operational-editor"><div className="panel-head"><div><h3><Settings size={18} /> Dados institucionais e página de contato</h3><p>Estas informações aparecem no rodapé, na página “Contato” e na carteirinha.</p></div></div><form onSubmit={submit}><div className="form-grid">
    <label className="field full"><span>Nome oficial</span><input required value={form.associationName} onChange={(event) => setForm({ ...form, associationName: event.target.value })} /></label>
    <label className="field"><span>Sigla</span><input required value={form.acronym} onChange={(event) => setForm({ ...form, acronym: event.target.value })} /></label><label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
    <label className="field"><span>Telefone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label className="field"><span>WhatsApp</span><input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></label>
    <label className="field full"><span>Endereço</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="field"><span>Cidade</span><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label className="field"><span>Estado</span><input maxLength={2} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} /></label>
    <label className="field"><span>Instagram</span><input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></label><label className="field"><span>Facebook</span><input value={form.facebook} onChange={(event) => setForm({ ...form, facebook: event.target.value })} /></label>
    <label className="field full"><span>Mensagem institucional</span><textarea value={form.siteMessage} onChange={(event) => setForm({ ...form, siteMessage: event.target.value })} /></label><label className="field full"><span>Texto de validade da carteirinha</span><input value={form.cardValidityText} onChange={(event) => setForm({ ...form, cardValidityText: event.target.value })} /></label>
  </div>{message && <div className={`form-message ${message.type}`}>{message.text}</div>}<button className="button" disabled={busy}><Save size={16} /> {busy ? "Salvando…" : "Salvar configurações"}</button></form></section>;
}
