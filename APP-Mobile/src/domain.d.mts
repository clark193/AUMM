export const categories: {
  id: string;
  label: string;
  detail: string;
  icon: string;
}[];
export function validCoordinates(lat: number, lng: number): boolean;
export function routeUrl(provider: string, lat: number, lng: number): string;
export function calculateShift(
  km: number,
  price: number,
  consumption: number,
  income: number,
  extra: number,
): { fuel: number; net: number; perKm: number } | null;
