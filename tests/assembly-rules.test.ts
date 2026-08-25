import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuorum,
  calculateVoteResult,
  canTransitionAssembly,
  noticePeriodIsValid,
} from "../lib/assemblyRules.ts";

test("calcula o quórum das três chamadas da AUMM", () => {
  assert.equal(calculateQuorum(10, 1), 7);
  assert.equal(calculateQuorum(10, 2), 5);
  assert.equal(calculateQuorum(10, 3), 1);
  assert.equal(calculateQuorum(0, 3), 1);
});

test("bloqueia publicação com antecedência inferior a 15 dias", () => {
  const publication = new Date("2026-09-01T12:00:00-03:00");
  assert.equal(noticePeriodIsValid(publication, new Date("2026-09-15T11:59:59-03:00")), false);
  assert.equal(noticePeriodIsValid(publication, new Date("2026-09-16T12:00:00-03:00")), true);
});

test("não permite pular estados da assembleia", () => {
  assert.equal(canTransitionAssembly("draft", "published"), true);
  assert.equal(canTransitionAssembly("draft", "in_session"), false);
  assert.equal(canTransitionAssembly("published", "closed"), false);
  assert.equal(canTransitionAssembly("closed", "in_session"), false);
});

test("apura maioria simples preservando números brutos", () => {
  const result = calculateVoteResult(
    ["APROVO", "REJEITO", "ABSTENÇÃO"],
    ["APROVO", "APROVO", "REJEITO", "ABSTENÇÃO"],
    6,
  );
  assert.equal(result.resultStatus, "approved");
  assert.equal(result.yes, 2);
  assert.equal(result.no, 1);
  assert.equal(result.abstention, 1);
  assert.equal(result.notVoted, 2);
});
