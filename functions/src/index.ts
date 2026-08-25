import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { createHash, randomUUID } from "node:crypto";

initializeApp();
const db = getFirestore();

function requirePermission(
  auth: Parameters<Parameters<typeof onCall>[0]>[0]["auth"],
  permission: string,
) {
  if (!auth) throw new HttpsError("unauthenticated", "Autenticação obrigatória.");
  const claims = auth.token as Record<string, unknown>;
  const permissions = (claims.permissions || {}) as Record<string, boolean>;
  if (claims.admin !== true && permissions[permission] !== true) {
    throw new HttpsError("permission-denied", "Permissão insuficiente.");
  }
}

function cleanText(value: unknown, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export const createApplication = onCall(
  { region: "southamerica-east1", enforceAppCheck: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Não foi possível validar a sessão.");
    const data = request.data || {};
    const cpf = cleanText(data.cpf, 30).replace(/\D/g, "");
    const email = cleanText(data.email, 254).toLowerCase();
    const fullName = cleanText(data.fullName, 160);
    if (cpf.length !== 11) throw new HttpsError("invalid-argument", "CPF inválido.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError("invalid-argument", "E-mail inválido.");
    if (fullName.length < 3) throw new HttpsError("invalid-argument", "Nome inválido.");
    if (data.consent !== true) throw new HttpsError("failed-precondition", "Consentimento obrigatório.");

    const applicationId = sha256(`cpf:${cpf}`);
    const emailKey = sha256(`email:${email}`);
    const appRef = db.collection("associationApplications").doc(applicationId);
    const emailRef = db.collection("applicationKeys").doc(emailKey);
    await db.runTransaction(async (transaction) => {
      const [existing, existingEmail] = await Promise.all([transaction.get(appRef), transaction.get(emailRef)]);
      if (existing.exists || existingEmail.exists) {
        throw new HttpsError("already-exists", "Já existe uma solicitação para este CPF ou e-mail.");
      }
      transaction.create(appRef, {
        fullName,
        cpf,
        email,
        birthDate: cleanText(data.birthDate, 10),
        phone: cleanText(data.phone, 30),
        whatsapp: cleanText(data.whatsapp, 30),
        cep: cleanText(data.cep, 12),
        address: cleanText(data.address, 180),
        number: cleanText(data.number, 20),
        district: cleanText(data.district, 100),
        city: cleanText(data.city, 100),
        state: cleanText(data.state, 2).toUpperCase(),
        cnh: cleanText(data.cnh, 30),
        cnhCategory: cleanText(data.cnhCategory, 5),
        cnhExpiry: cleanText(data.cnhExpiry, 10),
        motorcyclePlate: cleanText(data.motorcyclePlate, 12).toUpperCase(),
        motorcycleModel: cleanText(data.motorcycleModel, 100),
        motorcycleYear: cleanText(data.motorcycleYear, 4),
        notes: cleanText(data.notes, 2000),
        consent: true,
        consentVersion: "2026-08",
        consentAt: FieldValue.serverTimestamp(),
        applicantUid: request.auth!.uid,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.create(emailRef, { applicationId, createdAt: FieldValue.serverTimestamp() });
    });
    return { applicationId };
  },
);

export const approveApplication = onCall(
  { region: "southamerica-east1", enforceAppCheck: true },
  async (request) => {
    requirePermission(request.auth, "applications.review");
    const applicationId = cleanText(request.data?.applicationId, 80);
    if (!applicationId) throw new HttpsError("invalid-argument", "applicationId obrigatório.");
    const appRef = db.collection("associationApplications").doc(applicationId);
    const preflight = await appRef.get();
    if (!preflight.exists) throw new HttpsError("not-found", "Cadastro não encontrado.");
    const preflightData = preflight.data()!;
    const uid = preflightData.applicantUid as string;
    const email = preflightData.email as string;
    await getAuth().updateUser(uid, { email, displayName: preflightData.fullName as string, disabled: false });

    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(appRef);
      if (!snap.exists) throw new HttpsError("not-found", "Cadastro não encontrado.");
      const application = snap.data()!;
      if (application.status === "approved") throw new HttpsError("already-exists", "Cadastro já aprovado.");
      const counterRef = db.collection("counters").doc("members");
      const counter = await transaction.get(counterRef);
      const next = (counter.data()?.nextNumber || 1001) as number;
      const format = counter.data()?.format || "AUMM-{number}";
      const memberNumber = String(format).replace("{number}", String(next));
      const verificationToken = randomUUID();

      transaction.set(db.collection("associados").doc(uid), {
        uid, applicationId, memberNumber, fullName: application.fullName, email: application.email,
        status: "active", roleIds: [], joinedAt: FieldValue.serverTimestamp(),
        approvedBy: request.auth!.uid, createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(db.collection("publicMembers").doc(verificationToken), {
        fullName: application.fullName, memberNumber, status: "active", primaryRole: "Associado",
        public: true, updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(appRef, {
        status: "approved", memberNumber, approvedAt: FieldValue.serverTimestamp(),
        approvedBy: request.auth!.uid, verificationToken,
      });
      transaction.set(counterRef, { nextNumber: next + 1, format }, { merge: true });
      transaction.create(db.collection("auditLogs").doc(), {
        actorUid: request.auth!.uid, action: "application.approved",
        resource: "associationApplications", resourceId: applicationId,
        memberNumber, createdAt: FieldValue.serverTimestamp(),
      });
      return { memberNumber, verificationToken };
    });
    const activationLink = await getAuth().generatePasswordResetLink(email, {
      url: process.env.PUBLIC_SITE_URL || "https://aumm.com.br/associado/login",
    });
    return { ...result, activationLink };
  },
);

export const setAdminRole = onCall(
  { region: "southamerica-east1", enforceAppCheck: true },
  async (request) => {
    if (request.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Somente Super Admin.");
    const uid = cleanText(request.data?.uid, 128);
    const role = cleanText(request.data?.role, 60);
    const permissions = request.data?.permissions || {};
    await getAuth().setCustomUserClaims(uid, { adminRole: role, permissions });
    await db.collection("auditLogs").add({
      actorUid: request.auth.uid, action: "admin.role.updated", resource: "users",
      resourceId: uid, role, createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  },
);
