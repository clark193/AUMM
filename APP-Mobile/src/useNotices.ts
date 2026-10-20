import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  defaultNoticePreferences,
  normalizeCity,
  publicationNotice,
  shouldReceive,
  supportNotices,
  type NoticeEvent,
  type NoticePreferences,
} from "../shared/notifications";
import { listenForPush } from "./push";
import { isPreview, previewUid } from "./preview";
export type AppNotice = NoticeEvent & { read: boolean };
const storageKey = (uid: string) => `aumm.notices.${uid}`;
function localNotices(uid: string): AppNotice[] {
  try {
    return (
      JSON.parse(localStorage.getItem(storageKey(uid)) || "[]") as AppNotice[]
    )
      .filter((item) => item.expiresAt > Date.now())
      .slice(0, 100);
  } catch {
    return [];
  }
}
function loadPreferences(): NoticePreferences {
  try {
    return {
      ...defaultNoticePreferences,
      ...JSON.parse(localStorage.getItem("aumm.noticePreferences") || "{}"),
    };
  } catch {
    return defaultNoticePreferences;
  }
}
function source(data: Record<string, unknown>) {
  const time = (value: unknown) =>
    (value as { toMillis?: () => number })?.toMillis?.() || 0;
  return {
    status: String(data.status || ""),
    title: String(data.title || ""),
    audience: String(data.audience || ""),
    city: String(data.city || ""),
    ownerUid: String(data.ownerUid || ""),
    helperUid: String(data.helperUid || ""),
    createdAt: time(data.createdAt),
    publishedAt: time(data.publishedAt),
    expiresAt: time(data.expiresAt),
  };
}
export function useNotices(
  user: User | null,
  active: boolean,
  onOpen: (notice: NoticeEvent) => void,
) {
  const uid = isPreview ? previewUid : user?.uid || "guest";
  const [items, setItems] = useState<AppNotice[]>(() => localNotices(uid));
  const [preferences, setPreferences] = useState(loadPreferences);
  const [banner, setBanner] = useState<AppNotice | null>(null);
  const [syncError, setSyncError] = useState("");
  const serverIds = useRef(new Set<string>());
  const itemsRef = useRef(items),
    preferencesRef = useRef(preferences),
    onOpenRef = useRef(onOpen),
    userRef = useRef(user);
  itemsRef.current = items;
  preferencesRef.current = preferences;
  onOpenRef.current = onOpen;
  userRef.current = user;
  const persist = useCallback(
    (next: AppNotice[]) => {
      itemsRef.current = next;
      setItems(next);
      localStorage.setItem(storageKey(uid), JSON.stringify(next));
    },
    [uid],
  );
  const add = useCallback(
    (event: NoticeEvent, alert = true, read = false) => {
      if (event.expiresAt <= Date.now()) return;
      const previous = itemsRef.current.find((n) => n.id === event.id);
      if (previous) {
        if (read && !previous.read)
          persist(
            itemsRef.current.map((n) =>
              n.id === event.id ? { ...n, read: true } : n,
            ),
          );
        return;
      }
      const item = { ...event, read };
      persist(
        [item, ...itemsRef.current]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 100),
      );
      if (alert && !read && !document.hidden) setBanner(item);
    },
    [persist],
  );
  useEffect(() => {
    const next = localNotices(uid);
    itemsRef.current = next;
    setItems(next);
    setBanner(null);
    setSyncError("");
    serverIds.current.clear();
  }, [uid]);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 8500);
    return () => clearTimeout(timer);
  }, [banner]);
  useEffect(() => {
    if (!db || isPreview) return;
    const stops: (() => void)[] = [];
    const feeds: readonly (readonly [string, "news" | "communication"])[] = [
      ["news", "news"],
      ...(active ? [["communications", "communication"] as const] : []),
    ];
    for (const [name, kind] of feeds) {
      let initialized = false;
      const filters = [where("status", "==", "published")];
      if (name === "communications")
        filters.push(where("audience", "in", ["all", "members"]));
      stops.push(
        onSnapshot(
          query(collection(db, name), ...filters, limit(100)),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (snapshot.metadata.fromCache) return;
            if (!initialized) {
              initialized = true;
              return;
            }
            for (const change of snapshot.docChanges())
              if (change.type === "added") {
                const event = publicationNotice(
                  kind,
                  change.doc.id,
                  source(change.doc.data()),
                );
                if (
                  event &&
                  shouldReceive(event, uid, active, preferencesRef.current)
                )
                  add(event);
              }
          },
          () => {},
        ),
      );
    }
    if (user) {
      let previous: ReturnType<typeof source> | null = null;
      let initialized = false;
      stops.push(
        onSnapshot(
          doc(db, "supportRequests", uid),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;
            if (!snapshot.exists()) {
              initialized = true;
              previous = null;
              return;
            }
            const after = source(snapshot.data());
            const before = previous;
            previous = after;
            const events = supportNotices(uid, before, after, Date.now());
            for (const event of events)
              if (shouldReceive(event, uid, active, preferencesRef.current))
                add(event, initialized || after.createdAt > Date.now() - 15000);
            initialized = true;
          },
          () => {},
        ),
      );
      if (active) {
        let initializedNearby = false;
        stops.push(
          onSnapshot(
            query(
              collection(db, "supportRequests"),
              where("city", "==", preferences.city),
              where("status", "==", "open"),
            ),
            { includeMetadataChanges: true },
            (snapshot) => {
              if (snapshot.metadata.fromCache) return;
              if (!initializedNearby) {
                initializedNearby = true;
                return;
              }
              for (const change of snapshot.docChanges())
                if (
                  change.type === "added" &&
                  change.doc.data().expiresAt?.toMillis() > Date.now()
                ) {
                  for (const event of supportNotices(
                    change.doc.id,
                    null,
                    source(change.doc.data()),
                    Date.now(),
                  ))
                    if (shouldReceive(event, uid, true, preferencesRef.current))
                      add(event);
                }
            },
            () => {},
          ),
        );
        const previous = new Map<string, ReturnType<typeof source>>();
        let initial = true;
        stops.push(
          onSnapshot(
            query(
              collection(db, "supportRequests"),
              where("helperUid", "==", uid),
              limit(100),
            ),
            { includeMetadataChanges: true },
            (snapshot) => {
              if (
                snapshot.metadata.fromCache ||
                snapshot.metadata.hasPendingWrites
              )
                return;
              for (const loaded of snapshot.docs) {
                const after = source(loaded.data()),
                  before = previous.get(loaded.id) || null;
                previous.set(loaded.id, after);
                for (const event of supportNotices(
                  loaded.id,
                  before,
                  after,
                  Date.now(),
                ))
                  if (shouldReceive(event, uid, true, preferencesRef.current))
                    add(event, !initial);
              }
              initial = false;
            },
            () => {},
          ),
        );
      }
      stops.push(
        onSnapshot(
          query(
            collection(db, "mobileInbox", uid, "items"),
            orderBy("createdAt", "desc"),
            limit(100),
          ),
          (snapshot) => {
            for (const change of snapshot.docChanges())
              if (change.type !== "removed") {
                const row = change.doc.data() as AppNotice;
                serverIds.current.add(change.doc.id);
                if (
                  row.expiresAt > Date.now() &&
                  shouldReceive(row, uid, active, preferencesRef.current)
                )
                  add(
                    { ...row, id: change.doc.id },
                    change.type === "added",
                    row.read,
                  );
              }
          },
          () => {},
        ),
      );
    }
    return () => stops.forEach((stop) => stop());
  }, [uid, user, active, add, preferences.city]);
  useEffect(() => {
    const updated = (event: Event) => {
      const { id, before, after } = (
        event as CustomEvent<{
          id: string;
          before: Record<string, unknown>;
          after: Record<string, unknown>;
        }>
      ).detail;
      for (const notice of supportNotices(
        id,
        source(before),
        source(after),
        Date.now(),
      ))
        if (shouldReceive(notice, uid, active, preferencesRef.current))
          add(notice);
    };
    window.addEventListener("aumm:support-updated", updated);
    return () => window.removeEventListener("aumm:support-updated", updated);
  }, [uid, active, add]);
  useEffect(() => {
    if (!db || !user || isPreview) return;
    void setDoc(doc(db, "mobileSubscriptions", user.uid), {
      uid: user.uid,
      ...preferences,
      updatedAt: serverTimestamp(),
    })
      .then(() => setSyncError(""))
      .catch(() =>
        setSyncError(
          "Suas preferências estão salvas neste aparelho. A sincronização com a AUMM está indisponível.",
        ),
      );
  }, [user, preferences]);
  const markRead = useCallback(
    (id: string) => {
      persist(
        itemsRef.current.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      if (db && userRef.current && serverIds.current.has(id))
        void updateDoc(
          doc(db, "mobileInbox", userRef.current.uid, "items", id),
          { read: true },
        ).catch(() => {});
    },
    [persist],
  );
  const open = useCallback(
    (item: NoticeEvent) => {
      markRead(item.id);
      setBanner(null);
      onOpenRef.current(item);
    },
    [markRead],
  );
  useEffect(() => {
    let cleanup: (() => void) | undefined,
      cancelled = false;
    void listenForPush(
      (notice) => add(notice),
      (notice) => {
        if (auth?.currentUser?.uid !== userRef.current?.uid) {
          onOpenRef.current(notice);
          return;
        }
        serverIds.current.add(notice.id);
        add(notice, false, true);
        open(notice);
      },
      setSyncError,
    )
      .then((stop) => {
        if (cancelled) stop();
        else cleanup = stop;
      })
      .catch(() =>
        setSyncError(
          "As notificações deste aparelho não puderam ser ativadas. Tente novamente.",
        ),
      );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [user, add, open]);
  function updatePreferences(patch: Partial<NoticePreferences>) {
    const next = { ...preferences, ...patch };
    next.city = next.city.trim();
    next.cityKey = normalizeCity(next.city);
    setPreferences(next);
    localStorage.setItem("aumm.noticePreferences", JSON.stringify(next));
  }
  return {
    items,
    banner,
    setBanner,
    preferences,
    updatePreferences,
    syncError,
    open,
    markRead,
    markAllRead: () =>
      itemsRef.current
        .filter((item) => !item.read)
        .forEach((item) => markRead(item.id)),
    unread: items.filter((n) => !n.read && n.expiresAt > Date.now()).length,
  };
}
