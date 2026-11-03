import { cache } from "react";
import { request } from "node:https";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getNewsPreview(id: string, source: string) {
  if (!source) return undefined;
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/news-previews/manifest.json"), "utf8")) as Record<string, { path: string; source: string; version: string; width: number; height: number; type: string }>;
  const preview = manifest[id];
  if (!preview || preview.source !== source) throw new Error(`Gere as imagens atualizadas com npm run build:pages (${id}).`);
  return preview;
}

export type PublicNews = { id: string; title: string; summary: string; content: string; category: string; imageUrl: string; publishedAtISO: string; status: "published" };
type Document = { name: string; fields?: Record<string, { stringValue?: string; timestampValue?: string }> };

// Build-time public query: no administrative credentials or private collections.
export const getPublicNews = cache(async (): Promise<PublicNews[]> => {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!project) throw new Error("Configure NEXT_PUBLIC_FIREBASE_PROJECT_ID para exportar as notícias.");
  // Read fresh data on every export, bypassing Next's persistent fetch cache.
  const rows = await new Promise<{ document?: Document }[]>((resolve, reject) => {
    const req = request(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents:runQuery`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
    }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("error", reject);
      response.on("end", () => {
        if (response.statusCode !== 200) return reject(new Error(`Não foi possível exportar as notícias públicas (${response.statusCode}).`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error("Resposta inválida ao exportar notícias públicas.")); }
      });
    });
    req.on("error", reject);
    req.end(JSON.stringify({ structuredQuery: { from: [{ collectionId: "news" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "published" } } } } }));
  });
  return rows.flatMap(({ document }) => {
    const f = document?.fields;
    if (!document || f?.status?.stringValue !== "published") return [];
    const text = (key: string) => f[key]?.stringValue || "";
    return [{ id: document.name.split("/").at(-1)!, title: text("title"), summary: text("summary"), content: text("content"), category: text("category"), imageUrl: text("imageUrl"), publishedAtISO: f.publishedAt?.timestampValue || "", status: "published" as const }];
  });
});

export async function getPublicNewsById(id: string) { return (await getPublicNews()).find(item => item.id === id); }
