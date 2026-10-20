export const categories = [
  {
    id: "gasolina",
    label: "Sem gasolina",
    detail: "Uma força para seguir viagem",
    icon: "fuel",
  },
  {
    id: "pneu",
    label: "Pneu furado",
    detail: "Ajuda com reparo ou transporte",
    icon: "wheel",
  },
  {
    id: "pane",
    label: "Pane na moto",
    detail: "A moto parou de funcionar",
    icon: "wrench",
  },
  {
    id: "apoio",
    label: "Preciso de apoio",
    detail: "Outra dificuldade na rua",
    icon: "heart",
  },
];
export function validCoordinates(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
export function routeUrl(provider, lat, lng) {
  if (!validCoordinates(lat, lng)) throw new Error("Localização inválida.");
  return provider === "waze"
    ? `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}&travelmode=driving`;
}
export function calculateShift(km, price, consumption, income, extra) {
  if (
    ![km, price, consumption, income, extra].every(Number.isFinite) ||
    km < 0 ||
    price < 0 ||
    consumption <= 0 ||
    income < 0 ||
    extra < 0
  )
    return null;
  const fuel = (km / consumption) * price;
  return {
    fuel,
    net: income - fuel - extra,
    perKm: km > 0 ? (income - fuel - extra) / km : 0,
  };
}
