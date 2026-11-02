"use client";

import { useState, type FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { Pencil, Save } from "lucide-react";
import { saveMemberProfile } from "@/lib/adminMemberProfile";
import { displayMemberDate, memberDate } from "@/lib/memberDates";
import { maskBirthDate, maskCpf, maskWhatsapp, onlyDigits, parseBrazilianDate, validCpf } from "@/lib/membershipValidation";

export type MemberProfileRecord = {
  id: string; uid?: string | null; fullName?: string; email?: string; cpf?: string; whatsapp?: string; phone?: string;
  birthDate?: unknown; category?: string; updatedAt?: unknown;
  city?: string; state?: string; address?: string; rg?: string; issuingBody?: string;
  maritalStatus?: string; dependents?: string; bloodType?: string; emergencyContact?: string;
};
const optionalFields = [
  ["city", "Cidade"], ["state", "UF"], ["address", "Endereço"], ["rg", "RG"], ["issuingBody", "Órgão emissor"],
  ["maritalStatus", "Estado civil"], ["dependents", "Dependentes"], ["bloodType", "Tipo sanguíneo"], ["emergencyContact", "Contato de emergência"],
] as const;

export function MemberProfileEditor({ member, onSaved }: { member: MemberProfileRecord; onSaved: (data: Partial<MemberProfileRecord>) => void }) {
  const initialForm = () => ({
    fullName: member.fullName || "", email: member.email || "", cpf: maskCpf(member.cpf || ""),
    whatsapp: maskWhatsapp(member.whatsapp || member.phone || ""), birthDate: memberDate(member.birthDate) ? displayMemberDate(member.birthDate) : "",
    category: member.category || "", ...Object.fromEntries(optionalFields.map(([key]) => [key, String(member[key] || "")])),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const emailChanged = form.email.trim().toLowerCase() !== member.email?.trim().toLowerCase();
  const update = (field: string, value: string) => setForm(current => ({ ...current, [field]: value }));
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const date = parseBrazilianDate(form.birthDate);
      if (!date || date.getTime() > Date.now() || date.getUTCFullYear() < 1900) throw new Error("Informe uma data de nascimento válida.");
      if (!validCpf(form.cpf)) throw new Error("Informe um CPF válido.");
      if (onlyDigits(form.whatsapp).length < 10) throw new Error("Informe um WhatsApp com DDD.");
      const result = await saveMemberProfile(member.id, form, memberDate(member.updatedAt)?.getTime() ?? null, password);
      onSaved({ ...form, fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), cpf: onlyDigits(form.cpf), whatsapp: maskWhatsapp(form.whatsapp), phone: maskWhatsapp(form.whatsapp), birthDate: Timestamp.fromDate(date), updatedAt: Timestamp.fromMillis(result.updatedAtMillis) });
      setEditing(false); setMessage({ error: false, text: result.message });
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : "Não foi possível atualizar o cadastro." }); }
    finally { setBusy(false); setPassword(""); }
  }
  return <section className="member-profile-editor member-account-admin" aria-label="Edição dos dados do associado">
    <h2>Dados do associado · nível 1</h2>
    {!editing && <button className="button button-sm" type="button" onClick={() => { setForm(initialForm()); setMessage(null); setEditing(true); }}><Pencil size={16} /> Editar dados do associado</button>}
    {editing && <form onSubmit={save}>
      <fieldset disabled={busy} className="member-profile-fields">
        <div className="form-grid">
          <label className="field"><span>Nome completo</span><input required autoComplete="name" minLength={3} maxLength={200} value={form.fullName} onChange={e => update("fullName", e.target.value)} /></label>
          <label className="field"><span>Data de nascimento</span><input required inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10} value={form.birthDate} onChange={e => update("birthDate", maskBirthDate(e.target.value))} /></label>
          <label className="field"><span>CPF</span><input required inputMode="numeric" maxLength={14} value={form.cpf} onChange={e => update("cpf", maskCpf(e.target.value))} /></label>
          <label className="field"><span>WhatsApp</span><input required inputMode="numeric" maxLength={15} value={form.whatsapp} onChange={e => update("whatsapp", maskWhatsapp(e.target.value))} /></label>
          <label className="field"><span>E-mail de acesso</span><input required type="email" autoComplete="off" maxLength={200} value={form.email} onChange={e => update("email", e.target.value)} /></label>
          <label className="field"><span>Categoria</span><select required value={form.category} onChange={e => update("category", e.target.value)}><option value="">Selecione</option><option>Motoboy</option><option>Ciclista</option></select></label>
        </div>
        <details><summary>Outros dados pessoais</summary><div className="form-grid">{optionalFields.map(([key, label]) => <label className="field" key={key}><span>{label}</span><input maxLength={key === "address" ? 600 : key === "state" ? 2 : 200} value={form[key]} onChange={e => update(key, e.target.value)} /></label>)}</div></details>
        {emailChanged && member.uid && <><p>O novo e-mail será usado no próximo login. Confirme sua senha de administrador para salvar essa mudança.</p><label className="field"><span>Sua senha de administrador</span><input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label></>}
        <div className="member-detail-actions"><button className="button" type="submit"><Save size={16} /> {busy ? "Salvando…" : "Salvar dados do associado"}</button><button className="button button-dark" type="button" onClick={() => { setEditing(false); setPassword(""); setMessage(null); }}>Cancelar edição</button></div>
      </fieldset>
    </form>}
    {message && <p className={`form-message ${message.error ? "error" : "success"}`} role={message.error ? "alert" : "status"}>{message.text}</p>}
  </section>;
}
