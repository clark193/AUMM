import {useActiveAdmin} from "../../lib/useActiveAdmin";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import { auth, db, friendly } from "./firebase";
export type Row = {
  id: string;
  title?: string;
  name?: string;
  summary?: string;
  description?: string;
  content?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  fileUrl?: string;
  internalUrl?: string;
  externalUrl?: string;
  signedDocumentUrl?: string;
  partner?: string;
  date?: string | Timestamp;
  eventDate?: string | Timestamp;
  location?: string;
  publishedAt?: Timestamp;
  createdAt?: Timestamp;
  visibility?: string;
  [key: string]: unknown;
};
export type Member = {
  id: string;
  uid: string;
  fullName: string;
  memberNumber?: string;
  status: string;
  mustChangePassword?: boolean;
  photoURL?: string;
  cardValidUntil?: Timestamp;
};
export function useMemberPhoto(uid?:string){const [photo,setPhoto]=useState("");useEffect(()=>{setPhoto("");if(!db||!uid)return;let member="",admin="";const update=()=>setPhoto(member||admin);const a=onSnapshot(doc(db,"memberPhotos",uid),s=>{member=String(s.data()?.dataUrl||"");update();},()=>{});const b=onSnapshot(doc(db,"adminPhotos",uid),s=>{admin=String(s.data()?.dataUrl||"");update();},()=>{});return()=>{a();b();};},[uid]);return photo;}
export function useSession() {
  const adminState=useActiveAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!auth || !db) return;
    let stopMember = () => {};
    const stopAuth = onAuthStateChanged(auth, (current) => {
      stopMember();
      setUser(current);
      setMember(null);
      setError("");
      if (!current || current.isAnonymous) {
        setLoading(false);
        return;
      }
      setLoading(true);
      stopMember = onSnapshot(
        query(
          collection(db!, "associados"),
          where("uid", "==", current.uid),
          limit(1),
        ),
        (snap) => {
          setMember(
            snap.empty
              ? null
              : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Member),
          );
          setLoading(false);
        },
        (err) => {
          setError(friendly(err));
          setLoading(false);
        },
      );
    });
    return () => {
      stopAuth();
      stopMember();
    };
  }, []);
  return {
    user,
    member,
    loading: loading || adminState.loading,
    admin: adminState.role,
    error,
    active: member?.status === "active" && !member.mustChangePassword,
  };
}
// Os filtros são os mesmos das regras do site; nenhum conteúdo privado é solicitado por convidados.
export function useFeed(name: string, enabled = true, mode = "active") {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!db || !enabled) {
      setItems([]);
      return;
    }
    setLoading(true);
    setItems([]);
    setError("");
    const filters: QueryConstraint[] =
      mode === "documents"
        ? [
            where("published", "==", true),
            where("visibility", "in", ["public", "members"]),
          ]
        : [where("status", "==", mode)];
    if (name === "communications")
      filters.push(where("audience", "in", ["all", "members"]));
    return onSnapshot(
      query(collection(db, name), ...filters, limit(100)),
      (snapshot) => {
        setItems(
          snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Row)
            .sort(
              (a, b) =>
                (b.publishedAt?.toMillis?.() ||
                  b.createdAt?.toMillis?.() ||
                  0) -
                (a.publishedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0),
            ),
        );
        setLoading(false);
      },
      (err) => {
        setError(friendly(err));
        setLoading(false);
      },
    );
  }, [name, enabled, mode]);
  return { items, loading, error };
}
export function usePublicSettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (db)
      return onSnapshot(
        doc(db, "settings", "public"),
        (snap) => setSettings(snap.data() || {}),
        () => {},
      );
  }, []);
  return settings;
}
