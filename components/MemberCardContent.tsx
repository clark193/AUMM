"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { AlertTriangle, ArrowLeft, BadgeCheck, Camera, Printer, RefreshCw, Share2, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { writeAdminAudit } from "@/lib/audit";

type Member = {
  fullName?: string; memberNumber?: string; role?: string; status?: string;
  createdAt?: Timestamp; photoURL?: string; cardIssuedAt?: Timestamp; cardValidUntil?: Timestamp;
};

function formatted(value?: Timestamp) { return value?.toDate().toLocaleDateString("pt-BR") || "—"; }

export function MemberCardContent() {
  const [member, setMember] = useState<Member | null>(null);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  async function load(userId: string) {
    const { db } = getFirebaseServices();
    const [snapshot, photo] = await Promise.all([getDoc(doc(db, "associados", userId)), getDoc(doc(db, "memberPhotos", userId))]);
    setMember(snapshot.exists() ? { ...(snapshot.data() as Member), photoURL: String(photo.data()?.dataUrl || "") } : null);
    setCurrentTime(Date.now());
  }
  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, (user) => { if (!user) return; setUid(user.uid); void load(user.uid); }), []);

  const validUntil = member?.cardValidUntil?.toDate();
  const expired = Boolean(validUntil && validUntil.getTime() < currentTime);
  const issued = Boolean(member?.cardIssuedAt && validUntil);
  const usable = issued && !expired && member?.status === "active" && Boolean(member?.photoURL);
  const verifyUrl = typeof window !== "undefined" && member?.memberNumber ? `${window.location.origin}${withBasePath("/verificar")}?token=${encodeURIComponent(member.memberNumber)}` : "";

  async function issue() {
    if (!uid || !member?.memberNumber || !member.photoURL || member.status !== "active" || (issued && !expired)) return;
    setBusy(true); setMessage("");
    try {
      const { db } = getFirebaseServices();
      const issuedAt = new Date();
      const expiration = new Date(issuedAt); expiration.setFullYear(expiration.getFullYear() + 1);
      const batch = writeBatch(db);
      batch.update(doc(db, "associados", uid), { cardIssuedAt: serverTimestamp(), cardValidUntil: Timestamp.fromDate(expiration), updatedAt: serverTimestamp() });
      batch.update(doc(db, "publicMembers", member.memberNumber), { credentialType: "member", photoDataUrl: member.photoURL, cardIssuedAt: serverTimestamp(), cardValidUntil: Timestamp.fromDate(expiration), updatedAt: serverTimestamp() });
      await batch.commit();
      await writeAdminAudit({ action: expired ? "MEMBER_CARD_RENEWED" : "MEMBER_CARD_ISSUED", resource: "associados", resourceId: uid, description: expired ? "Renovou a própria carteirinha anual." : "Emitiu a própria carteirinha anual." }).catch(() => undefined);
      await load(uid); setMessage(expired ? "Nova carteirinha emitida por mais um ano." : "Carteirinha emitida com validade de um ano.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível emitir a carteirinha."); }
    finally { setBusy(false); }
  }
  async function share() { if (!verifyUrl || !usable) return; if (navigator.share) await navigator.share({ title: "Carteirinha AUMM", text: "Verificação da minha carteirinha AUMM", url: verifyUrl }); else await navigator.clipboard.writeText(verifyUrl); }

  return <main className="id-page"><div className="id-page-inner">
    <div className="id-actions"><Link href="/associado"><ArrowLeft size={15} /> Voltar</Link><span style={{ display: "flex", gap: 8 }}><button onClick={() => window.print()} disabled={!usable}><Printer size={15} /> Imprimir/PDF</button><button onClick={share} disabled={!usable}><Share2 size={15} /> Compartilhar</button></span></div>
    {!member?.photoURL && <section className="credential-notice warning"><Camera /><div><h2>Adicione uma foto antes de emitir</h2><p>A foto é obrigatória para proteger sua identificação e aparecerá na validação pelo QR Code.</p><Link className="button button-sm" href="/associado/configuracoes">Adicionar foto</Link></div></section>}
    {member?.photoURL && (!issued || expired) && <section className={`credential-notice ${expired ? "danger" : ""}`}><RefreshCw /><div><h2>{expired ? "Sua carteirinha venceu" : "Sua carteirinha está pronta para emissão"}</h2><p>{expired ? `A validade terminou em ${formatted(member.cardValidUntil)}. Emita uma nova para continuar usando.` : "Ao emitir, ela terá validade de um ano e não poderá ser renovada antes do vencimento."}</p><button className="button button-sm" disabled={busy || member.status !== "active"} onClick={issue}>{busy ? "Emitindo…" : expired ? "Emitir nova carteirinha" : "Emitir carteirinha"}</button></div></section>}
    {message && <div className="form-message success">{message}</div>}
    {issued && <div className={`id-card ${expired ? "expired" : ""}`}>
      <div className="id-top"><div className="id-brand"><Image src={withBasePath("/logo.png")} width={68} height={68} alt="AUMM" /><span><strong>AUMM</strong><small>Carteira de associado</small></span></div><small>BRASIL</small></div>
      <div className="id-body"><div className="member-photo">{member?.photoURL ? <Image src={member.photoURL} width={100} height={124} unoptimized alt={`Foto de ${member.fullName || "associado"}`} /> : <UserRound size={50} />}</div><div className="id-data"><small>Associado</small><h1>{member?.fullName || "Carregando..."}</h1><strong>{member?.role || "ASSOCIADO"}</strong><p>{member?.memberNumber || "Número em processamento"} · {member?.status === "active" ? "ATIVO" : "INATIVO"}</p><div className="credential-validity"><span>Emissão <b>{formatted(member?.cardIssuedAt)}</b></span><span>Validade <b>{formatted(member?.cardValidUntil)}</b></span></div></div>{verifyUrl && usable && <div className="qr-box"><QRCodeSVG value={verifyUrl} size={94} level="H" /></div>}{expired && <div className="credential-expired-stamp"><AlertTriangle /> VENCIDA</div>}</div>
      <div className="credential-card-foot"><BadgeCheck /> Válida por um ano a partir da emissão. Consulte o QR Code para confirmar a situação.</div>
    </div>}
  </div></main>;
}
