import assert from "node:assert/strict";
import test from "node:test";
import { newsPath, shareNews } from "../lib/newsSharing.ts";

test("o link compartilhado identifica a notícia sem depender de query string", () => {
  assert.equal(newsPath("ZaReHMDGJYgEUcDEcd43"), "/noticias/ZaReHMDGJYgEUcDEcd43/");
  assert.equal(newsPath("a/b"), "/noticias/a%2Fb/");
});
test("compartilha o título e o link usando a ação nativa", async () => {
  const received: unknown[] = [];
  assert.equal(await shareNews("Notícia", "https://aumm.com.br/noticias/id/", { share: async data => { received.push(data); } }), "shared");
  assert.deepEqual(received, [{ title: "Notícia", url: "https://aumm.com.br/noticias/id/" }]);
});
test("copia o link quando não há compartilhamento nativo ou quando ele falha", async () => {
  for (const share of [undefined, async () => { throw new Error("unsupported"); }]) {
    let copied = "";
    assert.equal(await shareNews("Notícia", "https://aumm.com.br/noticias/id/", { share, clipboard: { writeText: async text => { copied = text; } } }), "copied");
    assert.equal(copied, "https://aumm.com.br/noticias/id/");
  }
});
test("cancelar o compartilhamento não copia dados sem intenção", async () => {
  assert.equal(await shareNews("Notícia", "https://aumm.com.br/noticias/id/", { share: async () => { throw Object.assign(new Error(), { name: "AbortError" }); }, clipboard: { writeText: async () => { assert.fail("Não deve copiar ao cancelar"); } } }), "cancelled");
});
