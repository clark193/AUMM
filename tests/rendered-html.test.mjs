import assert from "node:assert/strict";
import test from "node:test";

test("renderiza a página inicial da AUMM", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AUMM/);
  assert.match(html, /Mais união/);
  assert.match(html, /Associe-se/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("renderiza o Estatuto integral e a filiação simplificada", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("statute-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const assets = { fetch: async () => new Response("Not found", { status: 404 }) };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const statute = await worker.fetch(new Request("http://localhost/estatuto/", { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  assert.equal(statute.status, 200);
  const statuteHtml = await statute.text();
  assert.match(statuteHtml, /Estatuto Social da AUMM/);
  assert.match(statuteHtml, /id="art-45"/);
  assert.match(statuteHtml, /Revogam-se as disposições contrárias ao presente Estatuto/);
  assert.match(statuteHtml, /Rodrigo Fellipe dos Santos/);
  const membership = await worker.fetch(new Request("http://localhost/associe-se/", { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  assert.equal(membership.status, 200);
  const membershipHtml = await membership.text();
  assert.match(membershipHtml, /Associe-se \| AUMM/);
  assert.match(membershipHtml, /Consultando sua solicitação/);
  assert.doesNotMatch(membershipHtml, /CNH|comprovante de renda|placa da moto/i);
});

test("exporta as novas rotas de publicação e benefícios", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("portal-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const assets = { fetch: async () => new Response("Not found", { status: 404 }) };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const publication = await worker.fetch(new Request("http://localhost/noticias/publicacao/?id=teste", { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  assert.equal(publication.status, 200);
  assert.match(await publication.text(), /Publica.+AUMM/);
  const benefits = await worker.fetch(new Request("http://localhost/associado/beneficios/", { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  assert.equal(benefits.status, 200);
  assert.match(await benefits.text(), /Benef.+AUMM/);
});
