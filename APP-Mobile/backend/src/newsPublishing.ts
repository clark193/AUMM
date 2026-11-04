import { createHash } from "node:crypto";

const SITE = "https://aumm.com.br";
const REPO = "clark193/AUMM";
export type Article = { id: string; title: string; summary: string; content: string; category: string; imageUrl: string; publishedAt: string };
type Entry = { path: string; mode: "100644"; type: "blob"; content?: string; sha?: string | null };
type Manifest = Record<string, { digest: string; image?: string }>;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export function publicArticle(id: string, data: Record<string, unknown>): Article | undefined {
  if (data.status !== "published") return;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id) || id === "publicacao") throw new Error("Invalid article ID");
  const str = (key: string) => typeof data[key] === "string" ? String(data[key]) : "";
  const date = data.publishedAt as { toDate?: () => Date } | undefined;
  return { id, title: str("title"), summary: str("summary"), content: str("content"), category: str("category"), imageUrl: str("imageUrl"), publishedAt: date?.toDate?.().toISOString() || "" };
}

export function renderArticle(item: Article, image: string, version: string) {
  const e = escape, url = `${SITE}/noticias/${item.id}/`, imageUrl = `${SITE}${image}`;
  const shareUrl = `${url}?imagem=${version}`;
  const paragraphs = (item.content || item.summary).split(/\n{2,}/).filter(Boolean).map(p => `<p>${e(p).replace(/\n/g, "<br>")}</p>`).join("");
  const title = e(item.title), summary = e(item.summary);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | AUMM</title><meta name="description" content="${summary}"><link rel="canonical" href="${url}"><link rel="icon" href="/logo.png"><meta property="og:type" content="article"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="AUMM"><meta property="og:title" content="${title}"><meta property="og:description" content="${summary}"><meta property="og:url" content="${url}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:secure_url" content="${imageUrl}"><meta property="og:image:alt" content="${title}">${image !== "/logo.png" ? '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${summary}"><meta name="twitter:image" content="${imageUrl}"><style>*{box-sizing:border-box}body{margin:0;color:#222;background:#fafafa;font-family:Arial,sans-serif;line-height:1.65}a{color:inherit}header,footer{background:#fff;border-bottom:1px solid #ddd;padding:18px max(20px,calc((100vw - 1120px)/2))}header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.brand{display:flex;gap:14px;align-items:center;text-decoration:none}.brand img{width:64px;height:64px;object-fit:contain}.brand strong{display:block;font-size:26px}.brand small{display:block}nav{display:flex;gap:18px;flex-wrap:wrap}main{max-width:960px;margin:36px auto;padding:0 20px}.banner{width:100%;max-height:620px;object-fit:contain;background:white;border-radius:16px}h1{font-size:clamp(28px,5vw,46px);line-height:1.15}h1,.summary,p{overflow-wrap:anywhere}.summary{font-size:21px;color:#555}.category{color:#b91c1c;font-weight:bold}.content{font-size:18px;line-height:1.85}.button{display:inline-flex;padding:12px 20px;border:0;border-radius:8px;background:#bc2026;color:white;font:inherit;font-weight:bold;cursor:pointer;text-decoration:none}.actions{display:flex;gap:16px;flex-wrap:wrap;align-items:center}footer{margin-top:50px}#share-message{overflow-wrap:anywhere}</style></head><body><header><a href="/" class="brand"><img src="/logo.png" alt="Logo da AUMM"><span><strong>AUMM</strong><small>Associação União Maior Motoboys</small></span></a><nav aria-label="Navegação principal"><a href="/noticias/">Notícias</a><a href="/quem-somos/">Quem somos</a><a href="/contato/">Contato</a><a href="/associado/login/">Área do associado</a></nav></header><main id="conteudo"><p><a href="/noticias/">← Todas as notícias</a></p><article>${item.imageUrl ? `<img class="banner" src="${imageUrl}" alt="${title}">` : ""}<p class="category">${e(item.category || "Notícia")}</p>${item.publishedAt ? `<time datetime="${e(item.publishedAt)}">${e(new Date(item.publishedAt).toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }))}</time>` : ""}<h1>${title}</h1><p class="summary">${summary}</p><div class="actions"><button class="button" id="share" type="button">Compartilhar notícia</button><a href="/associe-se/">Associe-se à AUMM</a></div><p id="share-message" role="status"></p><div class="content">${paragraphs}</div></article></main><footer><a href="/">AUMM</a> · <a href="/contato/">Contato</a> · <a href="/privacidade/">Privacidade</a></footer><script>document.getElementById('share').addEventListener('click',async()=>{const url=${JSON.stringify(shareUrl)},title=document.querySelector('h1').textContent,message=document.getElementById('share-message');try{if(navigator.share){try{await navigator.share({title,url});return}catch(error){if(error.name==='AbortError')return}}await navigator.clipboard.writeText(url);message.textContent='Link copiado. Cole no WhatsApp ou onde preferir.'}catch{message.textContent='Copie este link: '+url}});</script></body></html>`;
}

export class GitHubNewsPublisher {
  constructor(private token: string, private http: typeof fetch = fetch, private optimize: (image: Buffer) => Promise<Buffer> = async input => {
    const sharp = (await import("sharp")).default;
    return sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize(1200, 630, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  }) {}
  private async api(route: string, method = "GET", body?: unknown): Promise<any> {
    const r = await this.http(`https://api.github.com/repos/${REPO}/${route}`, { method, headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2026-03-10" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`GitHub news publication failed (${r.status})`);
    return r.json();
  }
  async publish(articles: Article[]) {
    const head = await this.api("git/ref/heads/gh-pages");
    const parent = head.object.sha;
    const commit = await this.api(`git/commits/${parent}`);
    const listing = await this.api(`git/trees/${commit.tree.sha}?recursive=1`);
    if (listing.truncated) throw new Error("Truncated publication tree");
    const files = new Map<string, string>(listing.tree.filter((x: any) => x.type === "blob").map((x: any) => [x.path, x.sha]));
    const manifestPath = "news-publication-index.json";
    let previous: Manifest = {};
    const indexSha = files.get(manifestPath);
    if (indexSha) { const blob = await this.api(`git/blobs/${indexSha}`); previous = JSON.parse(Buffer.from(blob.content, "base64").toString("utf8")); }
    const next: Manifest = {}, entries: Entry[] = [];
    const live = new Set(articles.map(x => x.id));
    for (const item of articles) {
      const hash = digest("aumm-news-template-v1\n" + JSON.stringify(item));
      const target = `noticias/${item.id}/index.html`;
      if (previous[item.id]?.digest === hash && files.has(target)) { next[item.id] = previous[item.id]; continue; }
      let imagePath = "/logo.png", imageVersion = hash.slice(0, 12);
      if (item.imageUrl) {
        const url = new URL(item.imageUrl);
        // Banners are supplied by administrators, but must not target local services or credentials.
        const hosts = new Set(["i.postimg.cc", "firebasestorage.googleapis.com", "storage.googleapis.com", ...(process.env.AUMM_NEWS_IMAGE_HOSTS || "").split(",").map(x => x.trim()).filter(Boolean)]);
        if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || !hosts.has(url.hostname) || /(^localhost$|\.local$|^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|:)/i.test(url.hostname)) throw new Error("Invalid public news image URL");
        const r = await this.http(url.href, { redirect: "error", signal: AbortSignal.timeout(30000) });
        if (!r.ok || !r.headers.get("content-type")?.startsWith("image/")) throw new Error("News image unavailable");
        const reader = r.body!.getReader(), chunks: Uint8Array[] = []; let length = 0;
        try { for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 20_000_000) { await reader.cancel(); throw new Error("News image too large"); } chunks.push(value); } } finally { reader.releaseLock(); }
        const image = await this.optimize(Buffer.concat(chunks));
        if (image.length > 300_000) throw new Error("News preview too large");
        imageVersion = digest(image).slice(0, 12);
        imagePath = `/news-previews/${item.id}-${imageVersion}.jpg`;
        const blob = await this.api("git/blobs", "POST", { content: image.toString("base64"), encoding: "base64" });
        entries.push({ path: imagePath.slice(1), mode: "100644", type: "blob", sha: blob.sha });
      }
      entries.push({ path: target, mode: "100644", type: "blob", content: renderArticle(item, imagePath, imageVersion) });
      // Remove stale Next data alongside a replaced standalone page. All navigation uses full HTTP loads.
      for (const file of files.keys()) if (file.startsWith(`noticias/${item.id}/`) && file !== target) entries.push({ path: file, mode: "100644", type: "blob", sha: null });
      next[item.id] = { digest: hash, ...(imagePath !== "/logo.png" ? { image: imagePath } : {}) };
    }
    // Include pages from the last full Next export, even if they predate this publisher's index.
    for (const file of files.keys()) {
      const match = file.match(/^noticias\/([A-Za-z0-9_-]+)\//);
      if (match && match[1] !== "publicacao" && !live.has(match[1])) entries.push({ path: file, mode: "100644", type: "blob", sha: null });
    }
    const wantedImages = new Set(Object.values(next).map(x => x.image?.slice(1)).filter(Boolean));
    for (const file of files.keys()) if (/^news-previews\/[A-Za-z0-9_-]+-[a-f0-9]+\.jpg$/.test(file) && !wantedImages.has(file)) entries.push({ path: file, mode: "100644", type: "blob", sha: null });
    if (!entries.length && JSON.stringify(previous) === JSON.stringify(next)) return { changed: false, commit: parent };
    entries.push({ path: manifestPath, mode: "100644", type: "blob", content: JSON.stringify(next) });
    const unique = [...new Map(entries.map(e => [e.path, e])).values()];
    const tree = await this.api("git/trees", "POST", { base_tree: commit.tree.sha, tree: unique });
    const created = await this.api("git/commits", "POST", { message: "Automatically synchronize published AUMM news", tree: tree.sha, parents: [parent] });
    // No force: a concurrent publication is retried against the new branch head on the next pass.
    await this.api("git/refs/heads/gh-pages", "PATCH", { sha: created.sha, force: false });
    return { changed: true, commit: created.sha };
  }
}
