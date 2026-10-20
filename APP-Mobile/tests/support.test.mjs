import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePlate,
  validPlate,
  isActiveSupport,
  confirmationDeadline,
} from "../shared/support.ts";
test("placas antigas e Mercosul são normalizadas e validadas", () => {
  assert.equal(normalizePlate("abc-1234"), "ABC1234");
  assert.equal(validPlate("abc1d23"), true);
  assert.equal(validPlate("ABC-1234"), true);
  for (const value of ["", "1234567", "AB12345", "ABC1DD3", "ABC12345"])
    assert.equal(validPlate(value), false);
});
test("aguardando confirmação continua ativo e tem prazo de cinco minutos", () => {
  assert.equal(isActiveSupport("awaiting_confirmation"), true);
  assert.equal(isActiveSupport("cancelled"), false);
  assert.equal(confirmationDeadline(1000), 301000);
  assert.equal(confirmationDeadline(), null);
});
