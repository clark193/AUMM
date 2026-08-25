"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, MessageCircle, Send } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!firebaseEnabled) throw new Error("Serviço temporariamente indisponível.");
      if (phone.replace(/\D/g, "").length < 10) throw new Error("Informe um WhatsApp válido com DDD.");
      await addDoc(collection(getFirebaseServices().db, "passwordResetRequests"), {
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a solicitação.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <main className="verify-shell"><section className="auth-card recovery-success"><CheckCircle2 /><h1>Solicitação enviada</h1><p>O administrador recebeu seu pedido e responderá pelo WhatsApp informado após confirmar seus dados.</p><Link className="button" href="/associado/login"><ArrowLeft size={16} /> Voltar ao login</Link></section></main>;

  return <main className="verify-shell"><section className="auth-card"><span className="eyebrow">Recuperar acesso</span><h1>Esqueci minha senha</h1><p>Informe o e-mail cadastrado e seu WhatsApp. A administração entrará em contato para confirmar sua identidade.</p><form onSubmit={submit}>
    <label className="field"><span>E-mail cadastrado</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
    <label className="field"><span><MessageCircle size={14} /> WhatsApp com DDD</span><input type="tel" value={phone} onChange={event => setPhone(event.target.value)} minLength={10} maxLength={30} required placeholder="(47) 99999-9999" /></label>
    {error && <div className="form-message error">{error}</div>}
    <button className="button" disabled={busy}>{busy ? "Enviando..." : <><Send size={16} /> Enviar solicitação</>}</button>
  </form><div className="auth-links"><Link href="/associado/login">← Voltar ao login</Link></div></section></main>;
}
