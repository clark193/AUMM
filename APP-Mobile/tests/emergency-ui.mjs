import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const env = await initializeTestEnvironment({ projectId: "demo-aumm-mobile", firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") } });
const prefix = `emergency-${Date.now()}`;
async function account(suffix) {
  return fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `${prefix}-${suffix}@aumm.test`, password: "EmergencyTest123!", returnSecureToken: true }) }).then(r => r.json());
}
const member = await account("member"), staff = await account("staff"), recruiter = await account("recruiter");
await env.withSecurityRulesDisabled(async c => {
  await setDoc(doc(c.firestore(), "associados", member.localId), { uid: member.localId, fullName: "Associado Teste Emergência", memberNumber: prefix, status: "active", mustChangePassword: false });
  await setDoc(doc(c.firestore(), "adminRoles", recruiter.localId), { active: true, level: 5, fullName: "Recrutador Teste", role: "Recrutamento", permissions: {} });
  await setDoc(doc(c.firestore(), "adminRoles", staff.localId), { active: true, level: 3, fullName: "Atendente Teste", role: "Coordenação", permissions: {} });
});
const browser = await chromium.launch({ headless: true, executablePath: process.env.AUMM_BROWSER });
const userContext = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["geolocation"], geolocation: { latitude: -26.9194, longitude: -49.0661, accuracy: 12 } });
const staffContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const recruiterContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await userContext.newPage(), admin = await staffContext.newPage(), observer = await recruiterContext.newPage();
page.setDefaultTimeout(60000); admin.setDefaultTimeout(60000); observer.setDefaultTimeout(60000);
const errors = []; for (const p of [page, admin, observer]) p.on("pageerror", e => errors.push(e.message));
async function readAlert() {
  let data;
  await env.withSecurityRulesDisabled(async c => { data = (await getDoc(doc(c.firestore(), "emergencyAlerts", member.localId))).data(); });
  return data;
}
try {
  await admin.goto("http://127.0.0.1:5175/portal.html#/associado/login?destino=admin", { waitUntil: "domcontentloaded" });
  await admin.getByPlaceholder("seu@email.com", { exact: true }).fill(staff.email);
  await admin.getByPlaceholder("Sua senha", { exact: true }).fill("EmergencyTest123!");
  await admin.getByRole("button", { name: "Entrar", exact: true }).click();

  await observer.goto("http://127.0.0.1:5175/portal.html#/associado/login?destino=admin", { waitUntil: "domcontentloaded" });
  await observer.getByPlaceholder("seu@email.com", { exact: true }).fill(recruiter.email);
  await observer.getByPlaceholder("Sua senha", { exact: true }).fill("EmergencyTest123!");
  await observer.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(observer.getByRole("button", { name: /^Notificações/ })).toBeVisible();
  console.log("Administradores de níveis 3 e 5 conectados ao painel.");
  await page.goto("http://127.0.0.1:5175/?login=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Botão de emergência/ })).toHaveCount(0);
  await page.getByLabel("E-mail", { exact: true }).fill(member.email);
  await page.getByLabel("Senha", { exact: true }).fill("EmergencyTest123!");
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await page.getByRole("button", { name: /Botão de emergência/ }).click();
  const dialog = page.getByRole("dialog", { name: "Emergência e apoio após acidente" });
  await dialog.getByRole("button", {name:"Cadastrar contato em Meu Perfil"}).click();
  const contactDialog=page.getByRole("dialog");
  await contactDialog.getByLabel("Nome do contato de emergência", {exact:true}).fill("Contato de Confiança");
  await contactDialog.getByLabel("Celular do contato com DDD").fill("47999991234");
  await contactDialog.getByLabel("Seu celular com DDD").fill("47999994321");
  await contactDialog.getByRole("button",{name:"Salvar contato de emergência",exact:true}).click();
  await expect(contactDialog.getByText("Contato de emergência atualizado.",{exact:true})).toBeVisible();
  await contactDialog.getByRole("button",{name:/Fechar/}).click();
  await page.getByRole("navigation",{name:"Navegação principal"}).getByRole("button",{name:"Início",exact:true}).click();
  await page.getByRole("button",{name:/Botão de emergência/}).click();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await dialog.getByRole("button",{name:"Cancelar",exact:true}).click();
  expect(await readAlert()).toBeUndefined();
  await page.getByRole("button",{name:/Botão de emergência/}).click();
  await userContext.clearPermissions();
  await dialog.getByRole("button",{name:"Confirmar Emergência",exact:true}).click();
  await expect(dialog.getByText("Alerta registrado para a diretoria",{exact:true})).toBeVisible();
  expect((await readAlert()).location).toBeNull();
  expect((await readAlert()).contactPhone).toBe("+5547999991234");
  await expect(dialog.getByText(/Nenhuma mensagem automática é enviada/)).toBeVisible();
  await page.screenshot({path:fileURLToPath(new URL("../artifacts/32-emergencia-em-andamento.png",import.meta.url))});
  await expect(admin.locator(".admin-emergency-toast")).toBeVisible();
  await admin.screenshot({ path: fileURLToPath(new URL("../artifacts/35-notificacao-emergencia-painel.png", import.meta.url)) });
  await expect(observer.locator(".admin-emergency-toast")).toBeVisible();
  await observer.getByRole("button", { name: "Ver aviso", exact: true }).click();
  await expect(observer.locator(".notification-popover .emergency-notice")).toHaveCount(1);
  await expect(observer.locator(".notification-popover")).not.toContainText("Associado Teste Emergência");
  await expect(observer.locator(".notification-popover")).not.toContainText("+5547999991234");
  await expect(observer.locator(".notification-popover").getByRole("link", { name: /Abrir atendimento/ })).toHaveCount(0);
  await observer.screenshot({ path: fileURLToPath(new URL("../artifacts/34-aviso-emergencia-admin-nivel-5.png", import.meta.url)) });
  await observer.getByRole("button", { name: "Fechar notificações", exact: true }).click();
  await admin.locator(".admin-emergency-toast").getByRole("link", { name: /Abrir atendimento/ }).click();

  const card = admin.locator(".emergency-admin-card").filter({ hasText: prefix });
  await expect(card.getByText("Localização não obtida.", { exact: false })).toBeVisible();
  await card.getByRole("button", { name: "Estou entrando em contato" }).click();
  await expect(dialog.getByText("A diretoria está entrando em contato", { exact: true })).toBeVisible();
  await expect(observer.locator(".admin-emergency-toast")).toHaveCount(0);
  await admin.screenshot({ path: fileURLToPath(new URL("../artifacts/33-emergencia-painel-aumm.png", import.meta.url)) });
  await card.getByRole("button", { name: "Marcar como atendido", exact: true }).click();
  await expect(dialog.getByText("Atendimento encerrado", { exact: true })).toBeVisible();
  await page.bringToFront();
  // Um segundo incidente confirma o caminho com GPS e o cancelamento pelo associado.
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), "emergencyAlerts", member.localId), { createdAt: Timestamp.fromMillis(Date.now()-65000) }));
  await userContext.grantPermissions(["geolocation"]);
  await dialog.getByRole("button",{name:"Confirmar Emergência",exact:true}).click();
  await expect(dialog.getByText("Alerta registrado para a diretoria",{exact:true})).toBeVisible();
  expect((await readAlert()).location.lat).toBe(-26.9194);
  await expect(observer.locator(".admin-emergency-toast")).toBeVisible();
  await dialog.getByRole("button", { name: /Cancelar alerta/ }).click();
  await expect(dialog.getByText("Alerta cancelado", { exact: true })).toBeVisible();
  await expect(observer.locator(".admin-emergency-toast")).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log("Emergência: contato privado, confirmação/cancelamento, alerta com e sem GPS, fila administrativa e status em tempo real, sino e aviso para admins de níveis 3 e 5 sem dados privados e sem repetir o mesmo incidente: aprovados em 390px. Fluxo manual da diretoria; nenhum SMS é aberto ou enviado.");
} catch (error) {
  console.error(error.message);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/emergency-test-failure.png", import.meta.url)) }).catch(() => undefined);
  if (await page.getByRole("dialog").count()) console.log(await page.getByRole("dialog").innerText());
  throw error;
} finally { await browser.close(); await env.cleanup(); }
