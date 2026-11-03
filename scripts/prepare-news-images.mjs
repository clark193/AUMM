import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import sharp from "sharp";

nextEnv.loadEnvConfig(process.cwd(), false);
const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!project) throw new Error("Configure NEXT_PUBLIC_FIREBASE_PROJECT_ID para gerar as imagens das notícias.");
const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents:runQuery`, {
  method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "news" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "published" } } } } }),
});
if (!response.ok) throw new Error(`Falha ao consultar notícias públicas (${response.status}).`);
const rows = await response.json();
const directory = path.resolve("public/news-previews");
await fs.mkdir(directory, { recursive: true });
const manifest = {};
for (const { document } of rows) {
  const id = document?.name?.split("/").at(-1);
  const source = document?.fields?.imageUrl?.stringValue;
  if (!id || document.fields?.status?.stringValue !== "published" || !source) continue;
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !source.startsWith("https://")) throw new Error("Notícia com ID ou imagem inválida.");
  const image = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!image.ok || !image.headers.get("content-type")?.startsWith("image/")) throw new Error(`Imagem indisponível na notícia ${id}.`);
  const input = Buffer.from(await image.arrayBuffer());
  if (input.length > 20 * 1024 * 1024) throw new Error(`Imagem muito grande na notícia ${id}.`);
  const output = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize(1200, 630, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (output.length > 300_000) throw new Error(`Prévia muito grande na notícia ${id}.`);
  const version = createHash("sha256").update(output).digest("hex").slice(0, 12);
  const filename = `${id}-${version}.jpg`;
  await fs.writeFile(path.join(directory, filename), output);
  manifest[id] = { path: `/news-previews/${filename}`, source, version, width: 1200, height: 630, type: "image/jpeg", bytes: output.length };
  console.log(`Imagem preparada: ${id} (${output.length} bytes).`);
}
await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
