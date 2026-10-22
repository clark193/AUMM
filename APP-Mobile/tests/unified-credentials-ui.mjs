import {chromium,expect as baseExpect} from '@playwright/test';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,Timestamp} from 'firebase/firestore';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const expect=baseExpect.configure({timeout:30000}),accounts=JSON.parse(readFileSync(new URL('../.emulator/unified-accounts.json',import.meta.url),'utf8'));
const env=await initializeTestEnvironment({projectId:'demo-aumm-mobile',firestore:{host:'127.0.0.1',port:8080}}),browser=await chromium.launch({headless:true,executablePath:process.env.AUMM_BROWSER}),context=await browser.newContext({viewport:{width:1280,height:1080},permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();page.setDefaultTimeout(30000);
try{
 await context.addInitScript(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
 await page.goto('http://127.0.0.1:5175/preview-unificado.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const jpeg=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=150;c.height=180;const x=c.getContext('2d');x.fillStyle='#9f1930';x.fillRect(0,0,150,180);x.fillStyle='#fff';x.font='bold 76px sans-serif';x.fillText('M',42,116);return c.toDataURL('image/jpeg');});
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'memberPhotos',accounts.president.uid),{uid:accounts.president.uid,dataUrl:jpeg,contentType:'image/jpeg',updatedAt:Timestamp.now()});});
 await page.getByRole('button',{name:'Presidência · nível 1'}).click();const app=page.frameLocator('iframe');
 await app.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Meu perfil',exact:true}).click();await app.getByRole('button',{name:'Minha carteirinha',exact:true}).click();
 const modal=app.getByRole('dialog');await expect(modal.getByRole('heading',{name:'Carteirinha administrativa',exact:true})).toBeVisible();await modal.getByRole('button',{name:'Emitir credencial',exact:true}).click();await expect(modal.locator('.qr-box svg')).toBeVisible();
 await expect(modal.locator('.id-data')).toContainText('Presidência');await expect(modal.getByText('Carteira de associado',{exact:true})).toHaveCount(0);
 await modal.getByRole('button',{name:'Compartilhar',exact:true}).click();
 await expect.poll(()=>page.frames()[1].evaluate(()=>navigator.clipboard.readText())).toMatch(/^https:\/\/aumm\.com\.br\/verificar\?token=/);
 await env.withSecurityRulesDisabled(async c=>{const card=(await getDoc(doc(c.firestore(),'adminCards',accounts.president.uid))).data();expect(card.role).toBe('Presidência');expect(card.status).toBe('active');expect((await getDoc(doc(c.firestore(),'publicMembers',card.cardNumber))).data().credentialType).toBe('admin');expect((await getDoc(doc(c.firestore(),'adminPhotos',accounts.president.uid))).data().dataUrl).toBe(jpeg);});
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/50-credencial-do-cargo.png',import.meta.url))});
 console.log('Credencial nativa administrativa: foto unificada, cargo atual, emissão, QR público em aumm.com.br e cópia do link aprovados.');
}finally{await browser.close();await env.cleanup();}
