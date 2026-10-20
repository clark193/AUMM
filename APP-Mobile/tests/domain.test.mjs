import test from "node:test";
import assert from "node:assert/strict";
import { calculateShift, routeUrl, validCoordinates } from "../src/domain.mjs";
test("a jornada desconta combustível e outros gastos", () => {
  assert.deepEqual(calculateShift(100, 6, 25, 200, 16), {
    fuel: 24,
    net: 160,
    perKm: 1.6,
  });
  assert.deepEqual(calculateShift(0, 6, 25, 0, 0), {
    fuel: 0,
    net: 0,
    perKm: 0,
  });
  assert.equal(calculateShift(100, 6, 0, 200, 16), null);
  assert.equal(calculateShift(-1, 6, 30, 200, 0), null);
  assert.equal(calculateShift(1, NaN, 30, 200, 0), null);
});
test("rotas preservam a coordenada de destino e rejeitam valores inválidos", () => {
  const lat = -26.9194,
    lng = -49.0661;
  assert.equal(
    new URL(routeUrl("google", lat, lng)).searchParams.get("destination"),
    `${lat},${lng}`,
  );
  assert.equal(
    new URL(routeUrl("waze", lat, lng)).searchParams.get("ll"),
    `${lat},${lng}`,
  );
  assert.equal(validCoordinates(91, 0), false);
  assert.equal(validCoordinates(0, -181), false);
  assert.throws(() => routeUrl("google", NaN, 0));
});
