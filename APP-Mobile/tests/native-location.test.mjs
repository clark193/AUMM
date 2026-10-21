import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../android/app/src/main/java/br/com/aumm/app/", import.meta.url));
const jdk = process.env.JAVA_HOME;
const executable = name => jdk ? join(jdk, "bin", name + (process.platform === "win32" ? ".exe" : "")) : name;
function compiledPackets() {
  const folder = mkdtempSync(join(tmpdir(), "aumm-native-location-"));
  try {
    const runner = join(folder, "NativeLocationCheck.java");
    writeFileSync(runner, `package br.com.aumm.app;
public class NativeLocationCheck {
 static void check(boolean value) { if (!value) throw new AssertionError(); }
 public static void main(String[] args) {
  long now = System.currentTimeMillis(); String project = "demo-aumm-mobile", id = "0123456789abcdef0123456789abcdef", token = "a".repeat(200);
  check(LiveLocationPolicy.validSession(project,id,token,now+12*60*60000,now));
  check(!LiveLocationPolicy.validSession(project,id,token,now+13*60*60000,now));
  check(!LiveLocationPolicy.validSession(project,id,token,now-1,now));
  check(!LiveLocationPolicy.validSession(project,id,token+"\\n",now+60000,now));
  check(!LiveLocationPolicy.validSession("evil/path",id,token,now+60000,now));
  check(!LiveLocationPolicy.validSession(project,"../anything",token,now+60000,now));
  check(LiveLocationPolicy.freshPosition(-26.92,-49.07,12,now,now));
  check(!LiveLocationPolicy.freshPosition(Double.NaN,-49,12,now,now));
  check(!LiveLocationPolicy.freshPosition(-91,-49,12,now,now));
  check(!LiveLocationPolicy.freshPosition(-26,-181,12,now,now));
  check(!LiveLocationPolicy.freshPosition(-26,-49,-1,now,now));
  check(!LiveLocationPolicy.freshPosition(-26,-49,1,now-120000,now));
  check(!LiveLocationPolicy.freshPosition(-26,-49,1,now+60000,now));
  System.out.println(LocationCommit.position(project,id,-26.92,-49.07,12,now));
  System.out.println(LocationCommit.revoke(project,id));
 }
}`);
    const compile = spawnSync(executable("javac"), ["-encoding", "UTF-8", "-d", folder, join(source, "LiveLocationPolicy.java"), join(source, "LocationCommit.java"), runner], { encoding: "utf8" });
    assert.equal(compile.status, 0, compile.stderr || String(compile.error || ""));
    const run = spawnSync(executable("java"), ["-cp", folder, "br.com.aumm.app.NativeLocationCheck"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    return run.stdout.trim().split(/\r?\n/).map(JSON.parse);
  } finally {
    assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
    rmSync(folder, { recursive: true, force: true });
  }
}

let packets;
test("código Java real rejeita sessões inválidas e amostras GPS antigas", () => {
  packets = compiledPackets();
  assert.equal(packets.length, 2);
});
test("envio nativo preserva expiração e usa horário do servidor, sem cadastro ou credenciais no documento", () => {
  const [position, revoke] = packets;
  const write = position.writes[0];
  assert.deepEqual(Object.keys(write.update.fields).sort(), ["accuracy", "lat", "lng", "sampledAt"]);
  assert.deepEqual(write.updateMask.fieldPaths.sort(), ["accuracy", "lat", "lng", "sampledAt"]);
  assert.deepEqual(write.updateTransforms, [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }]);
  assert.equal(write.currentDocument.exists, true);
  assert.equal(revoke.writes.length, 2);
  assert.match(revoke.writes[0].delete, /liveLocations\//);
  assert.match(revoke.writes[1].delete, /locationShareOwners\//);
});

test("pacote Java grava e revoga via REST autenticado sob as regras reais", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const { initializeTestEnvironment } = await import("@firebase/rules-unit-testing");
  const { readFileSync } = await import("node:fs");
  const { initializeApp, deleteApp } = await import("firebase/app");
  const { getAuth, connectAuthEmulator, signInAnonymously } = await import("firebase/auth");
  const { getFirestore, connectFirestoreEmulator, doc, writeBatch, Timestamp, serverTimestamp } = await import("firebase/firestore");
  const project = "demo-aumm-mobile", id = "0123456789abcdef0123456789abcdef";
  const environment = await initializeTestEnvironment({ projectId: project, firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") } });
  const app = initializeApp({ projectId: project, apiKey: "test-key" }, "native-rest-test");
  try {
    const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    await signInAnonymously(auth);
    const token = await auth.currentUser.getIdToken();
    const db = getFirestore(app); connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const expiresAt = Timestamp.fromMillis(Date.now() + 55 * 60000);
    const batch = writeBatch(db);
    batch.set(doc(db, "locationShareOwners", id), { ownerUid: auth.currentUser.uid, createdAt: serverTimestamp(), expiresAt });
    batch.set(doc(db, "liveLocations", id), { lat: 0, lng: 0, accuracy: 1, sampledAt: Timestamp.now(), updatedAt: serverTimestamp(), expiresAt });
    await batch.commit();
    const commit = body => fetch(`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents:commit`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await commit(packets[0]);
    assert.equal(result.status, 200, await result.text());
    const read = () => fetch(`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/liveLocations/${id}`);
    const stored = await (await read()).json();
    assert.equal(stored.fields.lat.doubleValue, -26.92);
    assert.equal(Date.parse(stored.fields.expiresAt.timestampValue), expiresAt.toMillis());
    assert.equal((await commit(packets[1])).status, 200);
    assert.notEqual((await read()).status, 200);
  } finally { await deleteApp(app); await environment.cleanup(); }
});
