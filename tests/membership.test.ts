import assert from "node:assert/strict";
import test from "node:test";
import { maskBirthDate, maskCpf, maskWhatsapp, parseBrazilianDate, validCpf } from "../lib/membershipValidation.ts";

test("valida CPF pelos dígitos verificadores", () => {
  assert.equal(validCpf("529.982.247-25"), true);
  assert.equal(validCpf("111.111.111-11"), false);
  assert.equal(validCpf("529.982.247-24"), false);
});

test("aplica máscaras brasileiras sem guardar caracteres extras", () => {
  assert.equal(maskCpf("52998224725"), "529.982.247-25");
  assert.equal(maskWhatsapp("47999999999"), "(47) 99999-9999");
  assert.equal(maskBirthDate("25081996"), "25/08/1996");
});

test("converte apenas datas brasileiras válidas", () => {
  assert.ok(parseBrazilianDate("25/08/1996"));
  assert.equal(parseBrazilianDate("31/02/1996"), null);
});
