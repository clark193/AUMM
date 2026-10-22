import {chromium,expect} from '@playwright/test';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,collection,getDocs,deleteDoc} from 'firebase/firestore';
import {readFileSync} from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-aumm-mobile',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});
const suffix=Date.now(),password='ImprovementTest123!';
async function signup(kind){return fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`improvements-${kind}-${suffix}@aumm.test`,password,returnSecureToken:true})}).then(r=>r.json());}
const member=await signup('member'),admin=await signup('admin');const fullName='Associado de Teste com Nome Completo Muito Longo';
await env.withSecurityRulesDisabled(async c=>{
 for(const item of (await getDocs(collection(c.firestore(),'events'))).docs)await deleteDoc(item.ref);
 await setDoc(doc(c.firestore(),'associados',member.localId),{uid:member.localId,fullName,email:member.email,memberNumber:`UI-${suffix}`,birthDate:'1990-05-20',createdAt:'2025-10-20',status:'active',mustChangePassword:false});
 await setDoc(doc(c.firestore(),'associados',admin.localId),{uid:admin.localId,fullName:'Admin UI',status:'active',mustChangePassword:false});
 await setDoc(doc(c.firestore(),'adminRoles',admin.localId),{active:true,level:1,fullName:'Admin UI',permissions:{}});
 await setDoc(doc(c.firestore(),'events',`test-${suffix}`),{title:`Evento local ${suffix}`,description:'Informações reais do registro de teste.',date:'2099-12-25',status:'active',location:'Sede de teste'});
});
const browser=await chromium.launch({executablePath:process.env.AUMM_BROWSER,headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR'}),page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5175/?login=1');await page.getByLabel('E-mail',{exact:true}).fill(member.email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar na minha conta'}).click();
 await expect(page.getByRole('button',{name:/Logado como:/})).toBeVisible();await expect(page.locator('.top-login')).toContainText(fullName);await expect(page.getByRole('button',{name:'Quero me associar',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:`Evento local ${suffix}`})).toBeVisible();await expect(page.getByText('25 de dez. de 2099',{exact:false}).first()).toBeVisible();
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Meu perfil',exact:true}).click();
 await page.getByRole('button',{name:/Configurações, foto e vínculo/}).click();await expect(page.locator('.mobile-member-feature')).toBeVisible();await expect(page.getByRole('button',{name:'Tirar foto',exact:true})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:/Fechar/}).click();
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Utilidades',exact:true}).click();await page.getByRole('button',{name:/Ganhos, despesas e quilometragem/}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Ganhos recebidos (R$)').fill('200');await dialog.getByLabel('Despesas pagas (R$)').fill('40');await dialog.getByLabel('Odômetro inicial (km)').fill('1000');await dialog.getByLabel('Odômetro final (km)').fill('1100');await dialog.getByRole('button',{name:'Salvar jornada'}).click();await expect(dialog.locator('.ledger-summary')).toContainText(/160,00/);await page.reload();
 const adminContext=await browser.newContext({viewport:{width:1280,height:900}});const staff=await adminContext.newPage();staff.setDefaultTimeout(60000);staff.on('pageerror',e=>errors.push(e.message));
 await staff.goto('http://127.0.0.1:5175/portal.html#/associado/login?destino=admin');await staff.getByPlaceholder('seu@email.com',{exact:true}).fill(admin.email);await staff.getByPlaceholder('Sua senha',{exact:true}).fill(password);await staff.getByRole('button',{name:'Entrar',exact:true}).click();await expect(staff.getByRole('button',{name:/^Notificações/})).toBeVisible();await staff.goto('http://127.0.0.1:5175/portal.html#/admin/associados');
 const row=staff.getByRole('row').filter({hasText:member.email});await row.getByRole('button',{name:'Abrir cadastro',exact:true}).click();const detail=staff.getByRole('dialog');await expect(detail.getByRole('heading',{name:fullName,exact:true})).toBeVisible();await expect(detail).toContainText('20/05/1990');await detail.getByRole('button',{name:'Alterar Senha',exact:true}).click();await expect(detail.getByLabel('Sua senha de administrador')).toBeVisible();await detail.getByRole('button',{name:'Cancelar',exact:true}).click();
 const png=await page.screenshot();await detail.locator('input[type=file]').first().setInputFiles({name:'foto.png',mimeType:'image/png',buffer:png});await expect(detail.getByText('Foto atualizada com sucesso.',{exact:true})).toBeVisible();
 await env.withSecurityRulesDisabled(async c=>expect((await getDoc(doc(c.firestore(),'memberPhotos',member.localId))).data().uid).toBe(member.localId));
 expect(errors).toEqual([]);console.log('Interface: nome completo, cadastro oculto, evento na data correta, configurações dentro do app, jornada com valores reais, cadastro legado sem falha, formulário de senha e upload administrativo de foto: aprovados.');
}finally{await browser.close();await env.cleanup();}
