"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { AlertTriangle, BadgeCheck, Camera, Printer, RefreshCw, Share2, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { writeAdminAudit } from "@/lib/audit";

type AdminProfile = { fullName?: string; role?: string; level?: number | string; active?: boolean };
type AdminCard = { cardNumber?: string; issuedAt?: Timestamp; validUntil?: Timestamp };
function formatted(value?: Timestamp) { return value?.toDate().toLocaleDateString("pt-BR") || "—"; }

export function AdminCardContent() {
  const [uid, setUid] = useState("");
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [photoURL, setPhotoURL] = useState("");
  const [card, setCard] = useState<AdminCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  async function load(userId: string) { const { db } = getFirebaseServices(); const [access, photo, credential] = await Promise.all([getDoc(doc(db, "adminRoles", userId)), getDoc(doc(db, "adminPhotos", userId)), getDoc(doc(db, "adminCards", userId))]); setProfile(access.exists() ? access.data() as AdminProfile : null); setPhotoURL(String(photo.data()?.dataUrl || "")); setCard(credential.exists() ? credential.data() as AdminCard : null); setCurrentTime(Date.now()); }
  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, (user) => { if (!user) return; setUid(user.uid); void load(user.uid); }), []);

  const validUntil = card?.validUntil?.toDate();
  const expired = Boolean(validUntil && validUntil.getTime() < currentTime);
  const issued = Boolean(card?.issuedAt && validUntil && card.cardNumber);
  const usable = issued && !expired && profile?.active !== false && Boolean(photoURL);
  const verifyUrl = typeof window !== "undefined" && card?.cardNumber ? `${window.location.origin}${withBasePath("/verificar")}?token=${encodeURIComponent(card.cardNumber)}` : "";

  async function issue() {
    if (!uid || !profile || !photoURL || (issued && !expired)) return;
    setBusy(true); setMessage("");
    try {
      const { db } = getFirebaseServices(); const now = new Date(); const expiration = new Date(now); expiration.setFullYear(expiration.getFullYear() + 1);
      const cardNumber = card?.cardNumber || `AUMM-ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const fullName = profile.fullName || "Administrador AUMM"; const role = profile.role || "Administrador"; const level = Number(profile.level || 5);
      const batch = writeBatch(db);
      batch.set(doc(db, "adminCards", uid), { uid, cardNumber, fullName, role, level, status: "active", issuedAt: serverTimestamp(), validUntil: Timestamp.fromDate(expiration), updatedAt: serverTimestamp() }, { merge: true });
      batch.set(doc(db, "publicMembers", cardNumber), { uid, memberNumber: cardNumber, fullName, role, status: "active", credentialType: "admin", photoDataUrl: photoURL, cardIssuedAt: serverTimestamp(), cardValidUntil: Timestamp.fromDate(expiration), updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
      await writeAdminAudit({ action: expired ? "ADMIN_CARD_RENEWED" : "ADMIN_CARD_ISSUED", resource: "adminCards", resourceId: uid, description: expired ? "Renovou a própria carteirinha administrativa anual." : "Emitiu a própria carteirinha administrativa anual." }).catch(() => undefined);
      await load(uid); setMessage(expired ? "Carteirinha administrativa renovada por um ano." : "Carteirinha administrativa emitida com sucesso.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível emitir a carteirinha administrativa."); }
    finally { setBusy(false); }
  }
  async function share() { if (!usable || !verifyUrl) return; if (navigator.share) await navigator.share({ title: "Carteirinha administrativa AUMM", text: "Verificação da minha função na AUMM", url: verifyUrl }); else await navigator.clipboard.writeText(verifyUrl); }

  return <div className="admin-credential-page"><div className="dash-welcome"><div><span className="access-badge">Identificação institucional</span><h2 style={{ marginTop: 12 }}>Carteirinha administrativa</h2><p>Credencial anual vinculada ao cargo registrado no seu acesso administrativo.</p></div><BadgeCheck size={42} /></div>
    <div className="id-actions admin-id-actions"><span /><span style={{ display: "flex", gap: 8 }}><button onClick={() => window.print()} disabled={!usable}><Printer /> Imprimir/PDF</button><button onClick={share} disabled={!usable}><Share2 /> Compartilhar</button></span></div>
    {!photoURL && <section className="credential-notice warning"><Camera /><div><h2>Foto obrigatória</h2><p>Adicione sua foto nas configurações antes de emitir a credencial do cargo.</p><Link className="button button-sm" href="/admin/configuracoes">Adicionar foto</Link></div></section>}
    {photoURL && (!issued || expired) && <section className={`credential-notice ${expired ? "danger" : ""}`}><RefreshCw /><div><h2>{expired ? "Credencial vencida" : "Credencial pronta para emissão"}</h2><p>{expired ? `A validade terminou em ${formatted(card?.validUntil)}.` : "A credencial terá validade de um ano e exibirá seu cargo atual na associação."}</p><button className="button button-sm" onClick={issue} disabled={busy || profile?.active === false}>{busy ? "Emitindo…" : expired ? "Renovar credencial" : "Emitir credencial"}</button></div></section>}
    {message && <div className="form-message success">{message}</div>}
    {issued && <div className={`id-card admin-id-card ${expired ? "expired" : ""}`}><div className="id-top"><div className="id-brand"><Image src={withBasePath("/logo.png")} width={68} height={68} alt="AUMM" /><span><strong>AUMM</strong><small>Credencial administrativa</small></span></div><small>BRASIL</small></div><div className="id-body"><div className="member-photo">{photoURL ? <Image src={photoURL} width={100} height={124} unoptimized alt={`Foto de ${profile?.fullName || "administrador"}`} /> : <UserRound />}</div><div className="id-data"><small>Representante da associação</small><h1>{profile?.fullName || "Administrador AUMM"}</h1><strong>{profile?.role || "ADMINISTRADOR"}</strong><p>{card?.cardNumber} · NÍVEL {profile?.level || 5}</p><div className="credential-validity"><span>Emissão <b>{formatted(card?.issuedAt)}</b></span><span>Validade <b>{formatted(card?.validUntil)}</b></span></div></div>{usable && verifyUrl && <div className="qr-box"><QRCodeSVG value={verifyUrl} size={94} level="H" /></div>}{expired && <div className="credential-expired-stamp"><AlertTriangle /> VENCIDA</div>}</div><div className="credential-card-foot"><BadgeCheck /> Cargo confirmado pelo cadastro administrativo da AUMM.</div></div>}
  </div>;
}
