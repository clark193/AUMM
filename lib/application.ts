import { ref, uploadBytes } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseServices } from "./firebase";

export type ApplicationPayload = {
  fullName: string; cpf: string; birthDate: string; email: string; phone: string; whatsapp: string;
  cep: string; address: string; number: string; district: string; city: string; state: string;
  cnh: string; cnhCategory: string; cnhExpiry: string; motorcyclePlate: string;
  motorcycleModel: string; motorcycleYear: string; notes?: string; consent: boolean;
};

export async function submitApplication(payload: ApplicationPayload, files: File[]) {
  const { auth, storage, functions } = getFirebaseServices();
  if (!auth.currentUser) await signInAnonymously(auth);
  const createApplication = httpsCallable<ApplicationPayload, { applicationId: string }>(functions, "createApplication");
  const result = await createApplication(payload);
  const applicationId = result.data.applicationId;
  await Promise.all(files.map(async (file) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    await uploadBytes(ref(storage, `applications/${applicationId}/${crypto.randomUUID()}-${safeName}`), file, {
      contentType: file.type,
      customMetadata: { applicationId },
    });
  }));
  return applicationId;
}
