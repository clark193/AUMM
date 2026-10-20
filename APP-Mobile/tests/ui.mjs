import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../artifacts/", import.meta.url));
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUMM_BROWSER || undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  geolocation: { latitude: -26.9194, longitude: -49.0661, accuracy: 15 },
  permissions: ["geolocation"],
  locale: "pt-BR",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5174");
await page.getByRole("heading", { name: /Salve, motoboy/ }).waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: root + "01-inicio.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "não deve existir rolagem lateral",
);
await page.getByRole("button", { name: "Apoio", exact: true }).click();
await page
  .getByRole("heading", { name: "Centro de Apoio", exact: true })
  .waitFor();
await page.screenshot({
  path: root + "02-centro-de-apoio.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Pedir ajuda", exact: true }).click();
const request = page.getByRole("dialog", { name: "Pedir apoio na cidade" });
await request
  .getByRole("button", { name: "Usar minha localização atual" })
  .click();
await request.getByText("Localização obtida", { exact: true }).waitFor();
await request.getByRole("textbox", { name: "Bairro / região" }).fill("Centro");
await request
  .getByRole("textbox", { name: "Detalhes para quem vier ajudar" })
  .fill("Moto preta, perto da entrada do posto.");
await request.getByRole("checkbox").check();
await page.screenshot({ path: root + "03-pedir-apoio.png", fullPage: true });
// Não envia dados para o Firebase de produção.
await request.getByRole("button", { name: "Fechar", exact: true }).click();
await page
  .getByRole("button", { name: "Utilidades", exact: true })
  .last()
  .click();
await page.getByRole("heading", { name: "Seu kit de utilidades" }).waitFor();
await page.screenshot({ path: root + "04-utilidades.png", fullPage: true });
await page.getByRole("button", { name: /Quanto rendeu a sua jornada/ }).click();
await page.getByRole("dialog", { name: "Calculadora da jornada" }).waitFor();
await page
  .getByRole("spinbutton", { name: "Distância rodada (km)" })
  .fill("100");
await page
  .getByRole("spinbutton", { name: "Ganhos recebidos (R$)" })
  .fill("200");
await page.getByRole("spinbutton", { name: "Preço do litro (R$)" }).fill("6");
await page
  .getByRole("spinbutton", { name: "Consumo da moto (km/l)" })
  .fill("25");
await page.getByRole("spinbutton", { name: "Outros gastos (R$)" }).fill("16");
assert.match(
  await page.locator(".calculation-result>strong").innerText(),
  /160,00/,
);
await page.screenshot({ path: root + "05-calculadora.png", fullPage: true });
await page.keyboard.press("Escape");
await page.getByRole("button", { name: /Checklist da moto/ }).click();
await page.getByRole("checkbox").first().check();
await page.keyboard.press("Escape");
await page.getByRole("button", { name: /Checklist da moto/ }).click();
assert.equal(
  await page.getByRole("checkbox").first().isChecked(),
  true,
  "checklist persiste ao reabrir",
);
await page.keyboard.press("Escape");
await page
  .getByRole("button", { name: "Meu perfil", exact: true })
  .last()
  .click();
await page
  .getByRole("button", { name: "Minha carteirinha", exact: true })
  .click();
await page.getByText("Um espaço para associados", { exact: true }).waitFor();
await page.keyboard.press("Escape");
await page
  .getByRole("button", { name: "Entrar como associado", exact: true })
  .click();
await page.getByRole("textbox", { name: "E-mail", exact: true }).waitFor();
await page.screenshot({ path: root + "06-login.png", fullPage: true });
await page.keyboard.press("Escape");
await page.setViewportSize({ width: 320, height: 740 });
await page.getByRole("button", { name: "Início", exact: true }).click();
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "tela 320px sem rolagem lateral",
);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: root + "07-desktop.png", fullPage: true });
assert.deepEqual(errors, [], "sem erros de execução no navegador");
await browser.close();
console.log(
  "UI validada: navegação, GPS, formulário de pedido, calculadora, checklist, acesso restrito, login e larguras 320/390/1440px.",
);
