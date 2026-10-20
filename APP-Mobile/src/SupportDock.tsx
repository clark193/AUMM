import { useState } from "react";
import { ArrowUpRight, HandHeart } from "lucide-react";
import type { HelpRequest } from "./support";
export default function SupportDock({
  requests,
  onOpen,
}: {
  requests: HelpRequest[];
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!requests.length) return null;
  return (
    <aside className="support-dock" aria-label="Apoios em andamento">
      {expanded && requests.length > 1 && (
        <div className="support-dock-list">
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setExpanded(false);
                onOpen(r.id);
              }}
            >
              <strong>
                {r.city} · {r.region}
              </strong>
              <small>
                {r.status === "open"
                  ? "Aguardando aceite"
                  : r.status === "awaiting_confirmation"
                    ? "Confirmação pendente"
                    : "Atendimento confirmado"}
              </small>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      )}
      <button
        className="support-dock-main"
        onClick={() =>
          requests.length > 1 ? setExpanded((v) => !v) : onOpen(requests[0].id)
        }
      >
        <span className="dock-icon">
          <HandHeart size={22} />
        </span>
        <span>
          <strong>
            {requests.length > 1
              ? `${requests.length} apoios em andamento`
              : "Solicitação de apoio em andamento"}
          </strong>
          <small>
            {requests.length > 1
              ? "Toque para escolher o atendimento"
              : requests[0].status === "awaiting_confirmation"
                ? "Confirmação pendente · toque para abrir"
                : "Toque para acompanhar seu atendimento"}
          </small>
        </span>
        <ArrowUpRight size={20} />
      </button>
    </aside>
  );
}
