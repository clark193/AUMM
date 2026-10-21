import { useEffect, useState, type FormEvent } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { emergencyPhone } from "../../lib/emergencyMessage";
import { friendly, services } from "./firebase";
import { isPreview } from "./preview";
export type EmergencyContact = { name: string; contactPhone: string; phone: string };
export function useEmergencyContact(uid: string) {
  const [contact,setContact]=useState<EmergencyContact|null>(isPreview?{name:"Contato de demonstração",contactPhone:"+5547999990000",phone:"+5547999990001"}:null);
  const [loading,setLoading]=useState(!isPreview),[error,setError]=useState("");
  useEffect(()=>{if(isPreview||!uid){setLoading(false);return;}return onSnapshot(doc(services().db,"emergencyContacts",uid),s=>{setContact(s.exists()?s.data() as EmergencyContact:null);setLoading(false);setError("");},e=>{setLoading(false);setError(friendly(e));});},[uid]);
  return {contact,loading,error};
}
export function EmergencyContactForm({uid}:{uid:string}) {
  const {contact,loading,error}=useEmergencyContact(uid);
  const [form,setForm]=useState<EmergencyContact>({name:"",contactPhone:"",phone:""}),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{if(contact)setForm(contact);},[contact]);
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");try{
    if(form.name.trim().length<2||form.name.trim().length>100)throw new Error("Informe um nome entre 2 e 100 caracteres.");
    const data={uid,name:form.name.trim(),contactPhone:emergencyPhone(form.contactPhone),phone:emergencyPhone(form.phone),updatedAt:serverTimestamp()};
    if(!isPreview)await setDoc(doc(services().db,"emergencyContacts",uid),data);
    setMessage(isPreview?"Contato salvo somente nesta demonstração.":"Contato de emergência atualizado.");
  }catch(e){setMessage(friendly(e));}finally{setBusy(false);}}
  if(loading)return <p role="status">Carregando contato…</p>;
  return <form className="form emergency-contact-form" onSubmit={save}><h3>Contato de Emergência</h3><p>Cadastre antes de precisar. A diretoria utilizará estes números para ligar manualmente ao receber seu alerta. Nenhum SMS será enviado.</p>{error&&<p role="alert">{error}</p>}{[["name","Nome do contato de emergência"],["contactPhone","Celular do contato com DDD"],["phone","Seu celular com DDD"]].map(([key,label])=><label key={key}>{label}<input type={key==="name"?"text":"tel"} maxLength={key==="name"?100:25} value={form[key as keyof EmergencyContact]} onChange={e=>setForm({...form,[key]:e.target.value})} required/></label>)}{message&&<p role="status">{message}</p>}<button className="btn" disabled={busy}>{busy?"Salvando…":"Salvar contato de emergência"}</button></form>;
}
