"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, KeyRound, Save } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { getFirebaseServices } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";

export function ChangePasswordForm() {
  const params = useSearchParams();
  const firstAccess = params.get("primeiro") === "1";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (newPassword.length < 8) throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
      if (newPassword !== confirmation) throw new Error("A confirmação da senha não confere.");
      const { auth, db } = getFirebaseServices();
      const user = auth.currentUser;
      if (!user?.email) throw new Error("Sessão inválida. Entre novamente.");
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "associados", user.uid), { mustChangePassword: false, updatedAt: serverTimestamp() });
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      setMessage({ type: "success", text: "Senha alterada com sucesso." });
    } catch (reason) {
      const text = reason instanceof Error && reason.message.includes("auth/invalid-credential") ? "A senha atual está incorreta." : reason instanceof Error ? reason.message : "Não foi possível alterar a senha.";
      setMessage({ type: "error", text });
    } finally { setBusy(false); }
  }

  return <AuthGate><main className="verify-shell"><section className="auth-card">{!firstAccess && <Link className="text-link" href="/associado"><ArrowLeft size={15} /> Voltar ao portal</Link>}<span className="eyebrow" style={{ marginTop: 24 }}>Segurança</span><h1>{firstAccess ? "Crie sua senha" : "Alterar senha"}</h1><p>{firstAccess ? "No primeiro acesso, confirme a senha inicial (seu CPF) e escolha uma senha pessoal com pelo menos 8 caracteres." : "Confirme sua senha atual e escolha uma nova senha exclusiva."}</p><form onSubmit={submit}>
    <label className="field"><span>Senha atual</span><input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
    <label className="field"><span><KeyRound size={14} /> Nova senha</span><input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} required /></label>
    <label className="field"><span>Confirmar nova senha</span><input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={8} required /></label>
    {message && <div className={`form-message ${message.type}`}>{message.type === "success" && <CheckCircle2 size={16} />} {message.text}{message.type === "success" && firstAccess && <><br /><Link className="text-link" href="/associado">Entrar no portal</Link></>}</div>}
    <button className="button" disabled={busy}><Save size={16} /> {busy ? "Alterando..." : "Alterar senha"}</button>
  </form></section></main></AuthGate>;
}
