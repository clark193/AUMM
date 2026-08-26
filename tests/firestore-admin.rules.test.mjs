import fs from "node:fs";
import test, { after, before, beforeEach } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "aumm-admin-rules-test",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "adminRoles", "master"), { active: true, level: 1, superAdmin: true, role: "TI", permissions: {} }),
      setDoc(doc(db, "adminRoles", "legacy-master"), { active: true, level: "1", role: "TI legado", permissions: {} }),
      setDoc(doc(db, "adminRoles", "communication"), { active: true, level: 4, superAdmin: false, role: "Comunicação", permissions: {} }),
      setDoc(doc(db, "requests", "request-1"), { ownerUid: "member", subject: "Ajuda", status: "pending" }),
      setDoc(doc(db, "associados", "member"), { uid: "member", status: "active" }),
      setDoc(doc(db, "communications", "published"), { audience: "all", status: "published", subject: "Aviso" }),
      setDoc(doc(db, "communications", "draft"), { audience: "all", status: "draft", subject: "Rascunho" }),
    ]);
  });
});

after(async () => env?.cleanup());

test("nível 1 grava todos os módulos operacionais e administra acessos", async () => {
  const db = env.authenticatedContext("master").firestore();
  const writes = [
    ["roles", "role-1", { name: "Tesouraria", active: true }],
    ["communications", "comm-1", { subject: "Comunicado", audience: "all", status: "published" }],
    ["partners", "partner-1", { name: "Parceiro", status: "active" }],
    ["events", "event-1", { title: "Evento", status: "active" }],
    ["benefits", "benefit-1", { title: "Benefício", status: "active" }],
    ["transparency", "publication-1", { title: "Prestação", status: "published" }],
    ["financialEntries", "entry-1", { description: "Receita", visibility: "admin" }],
    ["settings", "public", { associationName: "Associação União Maior Motoboys" }],
    ["adminRoles", "new-admin", { active: true, level: 3, role: "Coordenação", permissions: {} }],
  ];
  for (const [collectionName, id, data] of writes) await assertSucceeds(setDoc(doc(db, collectionName, id, data)));
  await assertSucceeds(updateDoc(doc(db, "requests", "request-1"), { status: "resolved", updatedAt: serverTimestamp() }));
  await assertSucceeds(addDoc(collection(db, "auditLogs"), { action: "TEST", resource: "settings", resourceId: "public", actorUid: "master", timestamp: serverTimestamp() }));
  await assertSucceeds(getDocs(collection(db, "adminRoles")));
});

test("nível 1 legado salvo como texto continua com acesso master", async () => {
  const db = env.authenticatedContext("legacy-master").firestore();
  await assertSucceeds(getDocs(collection(db, "adminRoles")));
  await assertSucceeds(setDoc(doc(db, "partners", "legacy-partner"), { name: "Parceiro legado", status: "draft" }));
  await assertSucceeds(setDoc(doc(db, "settings", "public"), { associationName: "Associação União Maior Motoboys" }));
});

test("administrador de conteúdo lista também rascunhos e arquivados", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "partners", "draft-partner"), { name: "Rascunho", status: "draft" });
  });
  const db = env.authenticatedContext("communication").firestore();
  await assertSucceeds(getDocs(collection(db, "partners")));
});

test("nível 4 gerencia conteúdo mas não cria administradores nem finanças", async () => {
  const db = env.authenticatedContext("communication").firestore();
  await assertSucceeds(setDoc(doc(db, "events", "event-1"), { title: "Evento", status: "active" }));
  await assertSucceeds(setDoc(doc(db, "communications", "comm-1"), { subject: "Comunicado", audience: "all", status: "published" }));
  await assertFails(setDoc(doc(db, "adminRoles", "forbidden"), { active: true, level: 1 }));
  await assertFails(setDoc(doc(db, "financialEntries", "forbidden"), { visibility: "admin" }));
  await assertFails(setDoc(doc(db, "settings", "public"), { associationName: "Alterada" }));
});

test("associado lê apenas comunicados publicados", async () => {
  const db = env.authenticatedContext("member").firestore();
  await assertSucceeds(getDocs(query(collection(db, "communications"), where("status", "==", "published"), where("audience", "==", "all"))));
  await assertFails(getDocs(collection(db, "communications")));
  await assertFails(updateDoc(doc(db, "communications", "published"), { subject: "Alterado" }));
});

test("log de auditoria não pode fingir outro administrador", async () => {
  const db = env.authenticatedContext("communication").firestore();
  await assertFails(addDoc(collection(db, "auditLogs"), { action: "FAKE", resource: "adminRoles", resourceId: "master", actorUid: "master", timestamp: serverTimestamp() }));
});
