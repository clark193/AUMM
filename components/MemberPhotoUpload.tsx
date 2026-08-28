"use client";

import Image from "next/image";
import { Camera, LoaderCircle, UserRound } from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function compressedDataUrl(file: File, dimension = 480) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      element.src = objectUrl;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = dimension; canvas.height = dimension;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Seu navegador não conseguiu preparar a foto.");
    context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, dimension, dimension);
    let dataUrl = canvas.toDataURL("image/webp", .78);
    if (dataUrl.length > 420_000) dataUrl = canvas.toDataURL("image/jpeg", .68);
    if (dataUrl.length > 500_000) throw new Error("A foto ficou muito grande. Escolha uma imagem menor.");
    return dataUrl;
  } finally { URL.revokeObjectURL(objectUrl); }
}

export function MemberPhotoUpload({ photoURL, name, onUploaded, compact = false }: { photoURL?: string; name: string; onUploaded: (url: string) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setMessage("");
    if (!acceptedTypes.includes(file.type)) return setMessage("Use uma imagem JPG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024) return setMessage("A foto deve ter no máximo 5 MB.");
    setBusy(true);
    try {
      const { auth, db } = getFirebaseServices();
      const user = auth.currentUser;
      if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
      const dataUrl = await compressedDataUrl(file);
      await setDoc(doc(db, "memberPhotos", user.uid), { uid: user.uid, dataUrl, contentType: dataUrl.startsWith("data:image/webp") ? "image/webp" : "image/jpeg", updatedAt: serverTimestamp() }, { merge: true });
      const member = await getDoc(doc(db, "associados", user.uid));
      const memberNumber = String(member.data()?.memberNumber || "");
      if (memberNumber) {
        await updateDoc(doc(db, "publicMembers", memberNumber), { photoDataUrl: dataUrl, updatedAt: serverTimestamp() });
      }
      onUploaded(dataUrl);
      setMessage("Foto atualizada com sucesso.");
    } catch (error) {
      setMessage(firebaseErrorMessage(error, "Não foi possível enviar a foto."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return <div className={`member-photo-upload ${compact ? "compact" : ""}`}>
    <div className="member-photo-preview">{photoURL ? <Image src={photoURL} width={82} height={82} unoptimized alt={`Foto de ${name}`} /> : <UserRound />}</div>
    <div><button type="button" className="button button-sm button-dark" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="spin" /> : <Camera />} {busy ? "Enviando…" : photoURL ? "Trocar foto" : "Adicionar foto"}</button>{!compact && <small>JPG, PNG ou WebP · até 5 MB. Não é necessário usar link público.</small>}{message && <span className={message.includes("sucesso") ? "upload-success" : "upload-error"}>{message}</span>}</div>
    <input ref={input} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
  </div>;
}
