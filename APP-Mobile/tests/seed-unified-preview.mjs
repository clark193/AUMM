// Apenas emuladores locais. Nunca usa credenciais ou dados de produção.
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,Timestamp} from 'firebase/firestore';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-aumm-mobile',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});
const accounts={};
try{
 for(const mode of ['member','president','director','target']){
  const data={email:`preview.${mode}@aumm.test`,password:'DemoAumm2026!',returnSecureToken:true};
  const base='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:';
  let result=await fetch(base+'signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json());
  if(result.error?.message==='EMAIL_EXISTS')result=await fetch(base+'signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json());
  if(!result.localId)throw Error(JSON.stringify(result));
  accounts[mode]={uid:result.localId,email:data.email,password:data.password};
 }
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore(),now=Timestamp.now(),set=(path,data)=>setDoc(doc(db,path),data);
  for(const [mode,name,num] of [['member','Rafael · demonstração','DEMO-001'],['president','Marina · demonstração','DEMO-002'],['director','João · demonstração','DEMO-003'],['target','Lucas · demonstração','DEMO-004']]){
   await set(`associados/${accounts[mode].uid}`,{uid:accounts[mode].uid,fullName:name,email:accounts[mode].email,memberNumber:num,status:'active',authorized:true,eligibleToVote:true,mustChangePassword:false,role:'Associado',city:'Blumenau',phone:'+5500999990000',whatsapp:'+5500999990000',createdAt:now,updatedAt:now});
   await set(`publicMembers/${num}`,{uid:accounts[mode].uid,fullName:name,memberNumber:num,status:'active',credentialType:'member',role:'Associado',updatedAt:now});
  }
  for(const [id,name,description] of [['president','Presidência','Representa a associação e coordena a diretoria. O nível de acesso é definido separadamente.'],['director','Diretoria operacional','Organiza ações, apoios e atividades da associação.'],['communications','Comunicação','Prepara notícias, comunicados e conteúdo institucional.'],['registration','Cadastro','Apoia o cadastro e o relacionamento com associados.']])await set(`roles/${id}`,{name,description,active:true,order:id==='president'?1:2});
  for(const [mode,level,role] of [['president',1,'Presidência'],['director',2,'Diretoria operacional']])await set(`adminRoles/${accounts[mode].uid}`,{uid:accounts[mode].uid,fullName:mode==='president'?'Marina · demonstração':'João · demonstração',email:accounts[mode].email,active:true,level,role,roleId:mode,permissions:{},createdAt:now,updatedAt:now});
  await set('settings/public',{name:'AUMM · demonstração local',externalPushUrl:'',city:'Blumenau'});
  await set('supportContacts/demo-oficina',{name:'Borracharia do Seu Zé · demonstração',phone:'+5500999990000',city:'Blumenau',address:'Região central · endereço fictício',notes:'Exemplo de contato cadastrado pela presidência.',active:true,whatsappEnabled:true,createdBy:accounts.president.uid,createdAt:now,updatedAt:now});
  await set('supportContacts/demo-apoio',{name:'Oficina União · demonstração',phone:'+5500999990001',city:'Blumenau',address:'Bairro Garcia · endereço fictício',notes:'Este contato tem somente o botão de ligação.',active:true,whatsappEnabled:false,createdBy:accounts.president.uid,createdAt:now,updatedAt:now});
  for(const [id,offset,title] of [['encontro',3,'Encontro da União · demonstração'],['acao',8,'Ação de apoio aos motoboys · demonstração'],['anterior',-5,'Café com a diretoria · demonstração']])await set(`events/${id}`,{title,description:'Exemplo de evento para conferir o novo visual da agenda. Esta publicação existe somente no emulador local.',summary:'Um momento para trocar experiências e fortalecer a união.',location:'Blumenau · local de demonstração',date:new Date(Date.now()+offset*86400000).toISOString().slice(0,10),time:'15:00',status:'active',createdAt:now});
  await set('news/demo-news',{title:'Uma associação mais perto de você',summary:'Notícia fictícia para demonstrar o novo aplicativo.',content:'Acompanhe notícias, eventos e benefícios em um único lugar.',status:'published',publishedAt:now,createdAt:now});
  await set('benefits/demo-benefit',{title:'Manutenção com condições para associados',name:'Manutenção preventiva · demonstração',description:'Exemplo de benefício exclusivo publicado pela associação.',status:'active',category:'Serviços',createdAt:now});
  const member=accounts.member.uid,incident='demo-incident-20261021';
  await set(`emergencyContacts/${member}`,{uid:member,name:'Contato de confiança · demonstração',contactPhone:'+5500999990002',phone:'+5500999990000',updatedAt:now});
  await set(`emergencyAlerts/${member}`,{ownerUid:member,incidentId:incident,fullName:'Rafael · demonstração',memberNumber:'DEMO-001',phone:'+5500999990000',contactName:'Contato de confiança · demonstração',contactPhone:'+5500999990002',status:'open',location:{lat:-26.9194,lng:-49.0661,accuracy:12},createdAt:now,updatedAt:now});
  await set(`emergencyAdminSignals/${member}`,{incidentId:incident,status:'open',createdAt:now,updatedAt:now});
  const starts=Timestamp.fromMillis(Date.now()+24*3600000);
  await set('adminMeetings/demo-meeting',{title:'Planejamento da diretoria · demonstração',description:'Pauta de exemplo: ações de apoio, agenda de eventos e atendimento aos associados. Não é uma convocação real.',location:'Online',joinUrl:'https://meet.google.com/demo-preview',startsAt:starts,endsAt:Timestamp.fromMillis(starts.toMillis()+3600000),status:'scheduled',createdBy:accounts.director.uid,createdByName:'João · demonstração',createdAt:now,updatedAt:now});
 });
 mkdirSync(new URL('../.emulator/',import.meta.url),{recursive:true});writeFileSync(new URL('../.emulator/unified-accounts.json',import.meta.url),JSON.stringify(accounts,null,2));
 console.log('Prévia local preparada: quatro contas fictícias, cargos, contatos, emergência e agenda. Nenhum envio externo.');
}finally{await env.cleanup();}
