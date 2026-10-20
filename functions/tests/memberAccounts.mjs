import test, { after } from "node:test";
import assert from "node:assert/strict";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "demo-aumm-mobile";
const { manageMemberAccount } = await import("../lib/index.js");
const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
const { getAuth } = await import("firebase-admin/auth");
const { getApp, deleteApp } = await import("firebase-admin/app");
const db = getFirestore(), auth = getAuth();
const prefix = `accounts-${Date.now()}`;
const uid = (name) => `${prefix}-${name}`;
const call = (actor, data) => manageMemberAccount.run({ auth: actor ? { uid: uid(actor), token: { admin: true, permissions: { "members.write": true } } } : undefined, data });
async function role(name, level, active = true) { await db.doc(`adminRoles/${uid(name)}`).set({ level, active, superAdmin: true }); }
async function member(name, login = true) {
  const id = uid(name);
  if (login) await auth.createUser({ uid: id, email: `${id}@example.test`, password: "Original123!" });
  await db.doc(`associados/${id}`).set({ uid: login ? id : null, status: "active", fullName: `Associado ${name}`, memberNumber: id, mustChangePassword: false });
  return id;
}
after(async () => { await db.terminate(); await deleteApp(getApp()); });
test("anônimo, associado, níveis 2 a 5 e administrador inativo não gerenciam contas", async () => {
  const id = await member("protected");
  for (const level of [2, 3, 4, 5]) await role(`level${level}`, level);
  await role("inactive", 1, false);
  for (const actor of [null, "member", "level2", "level3", "level4", "level5", "inactive"]) {
    for (const action of ["password", "delete"]) await assert.rejects(call(actor, { memberId: id, action, password: "Changed123!", confirmation: "Associado protected" }), (error) => ["unauthenticated", "permission-denied"].includes(error.code));
  }
  assert.equal((await db.doc(`associados/${id}`).get()).data().mustChangePassword, false);
});
test("nível 1 altera senha de login, exige troca e não grava a senha na auditoria", async () => {
  await role("president", "1");
  const id = await member("password");
  await assert.rejects(call("president", { memberId: id, action: "password", password: "123" }), { code: "invalid-argument" });
  assert.deepEqual(await call("president", { memberId: id, action: "password", password: "Changed123!" }), { ok: true });
  assert.equal((await db.doc(`associados/${id}`).get()).data().mustChangePassword, true);
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `${id}@example.test`, password: "Changed123!", returnSecureToken: true }) });
  assert.equal(response.ok, true);
  const audit = await db.collection("auditLogs").where("resourceId", "==", id).get();
  assert.equal(audit.size, 1);
  assert.equal(JSON.stringify(audit.docs[0].data()).includes("Changed123!"), false);
});
test("contas administrativas e registros sem login têm proteção específica", async () => {
  await role("president", 1);
  const admin = await member("admin-target"); await role("admin-target", 4);
  for (const action of ["password", "delete"]) await assert.rejects(call("president", { memberId: admin, action, password: "Changed123!", confirmation: "Associado admin-target" }), { code: "failed-precondition" });
  const pending = await member("pending", false);
  await assert.rejects(call("president", { memberId: pending, action: "password", password: "Changed123!" }), { code: "failed-precondition" });
  await assert.rejects(call("president", { memberId: pending, action: "delete", confirmation: "Outro nome" }), { code: "invalid-argument" });
  await call("president", { memberId: pending, action: "delete", confirmation: "Associado pending" });
  assert.equal((await db.doc(`associados/${pending}`).get()).exists, false);
});
test("exclusão remove login, perfil, cartões e dados privados, encerra apoio e preserva histórico", async () => {
  await role("president", 1);
  const id = await member("delete");
  for (const card of [id, `${id}-legacy`]) await db.doc(`publicMembers/${card}`).set({ uid: id });
  for (const name of ["memberPhotos", "users", "userPreferences", "mobileSubscriptions"]) await db.doc(`${name}/${id}`).set({ private: true });
  await db.doc(`mobilePushDevices/${id}/devices/phone`).set({ token: "private-token" });
  await db.doc(`mobileInbox/${id}/items/message`).set({ title: "Privado" });
  await db.doc(`locationShareOwners/${id}`).set({ ownerUid: id });
  await db.doc(`liveLocations/${id}`).set({ lat: -27, lng: -49 });
  await db.doc(`membershipRequests/${id}`).set({ status: "approved", memberUid: id });
  const request = db.doc(`supportRequests/${id}`);
  await request.set({ ownerUid: id, helperUid: "another-member", status: "accepted", expiresAt: Timestamp.fromMillis(Date.now() + 3600000) });
  for (const key of ["location", "helperPosition", "requesterPosition", "helperProfile"]) await request.collection("private").doc(key).set({ private: true });
  await call("president", { memberId: id, action: "delete", confirmation: "Associado delete" });
  assert.equal((await db.doc(`associados/${id}`).get()).exists, false);
  await assert.rejects(auth.getUser(id), { code: "auth/user-not-found" });
  assert.equal((await db.collection("publicMembers").where("uid", "==", id).get()).size, 0);
  assert.equal((await db.collection(`mobilePushDevices/${id}/devices`).get()).size, 0);
  assert.equal((await db.collection(`mobileInbox/${id}/items`).get()).size, 0);
  assert.equal((await db.doc(`liveLocations/${id}`).get()).exists, false);
  assert.equal((await request.get()).data().status, "cancelled");
  assert.equal((await request.collection("private").get()).size, 0);
  assert.equal((await db.doc(`membershipRequests/${id}`).get()).exists, true);
});
