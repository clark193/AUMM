import {chromium,expect as baseExpect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const expect=baseExpect.configure({timeout:30000}),browser=await chromium.launch({headless:true,executablePath:process.env.AUMM_BROWSER});
const luminance=rgb=>{const parts=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return parts[0]*.2126+parts[1]*.7152+parts[2]*.0722;};
try{
 for(const width of [320,360,390]){
  const context=await browser.newContext({viewport:{width,height:850},locale:'pt-BR'}),page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5175/?demo=1');await expect(page.getByRole('heading',{name:'Bem-vindo à AUMM'})).toBeVisible();
  await page.evaluate(()=>window.postMessage({type:'aumm-unified-preview',mode:'president'},location.origin));await expect(page.getByRole('heading',{name:'Espaço administrativo',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Administradores',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Lista de associados',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:'Lucas · demonstração'});await expect(row.locator('td[data-label="E-mail"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const box=await row.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
  await row.getByRole('button',{name:'Abrir cadastro'}).click();const dialog=page.getByRole('dialog');const role=dialog.locator('.member-role-assignment');await role.getByLabel('Cargo',{exact:true}).selectOption('communications');for(const level of ['1','2','3'])await expect(role.getByLabel('Nível de acesso',{exact:true}).locator(`option[value="${level}"]`)).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await dialog.locator('.modal-close').click();const nav=page.getByRole('navigation',{name:'Navegação principal'});await nav.getByRole('button',{name:'Meu perfil',exact:true}).click();
  await expect(page.getByRole('button',{name:'Quero me associar',exact:true})).toHaveCount(0);
  const profileText=page.locator('.menu-list>button>span').first();const colors=await profileText.evaluate(node=>({text:getComputedStyle(node).color,bg:getComputedStyle(node.closest('.menu-list')).backgroundColor}));expect((luminance(colors.text)+.05)/(luminance(colors.bg)+.05)).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button',{name:'Configurações, foto e vínculo',exact:false}).click();await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.keyboard.press('Escape');
  await nav.getByRole('button',{name:'Utilidades',exact:true}).click();const utility=page.locator('.utility-feature h2');const uc=await utility.evaluate(node=>({text:getComputedStyle(node).color,bg:getComputedStyle(node.closest('.utility-feature')).backgroundColor}));expect((luminance(uc.text)+.05)/(luminance(uc.bg)+.05)).toBeGreaterThanOrEqual(4.5);
  if(width===360)await page.screenshot({path:fileURLToPath(new URL('../artifacts/52-utilidades-contraste-corrigido.png',import.meta.url))});
  await nav.getByRole('button',{name:'Admin',exact:true}).click();await page.getByRole('button',{name:'Lista de associados',exact:true}).click();if(width===360){await row.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('../artifacts/53-associados-em-cartoes.png',import.meta.url))});}
  expect(errors).toEqual([]);await context.close();
 }
 console.log('Celular 320/360/390px: associados em cartões, sem rolagem lateral, dados e ações acessíveis, contraste de perfil/utilidades >=4,5:1, cargo e níveis 1/2/3 disponíveis e sem painel separado de Administradores.');
}finally{await browser.close();}
