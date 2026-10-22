// Integração real com Auth e Firestore locais, sem chamadas a Cloud Functions.
import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, getDocs, query, where, setDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const env = await initializeTestEnvironment({ projectId: "demo-aumm-mobile", firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") } });
const prefix = `portal-${Date.now()}`;
const cpfDigits = [...String(Date.now()).slice(-9)].map(Number);
for (let length = 9; length < 11; length++) {
  const remainder = cpfDigits.reduce((sum, digit, index) => sum + digit * (length + 1 - index), 0) % 11;
  cpfDigits.push(remainder < 2 ? 0 : 11 - remainder);
}
const accounts = [];
for (const level of [1, 2]) {
  const account = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `${prefix}-admin${level}@aumm.test`, password: "PortalTest123!", returnSecureToken: true }) }).then((r) => r.json());
  if (!account.localId) throw new Error("Auth local indisponível");
  accounts.push(account);
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "adminRoles", account.localId), { level, active: true, role: `Administrador nível ${level}`, fullName: "Admin teste local", permissions: {} });
  });
}
const memberAccount = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: prefix+"-member@aumm.test", password: "MemberOriginal123!", returnSecureToken: true }) }).then(r => r.json());
const memberId = memberAccount.localId;
const shareId = crypto.randomUUID().replaceAll("-", "");
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), "associados", memberId), { uid: memberId, fullName: "Motoboy Teste do Painel", status: "active", email: memberAccount.email, memberNumber: prefix });
  const db = c.firestore();
  await setDoc(doc(db, "publicMembers", prefix), { uid: memberId, status: "active" });
  await setDoc(doc(db, "memberPhotos", memberId), { uid: memberId, dataUrl: "fake" });
  await setDoc(doc(db, "locationShareOwners", shareId), { ownerUid: memberId, expiresAt: Timestamp.fromMillis(Date.now()+3600000) });
  await setDoc(doc(db, "liveLocations", shareId), { lat: -26.9, lng: -49.1, expiresAt: Timestamp.fromMillis(Date.now()+3600000) });
  await setDoc(doc(db, "supportRequests", memberId), { ownerUid: memberId, helperUid: "", status: "open" });
  for (const key of ["location", "helperProfile", "helperPosition", "requesterPosition"]) await setDoc(doc(db, "supportRequests", memberId, "private", key), { test: true });

});
const browser = await chromium.launch({ headless: true, executablePath: process.env.AUMM_BROWSER });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const page = await context.newPage(); page.setDefaultTimeout(90000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:5175/portal.html#/associe-se", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Nome completo", { exact: true }).fill("Motoboy Cadastro no Aplicativo");
  await page.getByLabel("Data de nascimento", { exact: true }).fill("10051992");
  await page.getByLabel("CPF", { exact: true }).fill(cpfDigits.join(""));
  await page.getByLabel("WhatsApp", { exact: true }).fill("47999999999");
  await page.getByLabel("E-mail", { exact: true }).fill(`${prefix}@aumm.test`);
  await page.getByRole("radio", { name: "Motoboy", exact: true }).check();
  await page.getByRole("link", { name: "Estatuto Social da AUMM" }).click();
  await expect(page).toHaveURL(/#\/estatuto/);
  await page.getByRole("button", { name: "Voltar ao cadastro" }).click();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue("Motoboy Cadastro no Aplicativo");
  await page.getByRole("checkbox").check();
  await expect(page.locator(".membership-form .form-message.error")).toHaveCount(0);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/26-cadastro-no-aplicativo.png", import.meta.url)) });
  await page.getByRole("button", { name: "Solicitar filiação", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar solicitação", exact: true }).click();
  await page.getByRole("heading", { name: "Seu pedido já foi recebido" }).waitFor();
  await env.withSecurityRulesDisabled(async (c) => {
    const requests = await getDocs(query(collection(c.firestore(), "membershipRequests"), where("email", "==", `${prefix}@aumm.test`)));
    expect(requests.size).toBe(1); expect(requests.docs[0].data().status).toBe("pending");
  });
  for (const [index, account] of accounts.reverse().entries()) {
    await page.goto("http://127.0.0.1:5175/portal.html#/associado/login?destino=admin", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("seu@email.com", { exact: true }).fill(account.email);
    await page.getByPlaceholder("Sua senha", { exact: true }).fill("PortalTest123!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await page.getByRole("link", { name: "Lista de associados", exact: true }).click();
    await page.getByPlaceholder("Pesquisar associado por nome, e-mail, telefone, CPF ou número").fill(prefix);
    await expect(page.getByRole("button", { name: "Abrir cadastro", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Abrir cadastro", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (index === 1) {
      await dialog.getByRole("button", { name: "Enviar recuperação de senha", exact: true }).click();
      await page.screenshot({ path: fileURLToPath(new URL("../artifacts/27-admin-app-recuperar-senha.png", import.meta.url)) });
      await dialog.getByRole("button", { name: "Enviar e-mail de recuperação", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      const codes = await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-aumm-mobile/oobCodes").then(r => r.json());
      expect(codes.oobCodes.some(code => code.email === memberAccount.email && code.requestType === "PASSWORD_RESET")).toBe(true);
      await page.getByRole("button", { name: "Abrir cadastro", exact: true }).click();
      await dialog.getByRole("button", { name: "Excluir perfil", exact: true }).click();
      const confirm = dialog.getByRole("button", { name: "Confirmar remoção do cadastro", exact: true });
      await expect(confirm).toBeDisabled();
      await dialog.locator('input[autocomplete="off"]').fill("Motoboy Teste do Painel");
      await confirm.click(); await dialog.waitFor({ state: "hidden" });
      await env.withSecurityRulesDisabled(async c => {
        const db = c.firestore();
        expect((await getDoc(doc(db, "associados", memberId))).exists()).toBe(false);
        expect((await getDoc(doc(db, "memberPhotos", memberId))).exists()).toBe(false);
        expect((await getDoc(doc(db, "publicMembers", prefix))).exists()).toBe(false);
        expect((await getDoc(doc(db, "locationShareOwners", shareId))).exists()).toBe(false);
        expect((await getDoc(doc(db, "liveLocations", shareId))).exists()).toBe(false);
        expect((await getDoc(doc(db, "supportRequests", memberId))).data().status).toBe("cancelled");
        for (const key of ["location", "helperProfile", "helperPosition", "requesterPosition"]) expect((await getDoc(doc(db, "supportRequests", memberId, "private", key))).exists()).toBe(false);
      });
      const login = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: memberAccount.email, password: "MemberOriginal123!", returnSecureToken: true }) }).then(r => r.json());
      expect(login.localId).toBe(memberId);
    } else {
      await expect(dialog.getByRole("button", { name: "Enviar recuperação de senha", exact: true })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Excluir perfil", exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
  console.log("Cadastro no app, recuperação real por e-mail, exclusão com limpeza de apoio e links, Auth preservado e restrição por nível: aprovados no emulador em 390px.");
} finally { await browser.close(); await env.cleanup(); }
