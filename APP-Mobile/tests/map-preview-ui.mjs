import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ headless: true, executablePath: process.env.AUMM_BROWSER });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage(); page.setDefaultTimeout(60000);
let writes = 0, tiles = 0;
const errors = []; page.on("pageerror", error => errors.push(error.message));
page.on("response", response => { if (response.ok() && response.url().includes("tiles.openfreemap.org") && !response.url().includes("/fonts/") && /\.pbf(?:\?|$)/.test(response.url())) tiles++; });
await context.route("**/*", route => {
  if (route.request().url().includes("firestore.googleapis.com") && /\/Write\/|documents:commit|documents:batchWrite/.test(route.request().url())) { writes++; return route.abort(); }
  return route.continue();
});
try {
  await page.goto("http://127.0.0.1:5174/preview-celular.html?role=map", { waitUntil: "domcontentloaded" });
  const phone = page.frameLocator("iframe");
  await expect(phone.getByText(/DEMONSTRAÇÃO · percurso fictício/)).toBeVisible({ timeout: 60000 });
  await expect(phone.getByRole("status")).toContainText("Recebendo localização");
  await expect(phone.locator(".maplibregl-canvas")).toBeVisible();
  await expect.poll(() => tiles, { timeout: 60000 }).toBeGreaterThan(0);
  await expect(phone.locator(".live-location-map")).toHaveAttribute("aria-busy", "false", { timeout: 60000 });
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/39-preview-mapa-celular.png", import.meta.url)) });
  expect(writes).toBe(0); expect(errors).toEqual([]);
  console.log("Prévia do mapa no celular: tiles carregados, percurso fictício identificado, sem GPS pessoal e sem gravações no Firebase.");
} finally { await browser.close(); }
