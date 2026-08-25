import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  linkWithCredential,
  signOut,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
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

function friendlyAccountError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use") return new Error("Este e-mail já possui uma conta ou uma inscrição na AUMM.");
    if (error.code === "auth/weak-password") return new Error("Escolha uma senha mais forte, com pelo menos 8 caracteres.");
    if (error.code === "auth/invalid-email") return new Error("Informe um endereço de e-mail válido.");
    if (error.code === "permission-denied") return new Error("Não foi possível registrar a inscrição. Atualize a página e tente novamente.");
  }
  return error instanceof Error ? error : new Error("Não foi possível enviar a inscrição.");
}

export async function submitApplication(payload: ApplicationPayload, password: string) {
  const { auth, db } = getFirebaseServices();
  const email = payload.email.trim().toLowerCase();
  const applicationId = await sha256(`email:${email}`);
  const applicationRef = doc(db, "associationApplications", applicationId);
  const summaryRef = doc(db, "applicationSummaries", applicationId);
  let applicant: User | null = null;
  let accountCreatedNow = false;

  try {
    if (auth.currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      applicant = (await linkWithCredential(auth.currentUser, credential)).user;
      accountCreatedNow = true;
    } else if (auth.currentUser?.email?.toLowerCase() === email) {
      applicant = auth.currentUser;
    } else {
      if (auth.currentUser) await signOut(auth);
      applicant = (await createUserWithEmailAndPassword(auth, email, password)).user;
      accountCreatedNow = true;
    }
    await applicant.getIdToken(true);

    const batch = writeBatch(db);
    batch.set(applicationRef, {
      ...payload,
      applicationId,
      email,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
      city: payload.city.trim(),
      consent: true,
      consentVersion: "2026-08",
      consentAt: serverTimestamp(),
      applicantUid: applicant.uid,
      authAccountCreated: true,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    batch.set(summaryRef, {
      applicationId,
      fullName: payload.fullName.trim(),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return applicationId;
  } catch (error) {
    if (accountCreatedNow && applicant) {
      try { await deleteUser(applicant); } catch { /* A conta sem inscrição poderá ser removida no console. */ }
    }
    throw friendlyAccountError(error);
  }
}
