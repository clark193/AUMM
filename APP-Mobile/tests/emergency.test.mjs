import { test } from "node:test";
import assert from "node:assert/strict";
import { emergencyPhone, emergencyMessage } from "../../lib/emergencyMessage.ts";
test("contato de emergência exige telefone brasileiro com DDD", () => {
  assert.equal(emergencyPhone("(47) 99999-1234"), "+5547999991234");
  assert.equal(emergencyPhone("+55 47 3333-1234"), "+554733331234");
  for (const value of ["", "192", "999991234", "+1 212 555 1234"]) assert.throws(() => emergencyPhone(value));
});
test("mensagem distingue localização obtida e indisponível sem prometer socorro", () => {
  assert.match(emergencyMessage("Maria", { lat: -26.9, lng: -49.1 }), /query=-26.9%2C-49.1/);
  assert.match(emergencyMessage("Maria", null), /localização não foi obtida/);
  assert.match(emergencyMessage("Maria", null), /não confirma atendimento/);
});
