import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { services } from "./firebase";
import { validCoordinates } from "./domain.mjs";
import {
  isActiveSupport,
  normalizePlate,
  validPlate,
  confirmationDeadline,
} from "../shared/support";
export type HelpRequest = {
  id: string;
  ownerUid: string;
  helperUid: string;
  category: string;
  city: string;
  region: string;
  status:
    | "open"
    | "awaiting_confirmation"
    | "accepted"
    | "resolved"
    | "cancelled";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  acceptedAt?: Timestamp;
  confirmedAt?: Timestamp;
  expiresAt: Timestamp;
  chatId: string;
};
export type PrivateLocation = {
  lat: number;
  lng: number;
  accuracy: number;
  details: string;
  plate?: string;
};
export type HelperPosition = {
  helperUid: string;
  sessionId: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt?: Timestamp;
};
export type RequesterPosition = Omit<HelperPosition, "helperUid"> & {
  ownerUid: string;
};
export type SupportHelperProfile = {
  uid: string;
  fullName: string;
  memberNumber: string;
  acceptedAt?: Timestamp;
};
export type SharingRole = "helper" | "requester";
export const privateSupportDocuments = [
  "location",
  "helperPosition",
  "requesterPosition",
  "helperProfile",
] as const;
function committed(
  id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  window.dispatchEvent(
    new CustomEvent("aumm:support-updated", { detail: { id, before, after } }),
  );
}
export async function publishParticipantPosition(
  role: SharingRole,
  id: string,
  sessionId: string,
  position: Pick<PrivateLocation, "lat" | "lng" | "accuracy">,
) {
  const { auth, db } = services();
  if (!auth.currentUser || !validCoordinates(position.lat, position.lng))
    throw new Error("Localização inválida.");
  await setDoc(
    doc(
      db,
      "supportRequests",
      id,
      "private",
      role === "helper" ? "helperPosition" : "requesterPosition",
    ),
    {
      [role === "helper" ? "helperUid" : "ownerUid"]: auth.currentUser.uid,
      sessionId,
      ...position,
      updatedAt: serverTimestamp(),
    },
  );
}
export async function removeParticipantPosition(
  role: SharingRole,
  id: string,
  sessionId: string,
) {
  const { db } = services(),
    ref = doc(
      db,
      "supportRequests",
      id,
      "private",
      role === "helper" ? "helperPosition" : "requesterPosition",
    );
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists() && snapshot.data().sessionId === sessionId)
      tx.delete(ref);
  });
}
export async function createRequest(
  category: string,
  city: string,
  region: string,
  position: PrivateLocation,
  plate: string,
) {
  const { auth, db } = services();
  if (!validCoordinates(position.lat, position.lng))
    throw new Error("A localização é inválida.");
  if (!validPlate(plate))
    throw new Error("Informe uma placa válida, como ABC1D23 ou ABC1234.");
  const user = auth.currentUser || (await signInAnonymously(auth)).user,
    ref = doc(db, "supportRequests", user.uid);
  const chatId = crypto.randomUUID();
  await runTransaction(db, async (tx) => {
    const previous = await tx.get(ref);
    if (previous.exists() && isActiveSupport(previous.data().status))
      throw new Error(
        "Você já tem um pedido em andamento. Encerre antes de criar outro.",
      );
    tx.set(ref, {
      ownerUid: user.uid,
      helperUid: "",
      category,
      city: city.trim(),
      region: region.trim(),
      status: "open",
      chatId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
    });
    tx.set(doc(ref, "private", "location"), {
      ...position,
      plate: normalizePlate(plate),
    });
  });
  return user.uid;
}
export async function acceptRequest(id: string) {
  const { auth, db } = services();
  if (!auth.currentUser || auth.currentUser.isAnonymous)
    throw new Error("Entre com sua conta de associado para ajudar.");
  const uid = auth.currentUser.uid;
  const before = await runTransaction(db, async (tx) => {
    const ref = doc(db, "supportRequests", id),
      snapshot = await tx.get(ref);
    if (
      !snapshot.exists() ||
      snapshot.data().status !== "open" ||
      snapshot.data().expiresAt.toMillis() <= Date.now()
    )
      throw new Error("Esse pedido já foi atendido ou expirou.");
    if (snapshot.data().ownerUid === uid)
      throw new Error("Você não pode aceitar seu próprio pedido.");
    const member = await tx.get(doc(db, "associados", uid));
    if (!member.exists())
      throw new Error("Cadastro de associado indisponível.");
    tx.set(doc(ref, "private", "helperProfile"), {
      uid,
      fullName: member.data().fullName ?? "Associado AUMM",
      memberNumber: member.data().memberNumber ?? "",
      acceptedAt: serverTimestamp(),
    });
    tx.update(ref, {
      helperUid: uid,
      status: "awaiting_confirmation",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return snapshot.data();
  });
  committed(id, before, {
    ...before,
    status: "awaiting_confirmation",
    helperUid: uid,
    acceptedAt: Timestamp.now(),
  });
}
export async function confirmRequest(id: string) {
  const { auth, db } = services();
  const before = await runTransaction(db, async (tx) => {
    const ref = doc(db, "supportRequests", id),
      s = await tx.get(ref),
      data = s.data();
    if (
      !data ||
      data.ownerUid !== auth.currentUser?.uid ||
      data.status !== "awaiting_confirmation"
    )
      throw new Error("A confirmação não está disponível.");
    const deadline = confirmationDeadline(data.acceptedAt?.toMillis());
    if (
      !deadline ||
      deadline <= Date.now() ||
      data.expiresAt.toMillis() <= Date.now()
    )
      throw new Error("O prazo para confirmar terminou. Faça um novo pedido.");
    tx.update(ref, {
      status: "accepted",
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return data;
  });
  committed(id, before, {
    ...before,
    status: "accepted",
    confirmedAt: Timestamp.now(),
  });
}
export async function finishRequest(
  id: string,
  status: "resolved" | "cancelled",
) {
  const { db } = services(),
    ref = doc(db, "supportRequests", id);
  const before = await runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists() || !isActiveSupport(s.data().status))
      throw new Error("Esse pedido já foi encerrado.");
    tx.update(ref, { status, updatedAt: serverTimestamp() });
    for (const key of privateSupportDocuments)
      tx.delete(doc(ref, "private", key));
    return s.data();
  });
  committed(id, before, { ...before, status });
}
export async function reconcileSupportRequest(before: HelpRequest) {
  const { db } = services(),
    snapshot = await runTransaction(db, (tx) =>
      tx.get(doc(db, "supportRequests", before.id)),
    ),
    after = snapshot.data();
  if (after) {
    committed(before.id, before, after);
    return !isActiveSupport(after.status);
  }
  return false;
}
export async function sendSupportMessage(request: HelpRequest, text: string) {
  const { auth, db } = services();
  const value = text.trim();
  if (!auth.currentUser || !value || value.length > 1000)
    throw new Error("Escreva uma mensagem com até 1.000 caracteres.");
  await setDoc(
    doc(
      db,
      "supportRequests",
      request.id,
      "chats",
      request.chatId,
      "messages",
      crypto.randomUUID(),
    ),
    {
      senderUid: auth.currentUser.uid,
      text: value,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000),
    },
  );
}
