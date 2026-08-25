import { signInAnonymously } from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

export type ApplicationPayload = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  consent: boolean;
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
  const email = payload.email.trim().toLowerCase();
  const applicationId = await sha256(`email:${email}`);
  const applicationRef = doc(db, "associationApplications", applicationId);

  await runTransaction(db, async transaction => {
    const existing = await transaction.get(applicationRef);
    if (existing.exists()) throw new Error("Já existe uma solicitação para este e-mail.");
    transaction.set(applicationRef, {
      ...payload,
      applicationId,
      email,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
      city: payload.city.trim(),
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
