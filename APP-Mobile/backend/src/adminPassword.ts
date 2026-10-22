import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

export class AdminPasswordError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function changeMemberPassword(bearer: string, input: Record<string, unknown>) {
  const auth = getAuth(), db = getFirestore();
  let identity;
  try { identity = await auth.verifyIdToken(bearer, true); } catch { throw new AdminPasswordError(401, "Sua sessão expirou. Entre novamente."); }
  const role = (await db.doc(`adminRoles/${identity.uid}`).get()).data();
  if (role?.active !== true || ![1, "1"].includes(role.level)) throw new AdminPasswordError(403, "Somente administradores ativos de nível 1 podem alterar senhas.");
  if (Date.now() / 1000 - identity.auth_time > 300) throw new AdminPasswordError(401, "Confirme novamente sua senha de administrador.");
  const id = input.memberId, password = input.password;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new AdminPasswordError(400, "Cadastro inválido.");
  if (typeof password !== "string" || password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) throw new AdminPasswordError(400, "Use 12 a 128 caracteres, com maiúscula, minúscula e número.");
  const ref = db.doc(`associados/${id}`), member = (await ref.get()).data();
  const target = member?.uid;
  if (typeof target !== "string" || !target || target === identity.uid) throw new AdminPasswordError(400, "Este cadastro não possui um login de associado elegível.");
  if ((await db.doc(`adminRoles/${target}`).get()).data()?.active === true) throw new AdminPasswordError(403, "Contas administrativas não podem ser alteradas por este recurso.");
  await auth.getUser(target);
  // Nenhum valor de senha é persistido, incluído no log ou devolvido ao cliente.
  const audit = db.collection("auditLogs").doc();
  await audit.set({ action: "MEMBER_PASSWORD_CHANGE_STARTED", resource: "associados", resourceId: id,
    actorUid: identity.uid, actorName: String(role.fullName || identity.email || "Administrador"), actorEmail: identity.email || "", actorRole: String(role.role || "Administrador"), actorLevel: 1,
    description: "Administrador iniciou alteração de senha de associado.", timestamp: FieldValue.serverTimestamp() });
  let changed = false;
  try {
    await auth.updateUser(target, { password }); changed = true;
    await auth.revokeRefreshTokens(target);
    const batch = db.batch();
    batch.set(db.doc(`sessionRevocations/${target}`), { validAfter: Math.ceil(Date.now() / 1000), updatedAt: FieldValue.serverTimestamp() });
    batch.update(ref, { mustChangePassword: true, updatedAt: FieldValue.serverTimestamp() });
    batch.update(audit, { action: "MEMBER_PASSWORD_CHANGED", description: "Senha alterada por administrador nível 1; sessões anteriores revogadas. Nova troca exigida no próximo acesso." });
    await batch.commit();
  } catch {
    throw new AdminPasswordError(503, changed ? "A senha foi alterada, mas a finalização de segurança falhou. Tente a operação novamente antes de orientar o associado." : "Não foi possível alterar a senha. Tente novamente.");
  }
  return { message: "Senha alterada. Sessões anteriores revogadas; o associado definirá sua senha pessoal no próximo acesso." };
}
