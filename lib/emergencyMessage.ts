export function emergencyPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+") && !digits.startsWith("55")) throw new Error("Informe um telefone brasileiro com DDD.");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (!/^55[1-9]{2}[0-9]{8,9}$/.test(digits)) throw new Error("Informe um telefone brasileiro com DDD.");
  return "+" + digits;
}
export function emergencyMessage(name: string, location: { lat: number; lng: number } | null) {
  return `Alerta de emergência AUMM: ${name} acionou o botão de acidente e solicita contato. `
    + (location ? `Localização no momento do alerta: https://www.google.com/maps/search/?api=1&query=${location.lat}%2C${location.lng}. ` : "A localização não foi obtida. ")
    + "Tente entrar em contato. Este aviso não confirma atendimento de socorro.";
}
