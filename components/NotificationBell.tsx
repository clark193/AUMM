"use client";

import { Bell, CheckCheck, Siren, X } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

type Notice = { id: string; emergency?: boolean; meeting?:boolean; subject?: string; body?: string; audience?: string; status?: string; createdAt?: Timestamp; updatedAt?: Timestamp };

function millis(value?: Timestamp) { return value?.toMillis?.() || 0; }

export function NotificationBell({ audience, canAttend = false }: { audience: "admin" | "member"; canAttend?: boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [meetings,setMeetings]=useState<Notice[]>([]);
  const [emergencies, setEmergencies] = useState<Notice[]>([]);
  const [emergencyPopup, setEmergencyPopup] = useState(false);
  const [emergencyError, setEmergencyError] = useState("");
  const [lastRead, setLastRead] = useState(0);
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [badgeEnabled, setBadgeEnabled] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    let stopItems: (() => void) | undefined;
    let stopEmergencies: (() => void) | undefined;
    let stopMeetings:(()=>void)|undefined;
    let generation = 0;
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      const current = ++generation;
      stopItems?.(); stopEmergencies?.(); stopMeetings?.();
      setItems([]); setMeetings([]); setEmergencies([]); setEmergencyPopup(false); setEmergencyError(""); setUid(""); setLastRead(0);
      if (!user) return;
      setUid(user.uid);
      const [read, preferences] = await Promise.all([getDoc(doc(db, "notificationReads", user.uid)), getDoc(doc(db, "userPreferences", user.uid))]).catch(() => [null, null]);
      if (current !== generation) return;
      const readAt = millis(read?.data()?.lastReadAt);
      setLastRead(readAt);
      setBadgeEnabled(preferences?.data()?.notificationBadge !== false);
      stopItems = onSnapshot(collection(db, "communications"), (snapshot) => {
        const allowed = audience === "admin" ? ["all", "admin"] : ["all", "members"];
        setItems(snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() } as Notice))
          .filter((item) => item.status === "published" && allowed.includes(item.audience || ""))
          .sort((a, b) => Math.max(millis(b.updatedAt), millis(b.createdAt)) - Math.max(millis(a.updatedAt), millis(a.createdAt)))
          .slice(0, 8));
      }, () => setItems([]));
      if (audience === "admin") {
        stopMeetings=onSnapshot(query(collection(db,"mobileInbox",user.uid,"items"),where("kind","==","meeting"),limit(50)),snap=>setMeetings(snap.docs.map(d=>{const data=d.data();return {id:d.id,meeting:true,subject:String(data.title||"Reunião da diretoria"),body:String(data.body||""),createdAt:Timestamp.fromMillis(Number(data.createdAt)||0)};}).sort((a,b)=>millis(b.createdAt)-millis(a.createdAt))),()=>setMeetings([]));
        const seen = new Set<string>();
        const storageKey = `aumm.admin.emergencies.${user.uid}`;
        try { const stored = JSON.parse(sessionStorage.getItem(storageKey) || "[]"); if (Array.isArray(stored)) for (const id of stored) if (typeof id === "string") seen.add(id); } catch { /* Continua sem armazenamento local. */ }
        stopEmergencies = onSnapshot(query(collection(db, "emergencyAdminSignals"), where("status", "in", ["open", "contacting"]), limit(100)), { includeMetadataChanges: true }, snapshot => {
          if (snapshot.metadata.hasPendingWrites) return;
          const notices = snapshot.docs.map(item => {
            const data = item.data();
            return { id: `emergency:${data.incidentId}`, emergency: true, subject: "Emergência de associado", body: "Um associado acionou o alerta de acidente e está solicitando contato da AUMM.", createdAt: data.createdAt as Timestamp };
          }).sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
          setEmergencies(notices); setEmergencyError("");
          let isNew = false;
          for (const notice of notices) {
            if (!seen.has(notice.id) && millis(notice.createdAt) > readAt) isNew = true;
            seen.add(notice.id);
          }
          try { sessionStorage.setItem(storageKey, JSON.stringify([...seen].slice(-500))); } catch { /* O aviso continua funcionando nesta tela. */ }
          if (!notices.length) setEmergencyPopup(false);
          else if (isNew) setEmergencyPopup(true);
        }, () => { setEmergencies([]); setEmergencyPopup(false); setEmergencyError("Não foi possível acompanhar os avisos de emergência. Confira a conexão e atualize o painel."); });
      }
    });
    return () => { generation++; stopAuth(); stopItems?.(); stopEmergencies?.(); };
  }, [audience]);

  useEffect(() => {
    function close(event: MouseEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const notices = useMemo(() => [...emergencies, ...meetings, ...items].sort((a, b) => Number(Boolean(b.emergency)) - Number(Boolean(a.emergency)) || Math.max(millis(b.updatedAt), millis(b.createdAt)) - Math.max(millis(a.updatedAt), millis(a.createdAt))), [items, emergencies, meetings]);
  const unread = useMemo(() => notices.filter((item) => (badgeEnabled || item.emergency) && Math.max(millis(item.updatedAt), millis(item.createdAt)) > lastRead).length, [notices, lastRead, badgeEnabled]);

  async function markRead() {
    if (!uid) return;
    const now = Date.now();
    setLastRead(now);
    await setDoc(doc(getFirebaseServices().db, "notificationReads", uid), { uid, lastReadAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) setEmergencyPopup(false);
    if (next && unread) await markRead().catch(() => undefined);
  }

  return <div className="notification-center" ref={root}>
    <button className="notification-trigger" type="button" onClick={toggle} aria-label={`Notificações${unread ? `, ${unread} novas` : ""}`} aria-expanded={open}>
      <Bell size={19} />{unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <section className="notification-popover">
      <header><div><strong>Notificações</strong><small>{unread ? `${unread} nova${unread > 1 ? "s" : ""}` : "Tudo em dia"}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar notificações"><X /></button></header>
      <div className="notification-list">{emergencyError && <p role="alert">{emergencyError}</p>}{notices.length === 0 ? <div className="empty-state">Nenhuma notificação disponível.</div> : notices.map((item) => <article className={item.emergency ? "emergency-notice" : ""} key={item.id}>{item.emergency ? <Siren /> : <Bell />}<div><strong>{item.subject || "Comunicado AUMM"}</strong><p>{item.body}</p><small>{(item.updatedAt || item.createdAt)?.toDate().toLocaleString("pt-BR") || "Publicado pela AUMM"}</small>{item.meeting && <Link href="/admin/reunioes" onClick={()=>setOpen(false)}>Abrir agenda da diretoria →</Link>}{item.emergency && (canAttend ? <Link href="/admin/emergencias" onClick={() => setOpen(false)}>Abrir atendimento →</Link> : <p>A equipe autorizada acompanha os detalhes em Emergências.</p>)}</div></article>)}</div>
      <footer><CheckCheck /> {audience === "admin" ? "Visualizar o aviso não encerra o atendimento." : "Comunicados visualizados"}</footer>
    </section>}
    {emergencyPopup && emergencies.length > 0 && <aside className="admin-emergency-toast" role="alert" aria-live="assertive"><Siren size={25} /><div><strong>Emergência de associado</strong><p>{emergencies.length > 1 ? `${emergencies.length} alertas aguardam acompanhamento da AUMM.` : "Um associado pediu contato após um acidente."}</p>{canAttend ? <Link href="/admin/emergencias" onClick={() => { setEmergencyPopup(false); void markRead().catch(() => undefined); }}>Abrir atendimento →</Link> : <button type="button" onClick={() => { setEmergencyPopup(false); setOpen(true); void markRead().catch(() => undefined); }}>Ver aviso</button>}</div><button type="button" aria-label="Dispensar aviso de emergência" onClick={() => setEmergencyPopup(false)}><X size={18} /></button></aside>}
  </div>;
}
