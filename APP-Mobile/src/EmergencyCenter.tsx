import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { Siren } from "lucide-react";
import { wakeExternalNotifications } from "../../lib/externalNotifications";
import { friendly, services } from "./firebase";
import { locate } from "./platform";
import { isPreview, previewPosition } from "./preview";
import { useEmergencyContact } from "./EmergencyContact";
type Alert={status:string;location:{lat:number;lng:number;accuracy:number}|null};
const labels:Record<string,string>={open:"Alerta registrado para a diretoria",contacting:"A diretoria está entrando em contato",resolved:"Atendimento encerrado",cancelled:"Alerta cancelado"};
export default function EmergencyCenter({uid,onConfigure,onCancel}:{uid:string;onConfigure:()=>void;onCancel:()=>void}){
  const {contact,loading,error:contactError}=useEmergencyContact(uid);
  const [alert,setAlert]=useState<Alert|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[warning,setWarning]=useState("");
  const inFlight=useRef(false);
  useEffect(()=>{if(isPreview)return;return onSnapshot(doc(services().db,"emergencyAlerts",uid),{includeMetadataChanges:true},s=>{if(!s.metadata.hasPendingWrites)setAlert(s.exists()?s.data() as Alert:null);},e=>setError(friendly(e)));},[uid]);
  const active=alert&&["open","contacting"].includes(alert.status);
  async function send(){
    if(inFlight.current||!contact||active)return;inFlight.current=true;setBusy(true);setError("");setWarning("");
    try{
      if(!navigator.onLine&&!isPreview)throw new Error("Sem internet. Não foi possível registrar o alerta. Procure conexão ou ligue para o serviço de emergência.");
      let location=null;
      try{location=isPreview?{...previewPosition}:await locate();}catch{setWarning("GPS indisponível. Alerta sem localização; a diretoria confirmará o local por telefone.");}
      if(isPreview){setAlert({status:"open",location});return;}
      const {db}=services();
      await runTransaction(db,async tx=>{
        const ref=doc(db,"emergencyAlerts",uid);
        const [member,saved,previous]=await Promise.all([tx.get(doc(db,"associados",uid)),tx.get(doc(db,"emergencyContacts",uid)),tx.get(ref)]);
        if(member.data()?.status!=="active"||member.data()?.mustChangePassword)throw new Error("É necessário um cadastro de associado ativo.");
        if(!saved.exists())throw new Error("Cadastre primeiro seu contato em Meu Perfil.");
        if(previous.exists()&&["open","contacting"].includes(previous.data().status))throw new Error("Seu alerta já está em andamento.");
        const data={ownerUid:uid,fullName:String(member.data()?.fullName||"Associado AUMM"),memberNumber:String(member.data()?.memberNumber||""),phone:saved.data().phone,contactName:saved.data().name,contactPhone:saved.data().contactPhone,incidentId:crypto.randomUUID(),location,status:"open",createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
        tx.set(ref,data);tx.set(doc(db,"emergencyAdminSignals",uid),{incidentId:data.incidentId,status:data.status,createdAt:data.createdAt,updatedAt:data.updatedAt});
      },{maxAttempts:1});
      wakeExternalNotifications(services());
    }catch(e){setError(friendly(e));}finally{inFlight.current=false;setBusy(false);}
  }
  async function cancelAlert(){setBusy(true);setError("");try{
    if(isPreview){setAlert(value=>value?{...value,status:"cancelled"}:null);return;}
    const {db}=services();await runTransaction(db,async tx=>{const ref=doc(db,"emergencyAlerts",uid),current=await tx.get(ref);if(!current.exists())throw new Error("Alerta não encontrado.");const updatedAt=serverTimestamp();tx.update(ref,{status:"cancelled",updatedAt});tx.set(doc(db,"emergencyAdminSignals",uid),{incidentId:current.data().incidentId,status:"cancelled",createdAt:current.data().createdAt,updatedAt});});
  }catch(e){setError(friendly(e));}finally{setBusy(false);}}
  if(loading)return <p role="status">Verificando contato cadastrado…</p>;
  return <section className="emergency-center"><div className="emergency-intro"><Siren size={32}/><h3>Alerta de emergência</h3><p>A diretoria recebe o alerta e liga manualmente para você ou para seu contato cadastrado.</p></div>{isPreview&&<p className="info-panel">Demonstração: nenhum alerta ou ligação será enviado.</p>}{(error||contactError)&&<p className="error-panel" role="alert">{error||contactError}</p>}{warning&&<p role="status">{warning}</p>}{active?<div className="emergency-progress" role="status"><strong>{labels[alert.status]}</strong><p>{alert.location?"Localização do alerta disponível à equipe autorizada.":"Alerta sem localização. A diretoria confirmará o local ao ligar."}</p><p>O registro não confirma que alguém já leu ou iniciou atendimento. Nenhuma mensagem automática é enviada ao seu contato.</p>{isPreview&&<button className="btn secondary" onClick={()=>setAlert(value=>value?{...value,status:"contacting"}:null)}>Simular diretoria entrando em contato</button>}<button className="btn secondary" disabled={busy} onClick={()=>void cancelAlert()}>Cancelar alerta · acionei por engano</button></div>:!contact||!contact.name||!contact.contactPhone||!contact.phone?<><p>Para utilizar o botão de emergência, cadastre primeiro seu contato de emergência na aba Meu Perfil.</p><button className="btn" onClick={onConfigure}>Cadastrar contato em Meu Perfil</button></>:<div className="emergency-confirm">{alert&&<p role="status">{labels[alert.status]}</p>}<h3>Confirmar emergência?</h3><p>Ao confirmar, seu nome, telefones cadastrados, data, horário e localização disponível serão registrados para a diretoria da AUMM entrar em contato. Deseja continuar?</p><button className="emergency-trigger" disabled={busy} onClick={()=>void send()}>{busy?"Registrando alerta…":"Confirmar Emergência"}</button><button className="btn secondary" disabled={busy} onClick={onCancel}>Cancelar</button></div>}</section>;
}
export function EmergencyHome({uid,onOpen}:{uid:string;onOpen:()=>void}){
  const [status,setStatus]=useState("");useEffect(()=>{if(isPreview)return;return onSnapshot(doc(services().db,"emergencyAlerts",uid),s=>setStatus(String(s.data()?.status||"")),()=>setStatus(""));},[uid]);
  return <button className="emergency-home" onClick={onOpen}><Siren size={24}/><span><strong>{["open","contacting"].includes(status)?"Alerta de emergência em andamento":"Botão de emergência"}</strong><small>{labels[status]||"Acidente · avise a diretoria com uma confirmação"}</small></span><span aria-hidden>›</span></button>;
}
