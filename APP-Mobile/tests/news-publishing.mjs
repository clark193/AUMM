import assert from "node:assert/strict";
import test from "node:test";
import { GitHubNewsPublisher, digest, publicArticle, renderArticle } from "../backend/lib/backend/src/newsPublishing.js";
import { startNewsPublisher } from "../backend/lib/backend/src/newsPublisher.js";

const article = { id: "public-id", title: "Uma notícia", summary: "Resumo público", content: "Primeiro parágrafo.\n\nSegundo parágrafo.", category: "Institucional", imageUrl: "", publishedAt: "2026-11-04T12:00:00.000Z" };
function github({ files = [{ path: "CNAME", sha: "cname", type: "blob" }], index, conflict = false, imageError = false } = {}) {
  const calls = [];
  async function http(url, options = {}) {
    const method = options.method || "GET", body = options.body && JSON.parse(options.body);
    calls.push({ url: String(url), method, body, headers: options.headers });
    const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
    if (String(url).startsWith("https://i.postimg.cc/")) return imageError ? new Response("no", { status: 500 }) : new Response("test-image", { headers: { "content-type": "image/png" } });
    const route = String(url).split("/repos/clark193/AUMM/")[1];
    if (route === "git/ref/heads/gh-pages") return respond({ object: { sha: "parent" } });
    if (route === "git/commits/parent") return respond({ tree: { sha: "base" } });
    if (route === "git/trees/base?recursive=1") return respond({ tree: files, truncated: false });
    if (route === "git/blobs/index") return respond({ content: Buffer.from(JSON.stringify(index)).toString("base64") });
    if (route === "git/trees" && method === "POST") return respond({ sha: "tree" });
    if (route === "git/blobs" && method === "POST") return respond({ sha: "image" });
    if (route === "git/commits" && method === "POST") return respond({ sha: "commit" });
    if (route === "git/refs/heads/gh-pages" && method === "PATCH") return respond({}, conflict ? 422 : 200);
    throw new Error(`Unexpected request ${method} ${route}`);
  }
  return { http, calls, tree: () => calls.find(x => x.method === "POST" && x.url.endsWith("/git/trees"))?.body };
}
test("projeta somente conteúdo público e ignora rascunhos", () => {
  assert.equal(publicArticle("id", { status: "draft", title: "Privado" }), undefined);
  const result = publicArticle("safe", { status: "published", title: "Público", cpf: "segredo", updatedBy: "admin" });
  assert.ok(!JSON.stringify(result).includes("segredo")); assert.ok(!JSON.stringify(result).includes("admin"));
  assert.throws(() => publicArticle("../CNAME", { status: "published" }));
  assert.throws(() => publicArticle("publicacao", { status: "published" }));
});
test("HTML contém notícia, prévia, botão e escape contra injeção", () => {
  const html = renderArticle({ ...article, title: '<script>alert("x")</script>', content: "<img src=x onerror=alert(1)>" }, "/news-previews/banner.jpg", "abc123");
  assert.ok(!html.includes('<script>alert("x")'));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(html.includes('property="og:image" content="https://aumm.com.br/news-previews/banner.jpg"'));
  assert.ok(html.includes("Compartilhar notícia")); assert.ok(html.includes("?imagem=abc123"));
  assert.ok(html.includes('content="1200"')); assert.ok(html.includes('content="image/jpeg"'));
});
test("publica em commit atômico preservando outros arquivos e sem force push", async () => {
  const fake = github();
  assert.deepEqual(await new GitHubNewsPublisher("secret", fake.http).publish([article]), { changed: true, commit: "commit" });
  assert.equal(fake.tree().base_tree, "base");
  assert.ok(fake.tree().tree.some(x => x.path === "noticias/public-id/index.html"));
  assert.ok(!fake.tree().tree.some(x => x.path === "CNAME" || x.path === ".nojekyll"));
  assert.deepEqual(fake.calls.at(-1).body, { sha: "commit", force: false });
});
test("repetir snapshot já publicado não cria commit", async () => {
  const index = { [article.id]: { digest: digest("aumm-news-template-v1\n" + JSON.stringify(article)) } };
  const fake = github({ index, files: [{ path: "news-publication-index.json", sha: "index", type: "blob" }, { path: "noticias/public-id/index.html", sha: "page", type: "blob" }] });
  assert.equal((await new GitHubNewsPublisher("secret", fake.http).publish([article])).changed, false);
  assert.ok(fake.calls.every(x => x.method === "GET"));
});
test("exclusão e despublicação removem apenas páginas e banners de notícias", async () => {
  const fake = github({ files: ["CNAME", ".nojekyll", "index.html", "noticias/publicacao/index.html", "noticias/removed/index.html", "noticias/removed/index.txt", "news-previews/removed-abcdef123456.jpg"].map(path => ({ path, sha: "x", type: "blob" })) });
  await new GitHubNewsPublisher("secret", fake.http).publish([]);
  const removed = fake.tree().tree.filter(x => x.sha === null).map(x => x.path);
  assert.deepEqual(removed.sort(), ["noticias/removed/index.html", "noticias/removed/index.txt", "news-previews/removed-abcdef123456.jpg"].sort());
});
test("edita notícia e limpa artefatos Next antigos", async () => {
  const fake = github({ files: [{ path: "noticias/public-id/index.txt", sha: "old", type: "blob" }] });
  await new GitHubNewsPublisher("secret", fake.http).publish([{ ...article, title: "Editada" }]);
  assert.ok(fake.tree().tree.find(x => x.path.endsWith("index.html")).content.includes("Editada"));
  assert.ok(fake.tree().tree.some(x => x.path.endsWith("index.txt") && x.sha === null));
});
test("imagem é enviada em blob sem transmitir credencial ao provedor externo", async () => {
  const fake = github();
  await new GitHubNewsPublisher("secret", fake.http, async () => Buffer.from("jpeg")).publish([{ ...article, imageUrl: "https://i.postimg.cc/banner.png" }]);
  const external = fake.calls.find(x => x.url.startsWith("https://i.postimg.cc/")); assert.equal(external.headers, undefined);
  assert.ok(fake.tree().tree.some(x => x.path.startsWith("news-previews/") && x.sha === "image"));
});
test("falha na imagem ou URL interna conserva a publicação anterior", async () => {
  for (const imageUrl of ["https://i.postimg.cc/broken.png", "https://127.0.0.1/private", "http://i.postimg.cc/no.png"]) {
    const fake = github({ imageError: true });
    await assert.rejects(() => new GitHubNewsPublisher("secret", fake.http).publish([{ ...article, imageUrl }]));
    assert.equal(fake.tree(), undefined);
  }
});
test("concorrência no GitHub é rejeitada para nova tentativa, sem sobrescrever branch", async () => {
  const fake = github({ conflict: true });
  await assert.rejects(() => new GitHubNewsPublisher("secret", fake.http).publish([article]), /422/);
  assert.equal(fake.calls.at(-1).body.force, false);
});
test("sem credencial, automação permanece inativa e não lê nem altera o banco", () => {
  const old = process.env.GITHUB_NEWS_TOKEN; delete process.env.GITHUB_NEWS_TOKEN;
  try { const control = startNewsPublisher({ collection() { assert.fail("Não deve ler sem credencial"); } }); assert.equal(control.status(), "not-configured"); control.wake(); control.stop(); }
  finally { if (old !== undefined) process.env.GITHUB_NEWS_TOKEN = old; }
});
test("snapshot inicial recupera notícias antigas após reinício e erro do listener não apaga páginas", async () => {
  const oldToken = process.env.GITHUB_NEWS_TOKEN, oldFetch = globalThis.fetch;
  process.env.GITHUB_NEWS_TOKEN = "test-only-token";
  const fake = github(), records = [];
  globalThis.fetch = fake.http;
  let onError;
  let stopped = false;
  const db = {
    collection(name) { assert.equal(name, "news"); return { onSnapshot(next, error) { onError = error; next({ docs: [{ id: article.id, data: () => ({ ...article, status: "published" }) }] }); return () => { stopped = true; }; } }; },
    doc(path) { assert.equal(path, "externalPushState/newsPublisher"); return { async set(record) { records.push(record); } }; },
  };
  const control = startNewsPublisher(db);
  try {
    await new Promise(resolve => setTimeout(resolve, 3200));
    assert.equal(control.status(), "submitted");
    assert.ok(fake.tree().tree.some(x => x.path === "noticias/public-id/index.html"));
    assert.equal(records[0].commit, "commit");
    const before = fake.calls.length;
    onError(new Error("offline")); control.wake();
    await new Promise(resolve => setTimeout(resolve, 3200));
    assert.equal(fake.calls.length, before);
    assert.equal(control.status(), "listener-error");
  } finally { control.stop(); globalThis.fetch = oldFetch; if (oldToken === undefined) delete process.env.GITHUB_NEWS_TOKEN; else process.env.GITHUB_NEWS_TOKEN = oldToken; }
  assert.equal(stopped, true);
});
