import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "br.com.aumm.app",
  appName: "AUMM",
  webDir: "dist",
  android: { backgroundColor: "#191d25" },
  plugins: {
    PushNotifications: { presentationOptions: [] },
    SystemBars: { insetsHandling: "native", style: "DARK", initialViewportFitValueHint: "auto" },
  },
};
export default config;
