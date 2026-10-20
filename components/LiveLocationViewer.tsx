"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import type { Map as LiveMap, Marker } from "maplibre-gl";
import { getFirebaseServices, firebaseEnabled } from "@/lib/firebase";
import "maplibre-gl/dist/maplibre-gl.css";

type Position = { lat: number; lng: number; accuracy: number; updatedAt: Timestamp; sampledAt: Timestamp; expiresAt: Timestamp };
export function LiveLocationViewer() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LiveMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState("Abrindo acompanhamento…");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const token = window.location.hash.slice(1);
    if (!/^[a-f0-9]{32}$/.test(token) || !firebaseEnabled) {
      setStatus("Link de acompanhamento inválido ou indisponível.");
      return () => clearInterval(timer);
    }
    const stop = onSnapshot(doc(getFirebaseServices().db, "liveLocations", token), (snapshot) => {
      if (!snapshot.exists()) { setPosition(null); setStatus("Este compartilhamento foi encerrado."); return; }
      setPosition(snapshot.data() as Position);
    }, () => { setPosition(null); setStatus("Este link foi encerrado, expirou ou está indisponível. Peça um novo link a quem compartilhou."); });
    return () => { clearInterval(timer); stop(); };
  }, []);
  const expired = !!position && position.expiresAt.toMillis() <= now;
  const age = position ? Math.max(0, Math.floor((now - Math.min(position.updatedAt.toMillis(), position.sampledAt.toMillis())) / 1000)) : 0;
  const stale = age > 45;
  useEffect(() => {
    if (!position || expired || !container.current) { marker.current?.remove(); return; }
    let disposed = false;
    void import("maplibre-gl").then(({ Map, Marker, NavigationControl }) => {
      if (disposed || !container.current) return;
      if (!map.current) {
        map.current = new Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [position.lng, position.lat], zoom: 15, attributionControl: { compact: true } });
        map.current.addControl(new NavigationControl({ showCompass: false }));
      }
      if (!marker.current) marker.current = new Marker({ color: "#d71920" });
      marker.current.setLngLat([position.lng, position.lat]).addTo(map.current);
      map.current.easeTo({ center: [position.lng, position.lat], duration: 900 });
    }).catch(() => setStatus("O mapa não carregou. Verifique sua conexão e recarregue a página."));
    return () => { disposed = true; };
  }, [position, expired]);
  useEffect(() => () => { marker.current?.remove(); map.current?.remove(); }, []);
  return <main className="live-location-page"><header><span className="eyebrow">AUMM · Pessoa de confiança</span><h1>Localização compartilhada</h1><p>Acompanhe a posição enviada pelo aplicativo. O link é temporário e não revela os dados de cadastro.</p></header><section className="live-location-card"><div className={`live-location-state ${stale ? "paused" : ""}`} role="status"><strong>{expired ? "Este link expirou." : position ? stale ? "Envio pausado ou sem sinal recente" : "Recebendo localização" : status}</strong>{position && !expired && <small>Último sinal há {age}s · precisão aproximada de {Math.round(position.accuracy)} m</small>}</div><div className="live-location-map" ref={container} aria-label="Mapa da localização compartilhada" hidden={!position || expired} />{position && !expired && <div className="live-location-info"><p>{stale ? "A pessoa pode ter bloqueado a tela, fechado o app ou perdido a conexão. O ponto indica o último local recebido." : "O ponto acompanha as atualizações enviadas pelo celular."}</p><p>Válido até {position.expiresAt.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</p></div>}</section><p className="live-location-footnote">Este acompanhamento não é um serviço de emergência. Encaminhe o link somente a pessoas de confiança.</p></main>;
}
