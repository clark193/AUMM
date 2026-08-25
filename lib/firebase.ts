import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseEnabled) throw new Error("Firebase ainda não foi configurado. Siga CONFIGURACAO_AUMM.md.");
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const getFirebaseServices = () => {
  const app = getFirebaseApp();
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (typeof window !== "undefined" && siteKey && !(globalThis as typeof globalThis & { __aummAppCheck?: boolean }).__aummAppCheck) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
    (globalThis as typeof globalThis & { __aummAppCheck?: boolean }).__aummAppCheck = true;
  }
  return { app, auth: getAuth(app), db: getFirestore(app) };
};
