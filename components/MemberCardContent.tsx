"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { ArrowLeft, Download, Printer, Share2, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";

type Member = { fullName?: string; memberNumber?: string; role?: string; status?: string; createdAt?: Timestamp };

export function MemberCardContent() {
  const [member, setMember] = useState<Member | null>(null);
  useEffect(() => onAuthStateChanged(getFirebaseServices().auth, async user => {
    if (!user) return;
    const snapshot = await getDoc(doc(getFirebaseServices().db, "associados", user.uid));
    setMember(snapshot.exists() ? snapshot.data() as Member : null);
  }), []);
  const verifyUrl = typeof window !== "undefined" && member?.memberNumber ? `${window.location.origin}/verificar?token=${encodeURIComponent(member.memberNumber)}` : "";
  async function share() {
    if (!verifyUrl) return;
    if (navigator.share) await navigator.share({ title: "Carteirinha AUMM", text: "Verificação da minha carteirinha AUMM", url: verifyUrl });
    else await navigator.clipboard.writeText(verifyUrl);
  }
  return <main className="id-page"><div className="id-page-inner"><div className="id-actions"><Link href="/associado"><ArrowLeft size={15} /> Voltar</Link><span style={{ display: "flex", gap: 8 }}><button onClick={() => window.print()}><Printer size={15} /> Imprimir/PDF</button><button onClick={share} disabled={!verifyUrl}><Share2 size={15} /> Compartilhar</button></span></div><div className="id-card"><div className="id-top"><div className="id-brand"><Image src="/logo.png" width={68} height={68} alt="AUMM" /><span><strong>AUMM</strong><small>Carteira de associado</small></span></div><small>BLUMENAU · SC</small></div><div className="id-body"><div className="member-photo"><UserRound size={50} /></div><div className="id-data"><small>Associado</small><h1>{member?.fullName || "Carregando..."}</h1><strong>{member?.role || "ASSOCIADO"}</strong><p>{member?.memberNumber || "Número em processamento"} · {member?.status === "active" ? "ATIVO" : "EM ANÁLISE"}</p><p>Desde {member?.createdAt?.toDate().toLocaleDateString("pt-BR") || "—"}</p></div>{verifyUrl && <div className="qr-box"><QRCodeSVG value={verifyUrl} size={94} level="H" /></div>}</div></div><button className="button" style={{ width: "100%", marginTop: 18 }} onClick={() => window.print()}><Download size={17} /> Baixar como PDF</button></div></main>;
}
