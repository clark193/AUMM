import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ headless: true, executablePath: process.env.AUMM_BROWSER });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "pt-BR" });
const page = await context.newPage(); page.setDefaultTimeout(30000);
const errors = []; let writes = 0;
page.on("pageerror", error => errors.push(error.message));
await context.route("**/*", route => {
  const url = route.request().url();
  if (url.includes("firestore.googleapis.com") && /\/Write\/|documents:commit|documents:batchWrite/.test(url)) { writes++; return route.abort(); }
  return route.continue();
});
try {
  await page.goto("http://127.0.0.1:5174/preview-celular.html", { waitUntil: "domcontentloaded" });
  const phone = page.frameLocator("iframe");
  await expect(phone.getByRole("button", { name: /Botão de emergência/ })).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/36-preview-app-atualizado.png", import.meta.url)) });
  await page.getByRole("link", { name: "Emergência", exact: true }).click();
  const emergency = phone.getByRole("dialog", { name: "Emergência e apoio após acidente" });
  await expect(emergency.getByText(/Demonstração: nenhum alerta/)).toBeVisible();
  await emergency.getByRole("button", { name: /Sofri um acidente/ }).click();
  await emergency.getByRole("button", { name: "Confirmar e avisar a associação" }).click();
  await expect(emergency.getByText("Aguardando atendimento da associação", { exact: true })).toBeVisible();
  await emergency.getByRole("button", { name: "Simular associação entrando em contato" }).click();
  await expect(emergency.getByText("A associação está verificando seu pedido", { exact: true })).toBeVisible();
  await emergency.getByRole("button", { name: "Simular atendimento encerrado" }).click();
  await expect(emergency.getByText("Atendimento encerrado", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Administrador", exact: true }).click();
  const admin = phone.getByRole("dialog", { name: "Painel administrativo · demonstração" });
  await admin.getByRole("button", { name: "Simular novo alerta de acidente" }).click();
  await expect(admin.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/37-preview-admin-notificacao.png", import.meta.url)) });
  await admin.getByRole("alert").getByRole("button", { name: "Abrir atendimento", exact: true }).click();
  await expect(admin.getByText("Rafael · associado fictício", { exact: true })).toBeVisible();
  await admin.getByRole("button", { name: "Estou entrando em contato" }).click();
  await expect(admin.getByText("Em acompanhamento pela associação", { exact: true })).toBeVisible();
  await admin.getByRole("button", { name: "Encerrar atendimento", exact: true }).click();
  await expect(admin.getByRole("status")).toContainText("Atendimento encerrado");
  await admin.getByRole("combobox").selectOption("5");
  await admin.getByRole("button", { name: "Simular novo alerta de acidente" }).click();
  await admin.getByRole("alert").getByRole("button", { name: "Ver aviso", exact: true }).click();
  await expect(admin.getByText("Rafael · associado fictício", { exact: true })).toHaveCount(0);
  await expect(admin.getByRole("button", { name: "Abrir atendimento", exact: true })).toHaveCount(0);
  expect(writes).toBe(0); expect(errors).toEqual([]);
  console.log("Prévia no celular: início atualizado, emergência completa e aviso administrativo por nível simulados sem gravações no Firebase ou mensagens reais.");
} finally { await browser.close(); }
