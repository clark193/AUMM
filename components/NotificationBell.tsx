"use client";

import { Bell, CheckCheck, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

type Notice = { id: string; subject?: string; body?: string; audience?: string; status?: string; createdAt?: Timestamp; updatedAt?: Timestamp };

function millis(value?: Timestamp) { return value?.toMillis?.() || 0; }

export function NotificationBell({ audience }: { audience: "admin" | "member" }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [lastRead, setLastRead] = useState(0);
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [badgeEnabled, setBadgeEnabled] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    let stopItems: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      const [read, preferences] = await Promise.all([getDoc(doc(db, "notificationReads", user.uid)), getDoc(doc(db, "userPreferences", user.uid))]);
      setLastRead(millis(read.data()?.lastReadAt));
      setBadgeEnabled(preferences.data()?.notificationBadge !== false);
      stopItems?.();
      stopItems = onSnapshot(collection(db, "communications"), (snapshot) => {
        const allowed = audience === "admin" ? ["all", "admin"] : ["all", "members"];
        setItems(snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() } as Notice))
          .filter((item) => item.status === "published" && allowed.includes(item.audience || ""))
          .sort((a, b) => Math.max(millis(b.updatedAt), millis(b.createdAt)) - Math.max(millis(a.updatedAt), millis(a.createdAt)))
          .slice(0, 8));
      });
    });
    return () => { stopAuth(); stopItems?.(); };
  }, [audience]);

  useEffect(() => {
    function close(event: MouseEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = useMemo(() => badgeEnabled ? items.filter((item) => Math.max(millis(item.updatedAt), millis(item.createdAt)) > lastRead).length : 0, [items, lastRead, badgeEnabled]);

  async function markRead() {
    if (!uid) return;
    const now = Date.now();
    setLastRead(now);
    await setDoc(doc(getFirebaseServices().db, "notificationReads", uid), { uid, lastReadAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread) await markRead().catch(() => undefined);
  }

  return <div className="notification-center" ref={root}>
    <button className="notification-trigger" type="button" onClick={toggle} aria-label={`Notificações${unread ? `, ${unread} novas` : ""}`} aria-expanded={open}>
      <Bell size={19} />{unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <section className="notification-popover">
      <header><div><strong>Notificações</strong><small>{unread ? `${unread} nova${unread > 1 ? "s" : ""}` : "Tudo em dia"}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar notificações"><X /></button></header>
      <div className="notification-list">{items.length === 0 ? <div className="empty-state">Nenhum comunicado publicado.</div> : items.map((item) => <article key={item.id}><Bell /><div><strong>{item.subject || "Comunicado AUMM"}</strong><p>{item.body}</p><small>{(item.updatedAt || item.createdAt)?.toDate().toLocaleString("pt-BR") || "Publicado pela AUMM"}</small></div></article>)}</div>
      <footer><CheckCheck /> Comunicados visualizados</footer>
    </section>}
  </div>;
}
