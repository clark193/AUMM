"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { BadgeCheck, Search, ShieldX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getFirebaseServices } from "@/lib/firebase";

type PublicMember = { fullName?: string; memberNumber?: string; role?: string; status?: string };

export function MemberVerification() {
  const params = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [member, setMember] = useState<PublicMember | null>(null);
  const [checked, setChecked] = useState(false);

  async function verify(value: string) {
    setChecked(false); setMember(null);
    if (!value.trim()) return;
    const snapshot = await getDoc(doc(getFirebaseServices().db, "publicMembers", value.trim().toUpperCase()));
    setMember(snapshot.exists() ? snapshot.data() as PublicMember : null);
    setChecked(true);
  }
  useEffect(() => {
    if (!initialToken) return;
    let cancelled = false;
    getDoc(doc(getFirebaseServices().db, "publicMembers", initialToken.trim().toUpperCase())).then(snapshot => {
      if (cancelled) return;
      setMember(snapshot.exists() ? snapshot.data() as PublicMember : null);
      setChecked(true);
    });
    return () => { cancelled = true; };
  }, [initialToken]);
  function submit(event: FormEvent) { event.preventDefault(); void verify(token); }

  return <div className="verify-shell"><div style={{ width: "min(520px,100%)" }}><form className="panel verification-search" onSubmit={submit}><label className="field"><span>Número da carteirinha</span><input value={token} onChange={event => setToken(event.target.value)} required placeholder="AUMM-2026-000001" /></label><button className="button"><Search size={16} /> Verificar</button></form>{checked && (member?.status === "active" ? <article className="verify-card" style={{ marginTop: 18 }}><div className="verify-head"><BadgeCheck /><h1>ASSOCIADO AUMM VÁLIDO</h1></div><div className="verify-data"><div className="verify-row"><span>Nome</span><strong>{member.fullName}</strong></div><div className="verify-row"><span>Número</span><strong>{member.memberNumber}</strong></div><div className="verify-row"><span>Cargo</span><strong>{member.role || "Associado"}</strong></div><div className="verify-row"><span>Situação</span><span className="status active">Ativo</span></div></div><div className="verify-foot">Esta página exibe somente dados autorizados para verificação.</div></article> : <article className="verify-card invalid-card" style={{ marginTop: 18 }}><div className="verify-head"><ShieldX /><h1>CARTEIRINHA NÃO ENCONTRADA</h1></div><div className="verify-data"><p>Confira o número informado ou procure a administração da AUMM.</p></div></article>)}<Link className="text-link" href="/" style={{ marginTop: 25 }}>← Voltar ao site</Link></div></div>;
}
