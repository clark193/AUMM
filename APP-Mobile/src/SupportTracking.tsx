import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { MapPin, Navigation, Pause, Radio, ShieldCheck } from "lucide-react";
import { db, friendly } from "./firebase";
import { locate } from "./platform";
import {
  reconcileSupportRequest,
  publishParticipantPosition,
  removeParticipantPosition,
  type HelpRequest,
  type HelperPosition,
  type RequesterPosition,
  type SharingRole,
  type PrivateLocation,
} from "./support";
import {
  distanceMeters,
  isPositionFresh,
  shouldPublishPosition,
} from "./tracking-domain.mjs";
export const SupportMap = lazy(() => import("./SupportMap"));
import { isPreview, previewPosition } from "./preview";
import { HelperIdentity } from "./SupportActivity";
type Point = Pick<PrivateLocation, "lat" | "lng" | "accuracy">;

function useParticipantSharing(
  request: HelpRequest,
  notify: (text: string) => void,
  role: SharingRole,
) {
  const [sharing, setSharing] = useState(false),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState("");
  const run = useRef(0),
    session = useRef<string | null>(null),
    watch = useRef<string | null>(null);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const previous = useRef<(Point & { sentAt: number }) | null>(null);
  const writing = useRef(false);
  const ready = useRef(false);
  const stop = useCallback(async () => {
    run.current++;
    ready.current = false;
    const id = session.current;
    session.current = null;
    const watchId = watch.current;
    watch.current = null;
    setSharing(false);
    if (watchId) await Geolocation.clearWatch({ id: watchId }).catch(() => {});
    await pending.current.catch(() => {});
    if (id) await removeParticipantPosition(role, request.id, id);
  }, [request.id, role]);
  useEffect(() => {
    const pause = () => {
      if (!session.current || !ready.current) return;
      setNote(
        "Compartilhamento pausado. Mantenha esta tela aberta e ative novamente para continuar.",
      );
      void stop().catch(() => {});
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", visibility);
    const listener = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", (state) => {
          if (!state.isActive) pause();
        })
      : null;
    const expires = setTimeout(
      pause,
      Math.max(0, request.expiresAt.toMillis() - Date.now()),
    );
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      void listener?.then((l) => l.remove());
      clearTimeout(expires);
      void stop().catch(() => {});
    };
  }, [stop, request.expiresAt]);
  async function start() {
    setBusy(true);
    setNote("");
    const token = ++run.current;
    const id = crypto.randomUUID();
    session.current = id;
    previous.current = null;
    async function send(point: Point) {
      if (
        token !== run.current ||
        writing.current ||
        !shouldPublishPosition(previous.current, point, Date.now())
      )
        return;
      writing.current = true;
      const operation = publishParticipantPosition(role, request.id, id, point);
      pending.current = operation;
      try {
        await operation;
        previous.current = { ...point, sentAt: Date.now() };
      } finally {
        writing.current = false;
      }
    }
    try {
      const first = await locate();
      if (token !== run.current) return;
      if (
        document.hidden ||
        (Capacitor.isNativePlatform() && !(await NativeApp.getState()).isActive)
      )
        throw new Error(
          "Volte ao aplicativo para compartilhar sua localização.",
        );
      ready.current = true;
      await send(first);
      if (token !== run.current) return;
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          minimumUpdateInterval: 10000,
        },
        (position, error) => {
          if (token !== run.current) return;
          if (error) {
            const code = (error as { code?: string | number }).code;
            if (
              code !== 1 &&
              ![
                "OS-PLUG-GLOC-0003",
                "OS-PLUG-GLOC-0007",
                "OS-PLUG-GLOC-0008",
                "OS-PLUG-GLOC-0009",
                "OS-PLUG-GLOC-0017",
              ].includes(String(code))
            ) {
              setNote(
                "Aguardando um novo sinal do GPS. A última posição será marcada como desatualizada se o sinal não voltar.",
              );
              return;
            }
            setNote(
              "O GPS não está atualizando. Verifique a permissão e ative novamente.",
            );
            void stop().catch(() => {});
            return;
          }
          if (
            !position ||
            document.hidden ||
            Math.abs(Date.now() - position.timestamp) > 30000
          )
            return;
          setNote("");
          void send({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }).catch((e) => {
            notify(friendly(e));
            void stop().catch(() => {});
          });
        },
      );
      if (token !== run.current) {
        await Geolocation.clearWatch({ id: watchId });
        return;
      }
      watch.current = watchId;
      setSharing(true);
    } catch (error) {
      if (token === run.current) {
        notify(friendly(error));
        await stop().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }
  async function pause() {
    setBusy(true);
    try {
      await stop();
      setNote(
        "Compartilhamento pausado. Sua posição foi retirada do acompanhamento.",
      );
    } catch {
      setNote(
        "GPS pausado neste aparelho. Sem conexão, a última posição pode continuar visível como desatualizada até o serviço reconectar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { sharing, busy, note, start, pause };
}

export function RequestTracking({
  request,
  isHelper = false,
  notify,
}: {
  request: HelpRequest;
  isHelper?: boolean;
  notify: (text: string) => void;
}) {
  const [origin, setOrigin] = useState<PrivateLocation | null>(null);
  const [requester, setRequester] = useState<RequesterPosition | null>(null);
  const [helper, setHelper] = useState<HelperPosition | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [demoMoving, setDemoMoving] = useState(true);
  const expired = request.expiresAt.toMillis() <= now;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setOrigin(null);
    setRequester(null);
    setHelper(null);
    setError("");
    if (expired) return;
    if (isPreview) {
      setOrigin(previewPosition);
      if (request.status !== "accepted") return;
      let step = 0;
      const update = () => {
        if (document.hidden) return;
        const shift = (step++ % 20) * 0.000025;
        setRequester({
          ownerUid: request.ownerUid,
          sessionId: "preview-requester",
          ...previewPosition,
          lat: previewPosition.lat + shift,
          updatedAt: Timestamp.now(),
        });
        setHelper({
          helperUid: request.helperUid,
          sessionId: "preview-helper",
          lat: -26.925 + shift * 7,
          lng: -49.073 + shift * 8,
          accuracy: 10,
          updatedAt: Timestamp.now(),
        });
      };
      update();
      if (!demoMoving) return;
      const timer = setInterval(update, 2500);
      return () => clearInterval(timer);
    }
    if (!db) return;
    let disposed = false,
      checking = false;
    const reconcile = (error: unknown) => {
      if (disposed || checking) return;
      checking = true;
      // Ao encerrar, as regras revogam o acesso aos documentos privados.
      // Confere o resumo autorizado para fechar a tela, inclusive se o outro participante encerrou.
      void reconcileSupportRequest(request)
        .then((closed) => {
          if (!disposed && !closed) setError(friendly(error));
        })
        .catch(() => {
          if (!disposed) setError(friendly(error));
        })
        .finally(() => {
          checking = false;
        });
    };
    const listen = <T,>(name: string, set: (value: T | null) => void) =>
      onSnapshot(
        doc(db!, "supportRequests", request.id, "private", name),
        (s) => set(s.exists() ? (s.data() as T) : null),
        reconcile,
      );
    const stops = [
      listen("location", setOrigin),
      listen("helperPosition", setHelper),
      listen("requesterPosition", setRequester),
    ];
    return () => {
      disposed = true;
      stops.forEach((stop) => stop());
    };
  }, [request.id, request.status, expired, demoMoving]);
  const tracking = useParticipantSharing(
    request,
    notify,
    isHelper ? "helper" : "requester",
  );
  const destination = requester || origin;
  const updated = helper?.updatedAt?.toMillis();
  const fresh = updated !== undefined && isPositionFresh(updated, now);
  const requesterTime = requester?.updatedAt?.toMillis();
  const requesterFresh =
    requesterTime !== undefined && isPositionFresh(requesterTime, now);
  const age = (time: number | undefined) =>
    time ? `${Math.max(0, Math.floor((now - time) / 1000))}s` : "—";
  const distance =
    destination && helper ? distanceMeters(destination, helper) : null;
  if (expired)
    return (
      <div className="tracking-notice">
        <ShieldCheck size={17} />
        <span>Pedido expirado. O acompanhamento foi encerrado.</span>
      </div>
    );
  return (
    <section className="tracking-panel" aria-label="Acompanhamento no mapa">
      {request.status === "accepted" && <HelperIdentity request={request} />}
      <div className="tracking-heading">
        <span>
          <MapPin size={17} />
          <strong>
            {isHelper ? "Encontro com quem pediu apoio" : "Acompanhe o apoio"}
          </strong>
        </span>
        <span
          className={`tracking-badge ${fresh && requesterFresh ? "fresh" : ""}`}
        >
          <i />
          {fresh && requesterFresh
            ? "Os dois ao vivo"
            : fresh || requesterFresh
              ? "Recebendo posições"
              : "Aguardando sinal"}
        </span>
      </div>
      {destination ? (
        <Suspense
          fallback={<div className="map-loading">Carregando mapa…</div>}
        >
          <SupportMap
            destination={destination}
            helper={helper}
            fresh={fresh}
            destinationFresh={!requester || requesterFresh}
            destinationLabel={
              requester ? "Quem pediu apoio" : "Local do pedido"
            }
          />
        </Suspense>
      ) : (
        <div className="map-loading">
          {error || "Carregando localização protegida…"}
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="destination-dot" />
          {isHelper ? "Quem pediu apoio" : "Você"}
        </span>
        <span>
          <i className="helper-dot" />
          {isHelper ? "Você" : "Quem vem ajudar"}
        </span>
      </div>
      {request.status === "accepted" && (
        <div className="participant-positions">
          <div
            className={`tracking-status ${requesterFresh ? "" : "is-stale"}`}
            role="status"
          >
            <MapPin size={17} />
            <div>
              <strong>Localização de quem pediu</strong>
              <p>
                {requester
                  ? `${requesterFresh ? "Atualizada" : "Desatualizada"} há ${age(requesterTime)} · precisão ${Math.round(requester.accuracy)} m.`
                  : "Ponto inicial do pedido. Aguardando ativar a localização ao vivo."}
              </p>
            </div>
          </div>
          <div
            className={`tracking-status ${fresh ? "" : "is-stale"}`}
            role="status"
          >
            <Radio size={17} />
            <div>
              <strong>
                {helper
                  ? fresh
                    ? "Localização recebida"
                    : "Posição desatualizada"
                  : "Aguardando quem vem ajudar"}
              </strong>
              <p>
                {helper
                  ? `Última atualização há ${age(updated)} · precisão ${Math.round(helper.accuracy)} m.`
                  : "O associado precisa ativar o compartilhamento."}
              </p>
            </div>
          </div>
        </div>
      )}
      {distance !== null && (
        <p className="tracking-distance">
          {distance < 1000
            ? `${Math.round(distance)} m`
            : `${(distance / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}{" "}
          entre vocês, em linha reta.
          {(!fresh || !requesterFresh) &&
            " Estimativa com a última posição disponível."}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {request.status === "open" && (
        <p className="sharing-note">
          O local inicial fica protegido até um associado aceitar. Depois, vocês
          podem ativar o acompanhamento dos dois.
        </p>
      )}
      {request.status === "accepted" &&
        (isPreview ? (
          <div className="sharing-controls">
            <p>
              Demonstração: Rafael Oliveira e você se movimentam com posições
              fictícias. Nenhum dado é enviado ao Firebase.
            </p>
            <button
              className="btn secondary"
              onClick={() => setDemoMoving((v) => !v)}
            >
              {demoMoving ? "Pausar simulação" : "Retomar simulação"}
            </button>
          </div>
        ) : (
          <div className="sharing-controls">
            <p>
              <ShieldCheck size={16} />
              Somente os dois participantes acessam as posições. Ative para
              atualizar sua localização. Sair desta tela, fechar o app ou abrir
              o Waze/Maps pausa o envio; ative novamente ao retornar.
            </p>
            <button
              className={`btn ${tracking.sharing ? "secondary" : ""}`}
              disabled={tracking.busy}
              onClick={() =>
                void (tracking.sharing ? tracking.pause() : tracking.start())
              }
            >
              {tracking.sharing ? (
                <Pause size={17} />
              ) : (
                <Navigation size={17} />
              )}{" "}
              {tracking.busy
                ? "Aguarde…"
                : tracking.sharing
                  ? "Parar de compartilhar"
                  : isHelper
                    ? "Compartilhar meu trajeto"
                    : "Compartilhar minha localização"}
            </button>
            {tracking.note && (
              <p className="sharing-note" role="status">
                {tracking.note}
              </p>
            )}
          </div>
        ))}
    </section>
  );
}
