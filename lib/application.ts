import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";
import { maskWhatsapp, onlyDigits, parseBrazilianDate, validCpf } from "./membershipValidation";
import { STATUTE_VERSION } from "./statute/version";

export { STATUTE_VERSION } from "./statute/version";
export type MembershipCategory = "Motoboy" | "Ciclista";
export type MembershipStatus = "pending" | "under_review" | "approved" | "rejected";
export type ApplicationPayload = { fullName: string; birthDate: string; cpf: string; whatsapp: string; email: string; category: MembershipCategory | ""; statuteAccepted: boolean };
export type MembershipRequestStatus = { requestId: string; status: MembershipStatus; category?: MembershipCategory; submittedAt?: Timestamp; memberNumber?: string };
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function friendlyError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") return new Error("Já existe uma solicitação vinculada aos dados informados ou o serviço está temporariamente indisponível.");
    if (error.code === "auth/operation-not-allowed") return new Error("A solicitação está temporariamente indisponível. A autenticação anônima precisa ser habilitada no Firebase.");
    if (error.code === "unavailable") return new Error("Sem conexão com o serviço. Verifique sua internet e tente novamente.");
  }
  return error instanceof Error ? error : new Error("Não foi possível enviar a solicitação.");
}
export async function ensureApplicantSession(): Promise<User> {
  const { auth } = getFirebaseServices();
  if (auth.currentUser) return auth.currentUser;
  await new Promise<void>((resolve) => { const stop = onAuthStateChanged(auth, () => { stop(); resolve(); }); });
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
export async function loadOwnMembershipRequest(): Promise<MembershipRequestStatus | null> {
  const user = await ensureApplicantSession();
  const { db } = getFirebaseServices();
  const owner = await getDoc(doc(db, "membershipRequestOwners", user.uid));
  if (!owner.exists()) return null;
  const requestId = String(owner.data().requestId || "");
  if (!requestId) return null;
  const request = await getDoc(doc(db, "membershipRequests", requestId));
  return request.exists() ? ({ requestId, ...request.data() } as MembershipRequestStatus) : null;
}
export async function submitApplication(payload: ApplicationPayload) {
  const user = await ensureApplicantSession();
  const { db } = getFirebaseServices();
  const birthDateValue = parseBrazilianDate(payload.birthDate);
  const cpfNormalized = onlyDigits(payload.cpf);
  const emailNormalized = payload.email.trim().toLowerCase();
  const whatsapp = maskWhatsapp(payload.whatsapp);
  if (payload.fullName.trim().length < 3) throw new Error("Informe seu nome completo.");
  if (!birthDateValue) throw new Error("Informe uma data de nascimento válida no formato DD/MM/AAAA.");
  if (!validCpf(cpfNormalized)) throw new Error("Informe um CPF válido.");
  if (onlyDigits(whatsapp).length < 10) throw new Error("Informe um WhatsApp válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) throw new Error("Informe um e-mail válido.");
  if (!payload.category) throw new Error("Selecione Motoboy ou Ciclista.");
  if (!payload.statuteAccepted) throw new Error("É necessário ler e aceitar o Estatuto Social da AUMM.");
  const [cpfHash, emailHash] = await Promise.all([sha256(`aumm:membership:cpf:${cpfNormalized}`), sha256(`aumm:membership:email:${emailNormalized}`)]);
  const requestId = crypto.randomUUID().replaceAll("-", "");
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "membershipRequests", requestId), {
      requestId, ownerUid: user.uid, fullName: payload.fullName.trim(), birthDate: Timestamp.fromDate(birthDateValue),
      cpf: cpfNormalized, cpfNormalized, cpfHash, email: emailNormalized, emailNormalized, emailHash,
      whatsapp, category: payload.category, statuteAccepted: true, statuteVersion: STATUTE_VERSION,
      statuteAcceptedAt: serverTimestamp(), electronicAcceptanceType: "Aceite eletrônico da solicitação de filiação",
      status: "pending", statutoryDocumentVerified: false, submittedAt: serverTimestamp(),
    });
    batch.set(doc(db, "membershipRequestCpfIndex", cpfHash), { requestId, ownerUid: user.uid, cpfHash, createdAt: serverTimestamp() });
    batch.set(doc(db, "membershipRequestEmailIndex", emailHash), { requestId, ownerUid: user.uid, emailHash, createdAt: serverTimestamp() });
    batch.set(doc(db, "membershipRequestOwners", user.uid), { requestId, ownerUid: user.uid, status: "pending", updatedAt: serverTimestamp() });
    batch.set(doc(db, "membershipAuditLogs", crypto.randomUUID()), { action: "MEMBERSHIP_REQUEST_CREATED", requestId, actorUid: user.uid, actorNameSnapshot: "Solicitante", timestamp: serverTimestamp() });
    await batch.commit();
    localStorage.setItem("aummMembershipRequestSubmitted", "true");
    localStorage.setItem("aummMembershipRequestId", requestId);
    return { requestId, status: "pending" as const };
  } catch (error) { throw friendlyError(error); }
}
