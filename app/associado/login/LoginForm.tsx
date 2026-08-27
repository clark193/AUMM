"use client";

import Image from "next/image";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, Mail, ShieldCheck, UserRound } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { withBasePath } from "@/lib/paths";

const ADMIN_LOGIN_EMAIL = "admin.final@aummteste.com.br";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const admin = params.get("destino") === "admin";
  const denied = params.get("erro") === "acesso";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    denied
      ? admin
        ? "Este usuário não possui acesso administrativo."
        : "Seu cadastro ainda não está autorizado para acessar o portal."
      : "",
  );
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!firebaseEnabled)
        throw new Error("Serviço de acesso não configurado.");
      const { auth, db } = getFirebaseServices();
      const normalized = identifier.trim().toLowerCase();
      const email =
        admin && normalized === "admin" ? ADMIN_LOGIN_EMAIL : normalized;
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (admin) {
        const access = await getDoc(doc(db, "adminRoles", credential.user.uid));
        if (!access.exists() || access.data().active !== true)
          throw new Error("Este usuário não possui acesso administrativo.");
      } else {
        const member = await getDoc(doc(db, "associados", credential.user.uid));
        if (!member.exists() || member.data().status !== "active") throw new Error("Seu cadastro ainda não está autorizado para acessar o portal.");
        if (member.data().mustChangePassword === true) {
          router.push("/associado/alterar-senha?primeiro=1");
          return;
        }
      }
      router.push(admin ? "/admin" : "/associado");
    } catch (reason) {
      const text =
        reason instanceof Error &&
        reason.message.includes("auth/invalid-credential")
          ? "Usuário ou senha incorretos."
          : reason instanceof Error
            ? reason.message
            : "Falha ao entrar.";
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`auth-page ${admin ? "auth-page-admin" : ""}`}>
      <section className="auth-brand">
        <Link className="auth-logo" href="/">
          <Image
            src={withBasePath("/logo.png")}
            width={78}
            height={78}
            alt="AUMM"
          />
          <strong>AUMM</strong>
        </Link>
        <div>
          <h1>
            Sua associação.
            <br />
            Sempre com você.
          </h1>
          <p>
            Acesse sua carteirinha, benefícios, comunicados e solicitações em um
            só lugar.
          </p>
        </div>
        <small>Área protegida · Blumenau/SC</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card" key={admin ? "admin" : "associado"}>
          {admin && (
            <div className="admin-login-banner">
              <ShieldCheck size={22} />
              <span>
                <small>Ambiente restrito</small>
                <strong>Painel administrativo</strong>
              </span>
            </div>
          )}
          <span className="eyebrow">Acesso seguro</span>
          <h2>{admin ? "Administração" : "Área do associado"}</h2>
          <p>
            {admin
              ? "Use seu usuário administrativo."
              : "Use o e-mail cadastrado na AUMM."}
          </p>
          <form onSubmit={login}>
            <label className="field">
              <span>
                {admin ? <UserRound size={14} /> : <Mail size={14} />}{" "}
                {admin ? "Usuário ou e-mail" : "E-mail"}
              </span>
              <input
                type={admin ? "text" : "email"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoCapitalize="none"
                required
                placeholder={admin ? "admin" : "seu@email.com"}
              />
            </label>
            <label className="field">
              <span>
                <LockKeyhole size={14} /> Senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="Sua senha"
              />
            </label>
            {error && <div className="form-message error">{error}</div>}
            <button className="button" disabled={busy}>
              {busy ? (
                "Entrando..."
              ) : (
                <>
                  Entrar <LogIn size={16} />
                </>
              )}
            </button>
          </form>
          {!admin && (
            <div className="auth-links">
              <Link href="/associado/recuperar-senha">Esqueci minha senha</Link>
              <Link href="/associe-se">Quero me associar</Link>
            </div>
          )}
          <div className="auth-links">
            <Link href="/">← Voltar ao site</Link>
            <Link
              href={
                admin ? "/associado/login" : "/associado/login?destino=admin"
              }
            >
              {admin ? "Portal do associado" : "Acesso administrativo"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
