import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
const here = fileURLToPath(new URL(".", import.meta.url));
const root = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, "VITE_");
  const firebaseFields = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "STORAGE_BUCKET", "MESSAGING_SENDER_ID", "APP_ID"];
  return {
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "firebase", "lucide-react"],
    alias: [
      { find: "next/navigation", replacement: here + "src/portal/navigation.ts" },
      { find: "next/link", replacement: here + "src/portal/Link.tsx" },
      { find: "next/image", replacement: here + "src/portal/Image.tsx" },
      { find: "@", replacement: root },
    ],
  },
  define: {
    ...Object.fromEntries(firebaseFields.map((key) => [`process.env.NEXT_PUBLIC_FIREBASE_${key}`, JSON.stringify(env[`VITE_FIREBASE_${key}`] || "")])),
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY": JSON.stringify(""),
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  base: "./",
  server: { fs: { allow: [root] }, watch: { ignored: ["**/android/**", "**/artifacts/**", "**/dist/**", "**/.emulator/**", "**/.next/**", "**/out/**"] } },
  optimizeDeps: { include: ["maplibre-gl", "@capacitor/push-notifications"] },
  build: {
    rollupOptions: {
      input: { app: here + "index.html", portal: here + "portal.html" },
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          react: ["react", "react-dom/client"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  };
});
