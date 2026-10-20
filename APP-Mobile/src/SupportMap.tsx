import { useEffect, useRef, useState } from "react";
import {
  Map,
  Marker,
  LngLatBounds,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker.js?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { LocateFixed, MapPin } from "lucide-react";
import type { HelperPosition, PrivateLocation } from "./support";
setWorkerUrl(workerUrl);
type Point = Pick<PrivateLocation, "lat" | "lng">;
export default function SupportMap({
  destination,
  helper,
  fresh = true,
  destinationFresh = true,
  destinationLabel = "Local do pedido",
}: {
  destination: Point;
  helper?: HelperPosition | null;
  fresh?: boolean;
  destinationFresh?: boolean;
  destinationLabel?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const targetMarker = useRef<Marker | null>(null),
    helperMarker = useRef<Marker | null>(null);
  const following = useRef(true);
  const latest = useRef({ destination, helper });
  latest.current = { destination, helper };
  const [error, setError] = useState(false);
  function center() {
    const m = map.current;
    if (!m) return;
    const { destination: d, helper: h } = latest.current;
    if (h)
      m.fitBounds(
        new LngLatBounds([d.lng, d.lat], [d.lng, d.lat]).extend([h.lng, h.lat]),
        { padding: 65, maxZoom: 15, duration: 500 },
      );
    else m.easeTo({ center: [d.lng, d.lat], zoom: 15, duration: 500 });
  }
  useEffect(() => {
    if (!container.current) return;
    let failed = false;
    try {
      const m = new Map({
        container: container.current,
        style:
          import.meta.env.VITE_MAP_STYLE_URL ||
          "https://tiles.openfreemap.org/styles/liberty",
        center: [
          latest.current.destination.lng,
          latest.current.destination.lat,
        ],
        zoom: 15,
        attributionControl: { compact: true },
      });
      map.current = m;
      m.addControl(new NavigationControl({ showCompass: false }), "top-right");
      m.on("dragstart", () => {
        following.current = false;
      });
      m.on("error", () => {
        if (!m.isStyleLoaded()) {
          failed = true;
          setError(true);
        }
      });
      m.on("load", () => {
        failed = false;
        setError(false);
        center();
      });
      m.on("idle", () => {
        if (
          m.isStyleLoaded() &&
          m.areTilesLoaded() &&
          m.queryRenderedFeatures().length > 0
        ) {
          if (container.current) container.current.dataset.mapReady = "true";
          setError(false);
        }
      });
      const observer = new ResizeObserver(() => m.resize());
      observer.observe(container.current);
      return () => {
        observer.disconnect();
        targetMarker.current?.remove();
        helperMarker.current?.remove();
        targetMarker.current = null;
        helperMarker.current = null;
        m.remove();
        map.current = null;
      };
    } catch {
      failed = true;
      setError(failed);
    }
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    function marker(kind: string, label: string) {
      const element = document.createElement("div");
      element.className = `support-map-marker ${kind}`;
      element.setAttribute("role", "img");
      element.setAttribute("aria-label", label);
      const dot = document.createElement("span");
      dot.className = "marker-dot";
      dot.textContent = kind === "destination" ? "●" : "➤";
      const text = document.createElement("strong");
      text.textContent = label;
      element.append(dot, text);
      return new Marker({ element, anchor: "bottom" });
    }
    if (!targetMarker.current)
      targetMarker.current = marker("destination", destinationLabel)
        .setLngLat([destination.lng, destination.lat])
        .addTo(m);
    targetMarker.current.setLngLat([destination.lng, destination.lat]);
    targetMarker.current
      .getElement()
      .classList.toggle("stale", !destinationFresh);
    targetMarker.current
      .getElement()
      .setAttribute("aria-label", destinationLabel);
    targetMarker.current.getElement().querySelector("strong")!.textContent =
      destinationLabel;
    if (helper) {
      if (!helperMarker.current)
        helperMarker.current = marker("helper", "Quem vem ajudar")
          .setLngLat([helper.lng, helper.lat])
          .addTo(m);
      helperMarker.current.setLngLat([helper.lng, helper.lat]);
      helperMarker.current.getElement().classList.toggle("stale", !fresh);
    } else {
      helperMarker.current?.remove();
      helperMarker.current = null;
    }
    if (following.current) center();
  }, [
    destination.lat,
    destination.lng,
    helper?.lat,
    helper?.lng,
    fresh,
    destinationFresh,
    destinationLabel,
  ]);
  return (
    <div className="support-map-shell">
      <div
        ref={container}
        className="support-map"
        role="region"
        aria-label="Mapa do pedido de apoio"
      />
      {error && (
        <div className="map-fallback" role="status">
          <MapPin size={24} />
          <strong>Mapa temporariamente indisponível</strong>
          <span>
            O acompanhamento e os botões de navegação continuam disponíveis.
            Verifique sua conexão.
          </span>
        </div>
      )}
      <button
        type="button"
        className="map-center"
        onClick={() => {
          following.current = true;
          center();
        }}
      >
        <LocateFixed size={15} />
        Centralizar
      </button>
    </div>
  );
}
