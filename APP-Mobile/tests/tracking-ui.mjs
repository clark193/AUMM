// Integração completa em dois navegadores, somente nos emuladores locais.
import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
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
      email: `helper-${Date.now()}@aumm.test`,
      password: "AummTest123!",
      returnSecureToken: true,
    }),
  },
).then((r) => r.json());
if (!signup.localId) throw new Error("Emulador de autenticação indisponível.");
const helperUid = signup.localId;
await env.withSecurityRulesDisabled(async (c) => {
  const database = c.firestore();
  await setDoc(doc(database, "associados", helperUid), {
    uid: helperUid,
    fullName: "Associado de teste local",
    status: "active",
    mustChangePassword: false,
  });
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUMM_BROWSER,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const contextOptions = {
  viewport: { width: 390, height: 844 },
  permissions: ["geolocation"],
  locale: "pt-BR",
};
const guestContext = await browser.newContext({
  ...contextOptions,
  geolocation: { latitude: -26.9194, longitude: -49.0661, accuracy: 12 },
});
const helperContext = await browser.newContext({
  ...contextOptions,
  geolocation: { latitude: -26.925, longitude: -49.073, accuracy: 10 },
});
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
  await guest.getByRole("button", { name: "Apoio", exact: true }).click();
  await guest.getByRole("button", { name: "Pedir ajuda", exact: true }).click();
  const form = guest.getByRole("dialog", { name: "Pedir apoio na cidade" });
  await form.getByRole("textbox", { name: "Placa da moto" }).fill("ABC1D23");
  await form.getByRole("textbox", { name: "Bairro / região" }).fill("Centro");
  await form
    .getByRole("button", { name: "Usar minha localização atual" })
    .click();
  await form.getByText("Localização obtida", { exact: true }).waitFor();
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Enviar pedido de apoio", exact: true })
    .click();
  await guest
    .getByRole("heading", { name: "Meu pedido de apoio", exact: true })
    .waitFor();
  await expect(
    guest.getByText("Quem está na rua se ajuda.", { exact: true }),
  ).toHaveCount(0);
  await guest.getByRole("button", { name: "Início", exact: true }).click();
  await guest.locator(".support-dock-main").waitFor();
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
  await helper
    .getByRole("button", { name: "Posso ajudar", exact: true })
    .click();
  await helper
    .getByRole("heading", { name: "Aguardando quem pediu ajuda", exact: true })
    .waitFor();
  await expect(
    helper.getByRole("button", {
      name: "Compartilhar meu trajeto",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(helper.getByText("ABC1D23", { exact: true })).toHaveCount(0);
  await guest.locator(".support-dock-main").click();
  await guest
    .getByRole("heading", { name: "Você ainda precisa de apoio?", exact: true })
    .waitFor();
  await guest.getByText("Associado de teste local", { exact: true }).waitFor();
  await guest.screenshot({
    path: fileURLToPath(
      new URL("../artifacts/16-confirmacao-solicitante.png", import.meta.url),
    ),
  });
  await guest
    .getByRole("button", { name: "Sim, ainda preciso", exact: true })
    .click();
  await helper
    .locator(".request-stage")
    .getByText("Apoio confirmado", { exact: true })
    .waitFor();
  await helper.getByText("ABC1D23", { exact: true }).waitFor();
  console.log(
    "Placa privada, aceite pendente e confirmação sincronizada: aprovados.",
  );
  await guest.getByRole("tab", { name: /Chat/ }).click();
  await helper.getByRole("tab", { name: /Chat/ }).click();
  await guest
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Estou ao lado do posto, moto preta.");
  await guest
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await helper
    .getByText("Estou ao lado do posto, moto preta.", { exact: true })
    .waitFor();
  await helper
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Recebi! Estou a caminho.");
  await helper
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await guest.getByText("Recebi! Estou a caminho.", { exact: true }).waitFor();
  await guest.screenshot({
    path: fileURLToPath(
      new URL("../artifacts/18-chat-privado.png", import.meta.url),
    ),
  });
  console.log("Chat bidirecional real no Firestore: aprovado.");
  await guest
    .getByRole("tab", { name: "Mapa e encontro", exact: true })
    .click();
  await helper
    .getByRole("tab", { name: "Mapa e encontro", exact: true })
    .click();
  await guest
    .getByRole("button", {
      name: "Compartilhar minha localização",
      exact: true,
    })
    .click();
  await helper
    .getByRole("button", { name: "Compartilhar meu trajeto", exact: true })
    .click();
  const helperDb = env.authenticatedContext(helperUid).firestore();
  const requests = await getDocs(
    query(
      collection(helperDb, "supportRequests"),
      where("helperUid", "==", helperUid),
      where("status", "==", "accepted"),
    ),
  );
  if (requests.size !== 1) throw new Error("Pedido não sincronizado");
  const ref = requests.docs[0].ref,
    helperPosition = doc(ref, "private", "helperPosition"),
    requesterPosition = doc(ref, "private", "requesterPosition");
  await expect
    .poll(async () => (await getDoc(helperPosition)).data()?.lat, {
      timeout: 20000,
    })
    .toBe(-26.925);
  await expect
    .poll(async () => (await getDoc(requesterPosition)).data()?.lat, {
      timeout: 20000,
    })
    .toBe(-26.9194);
  await guest.getByText("Os dois ao vivo", { exact: true }).waitFor();
  await new Promise((resolve) => setTimeout(resolve, 11000));
  await helperContext.setGeolocation({
    latitude: -26.9215,
    longitude: -49.068,
    accuracy: 8,
  });
  await guestContext.setGeolocation({
    latitude: -26.9185,
    longitude: -49.065,
    accuracy: 9,
  });
  await expect
    .poll(async () => (await getDoc(helperPosition)).data()?.lat, {
      timeout: 20000,
    })
    .toBe(-26.9215);
  await expect
    .poll(async () => (await getDoc(requesterPosition)).data()?.lat, {
      timeout: 20000,
    })
    .toBe(-26.9185);
  await guest.getByRole("tab", { name: /Chat/ }).click();
  await expect
    .poll(async () => (await getDoc(requesterPosition)).exists())
    .toBe(true);
  await guest.getByRole("button", { name: "Início", exact: true }).click();
  await expect
    .poll(async () => (await getDoc(requesterPosition)).exists())
    .toBe(false);
  await guest.locator(".support-dock-main").waitFor();
  await helper
    .getByRole("button", { name: "Concluir atendimento", exact: true })
    .click();
  await helper
    .getByRole("button", { name: "Confirmar encerramento", exact: true })
    .click();
  await expect(guest.locator(".support-dock-main")).toHaveCount(0, {
    timeout: 30000,
  });
  await helper
    .getByRole("heading", { name: "Apoio concluído", exact: true })
    .waitFor();
  await env.withSecurityRulesDisabled(async (c) => {
    for (const name of [
      "location",
      "helperPosition",
      "requesterPosition",
      "helperProfile",
    ]) {
      if (
        (
          await getDoc(
            doc(c.firestore(), "supportRequests", ref.id, "private", name),
          )
        ).exists()
      )
        throw new Error("Dados privados não removidos: " + name);
    }
  });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Integração aprovada: placa, confirmação, tela exclusiva, cartão persistente, chat, GPS dos dois e conclusão remota.",
  );
} catch (error) {
  console.log(
    "Solicitante:",
    (await guest.locator("body").innerText()).slice(-2400),
  );
  console.log(
    "Associado:",
    (await helper.locator("body").innerText()).slice(-2400),
  );
  console.log("Erros JS:", errors);
  throw error;
} finally {
  await browser.close();
  await env.cleanup();
}
