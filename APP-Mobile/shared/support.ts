export const CONFIRMATION_WAIT_MS = 5 * 60 * 1000;
export const activeSupportStatuses = [
  "open",
  "awaiting_confirmation",
  "accepted",
] as const;
export const isActiveSupport = (status: string) =>
  (activeSupportStatuses as readonly string[]).includes(status);
export const normalizePlate = (plate: string) =>
  plate.toUpperCase().replace(/[\s-]/g, "");
export const validPlate = (plate: string) =>
  /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(plate));
export const confirmationDeadline = (acceptedAt?: number) =>
  acceptedAt ? acceptedAt + CONFIRMATION_WAIT_MS : null;
