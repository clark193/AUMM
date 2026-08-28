"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { AlertTriangle, Bell, Save, Settings, ShieldAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { getFirebaseServices } from "@/lib/firebase";
import { maskWhatsapp } from "@/lib/membershipValidation";
import { MemberSidebar, MemberTopbar } from "./MemberNavigation";
import { MemberPhotoUpload } from "./MemberPhotoUpload";
import { PasswordSettingsPanel } from "./PasswordSettingsPanel";

type Member = { fullName?: string; email?: string; phone?: string; whatsapp?: string; cpf?: string; birthDate?: Timestamp; category?: string; memberNumber?: string; photoURL?: string };

export function MemberSettingsPage() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [uid, setUid] = useState("");
  const [phone, setPhone] = useState("");
  const [notificationBadge, setNotificationBadge] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, async (user) => {
    if (!user) return; setUid(user.uid);
    const { db } = getFirebaseServices();
    const [snapshot, photo, preferences] = await Promise.all([getDoc(doc(db, "associados", user.uid)), getDoc(doc(db, "memberPhotos", user.uid)), getDoc(doc(db, "userPreferences", user.uid))]);
    const value = snapshot.exists() ? ({ ...snapshot.data(), photoURL: photo.data()?.dataUrl || "" } as Member) : null;
    setMember(value); setPhone(String(value?.whatsapp || value?.phone || ""));
    setNotificationBadge(preferences.data()?.notificationBadge !== false);
  }), []);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const { db } = getFirebaseServices(); const formatted = maskWhatsapp(phone);
      await updateDoc(doc(db, "associados", uid), { phone: formatted, whatsapp: formatted, updatedAt: serverTimestamp() });
      await setDoc(doc(db, "userPreferences", uid), { uid, notificationBadge, updatedAt: serverTimestamp() }, { merge: true });
      setMessage({ type: "success", text: "Preferências e contato atualizados." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível salvar as configurações." }); }
    finally { setBusy(false); }
  }

  async function disassociate() {
    if (confirmation.trim().toUpperCase() !== "DESASSOCIAR") return;
    setBusy(true); setMessage(null);
    try {
      const { auth, db } = getFirebaseServices(); const batch = writeBatch(db);
      batch.update(doc(db, "associados", uid), { status: "inactive", authorized: false, eligibleToVote: false, disassociatedAt: serverTimestamp(), disassociationSource: "self_service", updatedAt: serverTimestamp() });
      if (member?.memberNumber) {
        const publicRef = doc(db, "publicMembers", member.memberNumber); if ((await getDoc(publicRef)).exists()) batch.update(publicRef, { status: "inactive", updatedAt: serverTimestamp() });
      }
      batch.set(doc(db, "membershipCancellations", uid), { uid, memberNumber: member?.memberNumber || "", fullName: member?.fullName || "Associado", requestedAt: serverTimestamp(), source: "self_service", status: "completed" });
      await batch.commit(); await signOut(auth); router.push("/associado/login?desassociado=1");
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível concluir a desassociação." }); setBusy(false); }
  }

  const name = member?.fullName || "Associado";
  return <div className="dashboard member-dashboard"><MemberSidebar footer={member?.memberNumber || "Associado AUMM"} /><main className="dashboard-main"><MemberTopbar title="Configurações" /><div className="dash-content settings-layout"><div className="dash-welcome"><div><span className="access-badge">Conta e privacidade</span><h2 style={{ marginTop: 12 }}>Suas configurações</h2><p>Atualize sua foto, contato, notificações, segurança e vínculo com a AUMM.</p></div><Settings size={40} /></div>
    <section className="panel settings-section"><div className="panel-head"><div><h3><UserRound /> Perfil do associado</h3><p>Sua foto também é usada na carteirinha digital.</p></div></div><MemberPhotoUpload photoURL={member?.photoURL} name={name} onUploaded={(photoURL) => setMember((current) => current ? { ...current, photoURL } : current)} /><dl className="settings-profile-data"><div><dt>Nome</dt><dd>{name}</dd></div><div><dt>E-mail de acesso</dt><dd>{member?.email || "—"}</dd></div><div><dt>CPF</dt><dd>{member?.cpf ? `***.***.***-${member.cpf.replace(/\D/g, "").slice(-2)}` : "—"}</dd></div><div><dt>Categoria</dt><dd>{member?.category || "—"}</dd></div></dl></section>
    <section className="panel settings-section"><div className="panel-head"><div><h3><Bell /> Contato e notificações</h3><p>Defina como os comunicados aparecem e mantenha seu WhatsApp atualizado.</p></div></div><form onSubmit={save}><div className="form-grid"><label className="field full"><span>WhatsApp</span><input inputMode="numeric" value={phone} onChange={(event) => setPhone(maskWhatsapp(event.target.value))} maxLength={15} required /></label></div><label className="settings-toggle"><input type="checkbox" checked={notificationBadge} onChange={(event) => setNotificationBadge(event.target.checked)} /><span><strong>Contagem de novas notificações</strong><small>Exibir o número de comunicados não lidos no sininho.</small></span></label>{message && <div className={`form-message ${message.type}`}>{message.text}</div>}<button className="button" disabled={busy}><Save /> {busy ? "Salvando…" : "Salvar preferências"}</button></form></section>
    <PasswordSettingsPanel member />
    <section className="panel danger-settings"><div><ShieldAlert /><div><h3>Desassociar-se da AUMM</h3><p>Seu cadastro ficará inativo e você perderá acesso à carteirinha, benefícios, documentos exclusivos e votações.</p></div></div><button className="table-action-danger" type="button" onClick={() => setConfirming(true)}>Quero me desassociar</button></section>
    {confirming && <div className="membership-modal" role="dialog" aria-modal="true" aria-labelledby="disassociate-title"><div className="disassociate-modal"><AlertTriangle /><h2 id="disassociate-title">Tem certeza que deseja sair?</h2><p>Ao confirmar, seu vínculo será encerrado imediatamente. Você perderá os benefícios, o direito a voto, a carteirinha ativa e o conteúdo exclusivo para associados.</p><label className="field"><span>Digite DESASSOCIAR para confirmar</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoFocus /></label><div><button className="button button-dark" type="button" onClick={() => { setConfirming(false); setConfirmation(""); }} disabled={busy}>Continuar associado</button><button className="table-action-danger" type="button" onClick={disassociate} disabled={busy || confirmation.trim().toUpperCase() !== "DESASSOCIAR"}>{busy ? "Processando…" : "Confirmar desassociação"}</button></div></div></div>}
  </div></main></div>;
}
