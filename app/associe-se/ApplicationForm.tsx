"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Send, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { firebaseEnabled } from "@/lib/firebase";
import { submitApplication, type ApplicationPayload } from "@/lib/application";
import { withBasePath } from "@/lib/paths";

const initial: ApplicationPayload = {
  fullName: "",
  email: "",
  phone: "",
  city: "Blumenau",
  consent: false,
};
export function ApplicationForm() {
  const [data, setData] = useState(initial);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const update = (name: keyof ApplicationPayload, value: string | boolean) =>
    setData((v) => ({ ...v, [name]: value }));
  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (data.phone.replace(/\D/g, "").length < 10)
        throw new Error("Informe um telefone celular válido.");
      if (!data.consent)
        throw new Error(
          "É necessário aceitar os termos e a política de privacidade.",
        );
      if (!firebaseEnabled)
        throw new Error("Cadastro temporariamente indisponível.");
      if (password.length < 8)
        throw new Error("Crie uma senha com pelo menos 8 caracteres.");
      if (password !== passwordConfirmation)
        throw new Error("A confirmação da senha está diferente.");
      const id = await submitApplication(data, password);
      setMessage({
        type: "success",
        text: `Cadastro enviado com sucesso. Protocolo: ${id.slice(0, 12).toUpperCase()}.`,
      });
      setData(initial);
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Não foi possível enviar.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="form-shell">
      <div className="container form-wrap">
        <aside className="form-aside">
          <Link href="/">
            <ArrowLeft size={17} /> Voltar ao site
          </Link>
          <Image src={withBasePath("/logo.png")} width={92} height={92} alt="AUMM" />
          <h2>Junte-se à AUMM</h2>
          <p>
            Preencha seus dados com atenção. O envio inicia uma análise e não
            ativa automaticamente a associação.
          </p>
          <div className="steps">
            <span>
              <i>1</i> Envie seus dados
            </span>
            <span>
              <i>2</i> Aguarde a análise
            </span>
            <span>
              <i>3</i> Receba a confirmação
            </span>
          </div>
        </aside>
        <form className="application-form" onSubmit={send}>
          <div className="form-heading">
            <div>
              <h1>Solicitação de associação</h1>
              <p>Campos com * são obrigatórios.</p>
            </div>
            <span className="demo-badge">
              Ambiente {firebaseEnabled ? "conectado" : "indisponível"}
            </span>
          </div>
          <FormSection title="Seus dados">
            <Field
              label="Nome completo *"
              name="fullName"
              value={data.fullName}
              onChange={update}
              required
            />
            <Field
              label="E-mail *"
              name="email"
              type="email"
              value={data.email}
              onChange={update}
              required
            />
            <Field
              label="Telefone celular *"
              name="phone"
              type="tel"
              value={data.phone}
              onChange={update}
              required
              placeholder="(47) 99999-9999"
            />
            <Field
              label="Cidade *"
              name="city"
              value={data.city}
              onChange={update}
              required
            />
          </FormSection>
          <FormSection title="Crie seu acesso">
            <label className="field">
              <span><KeyRound size={14} /> Senha *</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                placeholder="Mínimo de 8 caracteres"
              />
            </label>
            <label className="field">
              <span><ShieldCheck size={14} /> Confirmar senha *</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                minLength={8}
                required
                placeholder="Digite a mesma senha"
              />
            </label>
            <p className="password-notice">
              Sua senha fica protegida no Firebase Authentication e não é exibida para a administração. O acesso ao portal será liberado somente depois da aprovação.
            </p>
          </FormSection>
          <label className="consent">
            <input
              type="checkbox"
              required
              checked={data.consent}
              onChange={(e) => update("consent", e.target.checked)}
            />
            <span>
              Li e aceito a{" "}
              <Link className="text-link" href="/privacidade">
                Política de Privacidade
              </Link>
              , autorizo o tratamento dos dados para análise da associação e
              declaro que as informações são verdadeiras.
            </span>
          </label>
          {message && (
            <div className={`form-message ${message.type}`}>
              {message.type === "success" && <CheckCircle2 size={16} />}{" "}
              {message.text}
            </div>
          )}
          <button className="button" disabled={busy}>
            {busy ? (
              "Enviando..."
            ) : (
              <>
                Enviar solicitação <Send size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-section">
      <h2>{title}</h2>
      <div className="form-grid">{children}</div>
    </div>
  );
}
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  ...props
}: {
  label: string;
  name: keyof ApplicationPayload;
  value: string;
  onChange: (n: keyof ApplicationPayload, v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...props}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </label>
  );
}
