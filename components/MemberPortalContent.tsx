"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import {
  Vote,
  Gift,
  FileText,
  Headphones,
  CalendarDays,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { MemberCommunications } from "./MemberCommunications";
import { MemberPhotoUpload } from "./MemberPhotoUpload";
import { MemberBenefits } from "./MemberBenefits";
import { MemberSidebar, MemberTopbar } from "./MemberNavigation";

type Member = {
  fullName?: string;
  memberNumber?: string;
  role?: string;
  status?: string;
  city?: string;
  createdAt?: Timestamp;
  photoURL?: string;
  email?: string;
  phone?: string;
  cardIssuedAt?: Timestamp;
  cardValidUntil?: Timestamp;
};

export function MemberPortalContent() {
  const [member, setMember] = useState<Member | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(getFirebaseServices().auth, async (user) => {
        if (!user) return;
        const { db } = getFirebaseServices();
        const [snapshot, photo] = await Promise.all([getDoc(doc(db, "associados", user.uid)), getDoc(doc(db, "memberPhotos", user.uid))]);
        const data = snapshot.exists() ? { ...(snapshot.data() as Member), photoURL: photo.data()?.dataUrl || "" } : null;
        setMember(data);
        setCurrentTime(Date.now());
        if (data?.memberNumber && data.photoURL) await updateDoc(doc(db, "publicMembers", data.memberNumber), { photoDataUrl: data.photoURL, updatedAt: serverTimestamp() }).catch(() => undefined);
      }),
    [],
  );

  const name = member?.fullName || "Associado";
  const cardValidUntil = member?.cardValidUntil?.toDate();
  const cardExpired = Boolean(cardValidUntil && cardValidUntil.getTime() < currentTime);
  const cardDaysLeft = cardValidUntil ? Math.ceil((cardValidUntil.getTime() - currentTime) / 86_400_000) : null;
  return (
    <div className="dashboard member-dashboard">
      <MemberSidebar footer={`${member?.status === "active" ? "Associado ativo" : "Cadastro em análise"}${member?.memberNumber ? ` · ${member.memberNumber}` : ""}`} />
      <main className="dashboard-main">
        <MemberTopbar title="Portal do associado" />
        <div className="dash-content">
          <div className="dash-welcome">
            <div>
              <span className="access-badge">Área protegida</span>
              <h2 style={{ marginTop: 12 }}>Olá, {name}!</h2>
              <p>Bem-vindo ao seu espaço AUMM.</p>
            </div>
            <span className={`status ${member?.status || "pending"}`}>
              {member?.status === "active" ? "Associado ativo" : "Em análise"}
            </span>
          </div>
          {(!member?.photoURL || !member?.cardIssuedAt || cardExpired || (cardDaysLeft !== null && cardDaysLeft <= 30)) && <section className={`credential-dashboard-alert ${cardExpired ? "danger" : ""}`}><CalendarDays /><div><strong>{!member?.photoURL ? "Sua carteirinha precisa de uma foto" : !member?.cardIssuedAt ? "Emita sua carteirinha anual" : cardExpired ? "Sua carteirinha está vencida" : `Sua carteirinha vence em ${cardDaysLeft} dia(s)`}</strong><p>{!member?.photoURL ? "Adicione uma foto nas configurações para liberar a emissão." : cardExpired ? "Emita uma nova credencial para voltar a usar o QR Code." : "A carteirinha tem validade de um ano e pode ser renovada após o vencimento."}</p></div><Link className="button button-sm" href={!member?.photoURL ? "/associado/configuracoes" : "/associado/carteirinha"}>{!member?.photoURL ? "Adicionar foto" : "Abrir carteirinha"}</Link></section>}
          <section className="member-hero">
            <div>
              <h2>Sua carteirinha digital</h2>
              <p>
                Consulte seus dados de associação e apresente sua identificação
                quando necessário.
              </p>
            </div>
            <Link className="button" href="/associado/carteirinha">
              Ver carteirinha
            </Link>
          </section>
          <section className="member-profile-strip">
            <MemberPhotoUpload photoURL={member?.photoURL} name={name} onUploaded={(photoURL) => setMember(current => current ? { ...current, photoURL } : current)} />
            <div className="member-profile-copy"><span>Seu perfil</span><h2>{name}</h2><p>Mantenha sua foto atualizada para que a carteirinha digital fique completa.</p></div>
          </section>
          <div className="member-quick-grid">
            <Link href="/associado/beneficios"><Gift /><span><strong>Benefícios</strong><small>Vantagens e parceiros</small></span></Link>
            <Link href="/associado/assembleias"><Vote /><span><strong>Assembleias</strong><small>Participe das decisões</small></span></Link>
            <Link href="/associado/eventos"><CalendarDays /><span><strong>Eventos</strong><small>Agenda da associação</small></span></Link>
            <Link href="/associado/documentos"><FileText /><span><strong>Documentos</strong><small>Atas, editais e normas</small></span></Link>
            <Link href="/contato"><Headphones /><span><strong>Fale com a AUMM</strong><small>Canais de atendimento</small></span></Link>
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-head">
                <h3>Comunicados</h3>
              </div>
              <MemberCommunications />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h3>Seu cadastro</h3>
              </div>
              <div className="verify-row">
                <span>Número</span>
                <strong>
                  {member?.memberNumber || "Aguardando definição"}
                </strong>
              </div>
              <div className="verify-row">
                <span>Cargo</span>
                <strong>{member?.role || "Associado"}</strong>
              </div>
              <div className="verify-row">
                <span>Cidade</span>
                <strong>{member?.city || "Não informada"}</strong>
              </div>
              <div className="verify-row">
                <span>Desde</span>
                <strong>
                  {member?.createdAt?.toDate().toLocaleDateString("pt-BR") ||
                    "—"}
                </strong>
              </div>
            </section>
          </div>
          <section className="panel member-benefits-preview"><div className="panel-head"><div><h3><Gift size={18} /> Benefícios em destaque</h3><p>Condições cadastradas pela administração para associados ativos.</p></div><Link href="/associado/beneficios">Ver todos</Link></div><MemberBenefits limit={3} /></section>
        </div>
      </main>
    </div>
  );
}
