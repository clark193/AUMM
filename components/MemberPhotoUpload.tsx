"use client";

import Image from "next/image";
import { Camera, LoaderCircle, UserRound } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

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
      const { auth, db, storage } = getFirebaseServices();
      const user = auth.currentUser;
      if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const location = ref(storage, `members/${user.uid}/profile-${Date.now()}.${extension}`);
      await uploadBytes(location, file, { contentType: file.type, customMetadata: { ownerUid: user.uid } });
      const url = await getDownloadURL(location);
      await updateDoc(doc(db, "associados", user.uid), { photoURL: url, updatedAt: serverTimestamp() });
      onUploaded(url);
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
