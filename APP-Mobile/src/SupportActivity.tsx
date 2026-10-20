import { useEffect, useState } from "react";
import { ArrowUpRight, HandHeart, ShieldCheck } from "lucide-react";
import { useHelperProfile } from "./support-hooks";
import { categories } from "./domain.mjs";
import { isPreview } from "./preview";
import type { HelpRequest } from "./support";
export function HelperIdentity({
  request,
  compact = false,
}: {
  request: HelpRequest;
  compact?: boolean;
}) {
  const profile = useHelperProfile(request);
  if (!["awaiting_confirmation", "accepted"].includes(request.status))
    return null;
  return (
    <div className={`support-person ${compact ? "compact" : ""}`}>
      <span className="support-person-avatar">
        {profile?.fullName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join("") || <HandHeart size={20} />}
      </span>
      <div>
        <small>
          {isPreview
            ? "Associado de demonstração"
            : "Associado que aceitou ajudar"}
        </small>
        <strong>{profile?.fullName || "Carregando identificação…"}</strong>
        {!compact && (
          <span>
            <ShieldCheck size={13} />{" "}
            {profile?.memberNumber
              ? `Matrícula ${profile.memberNumber} · `
              : ""}
            Identificação do cadastro AUMM
          </span>
        )}
      </div>
    </div>
  );
}
export function OngoingSupportCard({
  request,
  isHelper = false,
  onOpen,
}: {
  request: HelpRequest;
  isHelper?: boolean;
  onOpen: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, request.expiresAt.toMillis() - Date.now() + 10),
    );
    return () => clearTimeout(timer);
  }, [request.expiresAt]);
  const expired = request.expiresAt.toMillis() <= now;
  return (
    <article
      className="ongoing-support"
      aria-label={
        isHelper
          ? "Você está prestando apoio"
          : "Solicitação de apoio em andamento"
      }
    >
      <div className="ongoing-heading">
        <span className="tile-icon green">
          <HandHeart size={21} />
        </span>
        <div>
          <span className="eyebrow">
            {isHelper ? "VOCÊ ESTÁ AJUDANDO" : "SEU CENTRO DE APOIO"}
          </span>
          <h2>{expired ? "Pedido expirado" : "Apoio em andamento"}</h2>
        </div>
        <span className="live-label">
          <i />
          {expired
            ? "Encerrar"
            : request.status === "open"
              ? "Na rede"
              : request.status === "awaiting_confirmation"
                ? "Confirmar"
                : "Confirmado"}
        </span>
      </div>
      <p className="ongoing-summary">
        {categories.find((c) => c.id === request.category)?.label ||
          "Pedido de apoio"}{" "}
        · {request.region}, {request.city}
      </p>
      {["awaiting_confirmation", "accepted"].includes(request.status) &&
      !expired ? (
        <HelperIdentity request={request} compact />
      ) : (
        <p className="muted">
          {expired
            ? "Encerre este pedido para poder solicitar outro apoio."
            : "Aguardando um associado aceitar. Avisaremos você por aqui."}
        </p>
      )}
      <button className="btn" onClick={onOpen}>
        {expired
          ? "Ver pedido"
          : isHelper
            ? "Continuar atendimento"
            : "Acompanhar atendimento"}
        <ArrowUpRight size={17} />
      </button>
    </article>
  );
}
