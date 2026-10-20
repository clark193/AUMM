import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "br.com.aumm.app",
  appName: "AUMM",
  webDir: "dist",
  android: { backgroundColor: "#f5f6f8" },
  plugins: { PushNotifications: { presentationOptions: [] } },
};
export default config;
