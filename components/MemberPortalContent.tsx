"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  KeyRound,
  LogOut,
  Vote,
  Gift,
  FileText,
  Headphones,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";
import { MemberCommunications } from "./MemberCommunications";
import { MemberPhotoUpload } from "./MemberPhotoUpload";
import { MemberBenefits } from "./MemberBenefits";

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
};

export function MemberPortalContent() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(getFirebaseServices().auth, async (user) => {
        if (!user) return;
        const snapshot = await getDoc(
          doc(getFirebaseServices().db, "associados", user.uid),
        );
        setMember(snapshot.exists() ? (snapshot.data() as Member) : null);
      }),
    [],
  );

  async function logout() {
    await signOut(getFirebaseServices().auth);
    router.push("/associado/login");
  }

  const name = member?.fullName || "Associado";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="dashboard member-dashboard">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/">
          <Image src={withBasePath("/logo.png")} width={51} height={51} alt="AUMM" />
          <span>
            <strong>AUMM</strong>
            <small>Portal do associado</small>
          </span>
        </Link>
        <nav className="side-nav">
          <Link className="active" href="/associado">
            <Home /> Início
          </Link>
          <Link href="/associado/carteirinha">
            <CreditCard /> Carteirinha
          </Link>
          <Link href="/associado/assembleias">
            <Vote /> Assembleias
          </Link>
          <Link href="/associado/beneficios">
            <Gift /> Benefícios
          </Link>
          <Link href="/associado/transparencia">
            <BarChart3 /> Transparência
          </Link>
          <Link href="/associado/alterar-senha">
            <KeyRound /> Alterar senha
          </Link>
        </nav>
        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={16} /> Sair
        </button>
        <div className="sidebar-footer">
          {member?.status === "active"
            ? "Associado ativo"
            : "Cadastro em análise"}
          {member?.memberNumber ? ` · ${member.memberNumber}` : ""}
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dash-top">
          <h1>Portal do associado</h1>
          <div className="dash-profile">
            <Bell size={18} />
            <span>{name}</span>
            <div className="avatar member-avatar">{member?.photoURL ? <Image src={member.photoURL} width={32} height={32} unoptimized alt="" /> : initials || "A"}</div>
          </div>
        </header>
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
            <Link href="/associado/transparencia"><FileText /><span><strong>Documentos</strong><small>Atas e transparência</small></span></Link>
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
