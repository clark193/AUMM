import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type Query,
} from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import {
  defaultNoticePreferences,
  noticeChannel,
  publicationNotice,
  pushData,
  shouldReceive,
  supportNotices,
  type NoticeEvent,
  type NoticePreferences,
} from "../../shared/notifications.js";
initializeApp();
const db = getFirestore();
const region = "southamerica-east1";
const options = { region, retry: true, maxInstances: 5 } as const;
const millis = (value: unknown) =>
  (value as Timestamp | undefined)?.toMillis?.() || 0;
function source(data: Record<string, unknown> | undefined) {
  return data
    ? {
        status: String(data.status || ""),
        title: String(data.title || ""),
        audience: String(data.audience || ""),
        city: String(data.city || ""),
        ownerUid: String(data.ownerUid || ""),
        helperUid: String(data.helperUid || ""),
        createdAt: millis(data.createdAt),
        publishedAt: millis(data.publishedAt),
        expiresAt: millis(data.expiresAt),
      }
    : null;
}
async function activeMember(uid: string) {
  const member = await db.doc(`associados/${uid}`).get();
  return (
    member.exists &&
    member.data()?.status === "active" &&
    member.data()?.mustChangePassword !== true
  );
}
async function preferences(uid: string): Promise<NoticePreferences> {
  const profile = await db.doc(`mobileSubscriptions/${uid}`).get();
  return {
    ...defaultNoticePreferences,
    ...profile.data(),
  } as NoticePreferences;
}
async function store(uid: string, event: NoticeEvent) {
  const ref = db.doc(`mobileInbox/${uid}/items/${event.id}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, {
      ...event,
      read: false,
      pushStatus: "pending",
      storedAt: FieldValue.serverTimestamp(),
    });
  });
}
async function eachProfile(
  query: Query,
  visit: (uid: string, prefs: NoticePreferences) => Promise<void>,
) {
  let cursor;
  for (;;) {
    const page = await (cursor ? query.startAfter(cursor) : query)
      .limit(200)
      .get();
    // Lotes pequenos para limitar memória e operações simultâneas.
    for (let offset = 0; offset < page.docs.length; offset += 20)
      await Promise.all(
        page.docs.slice(offset, offset + 20).map((d) =>
          visit(d.id, {
            ...defaultNoticePreferences,
            ...d.data(),
          } as NoticePreferences),
        ),
      );
    if (page.size < 200) break;
    cursor = page.docs[page.docs.length - 1];
  }
}
async function dispatch(event: NoticeEvent) {
  if (
    event.kind === "news" ||
    event.kind === "communication" ||
    event.kind === "support_nearby"
  ) {
    const flag =
      event.kind === "news"
        ? "news"
        : event.kind === "communication"
          ? "communications"
          : "nearbyHelp";
    let query: Query = db
      .collection("mobileSubscriptions")
      .where(flag, "==", true);
    if (event.kind === "support_nearby")
      query = query.where("cityKey", "==", event.cityKey);
    await eachProfile(query, async (uid, prefs) => {
      const active = event.kind === "news" ? false : await activeMember(uid);
      if (shouldReceive(event, uid, active, prefs)) await store(uid, event);
    });
  } else {
    const recipients = new Set(
      [
        event.ownerUid,
        ...([
          "support_resolved",
          "support_cancelled",
          "support_confirmed",
        ].includes(event.kind)
          ? [event.helperUid]
          : []),
      ].filter(Boolean) as string[],
    );
    await Promise.all(
      [...recipients].map(async (uid) => {
        if (shouldReceive(event, uid, false, await preferences(uid)))
          await store(uid, event);
      }),
    );
  }
}
export const mobileNewsPublished = onDocumentWritten(
  { ...options, document: "news/{id}" },
  async (event) => {
    const before = source(event.data?.before.data()),
      after = source(event.data?.after.data());
    if (
      !after ||
      before?.status === "published" ||
      after.status !== "published"
    )
      return;
    const notice = publicationNotice("news", event.params.id, after);
    if (notice) await dispatch(notice);
  },
);
export const mobileCommunicationPublished = onDocumentWritten(
  { ...options, document: "communications/{id}" },
  async (event) => {
    const before = source(event.data?.before.data()),
      after = source(event.data?.after.data());
    if (
      !after ||
      before?.status === "published" ||
      after.status !== "published"
    )
      return;
    const notice = publicationNotice("communication", event.params.id, after);
    if (notice) await dispatch(notice);
  },
);
export const mobileSupportChanged = onDocumentWritten(
  { ...options, document: "supportRequests/{id}" },
  async (event) => {
    const before = source(event.data?.before.data()),
      after = source(event.data?.after.data());
    if (!after) return;
    for (const notice of supportNotices(
      event.params.id,
      before,
      after,
      Date.parse(event.time),
    )) {
      if (notice.kind === "support_nearby" && after.expiresAt <= Date.now())
        continue;
      await dispatch(notice);
    }
  },
);
async function currentEvent(event: NoticeEvent, uid: string) {
  if (
    !shouldReceive(event, uid, await activeMember(uid), await preferences(uid))
  )
    return false;
  if (event.kind === "news" || event.kind === "communication") {
    const source = await db
      .doc(
        `${event.kind === "news" ? "news" : "communications"}/${event.itemId}`,
      )
      .get();
    return (
      source.exists &&
      source.data()?.status === "published" &&
      (event.kind === "news" ||
        ["all", "members"].includes(source.data()?.audience))
    );
  }
  const request = await db.doc(`supportRequests/${event.itemId}`).get();
  if (!request.exists) return false;
  const data = request.data()!;
  // Pedido reutilizado pelo solicitante não recebe um aviso antigo.
  if (!event.id.endsWith(`_${millis(data.createdAt)}`)) return false;
  if (event.kind === "support_nearby")
    return data.status === "open" && millis(data.expiresAt) > Date.now();
  if (event.kind === "support_accepted")
    return (
      data.status === "awaiting_confirmation" &&
      millis(data.acceptedAt) + 300000 > Date.now() &&
      data.ownerUid === uid &&
      millis(data.expiresAt) > Date.now()
    );
  if (event.kind === "support_confirmed")
    return data.status === "accepted" && millis(data.expiresAt) > Date.now();
  if (event.kind === "support_sent")
    return ["open", "awaiting_confirmation", "accepted"].includes(data.status);
  return (
    data.status ===
    (event.kind === "support_resolved" ? "resolved" : "cancelled")
  );
}
export const mobileDeliverPush = onDocumentCreated(
  { ...options, document: "mobileInbox/{uid}/items/{id}" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const current = await snapshot.ref.get();
    const notice = current.data() as NoticeEvent & {
      pushStatus?: string;
      read?: boolean;
    };
    if (
      !notice ||
      notice.pushStatus === "sent" ||
      notice.pushStatus === "skipped"
    )
      return;
    if (
      notice.read ||
      notice.expiresAt <= Date.now() ||
      !(await currentEvent(notice, event.params.uid))
    ) {
      await snapshot.ref.update({ pushStatus: "skipped" });
      return;
    }
    const devices = await db
      .collection(`mobilePushDevices/${event.params.uid}/devices`)
      .where("enabled", "==", true)
      .get();
    const tokens = [
      ...new Set(
        devices.docs.map((d) => String(d.data().token || "")).filter(Boolean),
      ),
    ];
    if (!tokens.length) {
      await snapshot.ref.update({ pushStatus: "skipped" });
      return;
    }
    const urgent = notice.target === "support";
    let failure = false;
    for (let offset = 0; offset < tokens.length; offset += 500) {
      const batch = tokens.slice(offset, offset + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch,
        notification: { title: notice.title, body: notice.body },
        data: pushData(notice),
        android: {
          priority: urgent ? "high" : "normal",
          ttl:
            notice.kind === "support_nearby"
              ? 300000
              : urgent
                ? 3600000
                : 86400000,
          notification: {
            channelId: noticeChannel(notice.kind),
            tag: notice.id,
            icon: "ic_notification",
            color: "#164C3A",
            visibility: "private",
            ...(urgent ? { sound: "default" } : {}),
          },
        },
      });
      await Promise.all(
        response.responses.map(async (result, index) => {
          if (result.success) return;
          if (
            [
              "messaging/registration-token-not-registered",
              "messaging/invalid-registration-token",
            ].includes(result.error?.code || "")
          ) {
            await Promise.all(
              devices.docs
                .filter((d) => d.data().token === batch[index])
                .map((d) => d.ref.delete()),
            );
          } else {
            failure = true;
            logger.warn("Falha temporária no envio de push", {
              code: result.error?.code,
            });
          }
        }),
      );
    }
    if (failure)
      throw new Error(
        "Falha temporária no envio. O evento será tentado novamente.",
      );
    await snapshot.ref.update({
      pushStatus: "sent",
      pushSentAt: FieldValue.serverTimestamp(),
    });
  },
);

// Fecha pedidos sem confirmação mesmo quando ninguém está com a tela aberta.
export const mobileExpireConfirmations = onSchedule(
  {
    region,
    schedule: "every 1 minutes",
    timeZone: "America/Sao_Paulo",
    maxInstances: 1,
    retryCount: 3,
  },
  async () => {
    let cursor;
    for (;;) {
      let query = db
        .collection("supportRequests")
        .where("status", "==", "awaiting_confirmation")
        .orderBy("__name__")
        .limit(200);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const snapshot of page.docs) {
        const data = snapshot.data();
        if (
          millis(data.acceptedAt) + 300000 > Date.now() &&
          millis(data.expiresAt) > Date.now()
        )
          continue;
        await db.runTransaction(async (tx) => {
          const current = await tx.get(snapshot.ref),
            request = current.data();
          if (
            !request ||
            request.status !== "awaiting_confirmation" ||
            (millis(request.acceptedAt) + 300000 > Date.now() &&
              millis(request.expiresAt) > Date.now())
          )
            return;
          tx.update(snapshot.ref, {
            status: "cancelled",
            updatedAt: FieldValue.serverTimestamp(),
          });
          for (const key of [
            "location",
            "helperPosition",
            "requesterPosition",
            "helperProfile",
          ])
            tx.delete(snapshot.ref.collection("private").doc(key));
        });
      }
      if (page.size < 200) break;
      cursor = page.docs[page.docs.length - 1];
    }
  },
);
export const mobileCleanupSupportChat = onDocumentWritten(
  { ...options, document: "supportRequests/{id}" },
  async (event) => {
    const after = event.data?.after.data();
    if (
      !after ||
      !["resolved", "cancelled"].includes(after.status) ||
      typeof after.chatId !== "string"
    )
      return;
    const messages = db.collection(
      `supportRequests/${event.params.id}/chats/${after.chatId}/messages`,
    );
    for (;;) {
      const page = await messages.limit(200).get();
      if (page.empty) break;
      const batch = db.batch();
      page.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  },
);
