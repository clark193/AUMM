"use client";

import { FormEvent, useEffect, useState } from "react";
import { deleteApp, FirebaseError, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser, inMemoryPersistence, initializeAuth, signOut, type Auth, type User } from "firebase/auth";
import { collection, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where, writeBatch, doc } from "firebase/firestore";
import { CheckCircle2, Copy, KeyRound, Save, ShieldCheck, UserPlus } from "lucide-react";
import { firebaseConfig, firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

type MemberRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  memberNumber?: string;
  status: string;
};

const emptyForm = { fullName: "", email: "", phone: "", city: "", password: "" };

function friendlyError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use") return "Já existe uma conta de login com este e-mail.";
    if (error.code === "auth/weak-password") return "A senha temporária precisa ter pelo menos 6 caracteres.";
    if (error.code === "auth/operation-not-allowed") return "Ative o provedor E-mail/senha no Firebase Authentication para criar logins.";
    if (error.code === "permission-denied") return "Seu nível não possui permissão para cadastrar associados.";
  }
  return error instanceof Error ? error.message : "Não foi possível concluir o cadastro.";
}

function makeMemberNumber() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return `AUMM-${new Date().getFullYear()}-${String(random).padStart(6, "0")}`;
}

type MemberAdminProps = {
  registrationOnly?: boolean;
};

export function MemberAdmin({ registrationOnly = false }: MemberAdminProps) {
  const [form, setForm] = useState(emptyForm);
  const [authorizeNow, setAuthorizeNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    if (!firebaseEnabled || registrationOnly) return;
    const { db } = getFirebaseServices();
    return onSnapshot(query(collection(db, "associados"), orderBy("createdAt", "desc"), limit(50)), snapshot => {
      setMembers(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MemberRow)));
    }, error => setMessage({ type: "error", text: friendlyError(error) }));
  }, [registrationOnly]);

  function update(field: keyof typeof emptyForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setCredentials(null);
    let secondaryApp: ReturnType<typeof initializeApp> | null = null;
    let secondaryAuth: Auth | null = null;
    let createdUser: User | null = null;

    try {
      if (!firebaseEnabled) throw new Error("Firebase não configurado.");
      if (authorizeNow && form.password.length < 8) throw new Error("Use uma senha temporária com pelo menos 8 caracteres.");

      const { auth, db } = getFirebaseServices();
      if (!auth.currentUser) throw new Error("A sessão administrativa expirou. Entre novamente.");

      const email = form.email.trim().toLowerCase();
      if (!registrationOnly) {
        const duplicate = await getDocs(query(collection(db, "associados"), where("email", "==", email), limit(1)));
        if (!duplicate.empty) throw new Error("Já existe um associado cadastrado com este e-mail.");
      }

      let memberId = `pending-${crypto.randomUUID()}`;
      if (authorizeNow) {
        secondaryApp = initializeApp(firebaseConfig, `member-registration-${crypto.randomUUID()}`);
        secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, form.password);
        createdUser = credential.user;
        memberId = credential.user.uid;
      }

      const memberNumber = makeMemberNumber();
      const batch = writeBatch(db);
      batch.set(doc(db, "associados", memberId), {
        uid: authorizeNow ? memberId : null,
        memberNumber,
        fullName: form.fullName.trim(),
        email,
        phone: form.phone.trim(),
        city: form.city.trim(),
        role: "Associado",
        status: authorizeNow ? "active" : "pending",
        authorized: authorizeNow,
        source: "admin_manual",
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (authorizeNow) batch.set(doc(db, "publicMembers", memberNumber), {
        uid: memberId,
        memberNumber,
        fullName: form.fullName.trim(),
        role: "Associado",
        status: "active",
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      if (authorizeNow) {
        setCredentials({ email, password: form.password });
        setMessage({ type: "success", text: `${form.fullName.trim()} foi cadastrado e já pode entrar no portal.` });
      } else {
        setMessage({ type: "success", text: `${form.fullName.trim()} foi cadastrado como pendente, sem acesso ao portal.` });
      }
      setForm(emptyForm);
    } catch (error) {
      if (createdUser) {
        try { await deleteUser(createdUser); } catch { /* A conta órfã pode ser removida no console do Firebase. */ }
      }
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      if (secondaryApp) {
        try { if (secondaryAuth) await signOut(secondaryAuth); } catch { /* instância já encerrada */ }
        await deleteApp(secondaryApp);
      }
      setBusy(false);
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(`Acesso AUMM\nE-mail: ${credentials.email}\nSenha temporária: ${credentials.password}\nPortal: ${window.location.origin}/associado/login`);
    setMessage({ type: "success", text: "Dados de acesso copiados." });
  }

  return <>
    <section className="panel member-registration">
      <div className="panel-head">
        <div><h3><UserPlus size={18} /> Novo associado</h3><p>Cadastro manual disponível para administradores autorizados.</p></div>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span>Nome completo</span><input value={form.fullName} onChange={event => update("fullName", event.target.value)} minLength={3} maxLength={160} required /></label>
          <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={event => update("email", event.target.value)} required /></label>
          <label className="field"><span>Telefone celular</span><input type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} minLength={10} maxLength={30} required /></label>
          <label className="field"><span>Cidade</span><input value={form.city} onChange={event => update("city", event.target.value)} minLength={2} maxLength={100} required /></label>
          {authorizeNow && <label className="field full"><span><KeyRound size={14} /> Senha temporária</span><input type="password" autoComplete="new-password" value={form.password} onChange={event => update("password", event.target.value)} minLength={8} required /><small>O associado poderá trocar a senha em “Esqueci minha senha”. A senha não é salva no banco de dados.</small></label>}
        </div>
        <label className="authorization-switch">
          <input type="checkbox" checked={authorizeNow} onChange={event => setAuthorizeNow(event.target.checked)} />
          <span className="switch-track" aria-hidden="true"><i /></span>
          <span><strong>Autorizar acesso agora</strong><small>{authorizeNow ? "Ligado: cria o login e ativa o associado imediatamente." : "Desligado: salva como pendente e não cria login."}</small></span>
        </label>
        {message && <div className={`form-message ${message.type}`}>{message.type === "success" && <CheckCircle2 size={16} />} {message.text}</div>}
        {credentials && <div className="credentials-box"><ShieldCheck /><div><strong>Login criado</strong><span>{credentials.email}</span><span>Senha temporária: {credentials.password}</span></div><button type="button" className="button button-sm button-dark" onClick={copyCredentials}><Copy size={15} /> Copiar acesso</button></div>}
        <button className="button" disabled={busy}><Save size={16} /> {busy ? "Cadastrando..." : authorizeNow ? "Cadastrar e autorizar" : "Cadastrar como pendente"}</button>
      </form>
    </section>

    {!registrationOnly && <section className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head"><div><h3>Associados cadastrados</h3><p>Registros reais do Firebase.</p></div><span className="demo-badge">{members.length} registros</span></div>
      {members.length === 0 ? <div className="empty-state">Nenhum associado cadastrado ainda.</div> : <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Número</th><th>E-mail</th><th>Cidade</th><th>Status</th></tr></thead><tbody>{members.map(member => <tr key={member.id}><td><strong>{member.fullName}</strong></td><td>{member.memberNumber || "—"}</td><td>{member.email}</td><td>{member.city}</td><td><span className={`status ${member.status}`}>{member.status === "active" ? "Ativo" : "Pendente"}</span></td></tr>)}</tbody></table></div>}
    </section>}
  </>;
}
