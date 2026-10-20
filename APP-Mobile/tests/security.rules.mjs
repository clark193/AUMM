import { before, after, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  orderBy,
  limit,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  setLogLevel,
  deleteDoc,
} from "firebase/firestore";
setLogLevel("silent");
let env;
const clients = new Map();
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-aumm-mobile",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(
        new URL("../../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  clients.clear();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    for (const uid of ["member1", "member2"])
      await setDoc(doc(c.firestore(), "associados", uid), {
        uid,
        status: "active",
        mustChangePassword: false,
      });
    await setDoc(doc(c.firestore(), "associados", "inactive"), {
      uid: "inactive",
      status: "inactive",
    });
    await setDoc(doc(c.firestore(), "associados", "initial"), {
      uid: "initial",
      status: "active",
      mustChangePassword: true,
    });
  });
});
const user = (uid) => {
  if (!clients.has(uid))
    clients.set(
      uid,
      env
        .authenticatedContext(uid, {
          firebase: {
            sign_in_provider: uid === "guest" ? "anonymous" : "password",
          },
        })
        .firestore(),
    );
  return clients.get(uid);
};
async function create(uid = "guest", overrides = {}, locationOverrides = {}) {
  const db = user(uid),
    ref = doc(db, "supportRequests", uid),
    batch = writeBatch(db);
  batch.set(ref, {
    ownerUid: uid,
    helperUid: "",
    category: "gasolina",
    city: "Blumenau",
    region: "Centro",
    status: "open",
    chatId: crypto.randomUUID(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
    ...overrides,
  });
  batch.set(doc(ref, "private", "location"), {
    lat: -26.91,
    lng: -49.06,
    accuracy: 12,
    details: "Moto preta",
    plate: "ABC1D23",
    ...locationOverrides,
  });
  return batch.commit();
}
const confirm = (id = "guest") =>
  updateDoc(doc(user(id), "supportRequests", id), {
    status: "accepted",
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
const accept = async (uid, id = "guest", confirmed = true) => {
  const database = user(uid),
    ref = doc(database, "supportRequests", id),
    batch = writeBatch(database);
  batch.update(ref, {
    status: "awaiting_confirmation",
    helperUid: uid,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(ref, "private", "helperProfile"), {
    uid,
    fullName: "Associado AUMM",
    memberNumber: "",
    acceptedAt: serverTimestamp(),
  });
  await batch.commit();
  if (confirmed) await confirm(id);
};
test("convidado cria um pedido e lê somente sua localização", async () => {
  await assertSucceeds(create());
  await assertSucceeds(
    getDoc(
      doc(user("guest"), "supportRequests", "guest", "private", "location"),
    ),
  );
  await assertFails(
    getDoc(
      doc(user("stranger"), "supportRequests", "guest", "private", "location"),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(user("guest"), "supportRequests"),
        where("status", "==", "open"),
      ),
    ),
  );
  await assertFails(create()); // não substitui um pedido ativo
});
test("mural não inclui localização; só o associado que aceita consegue consultá-la", async () => {
  await create();
  await assertSucceeds(
    getDocs(
      query(
        collection(user("member1"), "supportRequests"),
        where("status", "==", "open"),
        where("city", "==", "Blumenau"),
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(user("member1"), "supportRequests", "guest", "private", "location"),
    ),
  );
  await assertSucceeds(accept("member1"));
  await assertSucceeds(
    getDoc(
      doc(user("member1"), "supportRequests", "guest", "private", "location"),
    ),
  );
  await assertFails(
    getDoc(
      doc(user("member2"), "supportRequests", "guest", "private", "location"),
    ),
  );
  await assertFails(accept("member2"));
});
test("convidados, inativos e senha inicial não aceitam pedidos", async () => {
  await create();
  for (const uid of ["stranger", "inactive", "initial"])
    await assertFails(accept(uid));
  await create("member1");
  await assertFails(accept("member1", "member1"));
});
test("coordenadas não podem vazar no mural nem ser substituídas depois do aceite", async () => {
  await assertFails(create("guest", { lat: -26.9 }));
  await create();
  await accept("member1");
  await assertFails(
    updateDoc(
      doc(user("guest"), "supportRequests", "guest", "private", "location"),
      { lat: 1 },
    ),
  );
  await assertFails(
    updateDoc(doc(user("member1"), "supportRequests", "guest"), {
      region: "outro bairro",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("conclusão exige exclusão atômica da localização e permite novo pedido", async () => {
  await create();
  await accept("member1");
  const db = user("guest"),
    ref = doc(db, "supportRequests", "guest");
  await assertFails(
    updateDoc(ref, { status: "resolved", updatedAt: serverTimestamp() }),
  );
  const batch = writeBatch(db);
  batch.update(ref, { status: "resolved", updatedAt: serverTimestamp() });
  batch.delete(doc(ref, "private", "location"));
  batch.delete(
    doc(user("guest"), "supportRequests", "guest", "private", "helperProfile"),
  );
  batch.delete(
    doc(
      user("guest"),
      "supportRequests",
      "guest",
      "private",
      "requesterPosition",
    ),
  );
  await assertSucceeds(batch.commit());
  await assertFails(
    getDoc(
      doc(user("member1"), "supportRequests", "guest", "private", "location"),
    ),
  );
  await assertSucceeds(create());
});
test("cancelamento é exclusivo do solicitante e encerra acesso do ajudante", async () => {
  await create();
  await accept("member1");
  const bad = writeBatch(user("member1"));
  bad.update(doc(user("member1"), "supportRequests", "guest"), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
  bad.delete(
    doc(user("member1"), "supportRequests", "guest", "private", "location"),
  );
  await assertFails(bad.commit());
  const db = user("guest"),
    batch = writeBatch(db);
  batch.update(doc(db, "supportRequests", "guest"), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
  batch.delete(doc(db, "supportRequests", "guest", "private", "location"));
  batch.delete(
    doc(user("guest"), "supportRequests", "guest", "private", "helperProfile"),
  );
  batch.delete(
    doc(
      user("guest"),
      "supportRequests",
      "guest",
      "private",
      "requesterPosition",
    ),
  );
  await assertSucceeds(batch.commit());
});
test("pedido expirado não libera localização nem pode ser aceito", async () => {
  await create();
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "supportRequests", "guest"), {
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    }),
  );
  await assertFails(accept("member1"));
  await assertFails(
    getDoc(
      doc(user("guest"), "supportRequests", "guest", "private", "location"),
    ),
  );
});
test("dois voluntários concorrentes não podem aceitar o mesmo pedido", async () => {
  await create();
  const results = await Promise.allSettled(
    ["member1", "member2"].map((uid) =>
      runTransaction(user(uid), async (tx) => {
        const ref = doc(user(uid), "supportRequests", "guest");
        const snap = await tx.get(ref);
        if (snap.data().status !== "open") throw new Error("Ocupado");
        tx.set(doc(ref, "private", "helperProfile"), {
          uid,
          fullName: "Associado AUMM",
          memberNumber: "",
          acceptedAt: serverTimestamp(),
        });
        tx.update(ref, {
          status: "awaiting_confirmation",
          acceptedAt: serverTimestamp(),
          helperUid: uid,
          updatedAt: serverTimestamp(),
        });
      }),
    ),
  );
  if (results.filter((r) => r.status === "fulfilled").length !== 1)
    throw new Error("Deve existir exatamente um ajudante.");
});

const sendPosition = (uid = "member1", overrides = {}) =>
  setDoc(
    doc(user(uid), "supportRequests", "guest", "private", "helperPosition"),
    {
      helperUid: uid,
      sessionId: "session-test-1234567890",
      lat: -26.921,
      lng: -49.068,
      accuracy: 10,
      updatedAt: serverTimestamp(),
      ...overrides,
    },
  );
test("só o ajudante aceito publica a posição; somente os participantes leem", async () => {
  await create();
  await assertFails(sendPosition());
  await accept("member1");
  await assertFails(sendPosition("guest"));
  await assertFails(sendPosition("member2"));
  await assertSucceeds(sendPosition());
  await assertSucceeds(
    getDoc(
      doc(
        user("guest"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
  await assertSucceeds(
    getDoc(
      doc(
        user("member1"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(
        user("member2"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
  await assertFails(
    getDocs(collection(user("guest"), "supportRequests", "guest", "private")),
  );
});
test("posição inválida, identidade forjada e data antiga são recusadas", async () => {
  await create();
  await accept("member1");
  await assertFails(sendPosition("member1", { helperUid: "member2" }));
  await assertFails(sendPosition("member1", { lat: 91 }));
  await assertFails(sendPosition("member1", { accuracy: -1 }));
  await assertFails(
    sendPosition("member1", { updatedAt: Timestamp.fromMillis(1000) }),
  );
  await assertFails(sendPosition("member1", { phone: "não deve ser enviado" }));
});
test("ajudante pode parar e retomar, mas solicitante não apaga acompanhamento ativo", async () => {
  await create();
  await accept("member1");
  await sendPosition();
  await assertFails(
    deleteDoc(
      doc(
        user("guest"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
  await assertSucceeds(
    deleteDoc(
      doc(
        user("member1"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
  await assertSucceeds(sendPosition());
});
test("encerramento apaga as duas posições atomicamente e bloqueia novos envios", async () => {
  await create();
  await accept("member1");
  await sendPosition();
  const db = user("guest"),
    parent = doc(db, "supportRequests", "guest"),
    incomplete = writeBatch(db);
  incomplete.update(parent, {
    status: "resolved",
    updatedAt: serverTimestamp(),
  });
  incomplete.delete(doc(parent, "private", "location"));
  await assertFails(incomplete.commit());
  const batch = writeBatch(db);
  batch.update(parent, { status: "resolved", updatedAt: serverTimestamp() });
  batch.delete(doc(parent, "private", "location"));
  batch.delete(doc(parent, "private", "helperPosition"));
  batch.delete(
    doc(user("guest"), "supportRequests", "guest", "private", "helperProfile"),
  );
  batch.delete(
    doc(
      user("guest"),
      "supportRequests",
      "guest",
      "private",
      "requesterPosition",
    ),
  );
  await assertSucceeds(batch.commit());
  await assertFails(sendPosition());
  await assertSucceeds(create());
});
test("expiração e desativação do associado interrompem leitura e envio", async () => {
  await create();
  await accept("member1");
  await sendPosition();
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "associados", "member1"), {
      status: "inactive",
    }),
  );
  await assertFails(sendPosition());
  await assertFails(
    getDoc(
      doc(
        user("member1"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "supportRequests", "guest"), {
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    }),
  );
  await assertFails(
    getDoc(
      doc(
        user("guest"),
        "supportRequests",
        "guest",
        "private",
        "helperPosition",
      ),
    ),
  );
});

test("preferências e tokens de push são privados e não permitem trocar o proprietário", async () => {
  const database = user("guest"),
    profile = doc(database, "mobileSubscriptions", "guest");
  await assertSucceeds(
    setDoc(profile, {
      uid: "guest",
      news: true,
      nearbyHelp: false,
      requestUpdates: true,
      communications: false,
      city: "Blumenau",
      cityKey: "blumenau",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    getDoc(doc(user("member1"), "mobileSubscriptions", "guest")),
  );
  await assertFails(
    updateDoc(profile, { uid: "member1", updatedAt: serverTimestamp() }),
  );
  const device = doc(
    database,
    "mobilePushDevices",
    "guest",
    "devices",
    "local-device",
  );
  await assertSucceeds(
    setDoc(device, {
      uid: "guest",
      token: "test-token-private-1234567890",
      platform: "android",
      enabled: true,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    getDoc(
      doc(
        user("member1"),
        "mobilePushDevices",
        "guest",
        "devices",
        "local-device",
      ),
    ),
  );
  await assertFails(
    setDoc(
      doc(user("member1"), "mobilePushDevices", "guest", "devices", "other"),
      {
        uid: "guest",
        token: "test-token-private-1234567890",
        platform: "android",
        enabled: true,
        updatedAt: serverTimestamp(),
      },
    ),
  );
});
test("clientes não podem forjar notificações e só marcam os próprios avisos como lidos", async () => {
  const ref = doc(user("guest"), "mobileInbox", "guest", "items", "notice-1");
  await assertFails(setDoc(ref, { title: "Ajuda aceita", read: false }));
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "mobileInbox", "guest", "items", "notice-1"), {
      title: "Seu pedido",
      read: false,
      createdAt: Date.now(),
    }),
  );
  await assertSucceeds(getDoc(ref));
  await assertFails(
    getDoc(doc(user("member1"), "mobileInbox", "guest", "items", "notice-1")),
  );
  await assertSucceeds(updateDoc(ref, { read: true }));
  await assertFails(updateDoc(ref, { title: "Título forjado", read: true }));
  await assertFails(updateDoc(ref, { read: false }));
});

const sendRequester = (uid = "guest", overrides = {}) =>
  setDoc(
    doc(user(uid), "supportRequests", "guest", "private", "requesterPosition"),
    {
      ownerUid: uid,
      sessionId: "requester-test-session-12345",
      lat: -26.919,
      lng: -49.067,
      accuracy: 8,
      updatedAt: serverTimestamp(),
      ...overrides,
    },
  );
test("os dois atualizam somente sua própria posição e terceiros não leem", async () => {
  await create();
  await assertFails(sendRequester());
  await accept("member1");
  await assertSucceeds(sendRequester());
  await assertSucceeds(sendPosition());
  await assertSucceeds(
    getDoc(
      doc(
        user("member1"),
        "supportRequests",
        "guest",
        "private",
        "requesterPosition",
      ),
    ),
  );
  await assertFails(sendRequester("member1"));
  await assertFails(sendRequester("member2"));
  await assertFails(sendRequester("guest", { ownerUid: "member1" }));
  await assertFails(sendRequester("guest", { lng: 181 }));
  await assertFails(
    sendRequester("guest", { updatedAt: Timestamp.fromMillis(1000) }),
  );
  await assertFails(
    getDoc(
      doc(
        user("member2"),
        "supportRequests",
        "guest",
        "private",
        "requesterPosition",
      ),
    ),
  );
  await assertFails(
    deleteDoc(
      doc(
        user("member1"),
        "supportRequests",
        "guest",
        "private",
        "requesterPosition",
      ),
    ),
  );
  await assertSucceeds(
    deleteDoc(
      doc(
        user("guest"),
        "supportRequests",
        "guest",
        "private",
        "requesterPosition",
      ),
    ),
  );
  await assertSucceeds(sendRequester());
  const ref = doc(user("guest"), "supportRequests", "guest"),
    batch = writeBatch(user("guest"));
  batch.update(ref, { status: "resolved", updatedAt: serverTimestamp() });
  for (const id of [
    "location",
    "helperPosition",
    "requesterPosition",
    "helperProfile",
  ])
    batch.delete(doc(ref, "private", id));
  await assertSucceeds(batch.commit());
  await assertFails(sendRequester());
  await assertFails(sendPosition());
});
test("identificação só é gravada no aceite e deve corresponder ao cadastro real", async () => {
  await create();
  const database = user("member1"),
    ref = doc(database, "supportRequests", "guest");
  await assertFails(
    updateDoc(ref, {
      status: "accepted",
      helperUid: "member1",
      updatedAt: serverTimestamp(),
    }),
  );
  const forged = writeBatch(database);
  forged.update(ref, {
    status: "accepted",
    helperUid: "member1",
    updatedAt: serverTimestamp(),
  });
  forged.set(doc(ref, "private", "helperProfile"), {
    uid: "member1",
    fullName: "Nome inventado",
    memberNumber: "999",
    acceptedAt: serverTimestamp(),
  });
  await assertFails(forged.commit());
  await assertSucceeds(accept("member1"));
  const profile = doc(
    user("guest"),
    "supportRequests",
    "guest",
    "private",
    "helperProfile",
  );
  await assertSucceeds(getDoc(profile));
  await assertFails(
    getDoc(
      doc(
        user("member2"),
        "supportRequests",
        "guest",
        "private",
        "helperProfile",
      ),
    ),
  );
  await assertFails(
    updateDoc(doc(ref, "private", "helperProfile"), { fullName: "Outro nome" }),
  );
  await assertFails(
    setDoc(profile, {
      uid: "member2",
      fullName: "Forjado",
      memberNumber: "",
      acceptedAt: serverTimestamp(),
    }),
  );
});

test("placa é obrigatória e privada; GPS e chat só liberam após confirmação do solicitante", async () => {
  await assertFails(create("guest", { plate: "ABC1D23" }));
  await create();
  await accept("member1", "guest", false);
  const base = doc(user("member1"), "supportRequests", "guest");
  await assertFails(getDoc(doc(base, "private", "location")));
  await assertFails(sendPosition());
  await assertFails(sendRequester());
  await assertFails(
    updateDoc(base, {
      status: "accepted",
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(confirm());
  await assertSucceeds(getDoc(doc(base, "private", "location")));
});
test("confirmação vencida não pode ser aceita; ajudante só cancela por ausência após o prazo", async () => {
  await create();
  await accept("member1", "guest", false);
  const db = user("member1"),
    ref = doc(db, "supportRequests", "guest");
  const close = () => {
    const batch = writeBatch(db);
    batch.update(ref, { status: "cancelled", updatedAt: serverTimestamp() });
    for (const key of [
      "location",
      "helperPosition",
      "requesterPosition",
      "helperProfile",
    ])
      batch.delete(doc(ref, "private", key));
    return batch.commit();
  };
  await assertFails(close());
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "supportRequests", "guest"), {
      acceptedAt: Timestamp.fromMillis(Date.now() - 301000),
    }),
  );
  await assertFails(confirm());
  await assertSucceeds(close());
  await create();
  await accept("member1", "guest", false);
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "supportRequests", "guest"), {
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    }),
  );
  await assertFails(confirm());
  await assertSucceeds(close());
});
test("chat isola participantes e geração do pedido, valida remetente e bloqueia após encerrar", async () => {
  await create();
  await accept("member1", "guest", false);
  const summary = await getDoc(doc(user("guest"), "supportRequests", "guest")),
    chatId = summary.data().chatId;
  const send = (uid, text = "Olá", extra = {}) =>
    setDoc(
      doc(
        user(uid),
        "supportRequests",
        "guest",
        "chats",
        chatId,
        "messages",
        crypto.randomUUID(),
      ),
      {
        senderUid: uid,
        text,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000),
        ...extra,
      },
    );
  await assertFails(send("guest"));
  await confirm();
  await assertSucceeds(send("guest"));
  await assertSucceeds(send("member1"));
  await assertFails(send("member2"));
  await assertFails(send("member1", "Olá", { senderUid: "guest" }));
  await assertFails(send("guest", "x".repeat(1001)));
  const thread = (uid, generation = chatId) =>
    query(
      collection(
        user(uid),
        "supportRequests",
        "guest",
        "chats",
        generation,
        "messages",
      ),
      orderBy("createdAt", "desc"),
      limit(100),
    );
  await assertSucceeds(getDocs(thread("guest")));
  await assertSucceeds(getDocs(thread("member1")));
  await assertFails(getDocs(thread("member2")));
  await assertFails(getDocs(thread("guest", "outro-chat")));
  const batch = writeBatch(user("guest")),
    ref = doc(user("guest"), "supportRequests", "guest");
  batch.update(ref, { status: "resolved", updatedAt: serverTimestamp() });
  for (const key of [
    "location",
    "helperPosition",
    "requesterPosition",
    "helperProfile",
  ])
    batch.delete(doc(ref, "private", key));
  await batch.commit();
  await assertFails(send("guest"));
  await assertFails(getDocs(thread("guest")));
  await create();
  await accept("member1");
  await assertFails(getDocs(thread("guest")));
});

async function startLocationLink(id = "0123456789abcdef0123456789abcdef") {
  const db = user("guest"), batch = writeBatch(db), expiresAt = Timestamp.fromMillis(Date.now() + 3300000);
  batch.set(doc(db, "locationShareOwners", id), { ownerUid: "guest", createdAt: serverTimestamp(), expiresAt });
  batch.set(doc(db, "liveLocations", id), { lat: -26.9, lng: -49.1, accuracy: 10, updatedAt: serverTimestamp(), sampledAt: Timestamp.now(), expiresAt });
  await assertSucceeds(batch.commit());
  return id;
}
test("link ao vivo permite leitura sem login, sem listagem ou acesso ao dono", async () => {
  const id = await startLocationLink(), publicDb = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb, "liveLocations", id)));
  await assertFails(getDocs(collection(publicDb, "liveLocations")));
  await assertFails(getDoc(doc(publicDb, "locationShareOwners", id)));
});
test("somente o dono atualiza e encerra o link, sem inserir dados pessoais ou estender o prazo", async () => {
  const id = await startLocationLink(), own = user("guest"), other = user("member1");
  await assertFails(updateDoc(doc(other, "liveLocations", id), { lat: -27, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(other, "liveLocations", id)));
  await assertFails(updateDoc(doc(own, "liveLocations", id), { plate: "ABC1D23", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(own, "liveLocations", id), { sampledAt: Timestamp.fromMillis(Date.now() - 180000), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(own, "liveLocations", id), { expiresAt: Timestamp.fromMillis(Date.now() + 3600000), updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(own, "liveLocations", id), { lat: -27, updatedAt: serverTimestamp() }));
  const batch = writeBatch(own); batch.delete(doc(own, "liveLocations", id)); batch.delete(doc(own, "locationShareOwners", id)); await assertSucceeds(batch.commit());
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "liveLocations", id)));
});
test("links expirados não podem ser lidos nem atualizados e novos prazos têm limite de uma hora", async () => {
  const id = await startLocationLink();
  await env.withSecurityRulesDisabled(async (c) => {
    for (const name of ["liveLocations", "locationShareOwners"]) await updateDoc(doc(c.firestore(), name, id), { expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
  });
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "liveLocations", id)));
  await assertFails(updateDoc(doc(user("guest"), "liveLocations", id), { lat: -27, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(user("guest"), "locationShareOwners", "11111111111111111111111111111111"), { ownerUid: "guest", createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 7200000) }));
});
test("exclusão direta de associado exige nível 1 ativo, mesmo com flag superAdmin em outro nível", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    for (const [id, level, active] of [["level1", 1, true], ["level2", 2, true], ["disabled1", 1, false]]) await setDoc(doc(c.firestore(), "adminRoles", id), { level, active, superAdmin: true });
  });
  await assertFails(deleteDoc(doc(user("level2"), "associados", "member1")));
  await assertFails(deleteDoc(doc(user("disabled1"), "associados", "member1")));
  await assertFails(updateDoc(doc(user("level2"), "adminRoles", "level2"), { level: 1 }));
  await assertSucceeds(deleteDoc(doc(user("level1"), "associados", "member1")));
});
