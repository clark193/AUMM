import assert from "node:assert/strict";
import test from "node:test";
import { deletionMessage, deletionWhatsappUrl } from "../lib/deletionRequest.ts";
import { legalKind } from "../lib/legalContent.ts";
const request = { name: "Pessoa de teste", email: "pessoa@example.org", scope: "account" as const, details: "" };
test("pedido identifica a conta e solicita exclusão de login e dados, sem executar exclusão", () => {
  const message = deletionMessage(request);
  assert.match(message, /exclusão da minha conta/);
  assert.match(message, /dados pessoais associados/);
  assert.match(message, /pessoa@example.org/);
  assert.match(message, /verificação de titularidade/);
});
test("pedido parcial exige identificação dos dados", () => {
  assert.throws(() => deletionMessage({ ...request, scope: "data" }), /quais dados/);
  assert.match(deletionMessage({ ...request, scope: "data", details: "Remover minha foto" }), /Remover minha foto/);
});
test("valida e-mail, limites e tipo de pedido", () => {
  for (const email of ["", "invalid", "a@example.org\nBcc:x@example.org"]) assert.throws(() => deletionMessage({ ...request, email }));
  assert.throws(() => deletionMessage({ ...request, details: "x".repeat(801) }));
  assert.throws(() => deletionMessage({ ...request, scope: "invalid" as "account" }));
});
test("o link abre somente o canal oficial e codifica a mensagem", () => {
  const input = { ...request, name: "Nome & sobrenome", details: "Confirmação? #pedido" };
  const url = new URL(deletionWhatsappUrl(input));
  assert.equal(url.origin, "https://wa.me"); assert.equal(url.pathname, "/5547992524104");
  assert.equal(url.searchParams.get("text"), deletionMessage(input));
  assert.equal([...url.searchParams].length, 1);
});
test("endereços com e sem acento usam o mesmo conteúdo de exclusão", () => {
  assert.equal(legalKind("exclusão"), "exclusao"); assert.equal(legalKind("exclusao"), "exclusao");
  assert.equal(legalKind("exclus%C3%A3o"), "exclusao"); assert.equal(legalKind("exclusa\u0303o"), "exclusao");
  assert.equal(legalKind("%invalid"), undefined);
  assert.equal(legalKind("outro"), undefined);
});
