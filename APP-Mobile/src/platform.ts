import { Capacitor, registerPlugin } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Geolocation } from "@capacitor/geolocation";
import { Share } from "@capacitor/share";
import { routeUrl } from "./domain.mjs";
const NavigationChooser = registerPlugin<{
  open(options: { latitude: number; longitude: number }): Promise<void>;
}>("NavigationChooser");
export async function openNavigation(lat: number, lng: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    throw new Error("Localização inválida.");
  if (Capacitor.getPlatform() === "android") {
    try {
      await NavigationChooser.open({ latitude: lat, longitude: lng });
      return;
    } catch (error) {
      if ((error as { code?: string }).code !== "NO_MAP_APP") throw error;
    }
  }
  await openUrl(routeUrl("google", lat, lng));
}
export async function openUrl(url: string) {
  if (!/^https:\/\//i.test(url)) throw new Error("Link indisponível.");
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.open(url, "_blank", "noopener,noreferrer");
}
export function site(path: string) {
  return openUrl(
    `${import.meta.env.VITE_SITE_URL || "https://aumm.com.br"}${path}`,
  );
}
export async function locate() {
  if (Capacitor.isNativePlatform()) {
    const p = await Geolocation.requestPermissions();
    if (p.location === "denied" && p.coarseLocation === "denied")
      throw new Error(
        "Permita a localização nas configurações do celular para enviar um pedido.",
      );
  }
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    throw new Error(
      "Não foi possível obter sua localização. Ative o GPS e permita o acesso à localização.",
    );
  }
}
export async function shareLocation() {
  const p = await locate();
  const url = `https://www.google.com/maps/search/?api=1&query=${p.lat}%2C${p.lng}`;
  if (Capacitor.isNativePlatform() || typeof navigator.share === "function")
    await Share.share({
      title: "Minha localização",
      text: "Estou aqui. Localização enviada pelo AUMM.",
      url,
    });
  else {
    await navigator.clipboard.writeText(url);
    return "Localização copiada! Envie para alguém de confiança.";
  }
  return "Compartilhamento aberto.";
}
