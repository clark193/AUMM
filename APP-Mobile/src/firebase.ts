import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
const e = import.meta.env;
export const configured = Boolean(
  e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_PROJECT_ID,
);
const app = configured
  ? initializeApp({
      apiKey: e.VITE_FIREBASE_API_KEY,
      authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: e.VITE_FIREBASE_PROJECT_ID,
      storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: e.VITE_FIREBASE_APP_ID,
    })
  : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
if (auth && db && e.DEV && e.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
export function services() {
  if (!auth || !db)
    throw new Error(
      "O serviço precisa ser configurado pela AUMM. As utilidades continuam disponíveis.",
    );
  return { auth, db };
}
export function friendly(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code?.includes("permission-denied"))
    return "Acesso não autorizado. Verifique seu vínculo ou a ativação do serviço de apoio.";
  if (code?.includes("invalid-credential"))
    return "E-mail ou senha incorretos.";
  if (code?.includes("too-many-requests"))
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (code?.includes("network") || code === "unavailable")
    return "Não foi possível conectar. Verifique sua internet.";
  if (code === "auth/operation-not-allowed")
    return "O acesso de convidados precisa ser habilitado pela AUMM.";
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
}
