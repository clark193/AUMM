"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signOut } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { KeyRound, Save, Search, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { firebaseConfig, getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { writeAdminAudit } from "@/lib/audit";

type AdminRow = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  level?: number;
  active?: boolean;
  superAdmin?: boolean;
};

const levelNames: Record<number, string> = {
  1: "Master — acesso completo",
  2: "Diretoria — gestão ampla",
  3: "Coordenação — associados e documentos",
  4: "Comunicação — conteúdo e eventos",
  5: "Cadastro — novos associados",
};

const initial = { fullName: "", email: "", password: "", role: "", level: "2" };

export function AdminManagement() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [form, setForm] = useState(initial);
  const [search, setSearch] = useState("");
  const [currentUid, setCurrentUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    let stopRows: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      stopRows?.();
      stopRows = onSnapshot(collection(db, "adminRoles"), (snapshot) => {
        setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminRow)).sort((a, b) => Number(a.level || 9) - Number(b.level || 9)));
      }, (error) => setMessage({ type: "error", text: firebaseErrorMessage(error, "Não foi possível carregar os administradores.") }));
    });
    return () => { stopAuth(); stopRows?.(); };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return rows.filter((row) => `${row.fullName || ""} ${row.email || ""} ${row.role || ""} ${row.id}`.toLowerCase().includes(needle));
  }, [rows, search]);

  async function audit(action: string, resourceId: string) {
    await writeAdminAudit({ action, resource: "adminRoles", resourceId, description: action === "ADMIN_CREATED" ? "Criou uma conta administrativa." : "Alterou nível, função ou situação de uma conta administrativa." });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const secondary = initializeApp(firebaseConfig, `aumm-admin-create-${Date.now()}`);
    try {
      const secondaryAuth = getAuth(secondary);
      const credential = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim().toLowerCase(), form.password);
      const level = Number(form.level);
      const { db } = getFirebaseServices();
      await setDoc(doc(db, "adminRoles", credential.user.uid), {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role.trim() || levelNames[level].split(" — ")[0],
        level,
        active: true,
        superAdmin: level === 1,
        permissions: {},
        createdAt: serverTimestamp(),
        createdBy: currentUid,
        updatedAt: serverTimestamp(),
      });
      await audit("ADMIN_CREATED", credential.user.uid).catch(() => undefined);
      await signOut(secondaryAuth);
      setForm(initial);
      setMessage({ type: "success", text: "Administrador criado. Ele já pode entrar com o e-mail e a senha informados." });
    } catch (reason) {
      const detail = firebaseErrorMessage(reason, "Não foi possível criar o administrador.");
      setMessage({ type: "error", text: detail.includes("email-already-in-use") ? "Este e-mail já possui uma conta. Use outro e-mail ou atribua o UID pelo Firebase." : detail });
    } finally {
      await deleteApp(secondary);
      setBusy(false);
    }
  }

  async function updateAdmin(row: AdminRow, changes: Partial<AdminRow>) {
    if (row.id === currentUid && (changes.active === false || (changes.level && changes.level !== 1))) {
      setMessage({ type: "error", text: "Você não pode remover o próprio acesso master enquanto está conectado." });
      return;
    }
    setBusy(true);
    try {
      const { db } = getFirebaseServices();
      const nextLevel = changes.level ?? row.level ?? 5;
      await updateDoc(doc(db, "adminRoles", row.id), { ...changes, superAdmin: nextLevel === 1, updatedAt: serverTimestamp(), updatedBy: currentUid });
      await audit("ADMIN_ACCESS_UPDATED", row.id).catch(() => undefined);
      setMessage({ type: "success", text: "Permissões administrativas atualizadas." });
    } catch (reason) {
      setMessage({ type: "error", text: firebaseErrorMessage(reason, "Não foi possível atualizar.") });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(row: AdminRow) {
    if (!row.email) { setMessage({ type: "error", text: "Este administrador antigo não possui e-mail salvo no perfil." }); return; }
    try {
      await sendPasswordResetEmail(getFirebaseServices().auth, row.email);
      setMessage({ type: "success", text: `E-mail de redefinição enviado para ${row.email}.` });
    } catch (reason) {
      setMessage({ type: "error", text: firebaseErrorMessage(reason, "Não foi possível enviar o e-mail.") });
    }
  }

  return <div className="operational-admin">
    <section className="panel operational-editor">
      <div className="panel-head"><div><h3><UserPlus size={18} /> Novo administrador</h3><p>Somente o nível 1 pode criar ou alterar acessos administrativos.</p></div></div>
      <form onSubmit={submit}><div className="form-grid">
        <label className="field"><span>Nome completo</span><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label className="field"><span>E-mail</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="field"><span>Senha inicial</span><input type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>O administrador poderá trocar a senha depois.</small></label>
        <label className="field"><span>Nível de acesso</span><select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>{Object.entries(levelNames).map(([level, name]) => <option key={level} value={level}>Nível {level} — {name}</option>)}</select></label>
        <label className="field full"><span>Cargo/função</span><input required value={form.role} placeholder="Ex.: Tesoureiro, Comunicação, TI" onChange={(event) => setForm({ ...form, role: event.target.value })} /></label>
      </div>{message && <div className={`form-message ${message.type}`}>{message.text}</div>}<button className="button" disabled={busy}><ShieldCheck size={16} /> {busy ? "Criando…" : "Criar administrador"}</button></form>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>Administradores cadastrados</h3><p>Desativar remove o acesso ao painel, mas preserva o histórico das ações.</p></div></div>
      <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar nome, e-mail, cargo ou UID" /></label>
      {filtered.length === 0 ? <div className="empty-state">Nenhum administrador encontrado.</div> : <div className="admin-role-list">{filtered.map((row) => <article className="admin-role-card" key={row.id}><div><span className={`status ${row.active ? "active" : "suspended"}`}>{row.active ? "Ativo" : "Desativado"}</span><h3>{row.fullName || row.role || "Administrador"}</h3><p>{row.email || `UID: ${row.id}`}</p></div><label className="field"><span>Nível</span><select value={row.level || 5} disabled={busy || row.id === currentUid} onChange={(event) => updateAdmin(row, { level: Number(event.target.value) })}>{Object.keys(levelNames).map((level) => <option key={level} value={level}>Nível {level}</option>)}</select></label><label className="field"><span>Função</span><input defaultValue={row.role || "Administrador"} disabled={busy} onBlur={(event) => event.target.value !== row.role && updateAdmin(row, { role: event.target.value })} /></label><div className="table-actions"><button type="button" className="button button-sm button-dark" onClick={() => resetPassword(row)}><KeyRound size={14} /> Redefinir senha</button><button type="button" className={row.active ? "table-action-danger" : "button button-sm"} disabled={busy || row.id === currentUid} onClick={() => updateAdmin(row, { active: !row.active })}>{row.active ? <><UserX size={14} /> Desativar</> : <><Save size={14} /> Reativar</>}</button></div></article>)}</div>}
    </section>
  </div>;
}
