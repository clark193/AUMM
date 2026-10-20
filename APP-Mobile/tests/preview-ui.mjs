import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUMM_BROWSER,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  writes = [];
page.setDefaultTimeout(90000);
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().includes("Firestore/Write/")) writes.push(r.url());
});
await context.addInitScript(() => {
  window.__gpsCalls = 0;
  navigator.geolocation.getCurrentPosition = () => {
    window.__gpsCalls++;
    throw new Error("GPS proibido na prévia");
  };
});
async function screenshot(name) {
  await page.screenshot({
    path: fileURLToPath(new URL("../artifacts/" + name, import.meta.url)),
  });
}
try {
  await page.goto("http://127.0.0.1:5174/preview-celular.html", {
    waitUntil: "domcontentloaded",
  });
  let phone = page.frameLocator("iframe");
  await phone.getByRole("button", { name: "Apoio", exact: true }).click();
  await phone.getByRole("button", { name: "Pedir ajuda", exact: true }).click();
  const form = phone.getByRole("dialog", { name: "Pedir apoio na cidade" });
  await form.getByRole("textbox", { name: "Placa da moto" }).fill("ABC1D23");
  await form.getByRole("textbox", { name: "Bairro / região" }).fill("Centro");
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Enviar pedido de apoio", exact: true })
    .click();
  await phone
    .getByRole("heading", { name: "Meu pedido de apoio", exact: true })
    .waitFor();
  await expect(
    phone.getByText("Quem está na rua se ajuda.", { exact: true }),
  ).toHaveCount(0);
  await phone
    .getByRole("button", {
      name: "Simular alguém aceitando ajudar",
      exact: true,
    })
    .click();
  await phone
    .getByRole("heading", { name: "Você ainda precisa de apoio?", exact: true })
    .waitFor();
  await phone
    .getByRole("button", { name: "Sim, ainda preciso", exact: true })
    .click();
  await phone.getByText("Os dois ao vivo", { exact: true }).waitFor();
  await phone.getByRole("button", { name: "Início", exact: true }).click();
  await phone.locator(".support-dock-main").waitFor();
  if (
    await phone
      .getByRole("button", { name: "Fechar aviso", exact: true })
      .count()
  )
    await phone
      .getByRole("button", { name: "Fechar aviso", exact: true })
      .click();
  if (await phone.locator(".toast button").count())
    await phone.locator(".toast button").click();
  await screenshot("21-popup-apoio-em-andamento.png");
  await phone.locator(".support-dock-main").click();
  await phone.getByRole("tab", { name: /Chat/ }).click();
  const messageBox = phone.getByRole("textbox", {
      name: "Mensagem",
      exact: true,
    }),
    sendButton = phone.getByRole("button", {
      name: "Enviar mensagem",
      exact: true,
    });
  if (
    (await messageBox.boundingBox()).width < 150 ||
    (await sendButton.boundingBox()).width > 48
  )
    throw new Error("Campo do chat comprimido pelo botão de envio");
  await expect(messageBox).toHaveCSS("resize", "none");
  await expect(phone.locator("body")).toHaveCSS("scrollbar-width", "none");
  await phone
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Estou perto do posto.");
  await phone
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await phone
    .getByText("Recebi sua mensagem. Estou indo ao ponto combinado!", {
      exact: true,
    })
    .waitFor();
  await screenshot("22-preview-chat-solicitante.png");
  let frame = page.frames().find((f) => f.url().includes("?preview=1"));
  if ((await frame.evaluate(() => window.__gpsCalls)) !== 0)
    throw new Error("GPS solicitado");
  await page.goto("http://127.0.0.1:5174/preview-celular.html?role=helper", {
    waitUntil: "domcontentloaded",
  });
  phone = page.frameLocator("iframe");
  await phone.getByText("Prévia do associado", { exact: true }).waitFor();
  await phone
    .getByRole("button", { name: "Posso ajudar", exact: true })
    .waitFor();
  await screenshot("23-preview-associado-receber-pedido.png");
  await phone
    .getByRole("button", { name: "Posso ajudar", exact: true })
    .click();
  await phone
    .getByRole("heading", { name: "Aguardando quem pediu ajuda", exact: true })
    .waitFor();
  await expect(phone.getByText("ABC1D23", { exact: true })).toHaveCount(0);
  await screenshot("24-preview-associado-aguardando.png");
  await phone
    .getByRole("button", {
      name: "Simular confirmação do solicitante",
      exact: true,
    })
    .click();
  await phone.getByText("ABC1D23", { exact: true }).waitFor();
  await phone.getByText("Os dois ao vivo", { exact: true }).waitFor();
  await expect(
    phone.getByRole("button", {
      name: "Abrir localização no GPS",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    phone.getByRole("button", { name: "Google Maps", exact: true }),
  ).toHaveCount(0);
  await expect(
    phone.getByRole("button", { name: "Abrir Waze", exact: true }),
  ).toHaveCount(0);
  await phone
    .getByRole("button", { name: "Abrir localização no GPS", exact: true })
    .click();
  await phone
    .getByText(
      "No Android, este botão abre a escolha entre os aplicativos de GPS instalados.",
      { exact: true },
    )
    .waitFor();
  await phone
    .getByRole("button", { name: "Dispensar aviso", exact: true })
    .click();

  await phone.getByRole("tab", { name: /Chat/ }).click();
  await phone
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Estou chegando!");
  await phone
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await phone
    .getByText(
      "Obrigado! Estou aguardando perto do posto, com a moto de placa ABC1D23.",
      { exact: true },
    )
    .waitFor();
  await screenshot("25-preview-associado-chat.png");
  await phone
    .getByRole("button", { name: "Concluir atendimento", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Confirmar encerramento", exact: true })
    .click();
  await phone
    .getByRole("heading", { name: "Apoio concluído", exact: true })
    .waitFor();
  frame = page.frames().find((f) => f.url().includes("role=helper"));
  if ((await frame.evaluate(() => window.__gpsCalls)) !== 0)
    throw new Error("GPS solicitado");
  const compactContext = await browser.newContext({
      viewport: { width: 320, height: 740 },
    }),
    compact = await compactContext.newPage();
  await compact.goto("http://127.0.0.1:5174/?preview=1&role=helper", {
    waitUntil: "domcontentloaded",
  });
  await compact
    .getByRole("button", { name: "Posso ajudar", exact: true })
    .click();
  await compact
    .getByRole("button", {
      name: "Simular confirmação do solicitante",
      exact: true,
    })
    .click();
  await compact.getByRole("tab", { name: /Chat/ }).click();
  const smallField = compact.getByRole("textbox", {
    name: "Mensagem",
    exact: true,
  });
  await smallField.fill("Mensagem em tela pequena");
  if (
    (await smallField.boundingBox()).width < 100 ||
    (
      await compact
        .getByRole("button", { name: "Enviar mensagem", exact: true })
        .boundingBox()
    ).width > 48
  )
    throw new Error("Chat inválido em 320px");
  await compact
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await compact
    .getByText("Mensagem em tela pequena", { exact: true })
    .waitFor();
  if (
    await compact.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw new Error("Rolagem horizontal em 320px");
  await expect(compact.locator("html")).toHaveCSS("scrollbar-width", "none");
  await compact.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  if ((await compact.evaluate(() => window.scrollY)) <= 0)
    throw new Error("A rolagem por toque foi bloqueada");
  await compactContext.close();
  if (writes.length) throw new Error("Prévia tentou escrever no Firestore");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Duas prévias aprovadas: solicitante e associado, placa, confirmação, popup, tela exclusiva, chat simulado e conclusão. Sem GPS ou escritas remotas.",
  );
} catch (error) {
  console.log("JS errors:", errors);
  console.log(
    (await page.frameLocator("iframe").locator("body").innerText()).slice(
      -3000,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
