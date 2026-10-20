export type NoticeKind =
  | "news"
  | "communication"
  | "support_sent"
  | "support_nearby"
  | "support_accepted"
  | "support_confirmed"
  | "support_resolved"
  | "support_cancelled";
export type NoticeEvent = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  target: "news" | "support" | "communications";
  itemId: string;
  createdAt: number;
  expiresAt: number;
  ownerUid?: string;
  helperUid?: string;
  city?: string;
  cityKey?: string;
};
export type NoticePreferences = {
  news: boolean;
  nearbyHelp: boolean;
  requestUpdates: boolean;
  communications: boolean;
  city: string;
  cityKey: string;
};
export const normalizeCity = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
export const defaultNoticePreferences: NoticePreferences = {
  news: true,
  nearbyHelp: true,
  requestUpdates: true,
  communications: true,
  city: "Blumenau",
  cityKey: "blumenau",
};
export function eventId(kind: NoticeKind, itemId: string, generation: number) {
  return `${kind}_${encodeURIComponent(itemId)}_${generation}`;
}
type Source = {
  status?: string;
  title?: string;
  audience?: string;
  createdAt?: number;
  publishedAt?: number;
  expiresAt?: number;
  city?: string;
  ownerUid?: string;
  helperUid?: string;
};
const safeTitle = (value: unknown) =>
  String(value || "")
    .trim()
    .slice(0, 120);
export function publicationNotice(
  kind: "news" | "communication",
  id: string,
  source: Source,
): NoticeEvent | null {
  if (
    source.status !== "published" ||
    (kind === "communication" &&
      !["all", "members"].includes(source.audience || ""))
  )
    return null;
  const time = source.publishedAt || source.createdAt || 0;
  return {
    id: eventId(kind, id, time),
    kind,
    title: kind === "news" ? "Novidade na AUMM" : "Novo comunicado da AUMM",
    body:
      safeTitle(source.title) ||
      (kind === "news"
        ? "Uma nova notícia para a categoria."
        : "Confira o recado da associação."),
    target: kind === "news" ? "news" : "communications",
    itemId: id,
    createdAt: time,
    expiresAt: time + 14 * 86400000,
  };
}
export function supportNotices(
  id: string,
  before: Source | null,
  after: Source,
  now: number,
): NoticeEvent[] {
  const generation = after.createdAt || 0;
  const base = {
    itemId: id,
    target: "support" as const,
    createdAt: now,
    expiresAt: now + 7 * 86400000,
    ownerUid: after.ownerUid,
    helperUid: after.helperUid,
    city: after.city,
    cityKey: normalizeCity(after.city || ""),
  };
  const make = (
    kind: NoticeKind,
    title: string,
    body: string,
  ): NoticeEvent => ({
    ...base,
    id: eventId(kind, id, generation),
    kind,
    title,
    body,
  });
  if (
    after.status === "open" &&
    (before?.status !== "open" || before.createdAt !== after.createdAt)
  )
    return [
      make(
        "support_sent",
        "Seu pedido está na rede",
        "Pedido enviado. Avisaremos quando alguém aceitar ajudar.",
      ),
      make(
        "support_nearby",
        "Alguém precisa de uma força",
        `Há um novo pedido de apoio em ${safeTitle(after.city) || "sua cidade"}. Você pode ajudar?`,
      ),
    ];
  if (before?.status === "open" && after.status === "awaiting_confirmation")
    return [
      make(
        "support_accepted",
        "Alguém aceitou! Confirme seu apoio",
        "Confirme em até 5 minutos que ainda precisa de ajuda para liberar o atendimento.",
      ),
    ];
  if (before?.status === "awaiting_confirmation" && after.status === "accepted")
    return [
      make(
        "support_confirmed",
        "Apoio confirmado",
        "O solicitante confirmou. Vocês já podem conversar e acompanhar o mapa.",
      ),
    ];
  if (
    ["open", "awaiting_confirmation", "accepted"].includes(
      before?.status || "",
    ) &&
    after.status === "resolved"
  )
    return [
      make(
        "support_resolved",
        "Apoio concluído",
        "O atendimento foi encerrado. Obrigado por fortalecer nossa rede.",
      ),
    ];
  if (
    ["open", "awaiting_confirmation", "accepted"].includes(
      before?.status || "",
    ) &&
    after.status === "cancelled"
  )
    return [
      make(
        "support_cancelled",
        "Pedido de apoio cancelado",
        "O pedido foi cancelado e o compartilhamento de localização encerrado.",
      ),
    ];
  return [];
}
export function shouldReceive(
  event: NoticeEvent,
  uid: string,
  active: boolean,
  prefs: NoticePreferences,
): boolean {
  if (event.kind === "news") return prefs.news;
  if (event.kind === "communication") return active && prefs.communications;
  if (event.kind === "support_nearby")
    return (
      active &&
      prefs.nearbyHelp &&
      uid !== event.ownerUid &&
      prefs.cityKey === event.cityKey
    );
  if (!prefs.requestUpdates) return false;
  if (["support_sent", "support_accepted"].includes(event.kind))
    return uid === event.ownerUid;
  return uid === event.ownerUid || uid === event.helperUid;
}
export function noticeChannel(kind: NoticeKind) {
  return kind === "news"
    ? "aumm-news"
    : kind === "communication"
      ? "aumm-community"
      : kind === "support_nearby"
        ? "aumm-help"
        : "aumm-support";
}
export function pushData(event: NoticeEvent) {
  // Somente campos públicos de navegação. Nunca envie coordenadas, CPF, token de autenticação ou observações.
  return {
    noticeId: event.id,
    kind: event.kind,
    target: event.target,
    itemId: event.itemId,
    title: event.title,
    body: event.body,
    createdAt: String(event.createdAt),
    expiresAt: String(event.expiresAt),
  };
}
