import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

// O backend não importa o protocolo WhatsApp nem aguarda sua conexão.
// Falha no filho não encerra HTTP, alterações administrativas ou notificações.
export function startQrSupervisor(env: NodeJS.ProcessEnv = process.env, launch: typeof spawn = spawn) {
  let child: ChildProcess | undefined;
  let state = "disabled";
  const states = new Set(["starting", "pairing", "connected", "reconnecting", "needs_pairing", "error", "stopped"]);
  if (env.WA_QR_ENABLED === "true") {
    if (env.WA_ENABLED === "true") state = "configuration_error";
    else {
      state = "starting";
      try {
        const entry = fileURLToPath(new URL("../../../../whatsapp-qr/src/server.mjs", import.meta.url));
        child = launch(process.execPath, [entry], {
          env: { ...env, WA_QR_HEADLESS: "true" },
          stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true,
        });
        child.on("message", message => {
          const update = message as { type?: string; state?: string } | null;
          if (update?.type === "qr-state" && typeof update.state === "string" && states.has(update.state)) state = update.state;
        });
        child.on("error", () => { state = "error"; });
        child.on("exit", () => { state = "offline"; child = undefined; });
      } catch { state = "error"; }
    }
  }
  return {
    status: () => ({ state }),
    async stop() {
      const current = child;
      if (!current) return;
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => { current.kill("SIGKILL"); resolve(); }, 8000);
        timer.unref();
        current.once("exit", () => { clearTimeout(timer); resolve(); });
        current.kill("SIGTERM");
      });
    },
  };
}
