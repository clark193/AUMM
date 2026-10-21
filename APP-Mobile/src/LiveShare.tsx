import { useEffect, useRef, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import { PushNotifications } from "@capacitor/push-notifications";
import { signInAnonymously } from "firebase/auth";
import { doc, serverTimestamp, Timestamp, writeBatch, updateDoc } from "firebase/firestore";
import { MapPin, Share2, ShieldCheck, Square } from "lucide-react";
import { friendly, services } from "./firebase";
import { isPreview } from "./preview";
import { backgroundLocation, hasBackgroundLocation } from "./backgroundLocation";

export default function LiveShare({ notify }: { notify: (text: string) => void }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [paused, setPaused] = useState(false);
  const [updated, setUpdated] = useState("");
  const [expires, setExpires] = useState(0);
  const [closing, setClosing] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const shareId = useRef("");
  const watch = useRef<string | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWrite = useRef(0);
  const generation = useRef(0);

  async function stopWatch() {
    generation.current++;
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
    const current = watch.current;
    watch.current = null;
    if (current) await Geolocation.clearWatch({ id: current });
  }
  async function endShare() {
    if (hasBackgroundLocation) {
      await backgroundLocation.stop();
      setClosing(true);
      return;
    }
    await stopWatch();
    const id = shareId.current;
    if (!id) return;
    const { db } = services();
    const batch = writeBatch(db);
    batch.delete(doc(db, "liveLocations", id));
    batch.delete(doc(db, "locationShareOwners", id));
    await batch.commit();
    shareId.current = "";
    setLink(""); setPaused(false);
  }
  async function startWatch() {
    if (hasBackgroundLocation) return;
    await stopWatch();
    const activeGeneration = generation.current;
    const id = shareId.current;
    lastWrite.current = 0;
    const sample: Parameters<typeof Geolocation.watchPosition>[1] = (position, error) => {
      if (activeGeneration !== generation.current || shareId.current !== id) return;
      if (error) { setPaused(true); notify("O GPS não respondeu. Confira a permissão e retome o compartilhamento."); return; }
      if (!position || Date.now() - lastWrite.current < 10000 || document.hidden) return;
      lastWrite.current = Date.now();
      const { db } = services();
      void updateDoc(doc(db, "liveLocations", id), {
        lat: position.coords.latitude, lng: position.coords.longitude,
        accuracy: Math.max(0, position.coords.accuracy), updatedAt: serverTimestamp(),
        sampledAt: Timestamp.fromMillis(position.timestamp),
      }).then(() => { if (activeGeneration === generation.current) { setUpdated(new Date().toLocaleTimeString("pt-BR")); setPaused(false); } })
        .catch((caught) => { if (activeGeneration === generation.current) { setPaused(true); notify(friendly(caught)); } });
    };
    const watchId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }, sample);
    if (activeGeneration !== generation.current) await Geolocation.clearWatch({ id: watchId });
    else {
      watch.current = watchId;
      heartbeat.current = setInterval(() => {
        void Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 })
          .then((position) => sample(position)).catch(() => { if (activeGeneration === generation.current) setPaused(true); });
      }, 20000);
    }
  }
  useEffect(() => {
    if (hasBackgroundLocation) {
      let mounted = true;
      async function sync() {
        try {
          const state = await backgroundLocation.status();
          if (!mounted) return;
          shareId.current = state.shareId;
          setExpires(state.expiresAt); setClosing(state.closing);
          setPaused(Boolean(state.error));
          if (state.updatedAt) setUpdated(new Date(state.updatedAt).toLocaleTimeString("pt-BR"));
          setLink(state.active ? shareUrl(state.shareId) : "");
        } catch { /* A tela não controla o ciclo de vida do serviço nativo. */ }
      }
      void sync();
      const timer = setInterval(() => void sync(), 2000);
      return () => { mounted = false; clearInterval(timer); };
    }
    function pause() { if (document.hidden && shareId.current) { void stopWatch(); setPaused(true); } }
    document.addEventListener("visibilitychange", pause);
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive && shareId.current) { void stopWatch(); setPaused(true); }
    }) : null;
    return () => {
      document.removeEventListener("visibilitychange", pause);
      void listener?.then((item) => item.remove());
      void endShare().catch(() => { /* O link também expira automaticamente. */ });
    };
  }, []);
  useEffect(() => {
    if (hasBackgroundLocation || !expires || !link) return;
    const timer = setTimeout(() => { void endShare().catch((caught) => notify(friendly(caught))); }, Math.max(0, expires - Date.now()));
    return () => clearTimeout(timer);
  }, [expires, link]);
  async function start() {
    if (isPreview) { notify("A prévia não envia sua localização. Teste o acompanhamento ao vivo no aplicativo instalado."); return; }
    setBusy(true);
    try {
      const { auth, db } = services();
      await auth.authStateReady();
      if (!auth.currentUser) await signInAnonymously(auth);
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();
        if (permission.location === "denied" && permission.coarseLocation === "denied") throw new Error("Permita o acesso à localização nas configurações do celular.");
        if (hasBackgroundLocation) {
          let notifications = await PushNotifications.checkPermissions();
          if (notifications.receive === "prompt" || notifications.receive === "prompt-with-rationale") notifications = await PushNotifications.requestPermissions();
          if (notifications.receive !== "granted") throw new Error("Permita as notificações do Android para manter o aviso e o botão de encerrar o GPS visíveis.");
        }
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
      const id = crypto.randomUUID().replaceAll("-", "");
      if (![30, 60, 120, 240, 480, 720].includes(durationMinutes)) throw new Error("Escolha uma duração de até 12 horas.");
      const expiresAt = Timestamp.fromMillis(Date.now() + durationMinutes * 60 * 1000);
      const batch = writeBatch(db);
      batch.set(doc(db, "locationShareOwners", id), { ownerUid: auth.currentUser!.uid, createdAt: serverTimestamp(), expiresAt });
      batch.set(doc(db, "liveLocations", id), { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: Math.max(0, position.coords.accuracy), updatedAt: serverTimestamp(), sampledAt: Timestamp.fromMillis(position.timestamp), expiresAt });
      await batch.commit();
      shareId.current = id;
      if (hasBackgroundLocation) {
        try {
          // As credenciais ficam somente na memória do serviço durante a sessão autorizada.
          await backgroundLocation.start({ projectId: db.app.options.projectId!, shareId: id, idToken: await auth.currentUser!.getIdToken(true), refreshToken: auth.currentUser!.refreshToken, apiKey: db.app.options.apiKey!, expiresAt: expiresAt.toMillis() });
        } catch (caught) {
          const cleanup = writeBatch(db);
          cleanup.delete(doc(db, "liveLocations", id)); cleanup.delete(doc(db, "locationShareOwners", id));
          await cleanup.commit(); shareId.current = "";
          throw caught;
        }
      }
      setLink(shareUrl(id)); setExpires(expiresAt.toMillis()); setUpdated(new Date().toLocaleTimeString("pt-BR"));
      await startWatch();
    } catch (caught) { notify(friendly(caught)); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    try { await Clipboard.write({ string: link, label: "Link de acompanhamento AUMM" }); notify("Link copiado. Envie para uma pessoa de confiança."); } catch { notify("Não foi possível copiar automaticamente. Toque no campo do link para selecioná-lo e copiar."); }
  }
  async function share() {
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title: "Acompanhe minha localização · AUMM", text: "Acompanhe minha localização enquanto compartilho pelo app AUMM.", url: link });
      else if (navigator.share) await navigator.share({ title: "Localização ao vivo · AUMM", url: link });
      else { await navigator.clipboard.writeText(link); notify("Link copiado. Envie para uma pessoa de confiança."); }
    } catch (caught) { if ((caught as { name?: string }).name !== "AbortError") notify(friendly(caught)); }
  }
  return <div className="form live-share"><div className="login-mark"><MapPin /><p>Uma pessoa de confiança pode acompanhar você pelo navegador, sem instalar o app nem fazer login.</p></div><p className="muted"><ShieldCheck size={16} /> Qualquer pessoa com o link consegue ver sua posição. Você escolhe a duração, de 30 minutos até 12 horas. O link pode ser encerrado a qualquer momento. Sua placa, seus dados e seu histórico não são compartilhados.</p><p className="form-note">{hasBackgroundLocation ? "Ao iniciar, o GPS continua com a tela bloqueada ou usando outro aplicativo. O Android mantém um aviso com o botão Encerrar. Fechar esta janela mantém o compartilhamento; use Encerrar para parar. Forçar a parada do app ou desligar o aparelho interrompe o envio." : "No navegador, mantenha esta tela aberta e o aplicativo ativo. Ao bloquear a tela ou abrir outro aplicativo, o envio pausa. Ao fechar esta tela, o link é encerrado."}</p>{link ? <><div className="live-share-status" role="status"><strong>{closing ? "GPS desligado · encerrando o link…" : paused ? "Aguardando GPS ou conexão" : "Localização compartilhada"}</strong><small>Último envio: {updated || "aguardando GPS"} · válido até {new Date(expires).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>{closing && <small>É preciso conexão para revogar o link. Ele também expira automaticamente.</small>}</div><input aria-label="Link de acompanhamento" readOnly value={link} onFocus={(e) => e.currentTarget.select()} /><button className="btn" disabled={closing} onClick={() => void share()}><Share2 size={18} /> Compartilhar link</button><button className="btn secondary" disabled={closing} onClick={() => void copyLink()}>Copiar link</button>{paused && !hasBackgroundLocation && <button className="btn secondary" onClick={() => void startWatch().catch((caught) => notify(friendly(caught)))}>Retomar envio da localização</button>}<button className="btn secondary" disabled={closing} onClick={() => void endShare().catch((caught) => notify(friendly(caught)))}><Square size={16} /> Encerrar compartilhamento</button></> : <><label>Por quanto tempo?<select aria-label="Duração do compartilhamento" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}>{[[30,"30 minutos"],[60,"1 hora"],[120,"2 horas"],[240,"4 horas"],[480,"8 horas"],[720,"12 horas"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Autorizo compartilhar minha localização por um link temporário{hasBackgroundLocation ? ", inclusive com a tela bloqueada" : ""}.</label><button className="btn" disabled={!consent || busy} onClick={() => void start()}>{busy ? "Preparando o GPS…" : "Iniciar compartilhamento ao vivo"}</button></>}</div>;
}

function shareUrl(id: string) {
  const url = new URL("/acompanhar/", import.meta.env.VITE_SITE_URL || "https://aumm.com.br");
  url.hash = id;
  return url.href;
}
