import { randomUUID } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { hasAdminMembership } from "./adminMembership.js";

export class MemberProfileError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const optionalFields = ["city", "state", "address", "rg", "issuingBody", "maritalStatus", "dependents", "bloodType", "emergencyContact"] as const;
const requiredFields = ["fullName", "email", "cpf", "whatsapp", "birthDate", "category"] as const;
const editableFields: readonly string[] = [...requiredFields, ...optionalFields];
const digits = (value: string) => value.replace(/\D/g, "");
function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (size: number) => { const n = [...cpf.slice(0, size)].reduce((sum, v, i) => sum + Number(v) * (size + 1 - i), 0) * 10 % 11; return n === 10 ? 0 : n; };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
export function normalizeMemberProfile(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MemberProfileError(400, "Dados inválidos.");
  const values = input as Record<string, unknown>;
  if (Object.keys(values).some(key => !editableFields.includes(key))) throw new MemberProfileError(400, "O formulário contém campos que não podem ser editados aqui.");
  const text = (key: string) => {
    const value = values[key];
    if (typeof value !== "string" || value.length > (key === "address" ? 600 : 200)) throw new MemberProfileError(400, `Valor inválido no campo ${key}.`);
    return value.trim();
  };
  const fullName = text("fullName"), email = text("email").toLowerCase(), cpf = digits(text("cpf"));
  const phoneDigits = digits(text("whatsapp")), category = text("category"), birth = text("birthDate");
  if (fullName.length < 3) throw new MemberProfileError(400, "Informe o nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MemberProfileError(400, "Informe um e-mail válido.");
  if (!validCpf(cpf)) throw new MemberProfileError(400, "Informe um CPF válido.");
  if (![10, 11].includes(phoneDigits.length)) throw new MemberProfileError(400, "Informe um WhatsApp com DDD.");
  if (!["Motoboy", "Ciclista"].includes(category)) throw new MemberProfileError(400, "Selecione Motoboy ou Ciclista.");
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birth);
  const day = Number(match?.[1]), month = Number(match?.[2]), year = Number(match?.[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (!match || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getTime() > Date.now() || year < 1900) throw new MemberProfileError(400, "Informe uma data de nascimento válida.");
  const whatsapp = phoneDigits.length === 11 ? phoneDigits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : phoneDigits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  const result: Record<string, unknown> = { fullName, email, cpf, whatsapp, phone: whatsapp, category, birthDate: Timestamp.fromDate(date) };
  for (const key of optionalFields) if (key in values) result[key] = text(key);
  if ("state" in result) { result.state = String(result.state).toUpperCase(); if (result.state && !/^[A-Z]{2}$/.test(String(result.state))) throw new MemberProfileError(400, "Informe a UF com duas letras."); }
  return result;
}

export async function updateMemberProfile(bearer: string, input: Record<string, unknown>) {
  const auth = getAuth(), db = getFirestore();
  let identity;
  try { identity = await auth.verifyIdToken(bearer, true); } catch { throw new MemberProfileError(401, "Sua sessão expirou. Entre novamente."); }
  const role = (await db.doc(`adminRoles/${identity.uid}`).get()).data();
  if (role?.active !== true || ![1, "1"].includes(role.level) || !await hasAdminMembership(identity.uid, role)) throw new MemberProfileError(403, "Somente administradores ativos de nível 1 podem editar estes dados.");
  if (typeof input.memberId !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(input.memberId)) throw new MemberProfileError(400, "Cadastro inválido.");
  if (input.expectedVersion !== null && (typeof input.expectedVersion !== "number" || !Number.isFinite(input.expectedVersion))) throw new MemberProfileError(400, "Reabra o cadastro antes de editar.");
  const updates = normalizeMemberProfile(input.updates);
  const memberRef = db.doc(`associados/${input.memberId}`), lockRef = db.doc(`adminProfileEditLocks/${input.memberId}`), lockId = randomUUID();
  const version = (data: FirebaseFirestore.DocumentData | undefined) => (data?.updatedAt as Timestamp | undefined)?.toMillis?.() ?? null;
  const member = await db.runTransaction(async tx => {
    const [snapshot, lock] = await Promise.all([tx.get(memberRef), tx.get(lockRef)]);
    if (!snapshot.exists) throw new MemberProfileError(404, "Cadastro não encontrado.");
    if (version(snapshot.data()) !== input.expectedVersion) throw new MemberProfileError(409, "O cadastro foi atualizado. Feche e abra novamente antes de editar.");
    if (((lock.data()?.expiresAt as Timestamp | undefined)?.toMillis() ?? 0) > Date.now()) throw new MemberProfileError(409, "Outra alteração está em andamento. Aguarde e tente novamente.");
    tx.set(lockRef, { lockId, expiresAt: Timestamp.fromMillis(Date.now() + 120000) });
    return snapshot.data()!;
  });
  let originalUser: Awaited<ReturnType<typeof auth.getUser>> | null = null;
  let authChanged = false, committed = false;
  try {
    const targetUid = typeof member.uid === "string" && member.uid ? member.uid : null;
    if (targetUid) {
      if (targetUid.includes("/")) throw new MemberProfileError(400, "Login vinculado inválido.");
      originalUser = await auth.getUser(targetUid);
      if (originalUser.email?.toLowerCase() !== updates.email && Date.now() / 1000 - identity.auth_time > 300) throw new MemberProfileError(401, "Confirme sua senha de administrador para alterar o e-mail de acesso.");
    }
    // Check conflicts before touching Authentication; repeat in the commit transaction.
    async function duplicates(tx?: FirebaseFirestore.Transaction) {
      const checks = [
        db.collection("associados").where("email", "==", updates.email).limit(2),
        db.collection("associados").where("cpf", "in", [updates.cpf, String(updates.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")]).limit(2),
        db.collection("associados").where("phone", "==", updates.phone).limit(2),
        db.collection("associados").where("whatsapp", "==", updates.whatsapp).limit(2),
      ];
      const snapshots = await Promise.all(checks.map(q => tx ? tx.get(q) : q.get()));
      if (snapshots.some(snapshot => snapshot.docs.some(d => d.id !== memberRef.id))) throw new MemberProfileError(409, "Já existe outro cadastro com este e-mail, CPF ou WhatsApp.");
    }
    await duplicates();
    if (originalUser && (originalUser.email?.toLowerCase() !== updates.email || originalUser.displayName !== updates.fullName)) {
      await auth.updateUser(originalUser.uid, { email: String(updates.email), displayName: String(updates.fullName), ...(originalUser.email?.toLowerCase() !== updates.email ? { emailVerified: false } : {}) });
      authChanged = true;
    }
    await db.runTransaction(async tx => {
      const actorMemberId = typeof role.memberId === "string" ? role.memberId : identity.uid;
      const [current, lock, currentRole, actorMember, publicCards, targetRole, targetCard] = await Promise.all([
        tx.get(memberRef), tx.get(lockRef), tx.get(db.doc(`adminRoles/${identity.uid}`)), tx.get(db.doc(`associados/${actorMemberId}`)),
        targetUid ? tx.get(db.collection("publicMembers").where("uid", "==", targetUid).limit(101)) : Promise.resolve(null),
        targetUid ? tx.get(db.doc(`adminRoles/${targetUid}`)) : Promise.resolve(null),
        targetUid ? tx.get(db.doc(`adminCards/${targetUid}`)) : Promise.resolve(null),
      ]);
      if (currentRole.data()?.active !== true || ![1, "1"].includes(currentRole.data()?.level) || actorMember.data()?.status !== "active" || actorMember.data()?.uid !== identity.uid) throw new MemberProfileError(403, "Seu acesso administrativo foi revogado.");
      if (lock.data()?.lockId !== lockId || !current.exists || version(current.data()) !== input.expectedVersion || current.data()?.uid !== member.uid) throw new MemberProfileError(409, "O cadastro mudou durante a edição. Reabra o cadastro.");
      if (publicCards && publicCards.size > 100) throw new MemberProfileError(409, "Há muitas credenciais vinculadas. Procure o suporte.");
      await duplicates(tx);
      // Pending profiles also have a public member record even before a login exists.
      const memberNumber = typeof member.memberNumber === "string" && !member.memberNumber.includes("/") ? member.memberNumber : "";
      const ownPublic = memberNumber ? await tx.get(db.doc(`publicMembers/${memberNumber}`)) : null;
      if (ownPublic?.exists && ownPublic.data()?.uid !== (targetUid || memberRef.id)) throw new MemberProfileError(409, "A credencial está vinculada a outro cadastro. Confira o número do associado.");
      tx.update(memberRef, { ...updates, updatedAt: FieldValue.serverTimestamp() });
      const cards = new Map((publicCards?.docs || []).map(card => [card.id, card]));
      if (ownPublic?.exists) cards.set(ownPublic.id, ownPublic as FirebaseFirestore.QueryDocumentSnapshot);
      for (const card of cards.values()) tx.update(card.ref, { fullName: updates.fullName, updatedAt: FieldValue.serverTimestamp() });
      if (targetRole?.exists) tx.update(targetRole.ref, { fullName: updates.fullName, email: updates.email, updatedAt: FieldValue.serverTimestamp() });
      if (targetCard?.exists) tx.update(targetCard.ref, { fullName: updates.fullName, updatedAt: FieldValue.serverTimestamp() });
      tx.create(db.collection("auditLogs").doc(), { action: "MEMBER_PROFILE_UPDATED", resource: "associados", resourceId: memberRef.id,
        actorUid: identity.uid, actorName: String(role.fullName || identity.email || "Administrador"), actorEmail: identity.email || "", actorRole: String(role.role || "Administrador"), actorLevel: 1,
        description: "Administrador nível 1 atualizou os dados do associado e sincronizou o login e as credenciais.", fields: Object.keys(updates), timestamp: FieldValue.serverTimestamp() });
      tx.delete(lockRef);
    });
    committed = true;
  } catch (error) {
    if (authChanged && originalUser && !committed) {
      try { await auth.updateUser(originalUser.uid, { email: originalUser.email, displayName: originalUser.displayName || null, emailVerified: originalUser.emailVerified }); }
      catch { throw new MemberProfileError(503, "Não foi possível concluir a sincronização do login. Reabra o cadastro e confirme o e-mail de acesso antes de orientar o associado."); }
    }
    if (error instanceof MemberProfileError) throw error;
    if ((error as { code?: string }).code === "auth/email-already-exists") throw new MemberProfileError(409, "Este e-mail já pertence a outra conta de login.");
    throw new MemberProfileError(503, "Não foi possível salvar o cadastro. Nenhuma alteração foi concluída. Tente novamente.");
  } finally {
    if (!committed) await db.runTransaction(async tx => { const lock = await tx.get(lockRef); if (lock.data()?.lockId === lockId) tx.delete(lockRef); }).catch(() => {});
  }
  const saved = await memberRef.get();
  return { message: "Cadastro atualizado. Se o e-mail mudou, o próximo acesso deve usar o novo endereço.", updatedAtMillis: (saved.data()?.updatedAt as Timestamp).toMillis() };
}
