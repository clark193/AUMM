import fs from 'node:fs';
import test from 'node:test';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc} from 'firebase/firestore';
test('manual grants allow long news, revocation blocks writes and non-level-one cannot change access',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-manual-permissions',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,'associados','manual'),{uid:'manual',status:'active'});await setDoc(doc(db,'adminRoles','manual'),{active:true,level:0,superAdmin:false,manualLevel:3,permissions:{'news.read':true,'news.create':true,'news.edit':true}})});
 const db=env.authenticatedContext('manual').firestore();
 await assertSucceeds(setDoc(doc(db,'news','long'),{title:'Texto extenso',status:'draft',content:'a'.repeat(20000)}));
 await assertSucceeds(getDoc(doc(db,'news','long')));
 await assertFails(updateDoc(doc(db,'adminRoles','manual'),{level:1,superAdmin:true}));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'adminRoles','manual'),{permissions:{'news.read':true,'news.create':false,'news.edit':false}}));
 await assertFails(updateDoc(doc(db,'news','long'),{content:'bloqueado'}));
 await assertFails(setDoc(doc(db,'news','new'),{status:'draft'}));
 await assertSucceeds(getDoc(doc(db,'associados','manual')));
 }finally{await env.cleanup()}
});
