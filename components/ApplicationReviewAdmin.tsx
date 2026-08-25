"use client";

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
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  KeyRound,
  Search,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import {
  firebaseConfig,
  firebaseEnabled,
  getFirebaseServices,
} from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";

type ApplicationRow = {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  status?: string;
  memberNumber?: string;
  applicantUid?: string;
  authAccountCreated?: boolean;
  createdAt?: Timestamp;
};

type Credentials = { email: string; password?: string; memberNumber: string };

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function friendlyError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use")
      return "Este e-mail já possui uma conta de acesso. Confira a lista de associados antes de aprovar.";
    if (error.code === "auth/weak-password")
      return "A senha temporária precisa ter pelo menos 8 caracteres.";
    if (error.code === "permission-denied")
      return "Sua conta administrativa não possui permissão para revisar inscrições.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a análise.";
}

function date(value?: Timestamp) {
  return (
    value
      ?.toDate()
      .toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) ||
    "—"
  );
}

function statusLabel(status?: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Recusado";
  return "Pendente";
}

async function uniqueMemberNumber() {
  const { db } = getFirebaseServices();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const number = `AUMM-${new Date().getFullYear()}-${String(random).padStart(6, "0")}`;
    if (!(await getDoc(doc(db, "publicMembers", number))).exists())
      return number;
  }
  throw new Error("Não foi possível gerar um número único. Tente novamente.");
}

