import { signInAnonymously } from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

export type ApplicationPayload = {
  fullName: string; cpf: string; birthDate: string; email: string; phone: string; whatsapp: string;
  cep: string; address: string; number: string; district: string; city: string; state: string;
  cnh: string; cnhCategory: string; cnhExpiry: string; motorcyclePlate: string;
  motorcycleModel: string; motorcycleYear: string; notes?: string; consent: boolean;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function submitApplication(payload: ApplicationPayload) {
  const { auth, db } = getFirebaseServices();
  if (!auth.currentUser) await signInAnonymously(auth);
  const applicantUid = auth.currentUser!.uid;
  const cpf = payload.cpf.replace(/\D/g, "");
  const email = payload.email.trim().toLowerCase();
  const applicationId = await sha256(`cpf:${cpf}`);
  const applicationRef = doc(db, "associationApplications", applicationId);

  await runTransaction(db, async transaction => {
    const existing = await transaction.get(applicationRef);
    if (existing.exists()) throw new Error("Já existe uma solicitação para este CPF.");
    transaction.set(applicationRef, {
      ...payload,
      applicationId,
      cpf,
      email,
      fullName: payload.fullName.trim(),
      state: payload.state.trim().toUpperCase(),
      motorcyclePlate: payload.motorcyclePlate.trim().toUpperCase(),
      consent: true,
      consentVersion: "2026-08",
      consentAt: serverTimestamp(),
      applicantUid,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });
  return applicationId;
}
