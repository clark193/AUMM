import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const env = await initializeTestEnvironment({ projectId: "demo-aumm-mobile", firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") } });
const browser = await chromium.launch({ headless: true, executablePath: process.env.AUMM_BROWSER });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["geolocation"], geolocation: { latitude: -26.9194, longitude: -49.0661, accuracy: 12 } });
const page = await context.newPage(); page.setDefaultTimeout(90000);
const errors = []; page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:5175", { waitUntil: "domcontentloaded" });
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Meu perfil", exact: true }).click();
  await page.getByRole("button", { name: /Compartilhar localização ao vivo/ }).click();
  const dialog = page.getByRole("dialog", { name: "Compartilhar localização ao vivo" });
  await expect(dialog.getByRole("button", { name: "Iniciar compartilhamento ao vivo" })).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Iniciar compartilhamento ao vivo" }).click();
  const input = dialog.getByRole("textbox", { name: "Link de acompanhamento" });
  await expect(input).toBeVisible();
  const link = new URL(await input.inputValue()), token = link.hash.slice(1);
  expect(token).toMatch(/^[a-f0-9]{32}$/); expect(link.pathname).toBe("/acompanhar/");
  const publicDb = env.unauthenticatedContext().firestore();
  const location = () => getDoc(doc(publicDb, "liveLocations", token));
  expect((await location()).data().lat).toBe(-26.9194);
  expect(Object.keys((await location()).data()).sort()).toEqual(["accuracy", "expiresAt", "lat", "lng", "sampledAt", "updatedAt"]);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/28-compartilhar-localizacao-ao-vivo.png", import.meta.url)) });
  // Força a próxima amostra depois da janela de dez segundos do remetente.
  await page.waitForTimeout(10500);
  await context.setGeolocation({ latitude: -26.925, longitude: -49.073, accuracy: 10 });
  await expect.poll(async () => (await location()).data()?.lat, { timeout: 30000 }).toBe(-26.925);
  await dialog.getByRole("button", { name: "Encerrar compartilhamento", exact: true }).click();
  await expect(input).toHaveCount(0);
  await env.withSecurityRulesDisabled(async (c) => {
    expect((await getDoc(doc(c.firestore(), "liveLocations", token))).exists()).toBe(false);
    expect((await getDoc(doc(c.firestore(), "locationShareOwners", token))).exists()).toBe(false);
  });
  expect(errors).toEqual([]);
  console.log("Compartilhamento ao vivo: consentimento, link privado por posse, leitura pública sem dados cadastrais, movimento e revogação imediata: aprovados no emulador.");
} finally { await browser.close(); await env.cleanup(); }
