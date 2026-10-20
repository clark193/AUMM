// Interface do app usa apenas Auth/Firestore locais. A chamada administrativa
// é interceptada; o handler real é verificado em functions/tests/memberAccounts.mjs.
import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, getDocs, query, where, setDoc, doc } from "firebase/firestore";
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
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), "associados", `${prefix}-member`), { uid: `${prefix}-member`, fullName: "Motoboy Teste do Painel", status: "active", email: "member@example.test", memberNumber: prefix });
});
const browser = await chromium.launch({ headless: true, executablePath: process.env.AUMM_BROWSER });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const page = await context.newPage(); page.setDefaultTimeout(90000);
const errors = [], calls = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/manageMemberAccount", async (route) => {
  calls.push(route.request().postDataJSON().data);
  await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ data: { ok: true } }) });
});
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
  for (const [index, account] of accounts.entries()) {
    await page.goto("http://127.0.0.1:5175/portal.html#/associado/login?destino=admin", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("admin", { exact: true }).fill(account.email);
    await page.getByPlaceholder("Sua senha", { exact: true }).fill("PortalTest123!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await page.getByRole("link", { name: "Lista de associados", exact: true }).click();
    await page.getByPlaceholder("Pesquisar associado por nome, e-mail, telefone, CPF ou número").fill(prefix);
    await expect(page.getByRole("button", { name: "Abrir cadastro", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Abrir cadastro", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (index === 0) {
      await dialog.getByRole("button", { name: "Trocar senha", exact: true }).click();
      await dialog.getByLabel("Nova senha temporária", { exact: true }).fill("NewPortal123!");
      await dialog.getByLabel("Confirme a senha temporária", { exact: true }).fill("Different123!");
      await dialog.getByRole("button", { name: "Salvar senha temporária", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText("As senhas não coincidem");
      expect(calls.length).toBe(0);
      await dialog.getByLabel("Confirme a senha temporária", { exact: true }).fill("NewPortal123!");
      await page.screenshot({ path: fileURLToPath(new URL("../artifacts/27-admin-app-trocar-senha.png", import.meta.url)) });
      await dialog.getByRole("button", { name: "Salvar senha temporária", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      expect(calls[0]).toEqual({ memberId: `${prefix}-member`, action: "password", password: "NewPortal123!" });
      await page.getByRole("button", { name: "Abrir cadastro", exact: true }).click();
      await dialog.getByRole("button", { name: "Excluir perfil", exact: true }).click();
      const confirm = dialog.getByRole("button", { name: "Confirmar exclusão definitiva", exact: true });
      await expect(confirm).toBeDisabled();
      await dialog.locator('input[autocomplete="off"]').fill("Motoboy Teste do Painel");
      await confirm.click(); await dialog.waitFor({ state: "hidden" });
      expect(calls[1]).toEqual({ memberId: `${prefix}-member`, action: "delete", confirmation: "Motoboy Teste do Painel" });
    } else {
      await expect(dialog.getByRole("button", { name: "Trocar senha", exact: true })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Excluir perfil", exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
  console.log("Cadastro dentro do app com estatuto e envio real no emulador, painel completo, troca/exclusão com confirmação e restrição visual por nível: aprovados em 390px. Payload administrativo interceptado; nenhuma escrita remota.");
} finally { await browser.close(); await env.cleanup(); }
