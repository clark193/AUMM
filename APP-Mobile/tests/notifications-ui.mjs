import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const env = await initializeTestEnvironment({
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
const signup = await fetch(
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `notices-${Date.now()}@aumm.test`,
      password: "AummTest123!",
      returnSecureToken: true,
    }),
  },
).then((r) => r.json());
if (!signup.localId) throw new Error("Emulador Auth não está ativo.");
await env.withSecurityRulesDisabled((c) =>
  setDoc(doc(c.firestore(), "associados", signup.localId), {
    uid: signup.localId,
    fullName: "Associado de teste local",
    status: "active",
    mustChangePassword: false,
  }),
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUMM_BROWSER,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const options = {
  viewport: { width: 390, height: 844 },
  permissions: ["geolocation"],
  geolocation: { latitude: -26.9194, longitude: -49.0661, accuracy: 12 },
  locale: "pt-BR",
};
const guestContext = await browser.newContext(options),
  helperContext = await browser.newContext(options);
const guest = await guestContext.newPage(),
  helper = await helperContext.newPage();
guest.setDefaultTimeout(60000);
helper.setDefaultTimeout(60000);
const errors = [];
guest.on("pageerror", (e) => errors.push(e.message));
helper.on("pageerror", (e) => errors.push(e.message));
try {
  await guest.goto("http://127.0.0.1:5175", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await guest.getByRole("heading", { name: /Salve, motoboy/ }).waitFor();
  // Aguarda o primeiro snapshot público; as publicações antigas não viram alerta.
  await guest
    .getByRole("button", { name: "Notificações", exact: true })
    .click();
  await guest
    .getByRole("heading", { name: "Sua rede vai avisar você" })
    .waitFor();
  await guest.getByRole("button", { name: "Fechar", exact: true }).click();
  const newsId = `notice-news-${Date.now()}`;
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "news", newsId), {
      status: "published",
      title: "Nova ação para a categoria",
      summary: "Publicação do teste local",
      content: "Conteúdo da notícia de teste.",
      publishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }),
  );
  await guest
    .locator(".notice-banner")
    .getByText("Novidade na AUMM", { exact: true })
    .waitFor();
  await guest.locator(".notice-banner-copy").click();
  await guest
    .getByRole("dialog", { name: "Notícias AUMM" })
    .getByRole("heading", { name: "Nova ação para a categoria" })
    .waitFor();
  await guest.getByRole("button", { name: "Fechar", exact: true }).click();
  await env.withSecurityRulesDisabled((c) =>
    updateDoc(doc(c.firestore(), "news", newsId), {
      summary: "Texto atualizado",
    }),
  );
  await expect(guest.locator(".notice-banner")).toHaveCount(0);
  console.log(
    "Notícia nova notifica, abre a publicação e não repete em edição.",
  );
  await helper.goto("http://127.0.0.1:5175", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await helper
    .getByRole("button", { name: "Fazer login", exact: true })
    .click();
  await helper
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill(signup.email);
  await helper.getByLabel("Senha", { exact: true }).fill("AummTest123!");
  await helper
    .getByRole("button", { name: "Entrar na minha conta", exact: true })
    .click();
  await helper.getByRole("dialog").waitFor({ state: "hidden" });
  await helper.getByRole("button", { name: "Apoio", exact: true }).click();
  await helper.getByText("Tudo tranquilo por aqui", { exact: true }).waitFor();
  await guest.getByRole("button", { name: "Apoio", exact: true }).click();
  await guest.getByRole("button", { name: "Pedir ajuda", exact: true }).click();
  const form = guest.getByRole("dialog", { name: "Pedir apoio na cidade" });
  await form.getByRole("textbox", { name: "Bairro / região" }).fill("Centro");
  await form.getByRole("textbox", { name: "Placa da moto" }).fill("ABC1D23");
  await form
    .getByRole("button", { name: "Usar minha localização atual" })
    .click();
  await form.getByText("Localização obtida", { exact: true }).waitFor();
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Enviar pedido de apoio", exact: true })
    .click();
  await guest.getByText("Aguardando um voluntário", { exact: true }).waitFor();
  await helper
    .locator(".notice-banner")
    .getByText("Alguém precisa de uma força", { exact: true })
    .waitFor();
  await helper.locator(".notice-banner-copy").click();
  await helper
    .getByRole("button", { name: "Posso ajudar", exact: true })
    .click();
  await guest
    .locator(".notice-banner")
    .getByText("Alguém aceitou! Confirme seu apoio", { exact: true })
    .waitFor();
  await guest.screenshot({
    path: fileURLToPath(
      new URL("../artifacts/11-aviso-ajuda-aceita.png", import.meta.url),
    ),
  });
  await guest.locator(".notice-banner-copy").click();
  await guest.getByRole("button", { name: /^Notificações/ }).click();
  await guest
    .getByRole("dialog", { name: "Suas notificações" })
    .getByText("Seu pedido está na rede", { exact: true })
    .waitFor();
  await guest
    .getByRole("dialog", { name: "Suas notificações" })
    .getByText("Alguém aceitou! Confirme seu apoio", { exact: true })
    .waitFor();
  await guest.screenshot({
    path: fileURLToPath(
      new URL("../artifacts/12-central-notificacoes.png", import.meta.url),
    ),
  });
  await guest
    .getByRole("button", { name: "Marcar como lidos", exact: true })
    .click();
  await guest.getByText("Você está em dia", { exact: true }).waitFor();
  await guest
    .getByRole("button", { name: "Preferências de notificações" })
    .click();
  await guest.screenshot({
    path: fileURLToPath(
      new URL("../artifacts/13-preferencias-notificacoes.png", import.meta.url),
    ),
  });
  await guest
    .getByRole("switch", { name: "Notícias novas", exact: true })
    .uncheck();
  await expect(
    guest.getByRole("switch", { name: "Pedidos de ajuda na cidade" }),
  ).toBeDisabled();
  await guest.getByRole("button", { name: "Fechar", exact: true }).click();
  await guest
    .getByRole("button", { name: "Cancelar pedido", exact: true })
    .click();
  await guest
    .getByRole("button", { name: "Confirmar encerramento", exact: true })
    .click();
  await helper
    .locator(".notice-banner")
    .getByText("Pedido de apoio cancelado", { exact: true })
    .waitFor();
  await guest.getByRole("button", { name: /^Notificações/ }).click();
  await guest
    .getByRole("button", { name: "Marcar como lidos", exact: true })
    .click();
  await guest.getByRole("button", { name: "Fechar", exact: true }).click();
  const mutedId = `muted-news-${Date.now()}`;
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "news", mutedId), {
      status: "published",
      title: "Notícia silenciada no teste",
      publishedAt: serverTimestamp(),
    }),
  );
  await guest.getByRole("button", { name: "Notícias", exact: true }).click();
  await guest
    .getByRole("heading", { name: "Notícia silenciada no teste", exact: true })
    .waitFor();
  await expect(guest.locator(".notice-banner")).toHaveCount(0);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Notificações aprovadas em dois usuários: notícias, chamado na cidade, envio, aceite, cancelamento, leitura, preferências e navegação.",
  );
} catch (error) {
  console.log(
    "Solicitante:",
    (await guest.locator("body").innerText()).slice(-2200),
  );
  console.log(
    "Ajudante:",
    (await helper.locator("body").innerText()).slice(-1600),
  );
  console.log("Erros JavaScript:", errors);
  throw error;
} finally {
  await browser.close();
  await env.cleanup();
}
