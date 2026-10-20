type Point = { lat: number; lng: number; accuracy: number };
export const POSITION_FRESH_MS: number;
export function distanceMeters(
  a: Pick<Point, "lat" | "lng">,
  b: Pick<Point, "lat" | "lng">,
): number | null;
export function shouldPublishPosition(
  previous: (Point & { sentAt: number }) | null,
  next: Point,
  now: number,
): boolean;
export function isPositionFresh(updatedAt: number, now: number): boolean;
