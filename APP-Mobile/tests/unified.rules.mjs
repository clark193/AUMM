import {before,after,beforeEach,test} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc,getDocs,collection,query,where,deleteDoc,serverTimestamp,Timestamp,writeBatch,setLogLevel} from 'firebase/firestore';
setLogLevel('silent');
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-aumm-mobile',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await env.cleanup();});
const client=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'}}).firestore();
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{for(const uid of ['president','director','recruiter','off'])await setDoc(doc(c.firestore(),'associados',uid),{uid,status:'active',mustChangePassword:false});for(const [uid,level,active] of [['president',1,true],['director',2,true],['recruiter',5,true],['off',1,false]])await setDoc(doc(c.firestore(),'adminRoles',uid),{active,level,fullName:uid,role:'Diretoria',permissions:{}});await setDoc(doc(c.firestore(),'associados','member'),{uid:'member',status:'active',mustChangePassword:false});});});
const meeting=uid=>({title:'Reunião mensal',description:'Pauta interna',location:'Online',joinUrl:'https://meet.google.com/abc-defg-hij',startsAt:Timestamp.fromMillis(Date.now()+3600000),endsAt:Timestamp.fromMillis(Date.now()+7200000),status:'scheduled',createdBy:uid,createdByName:uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
test('qualquer administrador ativo cria reuniões; associados e visitantes não acessam',async()=>{
 for(const uid of ['president','director','recruiter'])await assertSucceeds(setDoc(doc(client(uid),'adminMeetings',uid),meeting(uid)));
 for(const uid of ['member','off']){await assertFails(setDoc(doc(client(uid),'adminMeetings',uid),meeting(uid)));await assertFails(getDoc(doc(client(uid),'adminMeetings','director')));}
 await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(),'adminMeetings')));
 await assertSucceeds(getDocs(collection(client('recruiter'),'adminMeetings')));
});
test('somente organizador ou nível 1 altera e cancela; autoria, horários e links são validados',async()=>{
 await setDoc(doc(client('director'),'adminMeetings','meeting'),meeting('director'));
 await assertFails(updateDoc(doc(client('recruiter'),'adminMeetings','meeting'),{status:'cancelled',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(client('director'),'adminMeetings','meeting'),{createdBy:'president',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(client('director'),'adminMeetings','meeting'),{joinUrl:'javascript:alert(1)',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(client('director'),'adminMeetings','meeting'),{startsAt:Timestamp.fromMillis(Date.now()-60000),updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(client('president'),'adminMeetings','meeting'),{status:'cancelled',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(client('director'),'adminMeetings','meeting'),{status:'scheduled',updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(client('president'),'adminMeetings','meeting')));
});
const contact=()=>({name:'Borracharia Teste',phone:'+5547999991234',city:'Blumenau',address:'Centro',notes:'Teste',whatsappEnabled:false,active:true,createdBy:'president',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
test('contatos: só nível 1 gerencia e visitantes consultam apenas publicados',async()=>{
 await assertFails(setDoc(doc(client('director'),'supportContacts','bad'),contact()));
 await assertSucceeds(setDoc(doc(client('president'),'supportContacts','public'),contact()));
 await setDoc(doc(client('president'),'supportContacts','hidden'),{...contact(),active:false});
 const guest=env.unauthenticatedContext().firestore();
 await assertSucceeds(getDocs(query(collection(guest,'supportContacts'),where('active','==',true))));
 await assertFails(getDoc(doc(guest,'supportContacts','hidden')));
 await assertFails(getDocs(collection(guest,'supportContacts')));
 await assertFails(updateDoc(doc(client('president'),'supportContacts','public'),{createdBy:'director',updatedAt:serverTimestamp()}));
 await assertSucceeds(deleteDoc(doc(client('president'),'supportContacts','hidden')));
});
test('cargo e nível: só nível 1 concede acesso e não remove sua própria autoridade',async()=>{
 await assertFails(setDoc(doc(client('president'),'adminRoles','without-member'),{active:true,level:1}));
 await assertFails(setDoc(doc(client('director'),'adminRoles','member'),{active:true,level:1}));
 await assertSucceeds(setDoc(doc(client('president'),'adminRoles','member'),{active:true,level:5,role:'Cadastro',permissions:{}}));
 await assertFails(deleteDoc(doc(client('president'),'associados','member')));
 await assertFails(updateDoc(doc(client('president'),'adminRoles','president'),{active:false}));
 await assertFails(updateDoc(doc(client('president'),'adminRoles','president'),{level:5}));
 await assertFails(deleteDoc(doc(client('president'),'adminRoles','president')));
 await assertSucceeds(updateDoc(doc(client('president'),'adminRoles','member'),{active:false}));
 await assertSucceeds(deleteDoc(doc(client('president'),'associados','member')));
});
test('acesso administrativo exige associado ativo e é bloqueado ao inativar o vínculo',async()=>{
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'adminRoles','orphan'),{active:true,level:1,fullName:'orphan',permissions:{}});});
 await assertFails(setDoc(doc(client('orphan'),'adminMeetings','orphan'),meeting('orphan')));
 await assertFails(getDocs(collection(client('orphan'),'adminRoles')));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'associados','orphan'),{uid:'orphan',status:'active'});});
 await assertSucceeds(setDoc(doc(client('orphan'),'adminMeetings','orphan'),meeting('orphan')));
 await assertSucceeds(updateDoc(doc(client('president'),'associados','orphan'),{status:'inactive'}));
 await assertFails(getDocs(collection(client('orphan'),'adminRoles')));
});
test('credencial: presidente invalida cartão e titular reemite com cargo atual e foto no mesmo lote',async()=>{
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'adminCards','director'),{uid:'director',cardNumber:'DIR-1',role:'Diretor anterior',status:'active',validUntil:Timestamp.fromMillis(Date.now()+86400000)});});
 await assertFails(updateDoc(doc(client('recruiter'),'adminCards','director'),{status:'inactive',updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(client('president'),'adminCards','director'),{status:'inactive',updatedAt:serverTimestamp()}));
 const db=client('director'),batch=writeBatch(db);
 batch.set(doc(db,'adminPhotos','director'),{uid:'director',dataUrl:'data:image/jpeg;base64,TEST',contentType:'image/jpeg',updatedAt:serverTimestamp()});
 batch.set(doc(db,'adminCards','director'),{uid:'director',cardNumber:'DIR-1',fullName:'director',level:2,role:'Diretoria',status:'active',issuedAt:serverTimestamp(),validUntil:Timestamp.fromMillis(Date.now()+365*86400000),updatedAt:serverTimestamp()});
 await assertSucceeds(batch.commit());
});
