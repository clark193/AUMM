import {useEffect,useRef} from "react";
import {ApplicationForm} from "../../app/associe-se/ApplicationForm";
import {StatutePage} from "../../components/StatutePage";
import {PasswordRecoveryForm} from "../../components/PasswordRecoveryForm";
import {activateEmbeddedNavigation,navigate,useRoute} from "./portal/navigation";
export default function RegistrationWizard({onExit}:{onExit:()=>void}){
 const exit=useRef(onExit);exit.current=onExit;const path=useRoute().split("?")[0];
 useEffect(()=>activateEmbeddedNavigation("/associe-se",()=>exit.current()),[]);
 return <div className="mobile-member-feature mobile-registration"><div hidden={path!=="/associe-se"}><ApplicationForm mobile/></div>{path!=="/associe-se"&&<><button className="btn secondary" onClick={()=>navigate("/associe-se")}>Voltar ao cadastro</button>{path==="/estatuto"?<StatutePage mobile/>:<section><h2>Sua privacidade</h2><p>Seus dados são usados pela AUMM para analisar a filiação e administrar o vínculo. CPF, nascimento e contato não são públicos. Procure a associação para corrigir seus dados.</p></section>}</>}</div>;
}
export function AccountRecovery({onExit}:{onExit:()=>void}){const exit=useRef(onExit);exit.current=onExit;useEffect(()=>activateEmbeddedNavigation("/associado/recuperar-senha",()=>exit.current()),[]);return <div className="mobile-member-feature mobile-registration"><PasswordRecoveryForm/></div>;}
