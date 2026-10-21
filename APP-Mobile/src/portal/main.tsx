import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { AdminModuleContent } from "../../../components/AdminModuleContent";
import { AdminDashboardContent } from "../../../components/AdminDashboardContent";
import { AdminShell } from "../../../components/AdminShell";
import { ApplicationForm } from "../../../app/associe-se/ApplicationForm";
import { LoginForm } from "../../../app/associado/login/LoginForm";
import { StatutePage } from "../../../components/StatutePage";
import { PasswordRecoveryForm } from "../../../components/PasswordRecoveryForm";
import { doc, getDoc } from "firebase/firestore";
import { services } from "../firebase";
import { detachPushDevice } from "../push";
import { stopBackgroundShareBeforeAuthChange } from "../backgroundLocation";
import { isActiveSupport } from "../../shared/support";
import { navigate, useRoute } from "./navigation";
import "../../../app/globals.css";
import "./portal.css";

async function beforeLogin() {
  const { auth, db } = services();
  if (auth.currentUser?.isAnonymous) {
    const request = await getDoc(doc(db, "supportRequests", auth.currentUser.uid));
    if (request.exists() && isActiveSupport(request.data().status)) throw new Error("Conclua ou cancele seu pedido de apoio antes de trocar de conta.");
  }
  await stopBackgroundShareBeforeAuthChange();
  await detachPushDevice();
}
class PortalError extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="verify-shell"><section className="auth-card"><h1>Não foi possível abrir esta tela</h1><p>Volte ao aplicativo e tente novamente.</p><button className="button" onClick={() => navigate("/")}>Voltar ao aplicativo</button></section></main> : this.props.children; }
}
function RegistrationFlow({ path }: { path: string }) {
  return <><div hidden={path !== "/associe-se"}><ApplicationForm mobile /></div>{path !== "/associe-se" && <div className="portal-legal"><button className="button button-dark" onClick={() => navigate("/associe-se")}>← Voltar ao cadastro</button>{path === "/estatuto" ? <StatutePage mobile /> : <section className="auth-card portal-privacy"><h1>Sua privacidade</h1><p>Seus dados de filiação são usados pela AUMM para analisar a solicitação e administrar seu vínculo. CPF, data de nascimento e contato não são públicos. Consulte a associação para solicitar correções ou tratar seus direitos sobre os dados.</p><p>Os pedidos ficam vinculados à sessão deste aparelho. A aprovação depende da análise da administração.</p></section>}</div>}</>;
}
function Portal() {
  const route = useRoute();
  const path = route.split("?")[0];
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () => {
      if (path.startsWith("/admin/")) navigate("/admin");
      else if (path === "/estatuto" || path === "/privacidade") navigate("/associe-se");
      else navigate("/");
    });
    return () => { void listener.then((item) => item.remove()); };
  }, [path]);
  let content;
  if (["/associe-se", "/estatuto", "/privacidade"].includes(path)) content = <RegistrationFlow path={path} />;
  else if (path === "/associado/recuperar-senha") content = <PasswordRecoveryForm />;
  else if (path === "/associado/login") content = <LoginForm mobile beforeLogin={beforeLogin} />;
  else if (path === "/admin") content = <AdminShell title="Visão geral"><AdminDashboardContent /></AdminShell>;
  else if (path.startsWith("/admin/")) content = <AdminModuleContent key={path} module={path.slice(7)} />;
  else content = <section className="auth-card"><h1>Tela indisponível</h1><button className="button" onClick={() => navigate("/")}>Voltar ao aplicativo</button></section>;
  return <><div className="portal-appbar"><button onClick={() => navigate("/")}>← Voltar ao aplicativo</button><span>AUMM</span></div><PortalError>{content}</PortalError></>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Portal /></React.StrictMode>);
