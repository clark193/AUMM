import test from 'node:test';
import assert from 'node:assert/strict';
import {activateEmbeddedNavigation,navigate,currentRoute,backFromEmbeddedNavigation} from '../src/portal/navigation.ts';
test('voltar da leitura do estatuto ou privacidade retorna ao formulário sem sair do cadastro',()=>{
 let exits=0;const stop=activateEmbeddedNavigation('/associe-se',()=>exits++);
 try{for(const route of ['/estatuto','/privacidade']){navigate(route);assert.equal(backFromEmbeddedNavigation(),true);assert.equal(currentRoute(),'/associe-se');}assert.equal(backFromEmbeddedNavigation(),false);assert.equal(exits,0);}finally{stop();}
});
test('voltar de uma ferramenta retorna ao espaço administrativo antes de sair da aba',()=>{
 const stop=activateEmbeddedNavigation('/admin',()=>{});
 try{navigate('/admin/emergencias');assert.equal(backFromEmbeddedNavigation(),true);assert.equal(currentRoute(),'/admin');assert.equal(backFromEmbeddedNavigation(),false);}finally{stop();}
});
