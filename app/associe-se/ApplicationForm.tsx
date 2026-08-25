"use client";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, LoaderCircle, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { loadOwnMembershipRequest, submitApplication, type ApplicationPayload, type MembershipRequestStatus } from "@/lib/application";
import { maskBirthDate, maskCpf, maskWhatsapp } from "@/lib/membershipValidation";
import { firebaseEnabled } from "@/lib/firebase";

const initial: ApplicationPayload = { fullName: "", birthDate: "", cpf: "", whatsapp: "", email: "", category: "", statuteAccepted: false };
function statusCopy(request: MembershipRequestStatus) {
  if (request.status === "approved") return { icon: <CheckCircle2 />, title: "Sua filiação foi aprovada!", badge: "APROVADA", text: "Sua solicitação foi aprovada pela AUMM. Entre em contato com a administração para receber as orientações de acesso ao Portal do Associado." };
  if (request.status === "rejected") return { icon: <X />, title: "Atualização da sua solicitação", badge: "NÃO APROVADA", text: "Sua solicitação não foi aprovada neste momento. Entre em contato com a AUMM caso queira mais informações." };
  return { icon: <Check />, title: "Seu pedido já foi recebido", badge: "EM ANÁLISE", text: "Sua solicitação de filiação à AUMM já está registrada. Aguarde a análise da administração. Não é necessário realizar uma nova solicitação." };
}
export function ApplicationForm() {
  const [data, setData] = useState(initial);
  const [request, setRequest] = useState<MembershipRequestStatus | null>(null);
  const [checking, setChecking] = useState(firebaseEnabled);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!firebaseEnabled) return;
    loadOwnMembershipRequest().then(setRequest).catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível consultar sua solicitação.")).finally(() => setChecking(false));
  }, []);
  const update = <K extends keyof ApplicationPayload>(name: K, value: ApplicationPayload[K]) => setData((current) => ({ ...current, [name]: value }));
  function prepare(event: FormEvent) { event.preventDefault(); setError(""); setConfirming(true); }
  async function confirm() {
    setBusy(true); setError("");
    try { setRequest(await submitApplication(data)); setConfirming(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível enviar a solicitação."); setConfirming(false); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="membership-page"><div className="membership-loading"><LoaderCircle className="spin" /><p>Consultando sua solicitação…</p></div></main>;
  if (request) { const copy = statusCopy(request); return <main className="membership-page"><section className={`membership-status membership-status-${request.status}`}><div className="membership-status-icon">{copy.icon}</div><span className="eyebrow">Pedido recebido</span><h1>{copy.title}</h1><p>{copy.text}</p><div className="membership-status-badge"><small>Status</small><strong>{copy.badge}</strong></div>{request.memberNumber && <p className="membership-number">Número de associado: <strong>{request.memberNumber}</strong></p>}<Link className="button" href="/">Voltar para o site</Link></section></main>; }
  return <main className="membership-page"><div className="membership-wrap"><Link className="membership-back" href="/"><ArrowLeft size={17} /> Voltar ao site</Link><header className="membership-heading"><span className="eyebrow">Filiação AUMM</span><h1>Faça parte da AUMM</h1><p>Junte-se à Associação União Maior Motoboys e faça parte de uma entidade criada para representar e fortalecer os profissionais de entrega.</p></header><form className="membership-form" onSubmit={prepare}>
    <label className="field"><span>Nome completo</span><input required autoComplete="name" value={data.fullName} onChange={(e) => update("fullName", e.target.value)} /></label>
    <label className="field"><span>Data de nascimento</span><input required inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10} value={data.birthDate} onChange={(e) => update("birthDate", maskBirthDate(e.target.value))} /></label>
    <label className="field"><span>CPF</span><input required inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} value={data.cpf} onChange={(e) => update("cpf", maskCpf(e.target.value))} /></label>
    <label className="field"><span>WhatsApp</span><input required inputMode="numeric" autoComplete="tel" placeholder="(47) 99999-9999" maxLength={15} value={data.whatsapp} onChange={(e) => update("whatsapp", maskWhatsapp(e.target.value))} /></label>
    <label className="field membership-full"><span>E-mail</span><input required type="email" autoComplete="email" value={data.email} onChange={(e) => update("email", e.target.value)} /></label>
    <fieldset className="membership-category membership-full"><legend>Como você trabalha?</legend><label><input required type="radio" name="category" checked={data.category === "Motoboy"} onChange={() => update("category", "Motoboy")} /><span>Motoboy</span></label><label><input required type="radio" name="category" checked={data.category === "Ciclista"} onChange={() => update("category", "Ciclista")} /><span>Ciclista</span></label></fieldset>
    <label className="membership-consent membership-full"><input required type="checkbox" checked={data.statuteAccepted} onChange={(e) => update("statuteAccepted", e.target.checked)} /><span>Li e concordo com o <Link href="/estatuto" target="_blank" rel="noopener noreferrer">Estatuto Social da AUMM</Link> e solicito minha filiação à Associação União Maior Motoboys.</span></label>
    {error && <div className="form-message error membership-full">{error}</div>}<button className="button membership-submit membership-full" disabled={!firebaseEnabled}><Send size={17} /> Solicitar filiação</button><p className="membership-privacy membership-full">Seus dados serão utilizados exclusivamente para analisar e administrar sua solicitação de filiação à AUMM, conforme as regras da associação e sua <Link href="/privacidade">política de privacidade</Link>.</p>
  </form></div>{confirming && <div className="membership-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div><ShieldCheck size={34} /><h2 id="confirm-title">Confirmar solicitação</h2><p>Você confirma que os dados informados estão corretos e deseja solicitar sua filiação à AUMM?</p><div><button className="button button-dark" type="button" onClick={() => setConfirming(false)} disabled={busy}>Voltar</button><button className="button" type="button" onClick={confirm} disabled={busy}>{busy ? <><LoaderCircle className="spin" /> Enviando…</> : "Confirmar solicitação"}</button></div></div></div>}</main>;
}
