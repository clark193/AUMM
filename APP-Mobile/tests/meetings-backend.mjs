import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';process.env.GCLOUD_PROJECT='demo-aumm-mobile';
const backend=await import('../backend/lib/backend/src/index.js');
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const {getFirestore,Timestamp}=require('firebase-admin/firestore'),{getApp,deleteApp}=require('firebase-admin/app');
const db=getFirestore(),prefix=`meeting-test-${Date.now()}`;
after(async()=>{await db.terminate();await deleteApp(getApp());});
test('reuniões notificam somente administradores ativos, deduplicam e respeitam alteração/cancelamento',async()=>{
 const now=Date.now(),start=now+30*60000;
 for(const [name,active,level] of [['one',true,1],['five',true,5],['off',false,1]]){await db.doc(`associados/${prefix}-${name}`).set({uid:`${prefix}-${name}`,status:'active'});await db.doc(`adminRoles/${prefix}-${name}`).set({active,level});}
 await db.doc(`adminRoles/${prefix}-orphan`).set({active:true,level:1});
 const ref=db.doc(`adminMeetings/${prefix}`),meeting={title:'Pauta confidencial',description:'Não deve ir para a tela bloqueada',joinUrl:'https://meet.google.com/privado',status:'scheduled',startsAt:Timestamp.fromMillis(start),endsAt:Timestamp.fromMillis(start+3600000),createdAt:Timestamp.fromMillis(now-3600000),updatedAt:Timestamp.fromMillis(now)};
 await ref.set(meeting);
 const inbox=async name=>(await db.collection(`mobileInbox/${prefix}-${name}/items`).get()).docs.map(d=>d.data()).filter(d=>d.itemId===prefix);
 await backend.processMeetingChange(prefix,null,meeting);await backend.processMeetingChange(prefix,null,meeting);
 for(const name of ['one','five']){const records=await inbox(name);assert.equal(records.length,1);assert.equal(records[0].target,'admin');assert.doesNotMatch(records[0].body,/confidencial|privado|meet.google/);}
 assert.equal((await inbox('off')).length,0);assert.equal((await inbox('orphan')).length,0);
 await backend.sendMeetingReminders(now);await backend.sendMeetingReminders(now);
 assert.equal((await inbox('one')).filter(d=>d.meetingStage==='30m').length,1);
 await backend.sendMeetingReminders(start);
 assert.equal((await inbox('five')).filter(d=>d.meetingStage==='start').length,1);
 const cancelled={...meeting,status:'cancelled',updatedAt:Timestamp.fromMillis(now+1)};await ref.set(cancelled);await backend.processMeetingChange(prefix,meeting,cancelled);
 await backend.sendMeetingReminders(start+60000);
 assert.equal((await inbox('one')).filter(d=>d.meetingStage==='cancelled').length,1);
 assert.equal((await inbox('one')).filter(d=>d.meetingStage==='start').length,1);
});