export function ApplicationReviewAdmin() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    if (!firebaseEnabled) return;
    const { db } = getFirebaseServices();
    return onSnapshot(
      query(
        collection(db, "associationApplications"),
        orderBy("createdAt", "desc"),
      ),
      (snapshot) =>
        setApplications(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as ApplicationRow,
          ),
        ),
      (error) => setMessage({ type: "error", text: friendlyError(error) }),
    );
  }, []);

  const filtered = useMemo(() => {
    const term = searchable(search);
    if (!term) return applications;
    return applications.filter((item) =>
      searchable(
        [
          item.fullName,
          item.email,
          item.phone,
          item.city,
          item.memberNumber,
          item.id,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(term),
    );
  }, [applications, search]);

  const selected = applications.find((item) => item.id === selectedId);
  const pendingCount = applications.filter(
    (item) => (item.status || "pending") === "pending",
  ).length;

  function openApproval(item: ApplicationRow) {
    setSelectedId(item.id);
    setTemporaryPassword("");
    setCredentials(null);
    setMessage(null);
  }

  async function approve() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    setCredentials(null);
    let secondaryApp: ReturnType<typeof initializeApp> | null = null;
    let secondaryAuth: Auth | null = null;
    let createdUser: User | null = null;

    try {
      if (!firebaseEnabled) throw new Error("Firebase não configurado.");
      if ((selected.status || "pending") !== "pending")
        throw new Error("Esta inscrição já foi analisada.");
      if (!selected.email)
        throw new Error("A inscrição não possui e-mail válido.");
      const accountPrepared = selected.authAccountCreated === true;
      if (!accountPrepared && temporaryPassword.length < 8)
        throw new Error(
          "Crie uma senha temporária com pelo menos 8 caracteres.",
        );

      const { auth, db } = getFirebaseServices();
      if (!auth.currentUser)
        throw new Error("A sessão administrativa expirou. Entre novamente.");
      const email = selected.email.trim().toLowerCase();
      const phone = selected.phone?.trim() || "";
      const duplicateQueries = [
        getDocs(
          query(
            collection(db, "associados"),
            where("email", "==", email),
            limit(1),
          ),
        ),
      ];
      if (phone)
        duplicateQueries.push(
          getDocs(
            query(
              collection(db, "associados"),
              where("phone", "==", phone),
              limit(1),
            ),
          ),
        );
      const duplicates = await Promise.all(duplicateQueries);
      if (duplicates.some((result) => !result.empty))
        throw new Error(
          "Esta pessoa já aparece na lista de associados. Pesquise pelo e-mail ou telefone antes de continuar.",
        );

      let memberUid = selected.applicantUid || "";
      if (accountPrepared) {
        if (!memberUid)
          throw new Error("A conta desta inscrição está incompleta. Revise o cadastro no Firebase.");
      } else {
        secondaryApp = initializeApp(
          firebaseConfig,
          `application-approval-${crypto.randomUUID()}`,
        );
        secondaryAuth = initializeAuth(secondaryApp, {
          persistence: inMemoryPersistence,
        });
        const credential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          temporaryPassword,
        );
        createdUser = credential.user;
        memberUid = createdUser.uid;
      }

      const memberNumber = await uniqueMemberNumber();
      const verificationToken = crypto.randomUUID().replaceAll("-", "");
      const batch = writeBatch(db);
      batch.set(doc(db, "associados", memberUid), {
        uid: memberUid,
        applicationId: selected.id,
        memberNumber,
        fullName: selected.fullName?.trim() || "Associado",
        email,
        phone,
        city: selected.city?.trim() || "Blumenau",
        role: "Associado",
        status: "active",
        authorized: true,
        source: "public_application",
        approvedBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, "publicMembers", memberNumber), {
        uid: memberUid,
        memberNumber,
        fullName: selected.fullName?.trim() || "Associado",
        role: "Associado",
        status: "active",
        verificationToken,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, "associationApplications", selected.id), {
        status: "approved",
        uid: memberUid,
        memberNumber,
        verificationToken,
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser.uid,
      });
      batch.update(doc(db, "applicationSummaries", selected.id), {
        status: "approved",
        memberNumber,
        reviewedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, "auditLogs")), {
        actorUid: auth.currentUser.uid,
        action: "application.approved",
        resource: "associationApplications",
        resourceId: selected.id,
        memberNumber,
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setCredentials({
        email,
        password: accountPrepared ? undefined : temporaryPassword,
        memberNumber,
      });
      setMessage({
        type: "success",
        text: `${selected.fullName || "Associado"} foi aprovado e já pode acessar o portal.`,
      });
      setSelectedId(null);
      setTemporaryPassword("");
    } catch (error) {
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch {
          /* Remoção manual poderá ser feita no Firebase Authentication. */
        }
      }
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      if (secondaryApp) {
        try {
          if (secondaryAuth) await signOut(secondaryAuth);
        } catch {
          /* Instância secundária já encerrada. */
        }
        await deleteApp(secondaryApp);
      }
      setBusy(false);
    }
  }

  async function reject(item: ApplicationRow) {
    if (
      !window.confirm(
        `Recusar a inscrição de ${item.fullName || "este candidato"}?`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      const { auth, db } = getFirebaseServices();
      if (!auth.currentUser)
        throw new Error("A sessão administrativa expirou. Entre novamente.");
      const batch = writeBatch(db);
      batch.update(doc(db, "associationApplications", item.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser.uid,
      });
      batch.update(doc(db, "applicationSummaries", item.id), {
        status: "rejected",
        reviewedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, "auditLogs")), {
        actorUid: auth.currentUser.uid,
        action: "application.rejected",
        resource: "associationApplications",
        resourceId: item.id,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      if (selectedId === item.id) setSelectedId(null);
      setMessage({
        type: "success",
        text: "Inscrição recusada e registrada no histórico.",
      });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Acesso AUMM\nE-mail: ${credentials.email}\n${credentials.password ? `Senha temporária: ${credentials.password}\n` : "Use a senha escolhida no cadastro.\n"}Número: ${credentials.memberNumber}\nPortal: ${window.location.origin}${withBasePath("/associado/login")}`,
    );
    setMessage({ type: "success", text: "Dados de acesso copiados." });
  }

  return (
    <section className="panel application-review">
      <div className="panel-head">
        <div>
          <h3>
            <ShieldAlert size={18} /> Inscrições para análise
          </h3>
          <p>
            Veja os dados completos e aprove somente depois de conferir
            duplicidades.
          </p>
        </div>
        <span className="demo-badge">{pendingCount} pendentes</span>
      </div>

      <label className="admin-search">
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por nome, e-mail, telefone, cidade ou protocolo"
        />
      </label>

      {message && (
        <div className={`form-message ${message.type}`}>
          {message.type === "success" && <CheckCircle2 size={16} />}{" "}
          {message.text}
        </div>
      )}
      {credentials && (
        <div className="credentials-box">
          <BadgeCheck />
          <div>
            <strong>Acesso liberado · {credentials.memberNumber}</strong>
            <span>{credentials.email}</span>
            <span>{credentials.password ? `Senha temporária: ${credentials.password}` : "Senha definida pelo associado no cadastro"}</span>
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

      {filtered.length === 0 ? (
        <div className="empty-state">Nenhuma inscrição encontrada.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th>Enviado em</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.fullName || "Sem nome"}</strong>
                    <small className="table-subline">
                      {item.id.slice(0, 12).toUpperCase()}
                    </small>
                  </td>
                  <td>
                    {item.email || "—"}
                    <small className="table-subline">{item.phone || "—"}</small>
                  </td>
                  <td>{item.city || "—"}</td>
                  <td>{date(item.createdAt)}</td>
                  <td>
                    <span className={`status ${item.status || "pending"}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    {(item.status || "pending") === "pending" ? (
                      <div className="table-actions">
                        <button
                          className="button button-sm"
                          type="button"
                          onClick={() => openApproval(item)}
                        >
                          <UserCheck size={14} /> Aprovar
                        </button>
                        <button
                          className="table-action-danger"
                          type="button"
                          onClick={() => reject(item)}
                          disabled={busy}
                        >
                          <XCircle size={15} /> Recusar
                        </button>
                      </div>
                    ) : (
                      <strong>{item.memberNumber || "Analisado"}</strong>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="approval-box">
          <div>
            <span className="eyebrow">Confirmar aprovação</span>
            <h3>{selected.fullName}</h3>
            <p>
              {selected.email} · {selected.phone || "sem telefone"}
            </p>
          </div>
          {selected.authAccountCreated ? (
            <div className="approval-password-ready">
              <BadgeCheck size={22} />
              <span><strong>Senha já definida</strong><small>O associado usará a senha escolhida no cadastro.</small></span>
            </div>
          ) : (
            <label className="field">
              <span>
                <KeyRound size={14} /> Senha temporária do associado antigo
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                minLength={8}
                placeholder="Mínimo de 8 caracteres"
              />
            </label>
          )}
          <div className="approval-actions">
            <button
              type="button"
              className="button"
              onClick={approve}
              disabled={busy}
            >
              {busy ? (
                "Aprovando…"
              ) : (
                <>
                  <UserCheck size={16} /> Aprovar e liberar acesso
                </>
              )}
            </button>
            <button
              type="button"
              className="button button-dark"
              onClick={() => setSelectedId(null)}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
