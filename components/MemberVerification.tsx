"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { BadgeCheck, Search, ShieldX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getFirebaseServices } from "@/lib/firebase";

type PublicMember = { fullName?: string; memberNumber?: string; role?: string; status?: string; photoDataUrl?: string; credentialType?: "member" | "admin"; cardIssuedAt?: Timestamp; cardValidUntil?: Timestamp };

export function MemberVerification() {
  const params = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [member, setMember] = useState<PublicMember | null>(null);
  const [checked, setChecked] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);

  async function verify(value: string) {
    setChecked(false); setMember(null);
    if (!value.trim()) return;
    const snapshot = await getDoc(doc(getFirebaseServices().db, "publicMembers", value.trim().toUpperCase()));
    setMember(snapshot.exists() ? snapshot.data() as PublicMember : null);
    setCheckedAt(Date.now());
    setChecked(true);
  }
  useEffect(() => {
    if (!initialToken) return;
    let cancelled = false;
    getDoc(doc(getFirebaseServices().db, "publicMembers", initialToken.trim().toUpperCase())).then(snapshot => {
      if (cancelled) return;
      setMember(snapshot.exists() ? snapshot.data() as PublicMember : null);
      setCheckedAt(Date.now());
      setChecked(true);
    });
    return () => { cancelled = true; };
  }, [initialToken]);
  function submit(event: FormEvent) { event.preventDefault(); void verify(token); }

  const validUntil = member?.cardValidUntil?.toDate();
  const valid = Boolean(member?.status === "active" && member.photoDataUrl && validUntil && validUntil.getTime() >= checkedAt);
  const invalidReason = member ? !member.photoDataUrl ? "Esta credencial não possui a foto obrigatória." : !validUntil ? "Esta credencial ainda não foi emitida no novo formato anual." : validUntil.getTime() < checkedAt ? `Esta credencial venceu em ${validUntil.toLocaleDateString("pt-BR")}.` : "O cadastro está inativo." : "Confira o número informado ou procure a administração da AUMM.";
  return <div className="verify-shell"><div style={{ width: "min(520px,100%)" }}><form className="panel verification-search" onSubmit={submit}><label className="field"><span>Número da carteirinha</span><input value={token} onChange={event => setToken(event.target.value)} required placeholder="AUMM-2026-000001" /></label><button className="button"><Search size={16} /> Verificar</button></form>{checked && (valid ? <article className="verify-card" style={{ marginTop: 18 }}><div className="verify-head"><BadgeCheck /><h1>{member?.credentialType === "admin" ? "CREDENCIAL ADMINISTRATIVA AUMM VÁLIDA" : "ASSOCIADO AUMM VÁLIDO"}</h1></div><div className="verification-photo"><Image src={member!.photoDataUrl!} width={112} height={112} unoptimized alt={`Foto de ${member?.fullName || "titular"}`} /></div><div className="verify-data"><div className="verify-row"><span>Nome</span><strong>{member?.fullName}</strong></div><div className="verify-row"><span>Número</span><strong>{member?.memberNumber}</strong></div><div className="verify-row"><span>{member?.credentialType === "admin" ? "Cargo" : "Categoria"}</span><strong>{member?.role || "Associado"}</strong></div><div className="verify-row"><span>Validade</span><strong>{validUntil?.toLocaleDateString("pt-BR")}</strong></div><div className="verify-row"><span>Situação</span><span className="status active">Ativa e válida</span></div></div><div className="verify-foot">Esta página exibe somente dados autorizados para verificação.</div></article> : <article className="verify-card invalid-card" style={{ marginTop: 18 }}><div className="verify-head"><ShieldX /><h1>{member ? "CARTEIRINHA INVÁLIDA" : "CARTEIRINHA NÃO ENCONTRADA"}</h1></div><div className="verify-data"><p>{invalidReason}</p></div></article>)}<Link className="text-link" href="/" style={{ marginTop: 25 }}>← Voltar ao site</Link></div></div>;
}
