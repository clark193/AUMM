"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { AlertTriangle, BadgeCheck, Camera, Printer, RefreshCw, Share2, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {useContext} from "react";
import {NativeActionsContext} from "./EmbeddedAdmin";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { AdminPhotoUpload } from "./AdminPhotoUpload";
import { writeAdminAudit } from "@/lib/audit";

type AdminProfile = { fullName?: string; role?: string; level?: number | string; active?: boolean };
type AdminCard = { status?:string; role?:string; cardNumber?: string; issuedAt?: Timestamp; validUntil?: Timestamp };
function formatted(value?: Timestamp) { return value?.toDate().toLocaleDateString("pt-BR") || "—"; }

export function AdminCardContent({embedded=false,siteUrl,onPhoto,onShare}:{embedded?:boolean;siteUrl?:string;onPhoto?:()=>void;onShare?:(url:string)=>Promise<void>}={}) {
  const native=useContext(NativeActionsContext);
  const effectiveShare=onShare||native?.share;
  const [uid, setUid] = useState("");
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [photoURL, setPhotoURL] = useState("");
  const [photoType,setPhotoType]=useState("image/jpeg");
  const [card, setCard] = useState<AdminCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  async function load(userId:string){const {db}=getFirebaseServices();const [access,memberPhoto,adminPhoto,credential]=await Promise.all([getDoc(doc(db,"adminRoles",userId)),getDoc(doc(db,"memberPhotos",userId)),getDoc(doc(db,"adminPhotos",userId)),getDoc(doc(db,"adminCards",userId))]);setProfile(access.exists()?access.data() as AdminProfile:null);const photo=memberPhoto.exists()?memberPhoto:adminPhoto;setPhotoURL(String(photo.data()?.dataUrl||""));setPhotoType(String(photo.data()?.contentType||"image/jpeg"));setCard(credential.exists()?credential.data() as AdminCard:null);setCurrentTime(Date.now());}
  useEffect(()=>{const {auth,db}=getFirebaseServices();let stopRole=()=>{},stopPhoto=()=>{},stopCard=()=>{};const stop=onAuthStateChanged(auth,user=>{stopRole();stopPhoto();stopCard();if(!user)return;setUid(user.uid);void load(user.uid);stopRole=onSnapshot(doc(db,"adminRoles",user.uid),s=>setProfile(s.exists()?s.data() as AdminProfile:null));stopCard=onSnapshot(doc(db,"adminCards",user.uid),s=>setCard(s.exists()?s.data() as AdminCard:null));stopPhoto=onSnapshot(doc(db,"memberPhotos",user.uid),s=>{if(s.exists()){setPhotoURL(String(s.data().dataUrl||""));setPhotoType(String(s.data().contentType||"image/jpeg"));}});});return()=>{stop();stopRole();stopPhoto();stopCard();};},[]);

  const validUntil = card?.validUntil?.toDate();
  const outdated = card?.status === "inactive" || Boolean(card?.role && card.role !== profile?.role);
  const expired = Boolean(validUntil && validUntil.getTime() < currentTime);
  const renewNeeded=expired||outdated;
  const issued = Boolean(card?.issuedAt && validUntil && card.cardNumber);
  const usable = issued && !renewNeeded && profile?.active !== false && Boolean(photoURL);
  const verifyUrl = typeof window !== "undefined" && card?.cardNumber ? `${siteUrl || native?.siteUrl || window.location.origin}${withBasePath("/verificar")}?token=${encodeURIComponent(card.cardNumber)}` : "";

  async function issue() {
    if (!uid || !profile || !photoURL || (issued && !renewNeeded)) return;
    setBusy(true); setMessage("");
    try {
      const { db } = getFirebaseServices(); const now = new Date(); const expiration = new Date(now); expiration.setFullYear(expiration.getFullYear() + 1);
      const cardNumber = card?.cardNumber || `AUMM-ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const fullName = profile.fullName || "Administrador AUMM"; const role = profile.role || "Administrador"; const level = Number(profile.level || 5);
      const batch = writeBatch(db);
      batch.set(doc(db,"adminPhotos",uid),{uid,dataUrl:photoURL,contentType:photoType,updatedAt:serverTimestamp()});
      batch.set(doc(db, "adminCards", uid), { uid, cardNumber, fullName, role, level, status: "active", issuedAt: serverTimestamp(), validUntil: Timestamp.fromDate(expiration), updatedAt: serverTimestamp() }, { merge: true });
      batch.set(doc(db, "publicMembers", cardNumber), { uid, memberNumber: cardNumber, fullName, role, status: "active", credentialType: "admin", photoDataUrl: photoURL, cardIssuedAt: serverTimestamp(), cardValidUntil: Timestamp.fromDate(expiration), updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
      await writeAdminAudit({ action: renewNeeded ? "ADMIN_CARD_RENEWED" : "ADMIN_CARD_ISSUED", resource: "adminCards", resourceId: uid, description: renewNeeded ? "Renovou a própria carteirinha administrativa anual." : "Emitiu a própria carteirinha administrativa anual." }).catch(() => undefined);
      await load(uid); setMessage(expired ? "Carteirinha administrativa renovada por um ano." : "Carteirinha administrativa emitida com sucesso.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível emitir a carteirinha administrativa."); }
    finally { setBusy(false); }
  }
  async function share() { if (!usable || !verifyUrl) return; try { if(effectiveShare){await effectiveShare(verifyUrl);setMessage("Credencial compartilhada.");return;} if (navigator.share) await navigator.share({ title: "Carteirinha administrativa AUMM", text: "Verificação da minha função na AUMM", url: verifyUrl }); else {await navigator.clipboard.writeText(verifyUrl);setMessage("Link copiado.");} }catch(error){if((error as {name?:string}).name!=="AbortError")setMessage("Não foi possível compartilhar a credencial.");} }

  return <div className="admin-credential-page"><div className="dash-welcome"><div><span className="access-badge">Identificação institucional</span><h2 style={{ marginTop: 12 }}>Carteirinha administrativa</h2><p>Credencial anual vinculada ao cargo registrado no seu acesso administrativo.</p></div><BadgeCheck size={42} /></div>
    <div className="id-actions admin-id-actions"><span /><span style={{ display: "flex", gap: 8 }}>{!embedded && !native && <button onClick={() => window.print()} disabled={!usable}><Printer /> Imprimir/PDF</button>}<button onClick={share} disabled={!usable}><Share2 /> Compartilhar</button></span></div>
    {!photoURL && <section className="credential-notice warning"><Camera /><div><h2>Foto obrigatória</h2><p>Adicione sua foto nas configurações antes de emitir a credencial do cargo.</p>{onPhoto?<button className="button button-sm" onClick={onPhoto}>Adicionar foto ao perfil</button>:<AdminPhotoUpload photoURL={photoURL} name={profile?.fullName||"Administrador"} onUploaded={value=>{setPhotoURL(value);void load(uid);}}/>}</div></section>}
    {photoURL && (!issued || renewNeeded) && <section className={`credential-notice ${expired ? "danger" : ""}`}><RefreshCw /><div><h2>{outdated ? "Cargo atualizado: nova credencial necessária" : expired ? "Credencial vencida" : "Credencial pronta para emissão"}</h2><p>{outdated ? "A credencial anterior foi invalidada. Emita a identificação com seu cargo atual." : expired ? `A validade terminou em ${formatted(card?.validUntil)}.` : "A credencial terá validade de um ano e exibirá seu cargo atual na associação."}</p><button className="button button-sm" onClick={issue} disabled={busy || profile?.active === false}>{busy ? "Emitindo…" : renewNeeded ? "Renovar credencial" : "Emitir credencial"}</button></div></section>}
    {message && <div className="form-message success">{message}</div>}
    {issued && <div className={`id-card admin-id-card ${expired ? "expired" : ""}`}><div className="id-top"><div className="id-brand"><Image src={withBasePath("/logo.png")} width={68} height={68} alt="AUMM" /><span><strong>AUMM</strong><small>Credencial administrativa</small></span></div><small>BRASIL</small></div><div className="id-body"><div className="member-photo">{photoURL ? <Image src={photoURL} width={100} height={124} unoptimized alt={`Foto de ${profile?.fullName || "administrador"}`} /> : <UserRound />}</div><div className="id-data"><small>Representante da associação</small><h1>{profile?.fullName || "Administrador AUMM"}</h1><strong>{profile?.role || "ADMINISTRADOR"}</strong><p>{card?.cardNumber} · NÍVEL {profile?.level || 5}</p><div className="credential-validity"><span>Emissão <b>{formatted(card?.issuedAt)}</b></span><span>Validade <b>{formatted(card?.validUntil)}</b></span></div></div>{usable && verifyUrl && <div className="qr-box"><QRCodeSVG value={verifyUrl} size={94} level="H" /></div>}{renewNeeded && <div className="credential-expired-stamp"><AlertTriangle /> {outdated?"CARGO ATUALIZADO":"VENCIDA"}</div>}</div><div className="credential-card-foot"><BadgeCheck /> Cargo confirmado pelo cadastro administrativo da AUMM.</div></div>}
  </div>;
}
