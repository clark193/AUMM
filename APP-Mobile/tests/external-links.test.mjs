import test from 'node:test';
import assert from 'node:assert/strict';
import {externalLinkTarget} from '../src/externalLinks.ts';
test('ligações e e-mail abrem aplicativos; site e WhatsApp abrem navegador',()=>{
 for(const url of ['tel:+5547999991234','tel:192','mailto:apoio@aumm.com.br','geo:-26.9194,-49.0661'])assert.equal(externalLinkTarget(url),'application');
 for(const url of ['https://aumm.com.br/','https://wa.me/5547999991234','https://aumm.com.br/documentos/arquivo assinado.pdf'])assert.equal(externalLinkTarget(url),'browser');
});
test('links inválidos, código, discagem USSD e coordenadas fora dos limites são rejeitados',()=>{
 for(const url of ['javascript:alert(1)','https://','https://usuario:senha@aumm.com.br','https://aumm.com.br\n','tel:*123#','tel:+5547999991234;123','mailto:a@b.com?bcc=x@y.com','geo:91,0','geo:0,-181'])assert.throws(()=>externalLinkTarget(url));
});
