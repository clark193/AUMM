"use client";
import { useState, type FormEvent } from "react";
import { deletionWhatsappUrl, type DeletionScope } from "@/lib/deletionRequest";
import { legalWhatsapp, legalWhatsappLabel } from "@/lib/legalContent";

export function DeletionRequestForm() {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [scope, setScope] = useState<DeletionScope>("account"), [details, setDetails] = useState(""), [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { window.location.assign(deletionWhatsappUrl({ name, email, scope, details })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Revise os dados da solicitação."); }
  }
  return <section className="panel" id="solicitar-exclusao" aria-labelledby="deletion-form-title" style={{ padding: "clamp(20px,4vw,32px)", marginBottom: 32 }}>
    <h2 id="deletion-form-title">Solicitar exclusão da conta e dos dados</h2>
    <p>Atendimento oficial AUMM: <a href={`https://wa.me/${legalWhatsapp}?text=${encodeURIComponent("Quero atendimento humano para solicitar a exclusão da minha conta AUMM e dos dados associados.")}`}>{legalWhatsappLabel} — WhatsApp</a>.</p>
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="field full"><span>O que deseja solicitar?</span><select value={scope} onChange={event => setScope(event.target.value as DeletionScope)}><option value="account">Excluir minha conta e os dados associados</option><option value="data">Excluir apenas dados específicos</option></select></label>
        <label className="field"><span>Nome para atendimento (opcional)</span><input value={name} onChange={event => setName(event.target.value)} maxLength={120} autoComplete="name" /></label>
        <label className="field"><span>E-mail usado no cadastro AUMM</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} autoComplete="email" required /></label>
        <label className="field full"><span>{scope === "data" ? "Quais dados deseja excluir?" : "Informações adicionais (opcional)"}</span><textarea value={details} onChange={event => setDetails(event.target.value)} maxLength={800} required={scope === "data"} placeholder="Não informe senha, código de acesso, CPF completo ou documentos." /></label>
      </div>
      <p>Ao continuar, as informações preenchidas serão usadas para preparar uma mensagem no WhatsApp/Meta. Confira a mensagem e envie na conversa para registrar o pedido com a AUMM. Este formulário não envia e-mail, não gera protocolo automaticamente e não exclui a conta por si só.</p>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="button">Preparar pedido no WhatsApp</button>
    </form>
    <p style={{ marginTop: 18 }}>Se não puder usar o WhatsApp, solicite orientação pelo telefone <a href={`tel:+${legalWhatsapp}`}>{legalWhatsappLabel}</a> ou pela <a href="/contato/">página de contato</a>.</p>
  </section>;
}
