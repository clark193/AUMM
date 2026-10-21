import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { backgroundLocation, hasBackgroundLocation, type BackgroundShare } from "./backgroundLocation";

export default function LiveShareIndicator({ open }: { open: () => void }) {
  const [state, setState] = useState<BackgroundShare | null>(null);
  useEffect(() => {
    if (!hasBackgroundLocation) return;
    let mounted = true;
    const sync = () => void backgroundLocation.status().then(value => { if (mounted) setState(value); }).catch(() => {});
    sync();
    const timer = setInterval(sync, 3000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);
  if (!state?.active) return null;
  return <button className="live-share-indicator" onClick={open}><MapPin size={18} /><span><strong>{state.closing ? "Encerrando compartilhamento" : "Localização sendo compartilhada"}</strong><small>{state.error || "Uma pessoa de confiança pode acompanhar pelo link. Toque para gerenciar."}</small></span></button>;
}
