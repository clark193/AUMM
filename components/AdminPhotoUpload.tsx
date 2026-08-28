"use client";

import Image from "next/image";
import { Camera, LoaderCircle, UserRound } from "lucide-react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { compressedDataUrl } from "./MemberPhotoUpload";
import { writeAdminAudit } from "@/lib/audit";

export function AdminPhotoUpload({ photoURL, name, onUploaded }: { photoURL?: string; name: string; onUploaded: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return; setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Use uma imagem JPG, PNG ou WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("A foto deve ter no máximo 5 MB."); return; }
    setBusy(true);
    try { const { auth, db } = getFirebaseServices(); if (!auth.currentUser) throw new Error("Sua sessão expirou."); const dataUrl = await compressedDataUrl(file); await setDoc(doc(db, "adminPhotos", auth.currentUser.uid), { uid: auth.currentUser.uid, dataUrl, contentType: dataUrl.startsWith("data:image/webp") ? "image/webp" : "image/jpeg", updatedAt: serverTimestamp() }, { merge: true }); await writeAdminAudit({ action: "ADMIN_PROFILE_PHOTO_UPDATED", resource: "adminPhotos", resourceId: auth.currentUser.uid, description: "Atualizou a própria foto de perfil administrativa." }).catch(() => undefined); onUploaded(dataUrl); setMessage("Foto atualizada com sucesso."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a foto."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="member-photo-upload"><div className="member-photo-preview">{photoURL ? <Image src={photoURL} width={82} height={82} unoptimized alt={`Foto de ${name}`} /> : <UserRound />}</div><div><button className="button button-sm button-dark" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="spin" /> : <Camera />} {busy ? "Enviando…" : photoURL ? "Trocar foto" : "Adicionar foto"}</button><small>A foto aparecerá no topo do painel administrativo.</small>{message && <span className={message.includes("sucesso") ? "upload-success" : "upload-error"}>{message}</span>}</div><input ref={input} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} /></div>;
}
