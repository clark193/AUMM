// Executa os handlers de produção contra o Firestore local, sem enviar push real.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-aumm-mobile";
const backend = await import("../backend/lib/backend/src/index.js");
const require = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getApp, deleteApp } = require("firebase-admin/app");
const database = getFirestore();
const prefix = `notification-test-${Date.now()}`;
const uid = (name) => `${prefix}-${name}`;
const prefs = {
  news: true,
  nearbyHelp: true,
  requestUpdates: true,
  communications: true,
  city: "Blumenau",
  cityKey: "blumenau",
};
after(async () => {
  await database.terminate();
  await deleteApp(getApp());
});
async function trigger(handler, ref, data) {
  const before = await ref.get();
  await ref.set(data);
  const after = await ref.get();
  await handler.run({
    params: { id: ref.id },
    time: new Date().toISOString(),
    data: { before, after },
  });
  return {
    params: { id: ref.id },
    time: new Date().toISOString(),
    data: { before, after },
  };
}
async function inbox(name) {
  return (
    await database.collection(`mobileInbox/${uid(name)}/items`).get()
  ).docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
test("handlers reais selecionam destinatários, evitam duplicação e não disparam em edição", async () => {
  for (const name of ["owner", "member", "inactive", "other-city", "muted"]) {
    await database.doc(`mobileSubscriptions/${uid(name)}`).set({
      ...prefs,
      uid: uid(name),
      ...(name === "other-city" ? { city: "Gaspar", cityKey: "gaspar" } : {}),
      ...(name === "muted"
        ? {
            news: false,
            nearbyHelp: false,
            requestUpdates: false,
            communications: false,
          }
        : {}),
    });
    await database.doc(`associados/${uid(name)}`).set({
      uid: uid(name),
      status: name === "inactive" ? "inactive" : "active",
      mustChangePassword: false,
    });
  }
  const newsRef = database.doc(`news/${prefix}-news`),
    publishedAt = Timestamp.now();
  const event = await trigger(backend.mobileNewsPublished, newsRef, {
    status: "published",
    title: "Notícia de teste no emulador",
    publishedAt,
  });
  await backend.mobileNewsPublished.run(event);
  assert.equal(
    (await inbox("owner")).filter((n) => n.kind === "news").length,
    1,
  );
  assert.equal(
    (await inbox("inactive")).filter((n) => n.kind === "news").length,
    1,
  );
  assert.equal((await inbox("muted")).length, 0);
  await trigger(backend.mobileNewsPublished, newsRef, {
    status: "published",
    title: "Título editado",
    publishedAt,
  });
  assert.equal(
    (await inbox("owner")).filter((n) => n.kind === "news").length,
    1,
  );
  const requestRef = database.doc(`supportRequests/${uid("owner")}`);
  const open = {
    status: "open",
    city: "Blumenau",
    region: "Centro",
    category: "gasolina",
    ownerUid: uid("owner"),
    helperUid: "",
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
  };
  await trigger(backend.mobileSupportChanged, requestRef, open);
  assert.equal(
    (await inbox("member")).filter((n) => n.kind === "support_nearby").length,
    1,
  );
  for (const name of ["owner", "inactive", "other-city", "muted"])
    assert.equal(
      (await inbox(name)).filter((n) => n.kind === "support_nearby").length,
      0,
    );
  await trigger(backend.mobileSupportChanged, requestRef, {
    ...open,
    status: "awaiting_confirmation",
    acceptedAt: Timestamp.now(),
    helperUid: uid("member"),
  });
  assert.equal(
    (await inbox("owner")).filter((n) => n.kind === "support_accepted").length,
    1,
  );
  assert.equal(
    (await inbox("member")).filter((n) => n.kind === "support_accepted").length,
    0,
  );
  await trigger(backend.mobileSupportChanged, requestRef, {
    ...open,
    status: "accepted",
    helperUid: uid("member"),
  });
  for (const name of ["owner", "member"])
    assert.equal(
      (await inbox(name)).filter((n) => n.kind === "support_confirmed").length,
      1,
    );
  await trigger(backend.mobileSupportChanged, requestRef, {
    ...open,
    status: "resolved",
    helperUid: uid("member"),
  });
  for (const name of ["owner", "member"])
    assert.equal(
      (await inbox(name)).filter((n) => n.kind === "support_resolved").length,
      1,
    );
  const acceptedNotice = (await inbox("owner")).find(
    (n) => n.kind === "support_accepted",
  );
  const ref = database.doc(
    `mobileInbox/${uid("owner")}/items/${acceptedNotice.id}`,
  );
  await backend.mobileDeliverPush.run({
    params: { uid: uid("owner"), id: acceptedNotice.id },
    data: await ref.get(),
  });
  assert.equal(
    (await ref.get()).data().pushStatus,
    "skipped",
    "aceite antigo não é enviado após concluir o atendimento",
  );
  const commRef = database.doc(`communications/${prefix}-comm`);
  await trigger(backend.mobileCommunicationPublished, commRef, {
    status: "published",
    audience: "members",
    title: "Comunicado local",
    publishedAt: Timestamp.now(),
  });
  assert.equal(
    (await inbox("member")).filter((n) => n.kind === "communication").length,
    1,
  );
  assert.equal(
    (await inbox("inactive")).filter((n) => n.kind === "communication").length,
    0,
  );
  console.log(
    "Fanout, idempotência, filtros de cidade/vínculo/preferência e rejeição de push obsoleto: aprovados. Nenhuma mensagem FCM enviada.",
  );
});

test("agendador encerra só confirmações vencidas e limpeza remove o chat encerrado", async () => {
  const old = dbRef("expired"),
    recent = dbRef("recent");
  function dbRef(name) {
    return database.doc(`supportRequests/${prefix}-${name}`);
  }
  for (const [ref, age] of [
    [old, 301000],
    [recent, 1000],
  ]) {
    await ref.set({
      ownerUid: ref.id,
      helperUid: uid("member"),
      status: "awaiting_confirmation",
      acceptedAt: Timestamp.fromMillis(Date.now() - age),
      expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
      chatId: "backend-test-chat",
    });
    for (const key of ["location", "helperProfile"])
      await ref.collection("private").doc(key).set({ test: true });
  }
  await backend.mobileExpireConfirmations.run({
    scheduleTime: new Date().toISOString(),
  });
  assert.equal((await old.get()).data().status, "cancelled");
  assert.equal((await recent.get()).data().status, "awaiting_confirmation");
  assert.equal((await old.collection("private").get()).size, 0);
  const messages = old
    .collection("chats")
    .doc("backend-test-chat")
    .collection("messages");
  await messages.doc("one").set({ text: "Teste privado" });
  await backend.mobileCleanupSupportChat.run({
    params: { id: old.id },
    data: { after: await old.get() },
  });
  assert.equal((await messages.get()).size, 0);
});
