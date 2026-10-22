import React, {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  signInWithEmailAndPassword,
  browserLocalPersistence, setPersistence,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Sun, Moon,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bike,
  Bookmark,
  Calculator,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  Droplets,
  ExternalLink,
  FileText,
  Fuel,
  Gift,
  HandHeart,
  House,
  Info,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  Newspaper,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { configured, db, friendly, services } from "./firebase";
import { useFeed, useMemberPhoto, usePublicSettings, useSession, type Row } from "./hooks";
import { categories, calculateShift } from "./domain.mjs";
import {
  acceptRequest,
  createRequest,
  type HelpRequest,
  type PrivateLocation,
} from "./support";
import { locate, openUrl, site } from "./platform";
import "./styles.css";
import "./improvements.css";
import "./account-theme.css";
import { SupportMap } from "./SupportTracking";
import NotificationCenter, { NoticeBanner } from "./NotificationCenter";
import { useNotices } from "./useNotices";
import { detachPushDevice } from "./push";
import type { NoticeEvent } from "../shared/notifications";
import {
  isPreview,
  previewPosition,
  createPreviewRequest,
  updatePreviewRequest,
  isPreviewHelper,
  readPreviewRequest,
  resetPreviewHelper,
} from "./preview";

import { useSupportActivity } from "./support-hooks";
import { OngoingSupportCard } from "./SupportActivity";
import SupportDetail from "./SupportDetail";
import SupportDock from "./SupportDock";
import LiveShare from "./LiveShare";
import LiveShareIndicator from "./LiveShareIndicator";
import { stopBackgroundShareBeforeAuthChange } from "./backgroundLocation";
import EmergencyCenter, { EmergencyHome } from "./EmergencyCenter";
import { EmergencyContactForm } from "./EmergencyContact";
import MobileEvents, { EventCard, EventDetails, upcomingEvents } from "./MobileEvents";
import RideLedger from "./RideLedger";
import {SupportContacts} from "../../components/SupportContacts";
import {useTheme} from "./useTheme";
import {useUnifiedPreview} from "./useUnifiedPreview";
const AdminWorkspace=React.lazy(()=>import("./AdminWorkspace"));
const RegistrationWizard=React.lazy(()=>import("./RegistrationWizard"));
const AccountRecovery=React.lazy(()=>import("./RegistrationWizard").then(m=>({default:m.AccountRecovery})));
const MemberFeatures = React.lazy(() => import("./MemberFeatures"));
import AdminEmergencyPreview from "./AdminEmergencyPreview";
import { isActiveSupport } from "../shared/support";
type Tab = "home" | "support" | "news" | "utilities" | "account" | "request" | "benefits" | "admin";
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function formatDate(value: Row["date"]) {
  return typeof value === "string"
    ? value
    : value?.toDate().toLocaleDateString("pt-BR") || "";
}
function documentLink(item: Row) {
  const value =
    item.internalUrl ||
    item.externalUrl ||
    item.signedDocumentUrl ||
    item.fileUrl ||
    item.url;
  if (!value) return "";
  return value.startsWith("/") && !value.startsWith("//")
    ? (import.meta.env.VITE_SITE_URL || "https://aumm.com.br") + value
    : value;
}
const categoryIcon: Record<string, LucideIcon> = {
  gasolina: Fuel,
  pneu: Wrench,
  pane: Bike,
  apoio: HandHeart,
};
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`btn ${secondary ? "secondary" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Empty({
  icon: Icon = Info,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={30} />
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}
function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-title">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    container.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const elements = container.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]',
      );
      if (!elements?.length) return;
      const first = elements[0],
        last = elements[elements.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === container.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={container}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function App() {
  const session = useSession();
  const {theme,toggleTheme}=useTheme();
  const [adminPath,setAdminPath]=useState("/admin");
  const [entryChoice,setEntryChoice]=useState(()=>{try{return localStorage.getItem("aumm.entry")||"choice";}catch{return "choice";}});
  function chooseEntry(value:string){setEntryChoice(value);try{localStorage.setItem("aumm.entry",value);}catch{}}
  const supportActivity = useSupportActivity(session.user, session.active);
  const [tab, setTab] = useState<Tab>(isPreviewHelper ? "support" : "home");
  const [selectedSupportId, setSelectedSupportId] = useState("");
  const openSupport = React.useCallback((id: string) => {
    setSelectedSupportId(id);
    setTab("request");
  }, []);
  const activeRequests = [
    ...(supportActivity.own && isActiveSupport(supportActivity.own.status)
      ? [supportActivity.own]
      : []),
    ...supportActivity.helping,
  ];
  const [modal, setModal] = useState<string | null>(isPreview && new URLSearchParams(location.search).get("role") === "admin" ? "adminPreview" : isPreview && new URLSearchParams(location.search).get("role") === "emergency" ? "emergency" : new URLSearchParams(location.search).has("login") ? "login" : null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [selectedNews, setSelectedNews] = useState<Row | null>(null);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("aumm.saved") || "[]");
    } catch {
      return [];
    }
  });
  const news = useFeed("news", true, "published");
  const events = useFeed("events");
  const memberPhoto = useMemberPhoto(session.user?.uid);
  const [selectedEvent, setSelectedEvent] = useState<Row | null>(null);
  function openEvent(item: Row) { setSelectedEvent(item); setModal("eventDetails"); }
  const benefits = useFeed("benefits", session.active);
  const documents = useFeed("documents", session.active, "documents");
  const communications = useFeed("communications", session.active, "published");
  const transparency = useFeed("transparency", session.active, "published");
  const settings = usePublicSettings();
  const [search, setSearch] = useState("");
  const [newsFilter, setNewsFilter] = useState("Todas");
  const notify = React.useCallback((text:string)=>setToast(text),[]);
  const previewMode=React.useCallback((mode:string)=>{setModal(null);setAdminPath("/admin");setEntryChoice(mode === "entry" ? "choice" : mode === "guest" ? "guest" : "user");try{localStorage.setItem("aumm.entry",mode === "entry" ? "choice" : mode === "guest" ? "guest" : "user");}catch{}setTab(mode === "president" || mode === "director" ? "admin" : "home");},[]);
  useUnifiedPreview(previewMode,notify);
  const pendingNotice = React.useRef<NoticeEvent | null>(null);
  const openNotice = React.useCallback(
    (notice: NoticeEvent) => {
      if (session.loading) {
        pendingNotice.current = notice;
        return;
      }
      setModal(null);
      if (notice.target === "admin") {
        setAdminPath(notice.kind === "meeting" ? "/admin/reunioes" : "/admin/emergencias"); setTab("admin");
        return;
      }
      if (notice.target === "support") {
        if (notice.kind === "support_nearby") setTab("support");
        else openSupport(notice.itemId);
        return;
      }
      if (notice.target === "communications") {
        setModal(session.active ? "communications" : "restricted");
        return;
      }
      setTab("news");
      const loaded = news.items.find((item) => item.id === notice.itemId);
      if (loaded) {
        setSelectedNews(loaded);
        return;
      }
      if (db)
        void import("firebase/firestore")
          .then(async ({ getDoc }) => {
            const snapshot = await getDoc(doc(db!, "news", notice.itemId));
            if (snapshot.exists() && snapshot.data().status === "published")
              setSelectedNews({ id: snapshot.id, ...snapshot.data() } as Row);
            else setToast("Esta publicação não está mais disponível.");
          })
          .catch(() =>
            setToast(
              "Não foi possível abrir a publicação. Verifique sua conexão.",
            ),
          );
    },
    [session.active, session.loading, news.items, openSupport],
  );
  useEffect(() => {
    if (!session.loading && pendingNotice.current) {
      const notice = pendingNotice.current;
      pendingNotice.current = null;
      openNotice(notice);
    }
  }, [session.loading, openNotice]);
  const notices = useNotices(session.user, session.active, openNotice);
  async function perform(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (e) {
      notify(friendly(e));
    }
  }
  const close = React.useCallback(() => {
    setModal(null);
    setSelectedNews(null);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () => {
      if (modal || selectedNews) close();
      else if (tab !== "home") setTab("home");
      else void NativeApp.minimizeApp();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [tab, modal, selectedNews, close]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);
  function save(id: string) {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    setSaved(next);
    localStorage.setItem("aumm.saved", JSON.stringify(next));
  }
  function memberFeature(name: string) {
    setModal(session.active || (name === "card" && session.admin) ? name : "restricted");
  }
  const firstName = (session.member?.fullName || session.admin?.fullName)?.split(" ")[0] || "motoboy";
  const nav: { id: Tab; title: string; icon: LucideIcon }[] = [
    { id: "home", title: "Início", icon: House },
    { id: "support", title: "Apoio", icon: HandHeart },
    { id: "news", title: "Notícias", icon: Newspaper },
    { id: "benefits", title: "Benefícios", icon: Gift },
    { id: "utilities", title: "Utilidades", icon: Wrench },
    { id: "account", title: "Meu perfil", icon: UserRound },
    ...(session.admin ? [{id:"admin" as Tab,title:"Admin",icon:ShieldCheck}] : []),
  ];
  const shortcuts: {
    title: string;
    detail: string;
    icon: LucideIcon;
    color: string;
    action: () => void;
  }[] = [
    {
      title: "Pedir ajuda",
      detail: "Conte com a rede",
      icon: HandHeart,
      color: "orange",
      action: () => {
        setTab("support");
        setModal("request");
      },
    },
    {
      title: "Carteirinha",
      detail: "Sempre com você",
      icon: Wallet,
      color: "blue",
      action: () => memberFeature("card"),
    },
    {
      title: "Utilidades",
      detail: "Facilite sua rotina",
      icon: Wrench,
      color: "green",
      action: () => setTab("utilities"),
    },
  ];
  function feedContent(feed: ReturnType<typeof useFeed>, empty: string) {
    if (!configured)
      return (
        <Empty title="Conteúdo conectado ao site">
          Configure o Firebase para acompanhar as publicações reais da AUMM.
        </Empty>
      );
    if (feed.loading) return <p className="loading">Carregando publicações…</p>;
    if (feed.error)
      return <Empty title="Não foi possível carregar">{feed.error}</Empty>;
    if (!feed.items.length)
      return (
        <Empty title={empty}>
          As publicações da associação aparecerão aqui.
        </Empty>
      );
    return feed.items.map((item) => (
      <article className="content-card" key={item.id}>
        <span className="tag">{item.category || item.partner || "AUMM"}</span>
        <h3>{item.title || item.name}</h3>
        <p>{item.summary || item.description || item.content}</p>
        {(item.date || item.eventDate) && (
          <small>
            <Clock3 size={14} /> {formatDate(item.date || item.eventDate)}{" "}
            {item.location && `· ${item.location}`}
          </small>
        )}
        {documentLink(item) && (
          <Button
            secondary
            onClick={() => void perform(() => openUrl(documentLink(item)))}
          >
            Abrir documento ou serviço <ExternalLink size={16} />
          </Button>
        )}
      </article>
    ));
  }
  function newsCard(item: Row, featured = false) {
    return (
      <article
        className={`news-card ${featured ? "featured-news" : ""}`}
        key={item.id}
      >
        <button className="news-open" onClick={() => setSelectedNews(item)}>
          {item.imageUrl?.startsWith("https://") ? (
            <img src={item.imageUrl} alt="" loading="lazy" />
          ) : (
            <div className="news-placeholder">
              <Newspaper size={36} />
              <span>INFORMAÇÃO QUE MOVIMENTA</span>
            </div>
          )}
          <div className="news-copy">
            <span className="tag">{item.category || "Notícias AUMM"}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <small>
              {item.publishedAt?.toDate().toLocaleDateString("pt-BR") || "AUMM"}
              <span>
                Leia a notícia <ArrowUpRight size={14} />
              </span>
            </small>
          </div>
        </button>
        <button
          className={`save ${saved.includes(item.id) ? "is-saved" : ""}`}
          aria-label={
            saved.includes(item.id) ? "Remover dos salvos" : "Salvar notícia"
          }
          onClick={() => save(item.id)}
        >
          <Bookmark size={18} />
        </button>
      </article>
    );
  }
  return (
    <div className="app-layout" onClickCapture={event=>{if(import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true" && new URLSearchParams(location.search).get("demo") === "1"){const anchor=(event.target as Element).closest("a");if(anchor && /^(https?:|tel:|mailto:|geo:)/i.test(anchor.getAttribute("href")||"")){event.preventDefault();event.stopPropagation();notify("Demonstração: nenhum contato externo ou ligação será aberto.");}}}}>
      {!isPreview && (session.loading || ((!session.user || session.user.isAnonymous) && entryChoice !== "guest")) && !modal && <div className="entry-overlay"><div className="entry-brand"><img src="./logo.png" alt="AUMM"/><span>ASSOCIAÇÃO UNIÃO MAIOR MOTOBOYS</span></div>{session.loading?<p role="status">Recuperando seu acesso…</p>:<><span className="eyebrow">Sua união. Seu caminho.</span><h1>Bem-vindo à AUMM</h1><p>Uma conta para seus benefícios, sua carteirinha e, quando autorizado, as ferramentas da diretoria.</p><button className="btn" onClick={()=>setModal("login")}>Entrar na minha conta</button><button className="btn secondary" onClick={()=>setModal("register")}>Quero me associar</button><button className="text-btn" onClick={()=>chooseEntry("guest")}>Entrar como convidado</button><small>Notícias, utilidades e apoio público. Recursos de associados e da diretoria exigem acesso autorizado.</small></>}<button className="theme-switch" onClick={toggleTheme}>{theme === "dark" ? <Sun/> : <Moon/>} Usar modo {theme === "dark" ? "claro" : "escuro"}</button></div>}
      <aside className="desktop-rail">
        <img src="./logo.png" alt="AUMM" />
        <p>
          Juntos, a gente
          <br />
          vai mais longe.
        </p>
        <nav>
          {nav.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              className={
                tab === id || (tab === "request" && id === "support")
                  ? "active"
                  : ""
              }
              onClick={() => {if(id === "admin") setAdminPath("/admin"); setTab(id);}}
            >
              <Icon size={20} />
              {title}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <ShieldCheck />
          <span>
            Uma rede feita
            <br />
            <strong>por quem está na rua.</strong>
          </span>
        </div>
      </aside>
      <div
        className={`app-shell ${tab === "home" ? "home-view" : ""} ${activeRequests.length && tab !== "request" ? "has-support-dock" : ""}`}
      >
        <header className="topbar">
          <button
            className="brand"
            onClick={() => setTab("home")}
            aria-label="AUMM início"
          >
            <img src="./logo.png" alt="AUMM" />
            <span>
              UNIÃO MAIOR
              <br />
              <strong>MOTOBOYS</strong>
            </span>
          </button>
          <div className="top-actions">
            <button className="icon-btn theme-switch" aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} onClick={toggleTheme}>{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
            <button
              className="top-login"
              onClick={() => {
                if (session.user && !session.user.isAnonymous)
                  setTab("account");
                else setModal("login");
              }}
            >
              {session.user && !session.user.isAnonymous ? (
                <>
                  <UserRound size={16} /><span className="account-name">Logado como:<strong title={session.member?.fullName || session.admin?.fullName || session.user?.displayName || "Usuário"}>{session.member?.fullName || session.admin?.fullName || session.user?.displayName || "Usuário"}</strong></span>
                </>
              ) : (
                <>
                  <LogIn size={16} /> Fazer login
                </>
              )}
            </button>
            <span className="city-chip">
              <MapPin size={13} /> Blumenau, SC
            </span>
            <button
              className="icon-btn notification"
              aria-label={
                notices.unread
                  ? `Notificações, ${notices.unread} não lidas`
                  : "Notificações"
              }
              onClick={() => {
                notices.setBanner(null);
                setModal("notifications");
              }}
            >
              <Bell size={21} />
              {notices.unread > 0 && (
                <span className="notice-count">
                  {notices.unread > 9 ? "9+" : notices.unread}
                </span>
              )}
            </button>
            <button
              className="avatar"
              aria-label="Meu perfil"
              onClick={() => setTab("account")}
            >
              {session.active || session.admin ? (
                memberPhoto ? <img src={memberPhoto} alt="Sua foto" /> : firstName.slice(0, 1).toUpperCase()
              ) : (
                <UserRound size={19} />
              )}
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline">
            <Info size={16} /> Você está sem conexão. Calculadora e checklist
            continuam disponíveis.
          </div>
        )}
        <main>
          {tab === "home" && (
            <>
              <div className="greeting">
                <div>
                  <span className="eyebrow">SUA PARCERIA DE TODOS OS DIAS</span>
                  <h1>
                    Salve, {firstName} <span className="wave">✌</span>
                  </h1>
                  <p>Na correria ou na pausa, estamos com você.</p>
                </div>
                <span className="member-pill">
                  <i />
                  {isPreviewHelper
                    ? "Associado · demo"
                    : session.active
                      ? "Associado"
                      : "Convidado"}
                </span>
              </div>
              {supportActivity.own &&
                isActiveSupport(supportActivity.own.status) && (
                  <OngoingSupportCard
                    request={supportActivity.own}
                    onOpen={() => openSupport(supportActivity.own!.id)}
                  />
                )}
              {supportActivity.helping.map((request) => (
                <OngoingSupportCard
                  key={request.id}
                  request={request}
                  isHelper
                  onOpen={() => openSupport(request.id)}
                />
              ))}
              {(session.active || isPreview) && <EmergencyHome uid={session.user?.uid || "preview-emergency"} onOpen={() => setModal("emergency")} />}
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <span /> CENTRO DE APOIO AO MOTOBOY
                  </span>
                  <h2>
                    Na rua, você
                    <br />
                    nunca está sozinho<span>.</span>
                  </h2>
                  <p>
                    Um imprevisto no caminho?
                    <br />A nossa união faz a diferença.
                  </p>
                  <button onClick={() => setTab("support")}>
                    Encontrar apoio <ArrowUpRight size={19} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="map-route" />
                  <MapPin className="pin pin-one" />
                  <MapPin className="pin pin-two" />
                  <div className="bike-mark">
                    <svg
                      viewBox="0 0 128 100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="27" cy="70" r="17" />
                      <circle cx="101" cy="70" r="17" />
                      <path d="M27 70l17-31 20 31H27zm37 0h14l14-28 9 28M43 39h23l12 14H54M85 26h9l7 22M89 27l-9 12M41 39l-9-9H19M22 47h16M65 39c7-10 17-11 22-6l4 9H69" />
                    </svg>
                  </div>
                  <div className="floating-label">
                    <ShieldCheck size={16} />
                    <span>
                      QUEM RODA JUNTO
                      <br />
                      <strong>CHEGA MAIS LONGE</strong>
                    </span>
                  </div>
                </div>
              </section>
              <Section title="O que você precisa hoje?">
                <div className="shortcut-grid">
                  {shortcuts.map((s) => (
                    <button
                      key={s.title}
                      className="shortcut"
                      onClick={s.action}
                    >
                      <span className={`tile-icon ${s.color}`}>
                        <s.icon size={24} />
                      </span>
                      <strong>{s.title}</strong>
                      <small>{s.detail}</small>
                    </button>
                  ))}
                </div>
              </Section>
              {session.member?.status !== "active" && (
                <button
                  className="join-banner"
                  onClick={() => setModal("login")}
                >
                  <span className="join-icon">
                    <Users size={23} />
                  </span>
                  <span>
                    <strong>Sua união vale muito mais.</strong>
                    <small>
                      Entre como associado e aproveite todos os benefícios.
                    </small>
                  </span>
                  <ChevronRight size={20} />
                </button>
              )}
              <Section
                title="Acontece na AUMM"
                aside={
                  <button className="text-btn" onClick={() => setTab("news")}>
                    Ver todas as notícias <ArrowRight size={16} />
                  </button>
                }
              >
                <div className="home-news">
                  {news.items.length
                    ? news.items.slice(0, 2).map((n) => newsCard(n, true))
                    : feedContent(news, "A próxima notícia chega por aqui")}
                </div>
              </Section>
              {session.active && <Section title="Próximos Eventos da AUMM" aside={<button className="text-btn" onClick={() => setModal("events")}>Ver Todos os Eventos</button>}>{events.loading ? <p>Carregando eventos…</p> : events.error ? <p role="alert">{events.error}</p> : upcomingEvents(events.items).length ? <div className="home-events">{upcomingEvents(events.items).slice(0,2).map(item => <EventCard key={item.id} item={item} onOpen={() => openEvent(item)}/>)}</div> : <p>Nenhum próximo evento cadastrado. Acompanhe as novidades por aqui.</p>}</Section>}
            </>
          )}
          {tab === "benefits" && <><PageHeading eyebrow="VANTAGENS DE FAZER PARTE" title="Benefícios AUMM" text="Parcerias para facilitar sua jornada."/>{session.active ? <React.Suspense fallback={<p>Carregando benefícios…</p>}><MemberFeatures feature="benefits" onPhoto={()=>{}}/></React.Suspense> : <section className="guest-benefits"><Gift size={38}/><h2>Mais vantagens para associados</h2><p>Entre com seu vínculo ativo para consultar as condições e os parceiros exclusivos.</p><button className="btn" onClick={()=>setModal("login")}>Entrar na minha conta</button><button className="btn secondary" onClick={()=>setModal("register")}>Quero me associar</button></section>}</>}
          {tab === "admin" && (session.admin ? <React.Suspense fallback={<p>Carregando ferramentas…</p>}><AdminWorkspace profile={session.admin} startPath={adminPath} onExit={()=>setTab("account")}/></React.Suspense> : <p>O acesso administrativo não está disponível nesta conta.</p>)}
          {tab === "support" && (
            <>
              <PageHeading
                eyebrow="UM AJUDA O OUTRO"
                title="Centro de Apoio"
                text="Uma rede de solidariedade, bem no seu caminho."
              />
              <Support
                activity={supportActivity}
                onOpen={openSupport}
                user={session.user}
                active={session.active || isPreviewHelper}
                request={() => setModal("request")}
                login={() => setModal("login")}
                notify={notify}
              />
              <SupportContacts onOpen={openUrl}/>
              <Section title="Apoio para a sua jornada">
                <div className="service-grid">
                  {[
                    {
                      icon: Fuel,
                      title: "Postos de combustível",
                      query: "postos de gasolina perto de mim",
                    },
                    {
                      icon: Wrench,
                      title: "Oficinas e borracharias",
                      query: "oficina moto borracharia perto de mim",
                    },
                    {
                      icon: Coffee,
                      title: "Uma pausa no caminho",
                      query: "ponto de apoio motoboy Blumenau",
                    },
                    {
                      icon: Droplets,
                      title: "Água e hidratação",
                      query: "bebedouro público Blumenau",
                    },
                  ].map((s) => (
                    <button
                      className="service"
                      key={s.title}
                      onClick={() =>
                        void perform(() =>
                          openUrl(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.query)}`,
                          ),
                        )
                      }
                    >
                      <s.icon />
                      <span>
                        {s.title}
                        <small>Buscar no Google Maps</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                </div>
              </Section>
              <div className="info-box">
                <Info size={20} />
                <p>
                  O espaço físico do Centro de Apoio está em desenvolvimento. As
                  buscas no mapa não representam pontos credenciados pela AUMM.
                </p>
              </div>
            </>
          )}
          {tab === "request" && (
            <SupportDetail
              id={selectedSupportId}
              uid={session.user?.uid || ""}
              onBack={() => setTab("support")}
              notify={notify}
            />
          )}
          {tab === "news" && (
            <>
              <PageHeading
                eyebrow="INFORMAÇÃO QUE MOVIMENTA"
                title="Notícias e novidades"
                text="Fique por dentro do que importa para a categoria."
              />
              <label className="search-box">
                <Search size={19} />
                <input
                  placeholder="Buscar uma notícia…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="chips">
                {[
                  "Todas",
                  "Salvas",
                  ...Array.from(
                    new Set(news.items.map((x) => x.category).filter(Boolean)),
                  ),
                ].map((c) => (
                  <button
                    key={c}
                    className={newsFilter === c ? "selected" : ""}
                    onClick={() => setNewsFilter(c!)}
                  >
                    {c === "Salvas" && <Bookmark size={13} />} {c}
                  </button>
                ))}
              </div>
              {news.items.length > 0 ? (
                <div className="news-grid">
                  {news.items
                    .filter(
                      (n) =>
                        (newsFilter === "Todas" ||
                          (newsFilter === "Salvas" && saved.includes(n.id)) ||
                          newsFilter === n.category) &&
                        `${n.title} ${n.summary}`
                          .toLocaleLowerCase("pt-BR")
                          .includes(search.toLocaleLowerCase("pt-BR")),
                    )
                    .map((n) => newsCard(n))}
                </div>
              ) : (
                feedContent(news, "Nenhuma notícia publicada ainda")
              )}
              {news.items.length > 0 &&
                !news.items.some(
                  (n) =>
                    (newsFilter === "Todas" ||
                      (newsFilter === "Salvas" && saved.includes(n.id)) ||
                      newsFilter === n.category) &&
                    `${n.title} ${n.summary}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                ) && (
                  <Empty title="Nenhuma notícia encontrada">
                    Tente outra busca ou salve uma notícia para ler depois.
                  </Empty>
                )}
            </>
          )}
          {tab === "utilities" && (
            <>
              <PageHeading
                eyebrow="MAIS PRATICIDADE, MENOS CORRERIA"
                title="Seu kit de utilidades"
                text="Ferramentas que acompanham o seu dia na rua."
              />
              <button className="list-row" onClick={() => setModal("ledger")}><Wallet size={22}/><span>Ganhos, despesas e quilometragem<small>Controle suas jornadas e veja seu lucro líquido</small></span><ChevronRight/></button>
              <div
                className="utility-feature"
                onClick={() => setModal("calculator")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setModal("calculator")}
              >
                <span className="tile-icon green">
                  <Calculator size={29} />
                </span>
                <div>
                  <span className="eyebrow">SUAS CONTAS EM DIA</span>
                  <h2>Quanto rendeu a sua jornada?</h2>
                  <p>Calcule combustível, gastos e ganho líquido.</p>
                </div>
                <ArrowUpRight />
              </div>
              <Section title="Para facilitar o caminho">
                <div className="service-grid">
                  {[
                    {
                      icon: CheckCheck,
                      title: "Checklist da moto",
                      description: "Saia com tudo conferido",
                      action: () => setModal("checklist"),
                    },
                    {
                      icon: MapPin,
                      title: "Compartilhar localização ao vivo",
                      description: "Envie para alguém de confiança",
                      action: () => setModal("liveShare"),
                    },
                    {
                      icon: Clock3,
                      title: "Lembrete de manutenção",
                      description: "Organize os cuidados com a moto",
                      action: () => setModal("maintenance"),
                    },
                    {
                      icon: ShieldCheck,
                      title: "Contatos de emergência",
                      description: "Acesso rápido quando precisar",
                      action: () => setModal("emergency"),
                    },
                  ].map((s) => (
                    <button
                      className="service"
                      key={s.title}
                      onClick={s.action}
                    >
                      <s.icon />
                      <span>
                        {s.title}
                        <small>{s.description}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Sua associação, na palma da mão">
                <div className="menu-list">
                  {[
                    {
                      title: "Agenda e eventos",
                      icon: Clock3,
                      action: () => setModal("events"),
                    },
                    {
                      title: "Documentos e estatuto",
                      icon: FileText,
                      action: () => memberFeature("documents"),
                    },
                    {
                      title: "Assembleias e votações",
                      icon: Users,
                      action: () => memberFeature("assembly"),
                    },
                    {
                      title: "Transparência",
                      icon: ShieldCheck,
                      action: () => memberFeature("transparency"),
                    },
                    {
                      title: "Falar com a AUMM",
                      icon: CircleHelp,
                      action: () => setModal("contact"),
                    },
                  ].map((s) => (
                    <button key={s.title} onClick={s.action}>
                      <s.icon size={20} />
                      <span>{s.title}</span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}
          {tab === "account" && (
            <>
              <PageHeading
                eyebrow="SEU ESPAÇO NA AUMM"
                title="Meu perfil"
                text="A sua conexão com uma categoria mais forte."
              />
              <div className="profile-card">
                <div className="profile-avatar">
                  {memberPhoto ? <img src={memberPhoto} alt="Sua foto de perfil" /> : <UserRound size={35} />}
                </div>
                <h2>{session.member?.fullName || "Bem-vindo à rede"}</h2>
                <span className="member-pill">
                  <i />
                  {session.admin ? `${session.admin.role} · Administração` : session.active
                    ? `Associado · ${session.member?.memberNumber || "AUMM"}`
                    : "Acesso de convidado"}
                </span>
                <p>
                  {session.admin ? "Seu cargo está ativo. Acesse as ferramentas administrativas na mesma conta." : session.active
                    ? "Seu vínculo está ativo. Conte com a AUMM no seu dia a dia."
                    : "Use as utilidades, acompanhe notícias e peça apoio. Faça parte da associação para ter acesso completo."}
                </p>
                {session.loading ? (
                  <p>Verificando seu vínculo…</p>
                ) : (
                  !session.active && !session.admin && (
                    <Button onClick={() => setModal("login")}>
                      <LogIn size={18} /> Entrar como associado
                    </Button>
                  )
                )}
                {session.error && <p role="alert">{session.error}</p>}
                {session.member?.mustChangePassword && (
                  <Button onClick={() => setModal("password")}>
                    Definir nova senha de acesso
                  </Button>
                )}
                {session.member && session.member.status !== "active" && (
                  <p>
                    Seu vínculo precisa de revisão. Entre em contato com a AUMM.
                  </p>
                )}
              </div>
              <Section title="Minha associação">
                {(session.active || session.admin) && <button className="list-row" onClick={() => setModal("memberSettings")}><Settings2 size={20}/><span>Configurações, foto e vínculo</span><ChevronRight size={17}/></button>}
                {session.active && <button className="list-row danger-text" onClick={() => setModal("emergencyContact")}><HandHeart size={20} /><span>Contato de Emergência<small>Cadastre e atualize os números para a diretoria ligar</small></span><ChevronRight size={17} /></button>}
                <button className="list-row" onClick={() => setModal("liveShare")}><MapPin size={20} /><span>Compartilhar localização ao vivo<small>Envie um link para uma pessoa de confiança</small></span><ChevronRight size={17} /></button>
                {session.admin && <button className="list-row" onClick={()=>{setAdminPath("/admin");setTab("admin");}}><ShieldCheck size={20}/><span>Ferramentas administrativas<small>{session.admin.role} · nível {session.admin.level}</small></span><ChevronRight size={17}/></button>}
                <div className="menu-list">
                  {[
                    { title: "Minha carteirinha", icon: Wallet, key: "card" },
                    { title: "Meus benefícios", icon: Gift, key: "benefits" },
                    { title: "Comunicados", icon: Bell, key: "communications" },
                    {
                      title: "Alterar minha senha",
                      icon: Settings2,
                      key: "password",
                    },
                  ].map((s) => (
                    <button key={s.key} onClick={() => memberFeature(s.key)}>
                      <s.icon size={20} />
                      <span>{s.title}</span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  {session.member?.status !== "active" && <button
                    onClick={() => setModal("register")}
                  >
                    <Plus size={20} />
                    <span>Quero me associar</span>
                    <ExternalLink size={16} />
                  </button>}
                </div>
              </Section>
              <div className="menu-list">
                <button onClick={() => setModal("privacy")}>
                  <ShieldCheck size={20} />
                  <span>Privacidade e localização</span>
                  <ChevronRight size={17} />
                </button>
                <button onClick={() => setModal("contact")}>
                  <CircleHelp size={20} />
                  <span>Ajuda e atendimento</span>
                  <ChevronRight size={17} />
                </button>
                {session.user && (
                  <button
                    className="danger-text"
                    onClick={() => setModal("logout")}
                  >
                    <LogOut size={20} />
                    <span>Sair da minha conta</span>
                    <ChevronRight size={17} />
                  </button>
                )}
              </div>
              <p className="version">
                AUMM · Feito para quem movimenta a cidade
                <br />
                Versão 1.0.0
              </p>
            </>
          )}
        </main>
        <LiveShareIndicator open={() => setModal("liveShare")} />
        <footer className="app-footer">
          <ShieldCheck size={14} /> Associação União Maior Motoboys
          <span>Juntos, vamos mais longe.</span>
        </footer>
        {tab !== "request" && (
          <SupportDock requests={activeRequests} onOpen={openSupport} />
        )}
        <nav className="bottom-nav" aria-label="Navegação principal">
          {nav.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              className={
                tab === id || (tab === "request" && id === "support")
                  ? "active"
                  : ""
              }
              aria-current={
                tab === id || (tab === "request" && id === "support")
                  ? "page"
                  : undefined
              }
              onClick={() => setTab(id)}
            >
              <Icon size={22} />
              <span>{title}</span>
            </button>
          ))}
        </nav>
      </div>
      {notices.banner && modal !== "notifications" && (
        <NoticeBanner
          notice={notices.banner}
          open={() => notices.open(notices.banner!)}
          dismiss={() => notices.setBanner(null)}
        />
      )}
      {toast && (
        <div
          className={`toast ${activeRequests.length && tab !== "request" ? "above-support-dock" : ""}`}
          role="status"
        >
          <Info size={18} />
          <span>{toast}</span>
          <button aria-label="Dispensar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {selectedNews && (
        <Modal title="Notícias AUMM" onClose={close}>
          <article className="article">
            <span className="tag">{selectedNews.category || "AUMM"}</span>
            <h1>{selectedNews.title}</h1>
            {selectedNews.imageUrl?.startsWith("https://") && (
              <img src={selectedNews.imageUrl} alt="" />
            )}
            <p className="article-lead">{selectedNews.summary}</p>
            <div>
              {selectedNews.content ||
                "A publicação completa está no site da associação."}
            </div>
            <Button secondary onClick={() => save(selectedNews.id)}>
              <Bookmark size={17} />
              {saved.includes(selectedNews.id)
                ? "Remover dos salvos"
                : "Salvar notícia"}
            </Button>
          </article>
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            (
              {
                login: "Entre para a união",
                request: "Pedir apoio na cidade",
                restricted: "Vamos mais longe juntos",
                calculator: "Calculadora da jornada",
                checklist: "Antes de sair",
                maintenance: "Cuidados com a moto",
                emergency: "Emergência e apoio após acidente",
                adminPreview: "Painel administrativo · demonstração",
                card: "Minha carteirinha",
                benefits: "Seus benefícios",
                documents: "Documentos da associação",
                events: "Agenda AUMM",
                register:"Faça parte da AUMM", recovery:"Recuperar meu acesso", statute: "Estatuto Social", eventDetails: "Detalhes do evento", emergencyContact: "Contato de Emergência", memberSettings: "Configurações do associado", ledger: "Minhas jornadas",
                communications: "Comunicados",
                privacy: "Sua privacidade",
                contact: "Fale com a AUMM",
                assembly: "Assembleias",
                transparency: "Transparência",
                password: "Nova senha",
                logout: "Sair da conta",
                notifications: "Suas notificações",
                liveShare: "Compartilhar localização ao vivo",
              } as Record<string, string>
            )[modal] || "AUMM"
          }
          onClose={close}
        >
          {modal === "notifications" && (
            <NotificationCenter
              center={notices}
              active={session.active}
              notify={notify}
            />
          )}
          {isPreview && modal === "adminPreview" && <AdminEmergencyPreview />}
          {modal === "liveShare" && <LiveShare notify={notify} />}
          {modal === "register" && <React.Suspense fallback={<p>Carregando cadastro…</p>}><RegistrationWizard onExit={close}/></React.Suspense>}
          {modal === "recovery" && <React.Suspense fallback={<p>Carregando recuperação…</p>}><AccountRecovery onExit={()=>setModal("login")}/></React.Suspense>}
          {modal === "login" && (
            <Login onRegister={()=>setModal("register")} onRecovery={()=>setModal("recovery")}
              onDone={() => {
                chooseEntry("user"); close();
                notify(
                  "Login realizado. Verificando seu vínculo de associado…",
                );
              }}
              notify={notify}
            />
          )}
          {modal === "request" && (
            <RequestForm
              onDone={(id) => {
                close();
                openSupport(id);
                notify("Pedido enviado. Acompanhe o atendimento nesta tela.");
              }}
              notify={notify}
            />
          )}
          {modal === "restricted" && (
            <>
              <Empty icon={Users} title="Um espaço para associados">
                Convidados têm acesso às notícias, utilidades e pedidos de
                apoio. Carteirinha, benefícios e documentos são exclusivos para
                associados ativos.
              </Empty>
              <Button onClick={() => setModal("login")}>
                Entrar como associado <ArrowRight size={17} />
              </Button>
              <Button
                secondary
                onClick={() => setModal("register")}
              >
                Quero me associar <ExternalLink size={16} />
              </Button>
            </>
          )}
          {modal === "emergencyContact" && (session.active || isPreview) && <EmergencyContactForm uid={session.user?.uid || "preview-emergency"}/>}
          {modal === "memberSettings" && (session.active || session.admin) && <React.Suspense fallback={<p>Carregando configurações…</p>}><MemberFeatures feature={session.admin && !session.active ? "adminSettings" : "settings"} onPhoto={() => setModal("memberSettings")}/></React.Suspense>}
          {modal === "eventDetails" && selectedEvent && <EventDetails item={selectedEvent}/>}
          {modal === "ledger" && <RideLedger key={session.user?.uid || "guest"} uid={session.user?.uid || "guest"}/>}
          {modal === "calculator" && <CalculatorPanel />}
          {modal === "checklist" && <Checklist />}
          {modal === "maintenance" && <Maintenance notify={notify} />}
          {modal === "emergency" && (
            <>
              {(session.active || isPreview) ? <EmergencyCenter uid={session.user?.uid || "preview-emergency"} onConfigure={() => { setTab("account"); setModal("emergencyContact"); }} onCancel={close} /> : <p>Entre com sua conta de associado ativo para cadastrar um contato e avisar a associação em caso de acidente.</p>}
              <p className="muted">
                Em caso de risco imediato, ligue para o serviço de emergência. A
                rede de apoio é voluntária.
              </p>
              {[
                { name: "SAMU", number: "192", text: "Urgência médica" },
                {
                  name: "Polícia Militar",
                  number: "190",
                  text: "Segurança e risco imediato",
                },
                {
                  name: "Bombeiros",
                  number: "193",
                  text: "Resgate e incêndio",
                },
              ].map((x) => (
                <a
                  className="emergency-link"
                  key={x.number}
                  href={`tel:${x.number}`}
                >
                  <span>
                    <strong>{x.name}</strong>
                    <small>{x.text}</small>
                  </span>
                  <b>{x.number}</b>
                  <ArrowUpRight size={18} />
                </a>
              ))}
            </>
          )}
          {modal === "card" && (session.active || session.admin) && (
            <React.Suspense fallback={<p>Carregando carteirinha…</p>}><MemberFeatures feature="card" onPhoto={() => setModal("memberSettings")}/></React.Suspense>
          )}
          {modal === "benefits" &&
            session.active &&
            <React.Suspense fallback={<p>Carregando benefícios…</p>}><MemberFeatures feature="benefits" onPhoto={() => {}}/></React.Suspense>}
          {modal === "documents" && session.active && (
            <>
              <React.Suspense fallback={<p>Carregando documentos…</p>}><MemberFeatures feature="documents" onPhoto={() => {}}/></React.Suspense>
              <Button
                secondary
                onClick={() => setModal("statute")}
              >
                Ler Estatuto Social <ExternalLink size={16} />
              </Button>
            </>
          )}
          {modal === "events" &&
            <MobileEvents items={events.items} loading={events.loading} error={events.error} onOpen={openEvent}/>}
          {modal === "communications" &&
            session.active &&
            feedContent(communications, "Nenhum comunicado no momento")}
          {modal === "transparency" &&
            session.active &&
            <React.Suspense fallback={<p>Carregando transparência…</p>}><MemberFeatures feature="transparency" onPhoto={() => {}}/></React.Suspense>}
          {modal === "assembly" && session.active && <React.Suspense fallback={<p>Carregando assembleias…</p>}><MemberFeatures feature="assembly" onPhoto={() => {}}/></React.Suspense>}
          {modal === "statute" && <React.Suspense fallback={<p>Carregando estatuto…</p>}><MemberFeatures feature="statute" onPhoto={() => {}}/></React.Suspense>}
          {modal === "privacy" && (
            <div className="privacy">
              <ShieldCheck size={35} />
              <h3>Você decide quando compartilhar.</h3>
              <p>
                A localização é obtida somente ao solicitar apoio ou tocar em
                compartilhar. Quem ajuda também pode ativar o compartilhamento
                do trajeto durante o atendimento. O aplicativo não rastreia sua
                posição em segundo plano.
              </p>
              <p>
                No pedido de apoio, somente você e o associado que aceitar
                ajudar podem consultar as coordenadas. Elas são apagadas ao
                concluir ou cancelar o pedido e deixam de ser acessíveis após 24
                horas.
              </p>
              <p>
                Checklist, manutenção e notícias salvas ficam neste aparelho. A
                saída da conta remove os dados locais de manutenção e os itens
                salvos.
              </p>
              <p>
                O mapa utiliza OpenFreeMap com dados do OpenStreetMap. Para
                carregar o mapa, o provedor recebe os pedidos de imagens e dados
                da área visualizada. A posição do ajudante é compartilhada
                somente com o solicitante e removida ao parar ou encerrar o
                atendimento.
              </p>
              <Button
                secondary
                onClick={() => void perform(() => site("/privacidade"))}
              >
                Política de privacidade <ExternalLink size={16} />
              </Button>
              <Button secondary onClick={() => setModal("contact")}>
                Solicitar exclusão de conta e dados
              </Button>
            </div>
          )}
          {modal === "contact" && (
            <>
              <Empty icon={HandHeart} title="A gente se escuta por aqui">
                Para atendimento, orientações, recuperação de acesso ou exclusão
                de conta e dados, fale com a associação pelos canais oficiais.
              </Empty>
              {typeof settings.whatsapp === "string" &&
                settings.whatsapp.replace(/\D/g, "").length >= 10 && (
                  <Button
                    onClick={() =>
                      void perform(() =>
                        openUrl(
                          `https://wa.me/${String(settings.whatsapp)
                            .replace(/\D/g, "")
                            .replace(/^(?!55)/, "55")}`,
                        ),
                      )
                    }
                  >
                    Falar pelo WhatsApp <ArrowUpRight size={17} />
                  </Button>
                )}
              <Button
                secondary
                onClick={() => void perform(() => site("/contato"))}
              >
                Abrir canais de atendimento <ExternalLink size={16} />
              </Button>
            </>
          )}
          {modal === "password" &&
            session.user &&
            !session.user.isAnonymous && (
              <Password member={session.member} notify={notify} close={close} />
            )}
          {modal === "logout" && (
            <>
              <p>
                Se você entrou como convidado e tem um pedido aberto, cancele ou
                conclua o pedido antes de sair para manter seu acesso a ele.
              </p>
              <Button
                onClick={() =>
                  void perform(async () => {
                    if (db && session.user?.isAnonymous) {
                      const { getDoc } = await import("firebase/firestore");
                      const own = await getDoc(
                        doc(db, "supportRequests", session.user.uid),
                      );
                      if (own.exists() && isActiveSupport(own.data().status))
                        throw new Error(
                          "Conclua ou cancele seu pedido na aba Apoio antes de sair.",
                        );
                    }
                    await stopBackgroundShareBeforeAuthChange();
                    await detachPushDevice();
                    await signOut(services().auth); chooseEntry("choice");
                    [
                      "aumm.saved",
                      "aumm.maintenance",
                      "aumm.checklist",
                    ].forEach((k) => localStorage.removeItem(k));
                    setSaved([]);
                    close();
                    setTab("home");
                  })
                }
              >
                Sair da conta
              </Button>
              <Button secondary onClick={close}>
                Continuar conectado
              </Button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Login({
  onDone,
  notify, onRegister, onRecovery,
}: {
  onRegister:()=>void; onRecovery:()=>void;
  onDone: () => void;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const { auth, db } = services();
      if (auth.currentUser?.isAnonymous) {
        const { getDoc } = await import("firebase/firestore");
        const own = await getDoc(
          doc(db, "supportRequests", auth.currentUser.uid),
        );
        if (own.exists() && isActiveSupport(own.data().status))
          throw new Error(
            "Conclua ou cancele seu pedido na aba Apoio antes de entrar como associado.",
          );
      }
      await stopBackgroundShareBeforeAuthChange();
      await detachPushDevice();
      await setPersistence(auth,browserLocalPersistence);
      await signInWithEmailAndPassword(
        auth,
        String(data.get("email")).trim(),
        String(data.get("password")),
      );
      onDone();
    } catch (err) {
      notify(friendly(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <div className="login-mark">
        <ShieldCheck />
        <p>Sua conta é a mesma do site AUMM.</p>
      </div>
      <label>
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="seu@email.com"
        />
      </label>
      <label>
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Sua senha"
        />
      </label>
      <button className="btn" disabled={busy || !configured}>
        {busy ? "Entrando…" : "Entrar na minha conta"}
        <ArrowRight size={17} />
      </button>
      {!configured && (
        <p className="form-note">
          Login disponível após configurar o Firebase.
        </p>
      )}
      <button
        type="button"
        className="text-btn"
        onClick={onRecovery}
      >
        Preciso recuperar meu acesso
      </button>
      <p className="form-note">
        Ainda não é associado?{" "}
        <button
          type="button"
          className="text-btn"
          onClick={onRegister}
        >
          Faça parte da AUMM
        </button>
      </p>
    </form>
  );
}
function RequestForm({
  onDone,
  notify,
}: {
  onDone: (id: string) => void;
  notify: (s: string) => void;
}) {
  const [category, setCategory] = useState("gasolina");
  const [position, setPosition] = useState<PrivateLocation | null>(
    isPreview ? previewPosition : null,
  );
  const [busy, setBusy] = useState(false);
  const [gps, setGps] = useState(false);
  async function getPosition() {
    setGps(true);
    try {
      setPosition({ ...(await locate()), details: "" });
    } catch (e) {
      notify(friendly(e));
    } finally {
      setGps(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!position) return;
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      let id = "preview-request";
      if (isPreview)
        createPreviewRequest(
          category,
          String(data.get("city")),
          String(data.get("region")),
          String(data.get("plate")),
        );
      else
        id = await createRequest(
          category,
          String(data.get("city")),
          String(data.get("region")),
          { ...position, details: String(data.get("details")).trim() },
          String(data.get("plate")),
        );
      onDone(id);
    } catch (err) {
      notify(friendly(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="muted">
        O que aconteceu? Avise a rede e acompanhe por aqui.
      </p>
      <div className="category-options">
        {categories.map((c) => {
          const Icon = categoryIcon[c.id];
          return (
            <button
              type="button"
              key={c.id}
              className={category === c.id ? "selected" : ""}
              onClick={() => setCategory(c.id)}
            >
              <Icon size={22} />
              <span>{c.label}</span>
              {category === c.id && <Check size={15} />}
            </button>
          );
        })}
      </div>
      <label>
        Placa da moto
        <input
          name="plate"
          required
          maxLength={8}
          minLength={7}
          pattern="[A-Za-z]{3}-?[0-9][A-Za-z0-9][0-9]{2}"
          placeholder="ABC1D23 ou ABC-1234"
          autoCapitalize="characters"
          autoComplete="off"
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value.toUpperCase();
          }}
        />
        <small className="form-note">
          A placa só aparece no atendimento privado após a confirmação.
        </small>
      </label>
      <div className="form-grid">
        <label>
          Cidade
          <input
            required
            name="city"
            defaultValue="Blumenau"
            minLength={2}
            maxLength={60}
          />
        </label>
        <label>
          Bairro / região
          <input
            required
            name="region"
            placeholder="Ex.: Centro"
            minLength={2}
            maxLength={60}
          />
        </label>
      </div>
      <label>
        Detalhes para quem vier ajudar
        <textarea
          name="details"
          maxLength={400}
          rows={3}
          placeholder="Ex.: Estou próximo à entrada do posto, moto preta."
        />
      </label>
      <div className="location-consent">
        <MapPin size={22} />
        <div>
          <strong>
            {isPreview
              ? "Localização de demonstração"
              : position
                ? "Localização obtida"
                : "Envie sua localização"}
          </strong>
          <p>
            {isPreview
              ? "Ponto fictício no Centro de Blumenau. Nenhum pedido será enviado à rede real."
              : position
                ? `Precisão aproximada: ${Math.round(position.accuracy)} m. Confira se você está no local do pedido.`
                : "As coordenadas e os detalhes serão liberados apenas para o associado que aceitar ajudar."}
          </p>
          <button
            type="button"
            className="text-btn"
            disabled={gps || busy}
            onClick={() => {
              if (isPreview) setPosition(previewPosition);
              else void getPosition();
            }}
          >
            {gps
              ? "Obtendo localização…"
              : position
                ? isPreview
                  ? "Usar ponto de demonstração"
                  : "Atualizar localização"
                : "Usar minha localização atual"}
            <Navigation size={14} />
          </button>
        </div>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" required />
        {isPreview
          ? "Entendi que este pedido é apenas uma demonstração."
          : "Autorizo compartilhar minha localização com o associado que aceitar o pedido."}
      </label>
      {position && (
        <React.Suspense
          fallback={<div className="map-loading">Carregando mapa…</div>}
        >
          <SupportMap destination={position} />
        </React.Suspense>
      )}
      <button
        className="btn"
        disabled={busy || gps || !position || (!isPreview && !configured)}
      >
        {busy ? "Enviando pedido…" : "Enviar pedido de apoio"}
        <ArrowUpRight size={17} />
      </button>
      <p className="form-note">
        Apoio voluntário, sujeito à disponibilidade. Em emergência médica, ligue
        192.
      </p>
    </form>
  );
}

function Support({
  activity,
  onOpen,
  user,
  active,
  request,
  login,
  notify,
}: {
  activity: ReturnType<typeof useSupportActivity>;
  onOpen: (id: string) => void;
  user: ReturnType<typeof useSession>["user"];
  active: boolean;
  request: () => void;
  login: () => void;
  notify: (s: string) => void;
}) {
  const { own, error: activityError } = activity;
  const [open, setOpen] = useState<HelpRequest[]>([]);
  const [city, setCity] = useState("Blumenau");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    setOpen([]);
    if (isPreview) {
      const refresh = () => {
        const r = readPreviewRequest();
        setOpen(isPreviewHelper && r?.status === "open" ? [r] : []);
      };
      refresh();
      window.addEventListener("aumm:preview-support", refresh);
      return () => window.removeEventListener("aumm:preview-support", refresh);
    }
    if (!active || !user || !db) return;
    const a = onSnapshot(
      query(
        collection(db, "supportRequests"),
        where("status", "==", "open"),
        where("city", "==", city),
      ),
      (s) =>
        setOpen(s.docs.map((d) => ({ id: d.id, ...d.data() }) as HelpRequest)),
      (e) => setError(friendly(e)),
    );
    return () => a();
  }, [user, active, city]);
  async function accept(id: string) {
    setBusy(id);
    try {
      if (isPreviewHelper) updatePreviewRequest("awaiting_confirmation");
      else await acceptRequest(id);
      onOpen(id);
      notify("Você aceitou ajudar. Aguarde a confirmação do solicitante.");
    } catch (e) {
      notify(friendly(e));
    } finally {
      setBusy("");
    }
  }
  const current = own && isActiveSupport(own.status) ? own : null;
  return (
    <>
      {isPreviewHelper && (
        <div className="helper-preview-note">
          <ShieldCheck size={22} />
          <div>
            <strong>Prévia do associado</strong>
            <p>
              Veja o pedido abaixo, aceite e simule a confirmação de quem pediu.
            </p>
            <button className="text-btn" onClick={resetPreviewHelper}>
              Reiniciar pedido de demonstração
            </button>
          </div>
        </div>
      )}
      <div className="support-callout">
        <span className="tile-icon orange">
          <HandHeart size={28} />
        </span>
        <div>
          <h2>Precisando de uma força?</h2>
          <p>Gasolina, pneu ou um imprevisto. Peça apoio.</p>
        </div>
        <Button onClick={request} disabled={Boolean(current)}>
          Pedir ajuda <Plus size={18} />
        </Button>
      </div>
      {(error || activityError) && (
        <p className="error" role="alert">
          {error || activityError}
        </p>
      )}
      <Section
        title="A rede se movimenta"
        aside={
          <span className="live-label">
            <i />
            Pedidos em aberto
          </span>
        }
      >
        {active ? (
          <>
            <label className="city-filter">
              <MapPin size={17} />
              Cidade
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {Array.from(
                  new Set([
                    "Blumenau",
                    "Gaspar",
                    "Indaial",
                    "Timbó",
                    "Pomerode",
                    ...(own ? [own.city] : []),
                  ]),
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {open.filter(
              (r) =>
                r.ownerUid !== user?.uid &&
                r.expiresAt?.toMillis() > Date.now(),
            ).length ? (
              open
                .filter(
                  (r) =>
                    r.ownerUid !== user?.uid &&
                    r.expiresAt?.toMillis() > Date.now(),
                )
                .map((r) => {
                  const Icon = categoryIcon[r.category] || HandHeart;
                  return (
                    <article className="request-card" key={r.id}>
                      <div className="request-top">
                        <span className="tile-icon orange">
                          <Icon size={20} />
                        </span>
                        <span className="tag">Precisa de apoio</span>
                      </div>
                      <h3>
                        {categories.find((c) => c.id === r.category)?.label ||
                          "Pedido de apoio"}
                      </h3>
                      <p>
                        <MapPin size={15} />
                        {r.region} · {r.city}
                      </p>
                      <small>
                        A localização exata aparece depois de você aceitar.
                      </small>
                      <Button
                        disabled={busy === r.id}
                        onClick={() => void accept(r.id)}
                      >
                        {busy === r.id ? "Aceitando…" : "Posso ajudar"}
                        <HandHeart size={17} />
                      </Button>
                    </article>
                  );
                })
            ) : (
              <Empty icon={HandHeart} title="Tudo tranquilo por aqui">
                Nenhum pedido ativo em {city}. Quando alguém precisar, você
                poderá ajudar por esta tela.
              </Empty>
            )}
          </>
        ) : (
          <div className="guest-support">
            <div className="guest-support-icon">
              <Users size={30} />
            </div>
            <h3>Quem está na rua se ajuda.</h3>
            <p>
              Você pode pedir apoio como convidado. Para visualizar e aceitar
              pedidos, entre como associado ativo.
            </p>
            <Button secondary onClick={login}>
              Entrar para ajudar <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </Section>
      <div className="info-box">
        <ShieldCheck size={21} />
        <p>
          O apoio é voluntário e não garante atendimento. Pedidos expiram em 24
          horas. Não é necessário informar telefone ou documentos.
        </p>
      </div>
    </>
  );
}
function CalculatorPanel() {
  const [values, setValues] = useState({
    km: "100",
    price: "6.20",
    consumption: "35",
    income: "180",
    extra: "15",
  });
  const result = calculateShift(
    Number(values.km),
    Number(values.price),
    Number(values.consumption),
    Number(values.income),
    Number(values.extra),
  );
  return (
    <>
      <p className="muted">
        Uma estimativa para entender o que ficou no seu bolso.
      </p>
      <div className="form form-grid">
        {[
          { key: "km", label: "Distância rodada (km)" },
          { key: "income", label: "Ganhos recebidos (R$)" },
          { key: "price", label: "Preço do litro (R$)" },
          { key: "consumption", label: "Consumo da moto (km/l)" },
          { key: "extra", label: "Outros gastos (R$)" },
        ].map((f) => (
          <label key={f.key}>
            {f.label}
            <input
              type="number"
              inputMode="decimal"
              min={f.key === "consumption" ? "0.1" : "0"}
              step="0.01"
              value={values[f.key as keyof typeof values]}
              onChange={(e) =>
                setValues({ ...values, [f.key]: e.target.value })
              }
            />
          </label>
        ))}
      </div>
      {result ? (
        <div className="calculation-result">
          <span>SEU GANHO LÍQUIDO ESTIMADO</span>
          <strong>{money(result.net)}</strong>
          <div>
            <p>
              Combustível <b>{money(result.fuel)}</b>
            </p>
            <p>
              Líquido por km <b>{money(result.perKm)}</b>
            </p>
          </div>
        </div>
      ) : (
        <p role="alert" className="error">
          Informe valores positivos e um consumo maior que zero.
        </p>
      )}
      <p className="form-note">
        Estimativa sem depreciação, impostos ou manutenção futura.
      </p>
    </>
  );
}
const checklistItems = [
  "Pneus calibrados e em bom estado",
  "Freios e iluminação funcionando",
  "Óleo e combustível conferidos",
  "Capacete e equipamentos de proteção",
  "Celular carregado e suporte firme",
  "Documentos e bag de entrega",
];
function Checklist() {
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("aumm.checklist") || "[]");
    } catch {
      return [];
    }
  });
  function toggle(x: string) {
    const next = checked.includes(x)
      ? checked.filter((y) => y !== x)
      : [...checked, x];
    setChecked(next);
    localStorage.setItem("aumm.checklist", JSON.stringify(next));
  }
  return (
    <>
      <p className="muted">Uma conferida rápida faz diferença na jornada.</p>
      <div className="progress">
        <span
          style={{
            width: `${(checked.length / checklistItems.length) * 100}%`,
          }}
        />
      </div>
      <small>
        {checked.length} de {checklistItems.length} itens conferidos
      </small>
      <div className="checklist">
        {checklistItems.map((x) => (
          <label key={x}>
            <input
              type="checkbox"
              checked={checked.includes(x)}
              onChange={() => toggle(x)}
            />
            <span>{x}</span>
          </label>
        ))}
      </div>
      {checked.length === checklistItems.length && (
        <div className="info-box">
          <CheckCheck />
          <p>Tudo conferido. Boa jornada e pilote com segurança!</p>
        </div>
      )}
      <Button
        secondary
        onClick={() => {
          setChecked([]);
          localStorage.removeItem("aumm.checklist");
        }}
      >
        Começar uma nova conferência
      </Button>
    </>
  );
}
function Maintenance({ notify }: { notify: (s: string) => void }) {
  const [entries, setEntries] = useState<
    { id: string; task: string; date: string }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("aumm.maintenance") || "[]");
    } catch {
      return [];
    }
  });
  function store(next: typeof entries) {
    setEntries(next);
    localStorage.setItem("aumm.maintenance", JSON.stringify(next));
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const d = new FormData(f);
    store(
      [
        ...entries,
        {
          id: crypto.randomUUID(),
          task: String(d.get("task")),
          date: String(d.get("date")),
        },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    );
    f.reset();
    notify("Manutenção salva neste aparelho.");
  }
  return (
    <>
      <p className="muted">
        Registre o próximo cuidado e consulte as datas por aqui. Os lembretes
        ficam neste aparelho e não enviam notificações.
      </p>
      <form className="form" onSubmit={submit}>
        <label>
          O que precisa fazer?
          <input
            name="task"
            required
            maxLength={80}
            placeholder="Ex.: Troca de óleo"
          />
        </label>
        <label>
          Próxima data
          <input name="date" type="date" required />
        </label>
        <button className="btn">
          <Plus size={17} /> Salvar manutenção
        </button>
      </form>
      <div className="maintenance-list">
        {entries.map((x) => (
          <div key={x.id}>
            <Wrench size={20} />
            <span>
              <strong>{x.task}</strong>
              <small>
                {new Date(`${x.date}T12:00:00`).toLocaleDateString("pt-BR")}
              </small>
            </span>
            <button
              className="icon-btn"
              onClick={() => store(entries.filter((y) => y.id !== x.id))}
              aria-label={`Concluir ${x.task}`}
            >
              <Check size={19} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
function MemberCard({
  member,
}: {
  member: NonNullable<ReturnType<typeof useSession>["member"]>;
}) {
  const [photo, setPhoto] = useState("");
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      doc(db, "memberPhotos", member.uid),
      (s) =>
        setPhoto(String(s.data()?.photoDataUrl || s.data()?.dataUrl || "")),
      () => {},
    );
  }, [member.uid]);
  const valid = Boolean(
    (photo || member.photoURL) &&
      member.cardValidUntil &&
      member.cardValidUntil.toMillis() > Date.now(),
  );
  return (
    <>
      <div className="digital-card">
        <header>
          <img src="./logo.png" alt="AUMM" />
          <ShieldCheck />
        </header>
        <span>CARTEIRINHA DO ASSOCIADO</span>
        <div className="card-person">
          {(photo || member.photoURL) && (
            <img src={photo || member.photoURL} alt="Sua foto" />
          )}
          <div>
            <h2>{member.fullName}</h2>
            <p>{member.memberNumber || "Número em processamento"}</p>
          </div>
        </div>
        {valid && member.memberNumber ? (
          <div className="card-qr">
            <QRCodeSVG
              value={`${import.meta.env.VITE_SITE_URL || "https://aumm.com.br"}/verificar?token=${encodeURIComponent(member.memberNumber)}`}
              size={105}
            />
            <div>
              <strong>Vínculo ativo</strong>
              <small>
                Validade:{" "}
                {member.cardValidUntil?.toDate().toLocaleDateString("pt-BR")}
              </small>
            </div>
          </div>
        ) : (
          <p className="card-notice">
            Carteirinha sem validade vigente. Emita ou renove no portal.
          </p>
        )}
      </div>
      <p className="form-note">
        Apresente o QR Code para verificar a validade da sua carteirinha.
      </p>
      <Button secondary onClick={() => void site("/associado/carteirinha")}>
        Gerenciar carteirinha no portal <ExternalLink size={16} />
      </Button>
    </>
  );
}
function Password({
  member,
  notify,
  close,
}: {
  member: ReturnType<typeof useSession>["member"];
  notify: (s: string) => void;
  close: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    if (password !== data.get("confirm"))
      return notify("As senhas precisam ser iguais.");
    setBusy(true);
    try {
      const { auth, db } = services();
      if (!auth.currentUser) throw new Error("Entre novamente.");
      await updatePassword(auth.currentUser, password);
      if (member?.mustChangePassword)
        await updateDoc(doc(db, "associados", member.id), {
          mustChangePassword: false,
          updatedAt: serverTimestamp(),
        });
      notify("Senha atualizada com sucesso.");
      close();
    } catch (err) {
      notify(
        (err as { code?: string }).code === "auth/requires-recent-login"
          ? "Entre novamente para alterar a senha com segurança."
          : friendly(err),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="muted">Escolha uma senha de pelo menos 8 caracteres.</p>
      <label>
        Nova senha
        <input
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </label>
      <label>
        Confirme a senha
        <input
          name="confirm"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </label>
      <button className="btn" disabled={busy}>
        {busy ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
