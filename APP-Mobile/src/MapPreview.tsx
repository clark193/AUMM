import { createRoot } from "react-dom/client";
import "./firebase";
import { LiveLocationViewer } from "../../components/LiveLocationViewer";
import "../../app/globals.css";

// O modo conectado só é permitido com os emuladores locais de desenvolvimento.
const connected = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true" && /^[a-f0-9]{32}$/.test(location.hash.slice(1));
createRoot(document.getElementById("root")!).render(<><div style={{ padding: "14px 20px", background: "#fff0f2", color: "#a10e2a", font: "600 13px Arial", textAlign: "center" }}>{connected ? "Teste local · acompanhamento via emulador Firebase" : "DEMONSTRAÇÃO · percurso fictício em Blumenau, sem rastrear uma pessoa real"}</div><LiveLocationViewer demo={!connected} /></>);
