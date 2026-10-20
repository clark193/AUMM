import { useState } from "react";
import {
  BadgeCheck,
  Bell,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  HandHeart,
  Newspaper,
  Settings2,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { detachPushDevice, enableNativePush } from "./push";
import { friendly } from "./firebase";
import type { NoticeEvent } from "../shared/notifications";
import type { useNotices } from "./useNotices";
export function NoticeIcon({ notice }: { notice: NoticeEvent }) {
  const Icon =
    notice.kind === "news"
      ? Newspaper
      : notice.kind === "support_accepted"
        ? BadgeCheck
        : notice.kind === "support_resolved"
          ? CircleCheck
          : notice.kind === "communication"
            ? Bell
            : HandHeart;
  return (
    <span
      className={`notice-icon ${notice.kind === "news" ? "blue" : notice.kind === "support_nearby" ? "orange" : "green"}`}
    >
      <Icon size={22} />
    </span>
  );
}
export function NoticeBanner({
  notice,
  open,
  dismiss,
}: {
  notice: NoticeEvent;
  open: () => void;
  dismiss: () => void;
}) {
  return (
    <aside className="notice-banner" role="status" aria-live="polite">
      <NoticeIcon notice={notice} />
      <button className="notice-banner-copy" onClick={open}>
        <span>
          AUMM · {notice.target === "support" ? "REDE DE APOIO" : "NOVIDADES"}
        </span>
        <strong>{notice.title}</strong>
        <p>{notice.body}</p>
        <small>
          Toque para acompanhar <ChevronRight size={12} />
        </small>
      </button>
      <button className="icon-btn" aria-label="Fechar aviso" onClick={dismiss}>
        <X size={17} />
      </button>
    </aside>
  );
}
function timeAgo(time: number) {
  const age = Math.max(0, Date.now() - time);
  return age < 60000
    ? "Agora"
    : age < 3600000
      ? `${Math.floor(age / 60000)} min atrás`
      : new Date(time).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });
}
export default function NotificationCenter({
  center,
  active,
  notify,
}: {
  center: ReturnType<typeof useNotices>;
  active: boolean;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState<"all" | "unread" | "settings">("all"),
    [busy, setBusy] = useState(false),
    [pushOn, setPushOn] = useState(
      localStorage.getItem("aumm.pushEnabled") === "true",
    );
  async function togglePush() {
    setBusy(true);
    try {
      if (pushOn) {
        await detachPushDevice();
        setPushOn(false);
        localStorage.removeItem("aumm.pushEnabled");
        notify("Notificações deste aparelho desativadas.");
      } else {
        await enableNativePush();
        setPushOn(true);
        localStorage.setItem("aumm.pushEnabled", "true");
        notify(
          "Permissão concedida. As notificações serão ativadas ao registrar este aparelho.",
        );
      }
    } catch (error) {
      notify(friendly(error));
    } finally {
      setBusy(false);
    }
  }
  const visible = center.items.filter(
    (item) => item.expiresAt > Date.now() && (tab !== "unread" || !item.read),
  );
  return (
    <div className="notification-center">
      <div className="notification-intro">
        <span className="notice-icon green">
          <Bell size={26} />
        </span>
        <div>
          <h3>O que acontece na sua rede</h3>
          <p>Apoio, informação e a AUMM mais perto de você.</p>
        </div>
      </div>
      <div className="notice-tabs">
        <button
          className={tab === "all" ? "selected" : ""}
          onClick={() => setTab("all")}
        >
          Todos
        </button>
        <button
          className={tab === "unread" ? "selected" : ""}
          onClick={() => setTab("unread")}
        >
          Não lidos {center.unread > 0 && <b>{center.unread}</b>}
        </button>
        <button
          className={tab === "settings" ? "selected" : ""}
          onClick={() => setTab("settings")}
          aria-label="Preferências de notificações"
        >
          <Settings2 size={16} />
        </button>
      </div>
      {tab !== "settings" ? (
        <>
          <div className="notice-list-heading">
            <span>
              {center.unread
                ? `${center.unread} aviso${center.unread > 1 ? "s" : ""} para você`
                : "Você está em dia"}
            </span>
            {center.unread > 0 && (
              <button onClick={center.markAllRead}>
                <CheckCheck size={15} />
                Marcar como lidos
              </button>
            )}
          </div>
          {visible.length ? (
            <div className="notice-list">
              {visible.map((item) => (
                <button
                  className={`notice-row ${item.read ? "" : "unread"}`}
                  key={item.id}
                  onClick={() => center.open(item)}
                >
                  <NoticeIcon notice={item} />
                  <span>
                    <small>
                      {timeAgo(item.createdAt)}
                      {!item.read && <i />}
                    </small>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="notice-empty">
              <CheckCheck size={36} />
              <h3>
                {tab === "unread"
                  ? "Tudo lido por aqui"
                  : "Sua rede vai avisar você"}
              </h3>
              <p>
                Notícias novas e atualizações dos seus pedidos aparecerão aqui.
                Não é preciso atualizar a página.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="notice-settings">
          <h3>Receba o que importa para você</h3>
          <p>Escolha os avisos que acompanham sua jornada.</p>
          {[
            {
              key: "news",
              title: "Notícias novas",
              detail: "Publicações e novidades da associação.",
              allowed: true,
            },
            {
              key: "nearbyHelp",
              title: "Pedidos de ajuda na cidade",
              detail: "Saiba quando alguém precisa de uma força.",
              allowed: active,
            },
            {
              key: "requestUpdates",
              title: "Meu atendimento",
              detail: "Pedido enviado, ajuda aceita, conclusão e cancelamento.",
              allowed: true,
            },
            {
              key: "communications",
              title: "Comunicados da AUMM",
              detail: "Avisos e recados para os associados.",
              allowed: active,
            },
          ].map((pref) => (
            <label className="notice-switch" key={pref.key}>
              <span>
                <strong>{pref.title}</strong>
                <small>
                  {pref.allowed
                    ? pref.detail
                    : "Disponível para associados ativos."}
                </small>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label={pref.title}
                disabled={!pref.allowed}
                checked={
                  pref.allowed &&
                  Boolean(
                    center.preferences[
                      pref.key as keyof typeof center.preferences
                    ],
                  )
                }
                onChange={(e) =>
                  center.updatePreferences({ [pref.key]: e.target.checked })
                }
              />
            </label>
          ))}
          <label className="notice-city">
            Sua cidade de apoio
            <select
              disabled={!active}
              value={center.preferences.city}
              onChange={(e) =>
                center.updatePreferences({ city: e.target.value })
              }
            >
              {["Blumenau", "Gaspar", "Indaial", "Timbó", "Pomerode"].map(
                (city) => (
                  <option key={city}>{city}</option>
                ),
              )}
            </select>
          </label>
          <div className="notice-device">
            <Smartphone size={25} />
            <h3>Alertas no seu celular</h3>
            <p>
              {Capacitor.getPlatform() === "android"
                ? "Receba também quando o aplicativo estiver fechado, com sua permissão."
                : "No aplicativo Android, você também pode ativar os avisos do sistema."}
            </p>
            {Capacitor.getPlatform() === "android" && (
              <button
                className={`btn ${pushOn ? "secondary" : ""}`}
                disabled={busy}
                onClick={() => void togglePush()}
              >
                {busy
                  ? "Aguarde…"
                  : pushOn
                    ? "Desativar neste aparelho"
                    : "Ativar notificações no Android"}
              </button>
            )}
          </div>
          <div className="notice-privacy">
            <ShieldCheck size={18} />
            <p>
              Os alertas de apoio não mostram coordenadas, documentos ou
              observações do pedido na tela bloqueada. Não dependemos de você
              compartilhar sua localização para escolher a cidade dos avisos.
            </p>
          </div>
          {center.syncError && (
            <p className="form-note" role="status">
              {center.syncError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
