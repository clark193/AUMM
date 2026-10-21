import {chromium,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({headless:true,executablePath:process.env.AUMM_BROWSER});
try{
 for(const [platform,userAgent] of [['android','Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'],['ios','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1']]){
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent});const page=await context.newPage();
  await page.goto('http://127.0.0.1:5174/mapa-preview.html',{waitUntil:'domcontentloaded'});
  const route=page.getByRole('link',{name:'Traçar rota até a pessoa',exact:true});await expect(route).toBeVisible();
  const url=new URL(await route.getAttribute('href'));
  if(platform==='android'){expect(url.hostname).toBe('www.google.com');expect(url.searchParams.get('destination')).toMatch(/^-26\./);expect(url.searchParams.get('dir_action')).toBe('navigate');await expect(page.getByRole('link',{name:'Abrir em outros aplicativos de mapas'})).toHaveAttribute('href',/^geo:-26\./);}
  else{expect(url.hostname).toBe('maps.apple.com');expect(url.searchParams.get('daddr')).toMatch(/^-26\./);}
  await route.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL(`../artifacts/41-rota-${platform}.png`,import.meta.url))});
  await context.close();
 }
 console.log('Rotas no receptor web: Android recebe direções e opção de outros aplicativos; iPhone recebe Apple Maps, ambos com a posição recebida. Sem abrir navegação real.');
}finally{await browser.close();}
