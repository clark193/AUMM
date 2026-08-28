"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Building2, Save, Settings } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { writeAdminAudit } from "@/lib/audit";

const initial = {
  associationName: "Associação União Maior Motoboys", acronym: "AUMM", cnpj: "45.115.209/0001-39",
  email: "contato@aumm.com.br", phone: "", whatsapp: "", address: "", city: "", state: "",
  instagram: "https://www.instagram.com/aumm.oficial/", facebook: "", siteMessage: "",
  cardValidityText: "Válida enquanto o associado estiver ativo",
};

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
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { db } = getFirebaseServices();
      const { cardValidityText, ...publicSettings } = form;
      await Promise.all([
        setDoc(doc(db, "settings", "public"), { ...publicSettings, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }),
        setDoc(doc(db, "settings", "cardPublic"), { validityText: cardValidityText, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }),
      ]);
      await writeAdminAudit({ action: "SETTINGS_UPDATED", resource: "settings", resourceId: "public", description: "Atualizou os dados públicos da associação, contato ou validade da carteirinha." }).catch(() => undefined);
      setMessage({ type: "success", text: "Dados públicos da associação salvos com sucesso." });
    } catch (reason) {
      setMessage({ type: "error", text: firebaseErrorMessage(reason, "Não foi possível salvar.") });
    } finally { setBusy(false); }
  }

  return <section className="panel operational-editor institutional-settings">
    <div className="panel-head"><div><h3><Settings size={18} /> Dados públicos da associação</h3><p>Configuração institucional da AUMM — não são os dados do seu perfil pessoal.</p></div><span className="status active">Somente nível 1</span></div>
    <div className="institutional-settings-note"><Building2 /><div><strong>Você está editando informações da AUMM</strong><p>As alterações abaixo podem aparecer publicamente no rodapé, na página “Contato” e nas carteirinhas.</p></div></div>
    <form onSubmit={submit}><div className="form-grid">
      <label className="field full"><span>Nome oficial da associação</span><input required value={form.associationName} onChange={(event) => setForm({ ...form, associationName: event.target.value })} /></label>
      <label className="field"><span>Sigla da associação</span><input required value={form.acronym} onChange={(event) => setForm({ ...form, acronym: event.target.value })} /></label>
      <label className="field"><span>CNPJ da associação</span><input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} /></label>
      <label className="field"><span>E-mail público da associação</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label className="field"><span>Telefone institucional</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      <label className="field"><span>WhatsApp institucional</span><input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></label>
      <label className="field full"><span>Endereço institucional</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label className="field"><span>Cidade da sede</span><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
      <label className="field"><span>Estado da sede</span><input maxLength={2} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} /></label>
      <label className="field"><span>Instagram oficial</span><input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></label>
      <label className="field"><span>Facebook oficial</span><input value={form.facebook} onChange={(event) => setForm({ ...form, facebook: event.target.value })} /></label>
      <label className="field full"><span>Mensagem institucional do site</span><textarea value={form.siteMessage} onChange={(event) => setForm({ ...form, siteMessage: event.target.value })} /></label>
      <label className="field full"><span>Texto institucional de validade da carteirinha</span><input value={form.cardValidityText} onChange={(event) => setForm({ ...form, cardValidityText: event.target.value })} /></label>
    </div>{message && <div className={`form-message ${message.type}`}>{message.text}</div>}<button className="button" disabled={busy}><Save size={16} /> {busy ? "Salvando…" : "Salvar dados públicos da AUMM"}</button></form>
  </section>;
}
