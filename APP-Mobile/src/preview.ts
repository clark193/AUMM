import { Timestamp } from "firebase/firestore";
import type { HelpRequest, PrivateLocation } from "./support";
import { isActiveSupport, normalizePlate } from "../shared/support";
export const isPreview =
  import.meta.env.DEV &&
  ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
  new URLSearchParams(location.search).get("preview") === "1";
export const isPreviewHelper =
  isPreview && new URLSearchParams(location.search).get("role") === "helper";
export const previewUid = isPreviewHelper ? "preview-helper" : "preview-user";
export const previewPosition: PrivateLocation = {
  lat: -26.9194,
  lng: -49.0661,
  accuracy: 100,
  details: "Moto preta perto do posto. Pedido de demonstração.",
  plate: "ABC1D23",
};
const key = `aumm.preview.v2.${isPreviewHelper ? "helper" : "owner"}`;
function serialize(request: HelpRequest) {
  return {
    ...request,
    createdAt: request.createdAt?.toMillis(),
    acceptedAt: request.acceptedAt?.toMillis(),
    confirmedAt: request.confirmedAt?.toMillis(),
    expiresAt: request.expiresAt.toMillis(),
  };
}
function fixture(): HelpRequest {
  return {
    id: "preview-request",
    ownerUid: "preview-user",
    helperUid: "",
    category: "gasolina",
    city: "Blumenau",
    region: "Centro",
    status: "open",
    chatId: crypto.randomUUID(),
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
  };
}
export function readPreviewRequest(): HelpRequest | null {
  if (!isPreview) return null;
  try {
    let saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!saved && isPreviewHelper) {
      saved = serialize(fixture());
      sessionStorage.setItem(key, JSON.stringify(saved));
    }
    return saved
      ? {
          ...saved,
          createdAt: Timestamp.fromMillis(saved.createdAt),
          acceptedAt: saved.acceptedAt
            ? Timestamp.fromMillis(saved.acceptedAt)
            : undefined,
          confirmedAt: saved.confirmedAt
            ? Timestamp.fromMillis(saved.confirmedAt)
            : undefined,
          expiresAt: Timestamp.fromMillis(saved.expiresAt),
        }
      : null;
  } catch {
    return null;
  }
}
function save(request: HelpRequest, before: HelpRequest | null) {
  if (!isPreview) throw new Error("Demonstração indisponível.");
  sessionStorage.setItem(key, JSON.stringify(serialize(request)));
  window.dispatchEvent(new Event("aumm:preview-support"));
  window.dispatchEvent(
    new CustomEvent("aumm:support-updated", {
      detail: { id: request.id, before: before || {}, after: request },
    }),
  );
}
export function createPreviewRequest(
  category: string,
  city: string,
  region: string,
  plate: string,
) {
  const before = readPreviewRequest();
  if (before && isActiveSupport(before.status))
    throw new Error("Encerre o pedido de demonstração anterior.");
  sessionStorage.setItem(
    key + ".location",
    JSON.stringify({ ...previewPosition, plate: normalizePlate(plate) }),
  );
  save({ ...fixture(), category, city, region }, before);
}
export function readPreviewLocation(): PrivateLocation {
  try {
    return (
      JSON.parse(sessionStorage.getItem(key + ".location") || "null") ||
      previewPosition
    );
  } catch {
    return previewPosition;
  }
}
export function updatePreviewRequest(status: HelpRequest["status"]) {
  const before = readPreviewRequest();
  if (!before || !isActiveSupport(before.status))
    throw new Error("Nenhum pedido ativo.");
  save(
    {
      ...before,
      status,
      helperUid:
        status === "awaiting_confirmation"
          ? "preview-helper"
          : before.helperUid,
      acceptedAt:
        status === "awaiting_confirmation"
          ? Timestamp.now()
          : before.acceptedAt,
      confirmedAt: status === "accepted" ? Timestamp.now() : before.confirmedAt,
    },
    before,
  );
}
export function resetPreviewHelper() {
  if (isPreviewHelper) {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(key + ".location");
    readPreviewRequest();
    window.dispatchEvent(new Event("aumm:preview-support"));
  }
}
export function readPreviewMessages(chatId: string) {
  if (!isPreview) return [];
  try {
    return (
      JSON.parse(sessionStorage.getItem(key + ".chat." + chatId) || "[]") as {
        id: string;
        senderUid: string;
        text: string;
        createdAt: number;
      }[]
    ).map((m) => ({ ...m, createdAt: Timestamp.fromMillis(m.createdAt) }));
  } catch {
    return [];
  }
}
export function sendPreviewMessage(request: HelpRequest, text: string) {
  if (!isPreview || request.status !== "accepted")
    throw new Error("Confirme o apoio para conversar.");
  function append(senderUid: string, value: string) {
    const current = readPreviewRequest();
    if (current?.status !== "accepted" || current.chatId !== request.chatId)
      return;
    const messages = readPreviewMessages(request.chatId).map((m) => ({
      ...m,
      createdAt: m.createdAt.toMillis(),
    }));
    messages.push({
      id: crypto.randomUUID(),
      senderUid,
      text: value,
      createdAt: Date.now(),
    });
    sessionStorage.setItem(
      key + ".chat." + request.chatId,
      JSON.stringify(messages),
    );
    window.dispatchEvent(new Event("aumm:preview-chat"));
  }
  append(previewUid, text);
  setTimeout(
    () =>
      append(
        isPreviewHelper ? "preview-user" : "preview-helper",
        isPreviewHelper
          ? "Obrigado! Estou aguardando perto do posto, com a moto de placa ABC1D23."
          : "Recebi sua mensagem. Estou indo ao ponto combinado!",
      ),
    1000,
  );
}
