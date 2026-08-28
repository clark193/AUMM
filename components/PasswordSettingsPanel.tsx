"use client";

import { FormEvent, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CheckCircle2, KeyRound, Save } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { writeAdminAudit } from "@/lib/audit";

export function PasswordSettingsPanel({ member = false }: { member?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      if (newPassword.length < 8) throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
      if (newPassword !== confirmation) throw new Error("A confirmação não corresponde à nova senha.");
      const { auth, db } = getFirebaseServices(); const user = auth.currentUser;
      if (!user?.email) throw new Error("Sua sessão expirou. Entre novamente.");
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
      await updatePassword(user, newPassword);
      if (member) await updateDoc(doc(db, "associados", user.uid), { mustChangePassword: false, updatedAt: serverTimestamp() });
      if (!member) await writeAdminAudit({ action: "ADMIN_PASSWORD_UPDATED", resource: "adminRoles", resourceId: user.uid, description: "Alterou a própria senha administrativa." }).catch(() => undefined);
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      setMessage({ type: "success", text: "Senha atualizada com sucesso." });
    } catch (error) {
      const value = error instanceof Error ? error.message : "Não foi possível alterar a senha.";
      setMessage({ type: "error", text: value.includes("auth/invalid-credential") ? "A senha atual está incorreta." : value });
    } finally { setBusy(false); }
  }
  return <section className="panel settings-section"><div className="panel-head"><div><h3><KeyRound /> Segurança da conta</h3><p>Use uma senha exclusiva, com pelo menos oito caracteres.</p></div></div><form onSubmit={submit}><div className="form-grid"><label className="field"><span>Senha atual</span><input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label className="field"><span>Nova senha</span><input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label className="field full"><span>Confirmar nova senha</span><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label></div>{message && <div className={`form-message ${message.type}`}>{message.type === "success" && <CheckCircle2 />} {message.text}</div>}<button className="button" disabled={busy}><Save /> {busy ? "Atualizando…" : "Alterar senha"}</button></form></section>;
}
