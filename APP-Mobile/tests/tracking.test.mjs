import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceMeters,
  isPositionFresh,
  shouldPublishPosition,
} from "../src/tracking-domain.mjs";
const point = { lat: -26.9194, lng: -49.0661, accuracy: 15 };
test("distância geográfica preserva zero, simetria e uma distância conhecida", () => {
  assert.equal(distanceMeters(point, point), 0);
  const north = { lat: 1, lng: 0 },
    origin = { lat: 0, lng: 0 };
  assert.ok(Math.abs(distanceMeters(origin, north) - 111195) < 5);
  assert.equal(distanceMeters(origin, north), distanceMeters(north, origin));
  assert.equal(distanceMeters({ lat: 91, lng: 0 }, point), null);
});
test("limita frequência das escritas, envia movimento e renova sinal parado", () => {
  const previous = { ...point, sentAt: 1000 },
    moved = { ...point, lat: point.lat + 0.001 };
  assert.equal(shouldPublishPosition(null, point, 1000), true);
  assert.equal(shouldPublishPosition(previous, moved, 10999), false);
  assert.equal(shouldPublishPosition(previous, moved, 11000), true);
  assert.equal(shouldPublishPosition(previous, point, 11000), false);
  assert.equal(shouldPublishPosition(previous, point, 31000), true);
  assert.equal(
    shouldPublishPosition(previous, { ...point, lat: NaN }, 31000),
    false,
  );
});
test("posição velha ou relógio muito adiantado não aparecem como recentes", () => {
  assert.equal(isPositionFresh(1000, 10000), true);
  assert.equal(isPositionFresh(1000, 46001), false);
  assert.equal(isPositionFresh(NaN, 10000), false);
  assert.equal(isPositionFresh(20000, 10000), false);
});
