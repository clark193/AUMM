"use client";
import { useEffect,useState } from 'react';
import { collection,doc,getDoc,getDocs,onSnapshot,query,where,writeBatch,serverTimestamp } from 'firebase/firestore';
import {getFirebaseServices} from '@/lib/firebase';
import {permissionOptions} from '@/lib/manualPermissions';
type Role={id:string;name:string;permissions?:Record<string,boolean>;customPermissions?:boolean};
export function LabelAdmin(){
 const [roles,setRoles]=useState<Role[]>([]),[id,setId]=useState(''),[values,setValues]=useState<Record<string,boolean>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [policies,setPolicies]=useState<Record<string,Record<string,boolean>>>({}),[ready,setReady]=useState(false);
 useEffect(()=>onSnapshot(query(collection(getFirebaseServices().db,'adminRoles'),where('permissionPolicy','==',true)),s=>{setPolicies(Object.fromEntries(s.docs.map(d=>[d.data().roleId,d.data().permissions||{}])));setReady(true);}),[]);
 useEffect(()=>onSnapshot(collection(getFirebaseServices().db,'roles'),s=>setRoles(s.docs.map(d=>({id:d.id,...d.data()}) as Role))),[]);
 function choose(value:string){setId(value);setValues({...policies[value]});setMessage('');}
 async function save(){setBusy(true);setMessage('');try{
 const {auth,db}=getFirebaseServices();if(!auth.currentUser)throw Error('Entre novamente.');
 const actor=await getDoc(doc(db,'adminRoles',auth.currentUser.uid));if(actor.data()?.active!==true||Number(actor.data()?.level)!==1)throw Error('Apenas o nível 1 pode configurar permissões.');
 const members=await getDocs(query(collection(db,'adminRoles'),where('roleId','==',id)));
 const targets=members.docs.filter(d=>!d.data().permissionPolicy&&Number(d.data().level)!==1);
 if(targets.length>450)throw Error('Este cargo possui muitos vínculos para uma única atualização. Procure o suporte.');
 const batch=writeBatch(db);const permissions=Object.fromEntries(permissionOptions.map(([key])=>[key,values[key]===true]));
 batch.set(doc(db,'adminRoles',`role-policy-${id}`),{permissionPolicy:true,active:false,roleId:id,permissions,customPermissions:true,updatedAt:serverTimestamp()});
 for(const target of targets)batch.update(target.ref,{level:0,manualLevel:target.data().manualLevel??target.data().level,superAdmin:false,permissions,updatedAt:serverTimestamp()});
 batch.set(doc(collection(db,'auditLogs')),{action:'ROLE_PERMISSIONS_UPDATED',resource:'roles',resourceId:id,actorUid:auth.currentUser.uid,description:'Nível 1 personalizou as permissões do cargo.',timestamp:serverTimestamp()});
 await batch.commit();setMessage('Permissões salvas e aplicadas às contas deste cargo.');
 }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}}
 return <section className="panel"><h2>Label admin</h2><p>Escolha o cargo e ative o que ele pode fazer. Ao salvar, estas chaves substituem as permissões predefinidas para esse cargo. O acesso de associado permanece disponível e o nível 1 mantém acesso completo.</p><label className="field"><span>Cargo</span><select value={id} disabled={busy||!ready} onChange={e=>choose(e.target.value)}><option value="">Selecione</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{id&&<><p>Ative também a consulta de cada área para que a pessoa consiga ver os registros que irá editar.</p><fieldset disabled={busy} style={{border:0,padding:0}}>{permissionOptions.map(([key,label])=><label className="settings-toggle" key={key}><input type="checkbox" role="switch" checked={values[key]===true} onChange={e=>setValues(v=>({...v,[key]:e.target.checked}))}/><span>{label}</span></label>)}</fieldset><button className="button" disabled={busy} onClick={()=>void save()}>{busy?'Salvando…':'Salvar permissões do cargo'}</button></>}{message&&<p role="status">{message}</p>}</section>;
}
