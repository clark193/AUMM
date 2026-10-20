import { validCoordinates } from "./domain.mjs";
export const POSITION_FRESH_MS = 45000;
export function distanceMeters(a, b) {
  if (!validCoordinates(a.lat, a.lng) || !validCoordinates(b.lat, b.lng))
    return null;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat = radians(b.lat - a.lat),
    lng = radians(b.lng - a.lng);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function shouldPublishPosition(previous, next, now) {
  if (
    !validCoordinates(next.lat, next.lng) ||
    !Number.isFinite(next.accuracy) ||
    next.accuracy < 0
  )
    return false;
  if (!previous) return true;
  const elapsed = now - previous.sentAt;
  return (
    elapsed >= 10000 &&
    (elapsed >= 30000 || distanceMeters(previous, next) >= 15)
  );
}
export function isPositionFresh(updatedAt, now) {
  return (
    Number.isFinite(updatedAt) &&
    now - updatedAt >= -5000 &&
    now - updatedAt <= POSITION_FRESH_MS
  );
}
