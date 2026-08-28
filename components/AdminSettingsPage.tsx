"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Bell, Save, Settings, UserRound } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { AdminPhotoUpload } from "./AdminPhotoUpload";
import { PasswordSettingsPanel } from "./PasswordSettingsPanel";
import { SettingsAdmin } from "./SettingsAdmin";
import { writeAdminAudit } from "@/lib/audit";

export function AdminSettingsPage() {
  const [profile, setProfile] = useState({ uid: "", name: "Administrador", email: "", role: "Administrador", level: 5, photoURL: "" });
  const [notificationBadge, setNotificationBadge] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, async (user) => {
    if (!user) return; const { db } = getFirebaseServices();
    const [access, photo, preferences] = await Promise.all([getDoc(doc(db, "adminRoles", user.uid)), getDoc(doc(db, "adminPhotos", user.uid)), getDoc(doc(db, "userPreferences", user.uid))]);
    setProfile({ uid: user.uid, name: String(access.data()?.fullName || user.displayName || "Administrador"), email: String(access.data()?.email || user.email || ""), role: String(access.data()?.role || "Administrador"), level: Number(access.data()?.level || 5), photoURL: String(photo.data()?.dataUrl || "") });
    setNotificationBadge(preferences.data()?.notificationBadge !== false);
  }), []);
  async function save(event: FormEvent) { event.preventDefault(); await setDoc(doc(getFirebaseServices().db, "userPreferences", profile.uid), { uid: profile.uid, notificationBadge, updatedAt: serverTimestamp() }, { merge: true }); await writeAdminAudit({ action: "ADMIN_PREFERENCES_UPDATED", resource: "userPreferences", resourceId: profile.uid, description: "Atualizou as preferências de notificações do painel." }).catch(() => undefined); setMessage("Preferências atualizadas."); }
  return <div className="settings-layout"><div className="dash-welcome"><div><span className="access-badge">Conta administrativa</span><h2 style={{ marginTop: 12 }}>Configurações do painel</h2><p>Os primeiros blocos são da sua conta pessoal. No final, o nível 1 também encontra os dados públicos da associação.</p></div><Settings size={40} /></div>
    <section className="panel settings-section"><div className="panel-head"><div><h3><UserRound /> Perfil administrativo</h3><p>A foto selecionada aparece no círculo do topo do painel.</p></div><span className="status active">Nível {profile.level}</span></div><AdminPhotoUpload photoURL={profile.photoURL} name={profile.name} onUploaded={(photoURL) => setProfile((current) => ({ ...current, photoURL }))} /><dl className="settings-profile-data"><div><dt>Nome</dt><dd>{profile.name}</dd></div><div><dt>E-mail</dt><dd>{profile.email || "—"}</dd></div><div><dt>Função</dt><dd>{profile.role}</dd></div><div><dt>Nível de acesso</dt><dd>Nível {profile.level}</dd></div></dl></section>
    <section className="panel settings-section"><div className="panel-head"><div><h3><Bell /> Notificações</h3><p>Personalize o aviso de novos comunicados no topo do painel.</p></div></div><form onSubmit={save}><label className="settings-toggle"><input type="checkbox" checked={notificationBadge} onChange={(event) => setNotificationBadge(event.target.checked)} /><span><strong>Contagem de notificações</strong><small>Exibir o número de comunicados não lidos sobre o sininho.</small></span></label>{message && <div className="form-message success">{message}</div>}<button className="button"><Save /> Salvar preferências</button></form></section>
    <PasswordSettingsPanel />
    {profile.level === 1 && <SettingsAdmin />}
  </div>;
}
