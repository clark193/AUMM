import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  MessageCircle,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { db, friendly } from "./firebase";
import { useSupportRequest } from "./support-hooks";
import { confirmRequest, finishRequest, type PrivateLocation } from "./support";
import { confirmationDeadline, isActiveSupport } from "../shared/support";
import { categories } from "./domain.mjs";
import {
  isPreview,
  isPreviewHelper,
  previewUid,
  readPreviewLocation,
  updatePreviewRequest,
} from "./preview";
import { openNavigation } from "./platform";
import { HelperIdentity } from "./SupportActivity";
import { RequestTracking } from "./SupportTracking";
import SupportChat from "./SupportChat";
export default function SupportDetail({
  id,
  uid,
  onBack,
  notify,
}: {
  id: string;
  uid: string;
  onBack: () => void;
  notify: (text: string) => void;
}) {
  const { request, loading, error } = useSupportRequest(id);
  const [now, setNow] = useState(Date.now()),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState<"resolved" | "cancelled" | null>(null),
    [panel, setPanel] = useState<"map" | "chat">("map"),
    [unread, setUnread] = useState(0);
  const [location, setLocation] = useState<PrivateLocation | null>(null),
    [live, setLive] = useState<{ lat: number; lng: number } | null>(null),
    [localError, setLocalError] = useState("");
  const timedOut = useRef("");
  const currentUid = isPreview ? previewUid : uid,
    owner = request?.ownerUid === currentUid;
  const deadline =
    request?.status === "awaiting_confirmation"
      ? Math.min(
          confirmationDeadline(request.acceptedAt?.toMillis()) || Infinity,
          request.expiresAt.toMillis(),
        )
      : null;
  const seconds = deadline
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : null;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setLocation(null);
    setLive(null);
    if (
      !request ||
      !isActiveSupport(request.status) ||
      (!owner && request.status !== "accepted")
    )
      return;
    if (isPreview) {
      setLocation(readPreviewLocation());
      return;
    }
    if (!db) return;
    const stop = onSnapshot(
      doc(db, "supportRequests", id, "private", "location"),
      (s) => setLocation(s.exists() ? (s.data() as PrivateLocation) : null),
      () => {},
    );
    const stopLive = onSnapshot(
      doc(db, "supportRequests", id, "private", "requesterPosition"),
      (s) =>
        setLive(s.exists() ? (s.data() as { lat: number; lng: number }) : null),
      () => setLive(null),
    );
    return () => {
      stop();
      stopLive();
    };
  }, [id, request?.status, owner]);
  useEffect(() => {
    if (
      !request ||
      seconds !== 0 ||
      request.status !== "awaiting_confirmation" ||
      timedOut.current === request.chatId
    )
      return;
    timedOut.current = request.chatId;
    if (isPreview) {
      updatePreviewRequest("cancelled");
      return;
    }
    void finishRequest(id, "cancelled").catch(() => {
      setLocalError(
        "O prazo acabou. O atendimento está bloqueado; conecte-se para encerrar o pedido.",
      );
    });
  }, [id, seconds, request?.status, request?.chatId]);
  async function confirm() {
    setBusy(true);
    setLocalError("");
    try {
      if (isPreview) updatePreviewRequest("accepted");
      else await confirmRequest(id);
      notify(
        "Apoio confirmado. Agora vocês podem conversar e compartilhar a localização.",
      );
    } catch (e) {
      setLocalError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    if (!action) return;
    setBusy(true);
    try {
      if (isPreview) updatePreviewRequest(action);
      else await finishRequest(id, action);
      setAction(null);
      notify(
        action === "resolved"
          ? "Atendimento concluído. Obrigado por fortalecer a rede!"
          : "Pedido cancelado.",
      );
    } catch (e) {
      setLocalError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  async function navigate() {
    const point = live || location;
    if (!point) return;
    try {
      if (isPreview) {
        notify(
          "No Android, este botão abre a escolha entre os aplicativos de GPS instalados.",
        );
        return;
      }
      await openNavigation(point.lat, point.lng);
    } catch (e) {
      notify(friendly(e));
    }
  }
  const back = (
    <button className="text-btn request-back" onClick={onBack}>
      <ArrowLeft size={17} /> Voltar ao Centro de Apoio
    </button>
  );
  if (loading)
    return (
      <>
        {back}
        <p className="loading">Carregando seu atendimento…</p>
      </>
    );
  if (!request || !isActiveSupport(request.status))
    return (
      <div className="request-detail">
        {back}
        <div className="request-finished">
          <ShieldCheck size={42} />
          <h1>
            {request?.status === "resolved"
              ? "Apoio concluído"
              : "Atendimento encerrado"}
          </h1>
          <p>
            Este pedido não está mais ativo. O acesso à localização e ao chat
            foi encerrado.
          </p>
          <button className="btn" onClick={onBack}>
            Voltar para a rede <ArrowUpRight size={17} />
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  return (
    <div className="request-detail" aria-label="Atendimento de apoio">
      {back}
      <header className="request-detail-heading">
        <span className="eyebrow">SEU ATENDIMENTO · REDE AUMM</span>
        <h1>{owner ? "Meu pedido de apoio" : "Você está ajudando"}</h1>
        <p>
          <MapPin size={14} />
          {request.region} · {request.city}
        </p>
      </header>
      <div className={`request-stage stage-${request.status}`}>
        <span>
          <Clock3 size={18} />
          {request.status === "open"
            ? "Aguardando um voluntário"
            : request.status === "awaiting_confirmation"
              ? "Aguardando confirmação"
              : "Apoio confirmado"}
        </span>
        <strong>
          {categories.find((c) => c.id === request.category)?.label}
        </strong>
      </div>
      {request.status !== "open" && request.status !== "accepted" && (
        <HelperIdentity request={request} />
      )}
      {location && (
        <div className="request-vehicle">
          <span>PLACA DA MOTO</span>
          <strong>{location.plate || "Não informada"}</strong>
          <p>{location.details || "Sem observações adicionais."}</p>
        </div>
      )}
      {request.status === "open" && (
        <div className="request-waiting">
          <ShieldCheck size={25} />
          <h2>Seu pedido está na rede</h2>
          <p>
            Quando um associado aceitar, você terá até 5 minutos para confirmar
            que ainda precisa. Só então a localização será liberada.
          </p>
          {isPreview && !isPreviewHelper && (
            <button
              className="btn secondary"
              onClick={() => updatePreviewRequest("awaiting_confirmation")}
            >
              Simular alguém aceitando ajudar
            </button>
          )}
        </div>
      )}
      {request.status === "awaiting_confirmation" && (
        <section
          className="confirmation-card"
          aria-label="Confirmação do apoio"
        >
          <span className="confirmation-clock">
            <Clock3 size={17} />
            {seconds === null
              ? "Sincronizando prazo…"
              : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} para confirmar`}
          </span>
          <h2>
            {owner
              ? "Você ainda precisa de apoio?"
              : "Aguardando quem pediu ajuda"}
          </h2>
          <p>
            {owner
              ? "Um associado se disponibilizou. Confirme para liberar o atendimento, o mapa e o chat."
              : "O solicitante precisa confirmar que continua precisando. Aguarde antes de iniciar o deslocamento; o pedido será encerrado se não houver resposta."}
          </p>
          {owner ? (
            <>
              <button
                className="btn"
                disabled={busy || seconds === 0 || seconds === null}
                onClick={() => void confirm()}
              >
                Sim, ainda preciso <Check size={17} />
              </button>
              <button
                className="text-btn"
                onClick={() => setAction("cancelled")}
              >
                Não preciso mais
              </button>
            </>
          ) : isPreviewHelper ? (
            <button className="btn secondary" onClick={() => void confirm()}>
              Simular confirmação do solicitante
            </button>
          ) : null}
        </section>
      )}
      {request.status === "accepted" && (
        <>
          <div
            className="request-view-tabs"
            role="tablist"
            aria-label="Detalhes do atendimento"
          >
            <button
              role="tab"
              aria-selected={panel === "map"}
              onClick={() => setPanel("map")}
            >
              <Navigation size={17} /> Mapa e encontro
            </button>
            <button
              role="tab"
              aria-selected={panel === "chat"}
              onClick={() => {
                setPanel("chat");
                setUnread(0);
              }}
            >
              <MessageCircle size={17} /> Chat{" "}
              {unread > 0 && <span className="chat-unread">{unread}</span>}
            </button>
          </div>
          <div hidden={panel !== "map"}>
            <RequestTracking
              request={request}
              isHelper={!owner}
              notify={notify}
            />
            {!owner && location && (
              <div className="request-route">
                <p>
                  Rotas usam{" "}
                  {live
                    ? "a última posição compartilhada"
                    : "o ponto inicial do pedido"}
                  .
                </p>
                <button className="btn" onClick={() => void navigate()}>
                  Abrir localização no GPS <Navigation size={16} />
                </button>
              </div>
            )}
          </div>
          <div hidden={panel !== "chat"}>
            <SupportChat
              request={request}
              uid={currentUid}
              visible={panel === "chat"}
              onUnread={setUnread}
            />
          </div>
        </>
      )}
      {(localError || error) && (
        <p className="error" role="alert">
          {localError || error}
        </p>
      )}
      <div className="request-actions">
        {request.status === "accepted" && (
          <button className="btn" onClick={() => setAction("resolved")}>
            {owner ? "Já fui atendido" : "Concluir atendimento"}
            <Check size={16} />
          </button>
        )}
        {owner && (
          <button
            className="btn secondary"
            onClick={() => setAction("cancelled")}
          >
            Cancelar pedido
          </button>
        )}
      </div>
      {action && (
        <div
          className="request-confirm-action"
          role="dialog"
          aria-label="Encerrar pedido"
        >
          <h2>
            {action === "resolved"
              ? "Concluir o atendimento?"
              : "Cancelar este pedido?"}
          </h2>
          <p>O acesso ao mapa e ao chat será encerrado para os dois.</p>
          <div className="button-row">
            <button
              className="btn"
              disabled={busy}
              onClick={() => void finish()}
            >
              {busy ? "Encerrando…" : "Confirmar encerramento"}
            </button>
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
