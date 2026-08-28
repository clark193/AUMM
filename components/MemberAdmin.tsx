"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { deleteApp, FirebaseError, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  inMemoryPersistence,
  initializeAuth,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  MessageCircle,
} from "lucide-react";
import {
  firebaseConfig,
  firebaseEnabled,
  getFirebaseServices,
} from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { BulkMemberImport } from "./BulkMemberImport";
import { maskBirthDate, maskCpf, maskWhatsapp, onlyDigits, parseBrazilianDate, validCpf } from "@/lib/membershipValidation";
import { writeAdminAudit } from "@/lib/audit";

type MemberRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  cpf?: string;
  memberNumber?: string;
  status: string;
  eligibleToVote?: boolean;
  authorized?: boolean;
  birthDate?: Timestamp;
  category?: string;
  whatsapp?: string;
  createdAt?: Timestamp;
  authAccountCreated?: boolean;
};

const emptyForm = {
  fullName: "",
  birthDate: "",
  cpf: "",
  whatsapp: "",
  email: "",
  category: "" as "" | "Motoboy" | "Ciclista",
};

function friendlyError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use")
      return "Já existe uma conta de login com este e-mail.";
    if (error.code === "auth/weak-password")
      return "A senha temporária precisa ter pelo menos 6 caracteres.";
    if (error.code === "auth/operation-not-allowed")
      return "Ative o provedor E-mail/senha no Firebase Authentication para criar logins.";
    if (error.code === "permission-denied")
      return "Seu nível não possui permissão para cadastrar associados.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir o cadastro.";
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
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<MemberRow | null>(null);

  useEffect(() => {
    if (!firebaseEnabled || registrationOnly) return;
    const { db } = getFirebaseServices();
    return onSnapshot(
      collection(db, "associados"),
      (snapshot) => {
        setMembers(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as MemberRow,
          ),
        );
      },
      (error) => setMessage({ type: "error", text: friendlyError(error) }),
    );
  }, [registrationOnly]);

  const filteredMembers = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const term = normalize(search).trim();
    return members.filter((member) => {
      const matchesSearch = !term || normalize([member.fullName, member.email, member.phone, member.whatsapp, member.city, member.cpf, member.memberNumber, member.category].filter(Boolean).join(" ")).includes(term);
      return matchesSearch && (statusFilter === "all" || member.status === statusFilter) && (categoryFilter === "all" || member.category === categoryFilter);
    });
  }, [members, search, statusFilter, categoryFilter]);

  function update(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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
      const cpf = onlyDigits(form.cpf);
      const birthDate = parseBrazilianDate(form.birthDate);
      const whatsapp = maskWhatsapp(form.whatsapp);
      if (!validCpf(cpf)) throw new Error("Informe um CPF válido.");
      if (!birthDate) throw new Error("Informe uma data de nascimento válida.");
      if (!form.category) throw new Error("Selecione Motoboy ou Ciclista.");

      const { auth, db } = getFirebaseServices();
      if (!auth.currentUser)
        throw new Error("A sessão administrativa expirou. Entre novamente.");

      const email = form.email.trim().toLowerCase();
      const [duplicateEmail, duplicatePhone, duplicateCpf] = await Promise.all([
        getDocs(query(collection(db, "associados"), where("email", "==", email), limit(1))),
        getDocs(query(collection(db, "associados"), where("phone", "==", whatsapp), limit(1))),
        getDocs(query(collection(db, "associados"), where("cpf", "==", cpf), limit(1))),
      ]);
      if (!duplicateEmail.empty || !duplicatePhone.empty || !duplicateCpf.empty)
        throw new Error("Já existe um associado cadastrado com este e-mail, WhatsApp ou CPF.");

      let memberId = `pending-${crypto.randomUUID()}`;
      if (authorizeNow) {
        secondaryApp = initializeApp(
          firebaseConfig,
          `member-registration-${crypto.randomUUID()}`,
        );
        secondaryAuth = initializeAuth(secondaryApp, {
          persistence: inMemoryPersistence,
        });
        const credential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          cpf,
        );
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
        phone: whatsapp,
        whatsapp,
        cpf,
        birthDate: Timestamp.fromDate(birthDate),
        category: form.category,
        role: "Associado",
        status: authorizeNow ? "active" : "pending",
        authorized: authorizeNow,
        authAccountCreated: authorizeNow,
        eligibleToVote: authorizeNow,
        mustChangePassword: authorizeNow,
        source: "admin_manual",
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (authorizeNow)
        batch.set(doc(db, "publicMembers", memberNumber), {
          uid: memberId,
          memberNumber,
          fullName: form.fullName.trim(),
          role: "Associado",
          status: "active",
          updatedAt: serverTimestamp(),
        });
      await batch.commit();
      await writeAdminAudit({ action: "MEMBER_CREATED", resource: "associados", resourceId: memberId, description: `Cadastrou o associado ${form.fullName.trim()}${authorizeNow ? " e criou o acesso ao portal" : " como pendente"}.` }).catch(() => undefined);

      if (authorizeNow) {
        setCredentials({ email, password: cpf });
        setMessage({
          type: "success",
          text: `${form.fullName.trim()} foi cadastrado e já pode entrar no portal.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `${form.fullName.trim()} foi cadastrado como pendente, sem acesso ao portal.`,
        });
      }
      setForm(emptyForm);
    } catch (error) {
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch {
          /* A conta órfã pode ser removida no console do Firebase. */
        }
      }
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      if (secondaryApp) {
        try {
          if (secondaryAuth) await signOut(secondaryAuth);
        } catch {
          /* instância já encerrada */
        }
        await deleteApp(secondaryApp);
      }
      setBusy(false);
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Acesso AUMM\nE-mail: ${credentials.email}\nSenha temporária: ${credentials.password}\nPortal: ${window.location.origin}${withBasePath("/associado/login")}`,
    );
    setMessage({ type: "success", text: "Dados de acesso copiados." });
  }

  async function toggleVotingEligibility(member: MemberRow) {
    try {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, "associados", member.id), {
        eligibleToVote: member.eligibleToVote === false,
        updatedAt: serverTimestamp(),
      });
      await writeAdminAudit({ action: "MEMBER_VOTE_UPDATED", resource: "associados", resourceId: member.id, description: `${member.eligibleToVote === false ? "Habilitou" : "Desabilitou"} o direito a voto de ${member.fullName}.` }).catch(() => undefined);
      setSelected((current) => current?.id === member.id ? { ...current, eligibleToVote: member.eligibleToVote === false } : current);
      setMessage({
        type: "success",
        text: `Direito a voto de ${member.fullName} atualizado.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    }
  }

  async function changeStatus(member: MemberRow, status: "active" | "inactive" | "pending") {
    try {
      const { db } = getFirebaseServices(); const batch = writeBatch(db);
      batch.update(doc(db, "associados", member.id), { status, authorized: status === "active", ...(status !== "active" ? { eligibleToVote: false } : {}), updatedAt: serverTimestamp() });
      if (member.memberNumber) batch.set(doc(db, "publicMembers", member.memberNumber), { uid: member.id, memberNumber: member.memberNumber, fullName: member.fullName, role: "Associado", status, updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit(); setSelected((current) => current?.id === member.id ? { ...current, status, authorized: status === "active", ...(status !== "active" ? { eligibleToVote: false } : {}) } : current);
      await writeAdminAudit({ action: "MEMBER_STATUS_UPDATED", resource: "associados", resourceId: member.id, description: `Alterou a situação de ${member.fullName} para ${statusName(status)}.` }).catch(() => undefined);
      setMessage({ type: "success", text: `Situação de ${member.fullName} atualizada.` });
    } catch (error) { setMessage({ type: "error", text: friendlyError(error) }); }
  }

  const statusName = (status: string) => status === "active" ? "Ativo" : status === "inactive" ? "Inativo" : "Pendente";
  const birthDate = (value?: Timestamp) => value?.toDate().toLocaleDateString("pt-BR", { timeZone: "UTC" }) || "—";

  return (
    <>
      {registrationOnly && <><section className="panel member-registration">
        <div className="panel-head">
          <div>
            <h3>
              <UserPlus size={18} /> Novo associado
            </h3>
            <p>Cadastro manual disponível para administradores autorizados.</p>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span>Nome completo</span>
              <input
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                minLength={3}
                maxLength={160}
                required
              />
            </label>
            <label className="field">
              <span>Data de nascimento</span>
              <input
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={form.birthDate}
                onChange={(event) => update("birthDate", maskBirthDate(event.target.value))}
                required
              />
            </label>
            <label className="field">
              <span>CPF</span>
              <input
                inputMode="numeric"
                placeholder="000.000.000-00"
                maxLength={14}
                value={form.cpf}
                onChange={(event) => update("cpf", maskCpf(event.target.value))}
                required
              />
            </label>
            <label className="field">
              <span>WhatsApp</span>
              <input
                inputMode="numeric"
                placeholder="(47) 99999-9999"
                maxLength={15}
                value={form.whatsapp}
                onChange={(event) => update("whatsapp", maskWhatsapp(event.target.value))}
                required
              />
            </label>
            <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></label>
            <fieldset className="membership-category full"><legend>Como trabalha?</legend><label><input type="radio" name="admin-category" checked={form.category === "Motoboy"} onChange={() => update("category", "Motoboy")} required /><span>Motoboy</span></label><label><input type="radio" name="admin-category" checked={form.category === "Ciclista"} onChange={() => update("category", "Ciclista")} required /><span>Ciclista</span></label></fieldset>
            {authorizeNow && <div className="form-message info full"><KeyRound size={16} /> A senha inicial será o CPF. No primeiro acesso, a pessoa deverá criar uma senha pessoal.</div>}
          </div>
          <label className="authorization-switch">
            <input
              type="checkbox"
              checked={authorizeNow}
              onChange={(event) => setAuthorizeNow(event.target.checked)}
            />
            <span className="switch-track" aria-hidden="true">
              <i />
            </span>
            <span>
              <strong>Autorizar acesso agora</strong>
              <small>
                {authorizeNow
                  ? "Ligado: cria o login e ativa o associado imediatamente."
                  : "Desligado: salva como pendente e não cria login."}
              </small>
            </span>
          </label>
          {message && (
            <div className={`form-message ${message.type}`}>
              {message.type === "success" && <CheckCircle2 size={16} />}{" "}
              {message.text}
            </div>
          )}
          {credentials && (
            <div className="credentials-box">
              <ShieldCheck />
              <div>
                <strong>Login criado</strong>
                <span>{credentials.email}</span>
                <span>Senha temporária: {credentials.password}</span>
              </div>
              <button
                type="button"
                className="button button-sm button-dark"
                onClick={copyCredentials}
              >
                <Copy size={15} /> Copiar acesso
              </button>
            </div>
          )}
          <button className="button" disabled={busy}>
            <Save size={16} />{" "}
            {busy
              ? "Cadastrando..."
              : authorizeNow
                ? "Cadastrar e autorizar"
                : "Cadastrar como pendente"}
          </button>
        </form>
      </section><BulkMemberImport /></>}

      {!registrationOnly && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Associados cadastrados</h3>
              <p>Registros reais do Firebase.</p>
            </div>
            <span className="demo-badge">{members.length} registros</span>
          </div>
          <label className="admin-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar associado por nome, e-mail, telefone, CPF ou número"
            />
          </label>
          <div className="member-list-filters"><label className="field"><span>Situação</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="pending">Pendentes</option></select></label><label className="field"><span>Categoria</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas</option><option value="Motoboy">Motoboy</option><option value="Ciclista">Ciclista</option></select></label></div>
          {filteredMembers.length === 0 ? (
            <div className="empty-state">
              {members.length === 0
                ? "Nenhum associado cadastrado ainda."
                : "Nenhum associado corresponde à pesquisa."}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Número</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th>Voto</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.fullName}</strong>
                      </td>
                      <td>{member.memberNumber || "—"}</td>
                      <td>{member.email}</td>
                      <td>{member.phone || "—"}</td>
                      <td>{member.category || "—"}</td>
                      <td>
                        <span className={`status ${member.status}`}>
                          {statusName(member.status)}
                        </span>
                      </td>
                      <td>
                        <div className="member-table-actions"><button
                          type="button"
                          className="button button-sm button-dark"
                          onClick={() => toggleVotingEligibility(member)}
                          disabled={member.status !== "active"}
                        >
                          {member.status === "active" && member.eligibleToVote !== false
                            ? "Habilitado"
                            : "Desabilitado"}
                        </button></div>
                      </td>
                      <td><div className="member-table-actions"><button type="button" className="button button-sm" onClick={() => setSelected(member)}>Abrir cadastro</button>{(member.whatsapp || member.phone) && <a className="whatsapp-button" href={`https://wa.me/55${(member.whatsapp || member.phone).replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer" aria-label={`Conversar com ${member.fullName} pelo WhatsApp`}><MessageCircle /> WhatsApp</a>}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {selected && <div className="document-modal member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="member-detail-title"><article><button className="modal-close" type="button" onClick={() => setSelected(null)}>×</button><span className="eyebrow">Cadastro completo</span><h1 id="member-detail-title">{selected.fullName}</h1><div className="member-detail-status"><span className={`status ${selected.status}`}>{statusName(selected.status)}</span><span>{selected.memberNumber || "Sem número"}</span></div><dl className="membership-details"><div><dt>Nome completo</dt><dd>{selected.fullName}</dd></div><div><dt>Data de nascimento</dt><dd>{birthDate(selected.birthDate)}</dd></div><div><dt>CPF</dt><dd>{selected.cpf ? maskCpf(selected.cpf) : "—"}</dd></div><div><dt>WhatsApp</dt><dd>{selected.whatsapp || selected.phone || "—"}</dd></div><div><dt>E-mail</dt><dd>{selected.email || "—"}</dd></div><div><dt>Categoria</dt><dd>{selected.category || "—"}</dd></div><div><dt>Direito a voto</dt><dd>{selected.eligibleToVote !== false ? "Habilitado" : "Desabilitado"}</dd></div><div><dt>Cadastrado em</dt><dd>{selected.createdAt?.toDate().toLocaleString("pt-BR") || "—"}</dd></div></dl><div className="member-detail-actions">{(selected.whatsapp || selected.phone) && <a className="button" href={`https://wa.me/55${(selected.whatsapp || selected.phone || "").replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer"><MessageCircle /> Abrir WhatsApp</a>}<button className="button button-dark" type="button" onClick={() => toggleVotingEligibility(selected)} disabled={selected.status !== "active"}>{selected.eligibleToVote !== false ? "Desabilitar voto" : "Habilitar voto"}</button>{selected.status === "active" ? <button className="table-action-danger" type="button" onClick={() => changeStatus(selected, "inactive")}>Deixar inativo</button> : !selected.id.startsWith("pending-") && <button className="button" type="button" onClick={() => changeStatus(selected, "active")}>Ativar cadastro</button>}</div>{selected.id.startsWith("pending-") && <div className="form-message info">Este registro ainda não possui conta de acesso. Faça um novo cadastro autorizado para criar o login.</div>}</article></div>}
    </>
  );
}
