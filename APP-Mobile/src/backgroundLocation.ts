import { Capacitor, registerPlugin } from "@capacitor/core";

export type BackgroundShare = {
  active: boolean;
  shareId: string;
  expiresAt: number;
  updatedAt: number;
  closing: boolean;
  error: string;
};
interface BackgroundLocationPlugin {
  start(options: { projectId: string; shareId: string; idToken: string; expiresAt: number }): Promise<BackgroundShare>;
  status(): Promise<BackgroundShare>;
  stop(): Promise<void>;
}
export const backgroundLocation = registerPlugin<BackgroundLocationPlugin>("BackgroundLocation");
export const hasBackgroundLocation = Capacitor.getPlatform() === "android";

// Trocar de conta não deve deixar uma sessão de localização da conta anterior ativa.
export async function stopBackgroundShareBeforeAuthChange() {
  if (!hasBackgroundLocation) return;
  const state = await backgroundLocation.status();
  if (!state.active) return;
  await backgroundLocation.stop();
  throw new Error("O compartilhamento está sendo encerrado. Aguarde alguns segundos e tente novamente.");
}
