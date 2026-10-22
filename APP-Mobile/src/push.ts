import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { signInAnonymously } from "firebase/auth";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, services } from "./firebase";
import type { NoticeEvent } from "../shared/notifications";
export const nativePushReady =
  Capacitor.getPlatform() === "android" &&
  import.meta.env.VITE_PUSH_CONFIGURED === "true";
let currentToken = "";
const deviceId = () => {
  let id = localStorage.getItem("aumm.deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("aumm.deviceId", id);
  }
  return id;
};
async function saveToken(token: string) {
  const { auth, db } = services();
  if (!auth.currentUser) return;
  await setDoc(
    doc(db, "mobilePushDevices", auth.currentUser.uid, "devices", deviceId()),
    {
      uid: auth.currentUser.uid,
      token,
      platform: "android",
      enabled: true,
      updatedAt: serverTimestamp(),
    },
  );
}
export async function detachPushDevice() {
  if (
    auth?.currentUser &&
    db &&
    (currentToken || localStorage.getItem("aumm.pushEnabled") === "true")
  )
    await deleteDoc(
      doc(db, "mobilePushDevices", auth.currentUser.uid, "devices", deviceId()),
    );
  if (nativePushReady && localStorage.getItem("aumm.pushEnabled") === "true") {
    await PushNotifications.removeAllDeliveredNotifications();
    await PushNotifications.unregister();
  }
  currentToken = "";
  localStorage.removeItem("aumm.pushEnabled");
}
export async function enableNativePush() {
  if (!nativePushReady)
    throw new Error(
      "As notificações deste aparelho ainda não estão disponíveis. Os avisos dentro do app continuam ativos.",
    );
  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt" || status.receive === "prompt-with-rationale")
    status = await PushNotifications.requestPermissions();
  if (status.receive !== "granted")
    throw new Error(
      "Permita as notificações nas configurações do Android para receber os alertas.",
    );
  const { auth } = services();
  if (!auth.currentUser) await signInAnonymously(auth);
  await createChannels();
  await PushNotifications.register();
  if (currentToken) await saveToken(currentToken);
}
async function createChannels() {
  for (const channel of [
    {
      id: "aumm-emergencies",
      name: "Emergências da associação",
      description: "Avisos para administradores, sem dados pessoais na notificação.",
      importance: 4 as const,
      vibration: true,
      sound: "default",
    },
    {
      id: "aumm-help",
      name: "Pedidos de apoio na cidade",
      description: "Um motoboy precisa de ajuda na cidade escolhida.",
      importance: 4 as const,
      vibration: true,
      sound: "default",
    },
    {
      id: "aumm-support",
      name: "Meu atendimento",
      description: "Aceite, conclusão e cancelamento do apoio.",
      importance: 4 as const,
      vibration: true,
      sound: "default",
    },
    {
      id: "aumm-news",
      name: "Notícias da AUMM",
      description: "Novas publicações da associação.",
      importance: 3 as const,
      vibration: false,
    },
    {
      id: "aumm-community",
      name: "Comunicados",
      description: "Avisos para os associados.",
      importance: 3 as const,
      vibration: false,
    },
  ])
    await PushNotifications.createChannel({ ...channel, visibility: 0 });
}
function parseNotice(data: Record<string, unknown>): NoticeEvent | null {
  if (
    !["news", "support", "communications", "admin"].includes(String(data.target)) ||
    typeof data.noticeId !== "string" ||
    typeof data.itemId !== "string"
  )
    return null;
  if (
    ![
      "emergency",
      "meeting",
      "news",
      "communication",
      "support_sent",
      "support_nearby",
      "support_accepted",
      "support_confirmed",
      "support_resolved",
      "support_cancelled",
    ].includes(String(data.kind))
  )
    return null;
  return {
    id: data.noticeId.slice(0, 500),
    itemId: data.itemId.slice(0, 200),
    kind: data.kind as NoticeEvent["kind"],
    title: String(data.title || "AUMM").slice(0, 160),
    body: String(data.body || "Você tem um novo aviso.").slice(0, 300),
    target: data.target as NoticeEvent["target"],
    createdAt: Number(data.createdAt) || Date.now(),
    expiresAt: Number(data.expiresAt) || Date.now() + 86400000,
  };
}
export async function listenForPush(
  receive: (notice: NoticeEvent) => void,
  open: (notice: NoticeEvent) => void,
  error: (message: string) => void,
) {
  if (!nativePushReady) return () => {};
  const listeners: PluginListenerHandle[] = [];
  listeners.push(
    await PushNotifications.addListener("registration", (token) => {
      currentToken = token.value;
      void saveToken(token.value).catch(() =>
        error(
          "Não foi possível ativar os alertas deste aparelho. Tente novamente.",
        ),
      );
    }),
  );
  listeners.push(
    await PushNotifications.addListener("registrationError", () =>
      error(
        "Não foi possível registrar as notificações. Verifique sua conexão.",
      ),
    ),
  );
  listeners.push(
    await PushNotifications.addListener(
      "pushNotificationReceived",
      (payload) => {
        const notice = parseNotice(payload.data || {});
        if (notice) receive(notice);
      },
    ),
  );
  listeners.push(
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        void (async () => {
          await auth?.authStateReady();
          const notice = parseNotice(action.notification.data || {});
          if (notice && (notice.target === "news" || auth?.currentUser))
            open(notice);
        })().catch(() =>
          error(
            "Não foi possível abrir esse aviso. Entre na sua conta e tente novamente.",
          ),
        );
      },
    ),
  );
  await createChannels();
  // Uma permissão já concedida é restaurada sem mostrar nova solicitação ao usuário.
  if (
    (await PushNotifications.checkPermissions()).receive === "granted" &&
    auth?.currentUser &&
    localStorage.getItem("aumm.pushEnabled") === "true"
  )
    await PushNotifications.register();
  return () => {
    listeners.forEach((listener) => void listener.remove());
  };
}
